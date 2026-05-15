/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, ChangeEvent, useRef, Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Search,
  Plus,
  Lock,
  Unlock,
  Settings,
  Download,
  Upload,
  HelpCircle,
  Moon,
  Sun,
  Filter,
  ArrowUpDown,
  Command,
  Heart,
  Briefcase,
  AlertCircle,
  ShieldCheck,
  Cloud,
  LogOut,
  RefreshCcw,
  User
} from 'lucide-react';
// Sub-components
import { Sidebar } from './components/Sidebar.tsx';
const StatsDashboard = lazy(() => import('./components/StatsDashboard.tsx').then(m => ({ default: m.StatsDashboard })));
const AiAssistantWidget = lazy(() => import('./components/AiAssistantWidget.tsx').then(m => ({ default: m.AiAssistantWidget })));
const PromptCard = lazy(() => import('./components/PromptCard.tsx').then(m => ({ default: m.PromptCard })));
const Modal = lazy(() => import('./components/Modal.tsx').then(m => ({ default: m.Modal })));
const PromptForm = lazy(() => import('./components/PromptForm.tsx').then(m => ({ default: m.PromptForm })));
const PinLock = lazy(() => import('./components/PinLock.tsx').then(m => ({ default: m.PinLock })));
const VariableForm = lazy(() => import('./components/VariableForm.tsx').then(m => ({ default: m.VariableForm })));

// Types and Constants
import { Prompt, Category, VaultData, SortOption } from './types.ts';
import { INITIAL_DATA, LOCAL_STORAGE_KEY, SCHEMA_VERSION, SYNC_META_KEY, SYNC_TABLE } from './constants.ts';

type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncMeta = {
  lastLocalChangeAt: number;
  lastRemoteChangeAt: number;
  lastSyncedAt: number | null;
};

type MotionModule = typeof import('motion/react');
type SupabaseModule = typeof import('./utils/supabase.ts');
type SupabaseClient = SupabaseModule['supabase'];

const readSyncMeta = (): SyncMeta => {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) {
      return { lastLocalChangeAt: 0, lastRemoteChangeAt: 0, lastSyncedAt: null };
    }
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      lastLocalChangeAt: typeof parsed.lastLocalChangeAt === 'number' ? parsed.lastLocalChangeAt : 0,
      lastRemoteChangeAt: typeof parsed.lastRemoteChangeAt === 'number' ? parsed.lastRemoteChangeAt : 0,
      lastSyncedAt: typeof parsed.lastSyncedAt === 'number' ? parsed.lastSyncedAt : null,
    };
  } catch {
    return { lastLocalChangeAt: 0, lastRemoteChangeAt: 0, lastSyncedAt: null };
  }
};

const writeSyncMeta = (meta: SyncMeta) => {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
};

const isValidVaultData = (value: unknown): value is VaultData => {
  const data = value as VaultData;
  return Boolean(
    data &&
    data.schemaVersion &&
    Array.isArray(data.prompts) &&
    Array.isArray(data.categories) &&
    data.settings &&
    typeof data.settings.isDarkMode === 'boolean'
  );
};

const formatTimestamp = (value: number | null) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
};

const getSyncData = (value: VaultData): VaultData => ({
  ...value,
  settings: {
    ...value.settings,
    pinHash: null,
  },
});

export default function App() {
  // --- STATE ---
  const [data, setData] = useState<VaultData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as VaultData;
        // Basic schema guard: ensure required fields exist
        if (isValidVaultData(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('[PromptVault] Failed to parse saved data, resetting to defaults:', err);
    }
    return INITIAL_DATA;
  });


  const initialSyncMeta = useMemo(() => readSyncMeta(), []);
  const lastLocalChangeAtRef = useRef(initialSyncMeta.lastLocalChangeAt);
  const lastRemoteChangeAtRef = useRef(initialSyncMeta.lastRemoteChangeAt);
  const lastSyncedAtRef = useRef<number | null>(initialSyncMeta.lastSyncedAt);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(initialSyncMeta.lastSyncedAt);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const pendingSyncRef = useRef(false);
  const suppressLocalChangeRef = useRef(false);
  const hasHydratedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [motionModule, setMotionModule] = useState<MotionModule | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const loadMotion = () => {
      import('motion/react').then((mod) => {
        if (!cancelled) {
          setMotionModule(mod);
        }
      });
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(loadMotion, { timeout: 2000 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(id);
      };
    }

    const timeoutId = window.setTimeout(loadMotion, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const loadSupabase = () => {
      import('./utils/supabase.ts').then(({ supabase, isSupabaseConfigured }) => {
        if (!cancelled) {
          setSupabaseClient(supabase);
          setSupabaseConfigured(isSupabaseConfigured);
        }
      });
    };

    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(loadSupabase, { timeout: 2000 });
      return () => {
        cancelled = true;
        idleWindow.cancelIdleCallback?.(id);
      };
    }

    const timeoutId = window.setTimeout(loadSupabase, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);


  const [isLocked, setIsLocked] = useState(data.settings.pinHash !== null);
  const [isRemovingLock, setIsRemovingLock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('RECENTLY_ADDED');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [variablePrompt, setVariablePrompt] = useState<{ prompt: Prompt, vars: string[] } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 2000);

      if (!hasHydratedRef.current) {
        hasHydratedRef.current = true;
        writeSyncMeta({
          lastLocalChangeAt: lastLocalChangeAtRef.current,
          lastRemoteChangeAt: lastRemoteChangeAtRef.current,
          lastSyncedAt: lastSyncedAtRef.current,
        });
        return;
      }

      if (suppressLocalChangeRef.current) {
        suppressLocalChangeRef.current = false;
        const remoteAt = lastRemoteChangeAtRef.current || Date.now();
        lastLocalChangeAtRef.current = remoteAt;
        writeSyncMeta({
          lastLocalChangeAt: remoteAt,
          lastRemoteChangeAt: lastRemoteChangeAtRef.current,
          lastSyncedAt: lastSyncedAtRef.current,
        });
        return;
      }

      const now = Date.now();
      lastLocalChangeAtRef.current = now;
      pendingSyncRef.current = true;
      writeSyncMeta({
        lastLocalChangeAt: now,
        lastRemoteChangeAt: lastRemoteChangeAtRef.current,
        lastSyncedAt: lastSyncedAtRef.current,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  // --- MOBILE DETECTION ---
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (data.settings.isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [data.settings.isDarkMode]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthReady(true);
      return;
    }

    if (!supabaseClient) {
      return;
    }

    setAuthReady(false);
    let isMounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseClient, supabaseConfigured]);

  const applyRemoteData = useCallback((remoteData: VaultData, remoteUpdatedAt: number) => {
    const mergedData: VaultData = {
      ...remoteData,
      settings: {
        ...remoteData.settings,
        pinHash: dataRef.current.settings.pinHash,
      },
    };
    suppressLocalChangeRef.current = true;
    lastRemoteChangeAtRef.current = remoteUpdatedAt;
    lastLocalChangeAtRef.current = remoteUpdatedAt;
    lastSyncedAtRef.current = Date.now();
    setLastSyncedAt(lastSyncedAtRef.current);
    writeSyncMeta({
      lastLocalChangeAt: lastLocalChangeAtRef.current,
      lastRemoteChangeAt: lastRemoteChangeAtRef.current,
      lastSyncedAt: lastSyncedAtRef.current,
    });
    setData(mergedData);
  }, []);

  const syncToCloud = useCallback(async (reason: 'auto' | 'manual' | 'bootstrap') => {
    if (!session || !supabaseConfigured || !supabaseClient) return;
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    const dataToSync = getSyncData(dataRef.current);
    const payload = {
      user_id: session.user.id,
      data: dataToSync,
      schema_version: dataToSync.schemaVersion,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabaseClient
      .from(SYNC_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select('updated_at')
      .single();

    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
      syncInFlightRef.current = false;
      return;
    }

    const remoteMs = Date.parse(row.updated_at);
    if (Number.isFinite(remoteMs)) {
      lastRemoteChangeAtRef.current = remoteMs;
    }

    const now = Date.now();
    lastSyncedAtRef.current = now;
    setLastSyncedAt(now);
    pendingSyncRef.current = false;
    writeSyncMeta({
      lastLocalChangeAt: lastLocalChangeAtRef.current,
      lastRemoteChangeAt: lastRemoteChangeAtRef.current,
      lastSyncedAt: lastSyncedAtRef.current,
    });
    setSyncStatus('idle');
    syncInFlightRef.current = false;
  }, [session, supabaseClient, supabaseConfigured]);

  const bootstrapSync = useCallback(async () => {
    if (!session || !supabaseConfigured || !supabaseClient) return;
    setSyncStatus('syncing');
    setSyncError(null);

    const { data: row, error } = await supabaseClient
      .from(SYNC_TABLE)
      .select('data, updated_at, schema_version')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
      return;
    }

    if (!row) {
      await syncToCloud('bootstrap');
      return;
    }

    const remoteMs = Date.parse(row.updated_at);
    if (Number.isFinite(remoteMs)) {
      lastRemoteChangeAtRef.current = remoteMs;
    }

    if (lastLocalChangeAtRef.current > lastRemoteChangeAtRef.current) {
      await syncToCloud('bootstrap');
      return;
    }

    if (row.data && isValidVaultData(row.data) && lastRemoteChangeAtRef.current > lastLocalChangeAtRef.current) {
      applyRemoteData(row.data, lastRemoteChangeAtRef.current);
      setSyncStatus('idle');
      return;
    }

    const now = Date.now();
    lastSyncedAtRef.current = now;
    setLastSyncedAt(now);
    writeSyncMeta({
      lastLocalChangeAt: lastLocalChangeAtRef.current,
      lastRemoteChangeAt: lastRemoteChangeAtRef.current,
      lastSyncedAt: lastSyncedAtRef.current,
    });
    setSyncStatus('idle');
  }, [applyRemoteData, session, supabaseClient, supabaseConfigured, syncToCloud]);

  const pullIfRemoteNewer = useCallback(async () => {
    if (!session || !supabaseConfigured || !supabaseClient) return;
    if (syncInFlightRef.current) return;

    const { data: row, error } = await supabaseClient
      .from(SYNC_TABLE)
      .select('data, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !row) return;

    const remoteMs = Date.parse(row.updated_at);
    if (!Number.isFinite(remoteMs)) return;

    if (remoteMs <= lastRemoteChangeAtRef.current) return;

    if (remoteMs > lastLocalChangeAtRef.current && row.data && isValidVaultData(row.data)) {
      applyRemoteData(row.data, remoteMs);
      return;
    }

    if (lastLocalChangeAtRef.current > remoteMs) {
      pendingSyncRef.current = true;
      syncToCloud('auto');
    }
  }, [applyRemoteData, session, supabaseClient, supabaseConfigured, syncToCloud]);

  useEffect(() => {
    if (!session?.user.id || !supabaseConfigured || !supabaseClient) return;
    bootstrapSync();
  }, [bootstrapSync, session?.user.id, supabaseClient, supabaseConfigured]);

  useEffect(() => {
    if (!session?.user.id || !supabaseConfigured || !supabaseClient) return;
    if (!pendingSyncRef.current) return;

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncToCloud('auto');
    }, 1000);

    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [data, session?.user.id, supabaseClient, supabaseConfigured, syncToCloud]);

  useEffect(() => {
    if (!session?.user.id || !supabaseConfigured || !supabaseClient) return;
    const interval = window.setInterval(() => {
      pullIfRemoteNewer();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [pullIfRemoteNewer, session?.user.id, supabaseClient, supabaseConfigured]);

  const handleSignIn = async () => {
    if (!supabaseConfigured || !supabaseClient) {
      setSyncStatus('error');
      setSyncError('Supabase is not configured or still initializing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setSyncError(null);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
    }
  };

  const handleSignOut = async () => {
    setSyncError(null);
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
    }
  };

  const handleManualSync = async () => {
    await syncToCloud('manual');
  };

  const [showSettings, setShowSettings] = useState(false);

  // --- ACTIONS ---
  const handleSetPin = async (hash: string) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, pinHash: hash } }));
  };

  // Update logic for the lock button in header
  const handleLockButtonClick = () => {
    if (data.settings.pinHash && !isRemovingLock) {
      // If there's a PIN set and we're not already removing, start the removal process
      setIsRemovingLock(true);
    } else if (!data.settings.pinHash) {
      // If no PIN is set, go straight to the PIN setup flow
      setIsLocked(true);
    }
  };

  const handleRemoveLock = () => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, pinHash: null } }));
    setIsRemovingLock(false);
  };

  const handleCancelRemoveLock = () => {
    setIsRemovingLock(false);
  };

  const createPrompt = (promptData: { title: string; body: string; categoryId: string; tags?: string[]; isFavorite?: boolean }) => {
    const newPrompt: Prompt = {
      id: crypto.randomUUID(),
      title: promptData.title,
      body: promptData.body,
      categoryId: promptData.categoryId,
      tags: promptData.tags || [],
      isFavorite: promptData.isFavorite ?? false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setData(prev => ({ ...prev, prompts: [newPrompt, ...prev.prompts] }));
    return newPrompt.id;
  };

  const handleAddPrompt = (promptData: Partial<Prompt>) => {
    createPrompt({
      title: promptData.title!,
      body: promptData.body!,
      categoryId: promptData.categoryId!,
      tags: promptData.tags,
      isFavorite: false,
    });
    setIsNewModalOpen(false);
  };

  const handleCreatePromptFromAi = (promptData: { title: string; body: string; categoryId: string; tags: string[] }) => {
    return createPrompt({ ...promptData, isFavorite: false });
  };

  const handleUpdatePrompt = (promptData: Partial<Prompt>) => {
    if (!editingPrompt) return;
    setData(prev => ({
      ...prev,
      prompts: prev.prompts.map(p =>
        p.id === editingPrompt.id ? { ...p, ...promptData, updatedAt: Date.now() } : p
      )
    }));
    setEditingPrompt(null);
  };

  const handleToggleFavorite = (id: string) => {
    setData(prev => ({
      ...prev,
      prompts: prev.prompts.map(p =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      )
    }));
  };

  const handleDeletePrompt = (id: string) => {
    setData(prev => ({ ...prev, prompts: prev.prompts.filter(p => p.id !== id) }));
    setViewingPrompt(null);
    setEditingPrompt(null);
    setConfirmDeleteId(null);
  };

  const handleDuplicatePrompt = (prompt: Prompt) => {
    const newPrompt: Prompt = {
      ...prompt,
      id: crypto.randomUUID(),
      title: `${prompt.title} (copy)`,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setData(prev => ({ ...prev, prompts: [newPrompt, ...prev.prompts] }));
  };

  const handleCopyPrompt = useCallback((prompt: Prompt, customBody?: string) => {
    const finalBody = customBody || prompt.body;

    // Check for variables if no custom body provided
    if (!customBody) {
      const matches = prompt.body.match(/{{([^{}]+)}}/g);
      if (matches) {
        const vars = Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
        setVariablePrompt({ prompt, vars });
        return;
      }
    }

    navigator.clipboard.writeText(finalBody).then(() => {
      setData(prev => ({
        ...prev,
        prompts: prev.prompts.map(p =>
          p.id === prompt.id ? { ...p, usageCount: p.usageCount + 1 } : p
        )
      }));
      setVariablePrompt(null);
    });
  }, []);

  const handleAddCategory = () => {
    const name = prompt('Category Name:');
    if (name) {
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name,
        isCollapsed: false,
      };
      setData(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string) as VaultData;
        if (importedData.schemaVersion) {
          if (confirm('Import data? This will merge with existing prompts.')) {
            setData(prev => {
              // Simple merge: add unique by ID
              const existingIds = new Set(prev.prompts.map(p => p.id));
              const newPrompts = importedData.prompts.filter(p => !existingIds.has(p.id));
              return {
                ...prev,
                prompts: [...prev.prompts, ...newPrompts],
                categories: [...prev.categories, ...importedData.categories.filter(c => !prev.categories.find(pc => pc.id === c.id))]
              };
            });
          }
        }
      } catch (err) {
        alert('Invalid import file.');
      }
    };
    reader.readAsText(file);
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key === '[') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      } else if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        document.getElementById('main-search-desktop')?.focus() || document.getElementById('main-search')?.focus();
      } else if (isCmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        setIsNewModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsNewModalOpen(false);
        setEditingPrompt(null);
        setViewingPrompt(null);
        setVariablePrompt(null);
        setShowShortcuts(false);
      } else if (e.key === '?' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        setShowShortcuts(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked]);

  // --- FILTERING & SORTING ---
  const filteredPrompts = useMemo(() => {
    let result = [...data.prompts];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Category
    if (selectedCategoryId) {
      result = result.filter(p => p.categoryId === selectedCategoryId);
    }

    // Favorites
    if (showFavorites) {
      result = result.filter(p => p.isFavorite);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'MOST_USED': return b.usageCount - a.usageCount;
        case 'RECENTLY_ADDED': return b.createdAt - a.createdAt;
        case 'RECENTLY_UPDATED': return b.updatedAt - a.updatedAt;
        case 'A_Z': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });

    return result;
  }, [data.prompts, searchQuery, selectedCategoryId, showFavorites, sortBy]);

  const isMotionReady = Boolean(motionModule);
  const MotionDiv: React.ElementType = isMotionReady ? motionModule!.motion.div : 'div';
  const MotionSpan = motionModule?.motion.span;
  const emptyStateMotionProps = isMotionReady
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } }
    : {};
  const promptGridFallback = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-64 rounded-2xl border border-vault-border bg-vault-panel/50" />
      ))}
    </div>
  );
  const modalFallback = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative w-full max-w-2xl h-[70vh] rounded-2xl border border-vault-border bg-vault-panel/80" />
    </div>
  );
  const pinLockFallback = <div className="min-h-screen w-full bg-vault-bg" />;
  const isEmptyState = !showStats && filteredPrompts.length === 0;
  const contentAreaClassName = `flex-1 min-h-0 ${isEmptyState ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} ${isMobile ? (isEmptyState ? 'px-4 py-3' : 'p-4') : (isEmptyState ? 'px-10 py-6' : 'px-10 py-8')}`;
  const contentWrapperClassName = isEmptyState
    ? 'flex flex-1 flex-col max-w-7xl mx-auto w-full'
    : 'space-y-6 max-w-7xl mx-auto';

  // --- RENDER ---
  if (isLocked || isRemovingLock) {
    return (
      <Suspense fallback={pinLockFallback}>
        <PinLock
          storedHash={data.settings.pinHash}
          onUnlocked={() => setIsLocked(false)}
          onSetPin={handleSetPin}
          isRemovingLock={isRemovingLock}
          onRemoveLock={handleRemoveLock}
          onCancelRemove={handleCancelRemoveLock}
        />
      </Suspense>
    );
  }

  // Compute the current view label for the section header
  const currentViewLabel = showFavorites ? '⭐ Favorites' : selectedCategoryId ? `# ${data.categories.find(c => c.id === selectedCategoryId)?.name || 'Unknown'}` : 'All Prompts';

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full bg-vault-bg text-vault-text overflow-hidden transition-colors duration-300 relative z-[1]">
      {/* Skip Navigation — accessibility for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-vault-accent focus:text-vault-bg focus:rounded-lg focus:text-sm focus:font-bold">Skip to main content</a>

      {/* Sidebar Overlay for Mobile/Smaller Screens could go here */}
      <Sidebar
        categories={data.categories}
        prompts={data.prompts}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(id) => {
          setSelectedCategoryId(id);
          setShowStats(false);
        }}
        onAddCategory={handleAddCategory}
        onDeleteCategory={(id) => setData(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id), prompts: prev.prompts.filter(p => p.categoryId !== id) }))}
        onRenameCategory={(id, name) => setData(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, name } : c) }))}
        onToggleCollapse={(id) => setData(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, isCollapsed: !c.isCollapsed } : c) }))}
        showFavorites={showFavorites}
        onToggleFavorites={() => {
          setShowFavorites(!showFavorites);
          setSelectedCategoryId(null);
          setShowStats(false);
        }}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
        isCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
      />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-full min-h-0">
        {/* Visually hidden h1 for proper heading hierarchy — SEO & accessibility */}
        <h1 className="sr-only">PromptVault — Your Private AI Prompt Library</h1>
        {/* Header — Desktop: single-row | Mobile: two-row */}
        <header className={`border-b border-vault-border bg-vault-panel/70 backdrop-blur-xl z-10 shrink-0 ${isMobile ? 'flex flex-col' : 'h-[72px] flex items-center justify-between px-8'
          }`}>

          {isMobile ? (
            /* ─── Mobile Header ─── */
            <>
              {/* Row 1: Menu toggle · Logo · Action buttons */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                {/* Left: hamburger + logo */}
                <div className="flex items-center gap-3">
                  <button
                    id="mobile-menu-toggle"
                    onClick={() => setSidebarCollapsed(prev => !prev)}
                    aria-label="Toggle sidebar"
                    className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-lg border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent active:scale-95 transition-all"
                  >
                    {/* Animated hamburger: 3 lines → X when sidebar open */}
                    <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? 'rotate-45 translate-y-[6.5px]' : ''
                      }`} />
                    <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? 'opacity-0 scale-x-0' : ''
                      }`} />
                    <span className={`block h-[1.5px] w-4 rounded-full bg-current transition-all duration-300 ${!sidebarCollapsed ? '-rotate-45 -translate-y-[6.5px]' : ''
                      }`} />
                  </button>

                  {/* Brand wordmark */}
                  <div className="flex items-center gap-2">
                    <img src="/favicon.svg" alt="PromptVault Logo" width="20" height="20" className="w-5 h-5 rounded-md shrink-0 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]" />
                    <span className="text-sm font-bold tracking-tight">Prompt<span className="text-vault-accent">Vault</span></span>
                  </div>
                </div>

                {/* Right: vault status badge + new + lock */}
                <div className="flex items-center gap-2">
                  {/* Encrypted badge */}
                  <div className="hidden xs:flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/8">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Encrypted</span>
                  </div>

                  {supabaseConfigured && authReady ? (
                    session ? (
                      <button
                        onClick={handleSignOut}
                        aria-label="Sign out"
                        className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
                      >
                        <LogOut size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={handleSignIn}
                        aria-label="Sign in with Google"
                        className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)' }}
                        />
                      </button>
                    )
                  ) : null}

                  <button
                    id="mobile-new-prompt"
                    onClick={() => setIsNewModalOpen(true)}
                    aria-label="New Prompt"
                    className="btn-primary flex items-center gap-1.5 h-9 px-3 !py-0 !rounded-lg text-[11px]"
                  >
                    <Plus size={13} />
                    <span>New</span>
                  </button>

                  <button
                    id="mobile-lock-toggle"
                    onClick={handleLockButtonClick}
                    aria-label={data.settings.pinHash ? 'Remove Lock' : 'Create PIN'}
                    className="w-9 h-9 flex items-center justify-center border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent rounded-lg transition-colors"
                  >
                    {data.settings.pinHash ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </div>
              </div>

              {/* Row 2: Full-width search bar */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <input
                    id="main-search"
                    type="text"
                    placeholder="Search prompts..."
                    aria-label="Search prompts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-vault-bg/80 border border-vault-border rounded-xl pl-9 pr-4 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/60"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" size={14} />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-vault-border text-vault-text-muted hover:text-vault-text transition-colors text-[10px] font-bold"
                    >×</button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ─── Desktop Header ─── */
            <>
              <div className="w-[400px] relative group/search">
                <input
                  id="main-search-desktop"
                  type="text"
                  placeholder="Search prompts..."
                  aria-label="Search prompts"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-vault-bg/60 border border-vault-border rounded-xl pl-10 pr-12 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/60"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vault-text-muted group-focus-within/search:text-vault-accent transition-colors" size={14} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 border border-vault-border/60 rounded-md text-[10px] text-vault-text-muted font-mono">⌘K</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Security chip */}
                <div className="badge badge-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  <span>Secured</span>
                </div>

                {supabaseConfigured ? (
                  authReady ? (
                    session ? (
                      <div className="flex items-center gap-2">
                        <div className="badge badge-emerald">
                          <User size={12} />
                          <span>Signed in</span>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="px-3 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase"
                        >
                          Sign out
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSignIn}
                        className="px-3 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-xl transition-all text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-2"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)' }}
                        />
                        Sign in
                      </button>
                    )
                  ) : (
                    <div className="badge badge-amber">
                      <Cloud size={12} />
                      <span>Checking</span>
                    </div>
                  )
                ) : (
                  <div className="badge badge-amber">
                    <Cloud size={12} />
                    <span>Sync off</span>
                  </div>
                )}

                <button
                  onClick={() => setIsNewModalOpen(true)}
                  className="btn-primary flex items-center gap-2 !text-[11px]"
                >
                  <Plus size={14} />
                  New Prompt
                </button>

                <button
                  onClick={handleLockButtonClick}
                  className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30 rounded-xl transition-all"
                  title={data.settings.pinHash ? 'Remove Lock' : 'Create PIN'}
                >
                  {data.settings.pinHash ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent hover:border-vault-accent/30 rounded-xl transition-all"
                  title="Vault Protocol Settings"
                >
                  <Settings size={16} />
                </button>
              </div>
            </>
          )}
        </header>

        {/* Content Area */}
        <div className={contentAreaClassName}>
          {showStats ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tight">Vault <span className="text-gradient">Intelligence</span></h2>
                <button onClick={() => setShowStats(false)} className="text-[11px] font-mono text-vault-text-muted hover:text-vault-accent uppercase px-4 py-2 border border-vault-border hover:border-vault-accent/30 rounded-xl transition-all">Back to Prompts</button>
              </div>
              <Suspense fallback={<div className="flex items-center justify-center py-20 text-vault-text-muted text-sm font-mono">Loading analytics…</div>}>
                <StatsDashboard prompts={data.prompts} categories={data.categories} />
              </Suspense>
            </div>
          ) : (
            <div className={contentWrapperClassName}>
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight">{currentViewLabel}</h2>
                  <span className="badge badge-amber">{filteredPrompts.length} prompts</span>
                </div>
              </div>

              {/* Grid */}
              {filteredPrompts.length > 0 ? (
                <Suspense fallback={promptGridFallback}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredPrompts.map(prompt => (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                        onCopy={handleCopyPrompt}
                        onToggleFavorite={handleToggleFavorite}
                        onClick={setViewingPrompt}
                        onDuplicate={handleDuplicatePrompt}
                      />
                    ))}
                  </div>
                </Suspense>
              ) : (
                <MotionDiv
                  {...emptyStateMotionProps}
                  className="flex flex-1 flex-col items-center justify-center space-y-6 md:space-y-8"
                >
                  {/* Animated geometric illustration */}
                  <div className="relative w-24 h-24 md:w-32 md:h-32">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border border-vault-border bg-vault-panel/50 flex items-center justify-center geo-float">
                        {searchQuery ? <Search size={32} className="text-vault-text-muted/30" /> : <Briefcase size={32} className="text-vault-text-muted/30" />}
                      </div>
                    </div>
                    <div className="absolute top-0 right-2 w-5 h-5 md:w-6 md:h-6 rounded-lg border border-vault-accent/20 bg-vault-accent/5 geo-float-delay" />
                    <div className="absolute bottom-2 left-0 w-3 h-3 md:w-4 md:h-4 rounded-md border border-vault-accent-blue/20 bg-vault-accent-blue/5 geo-float-delay-2" />
                    <div className="absolute top-4 left-3 w-3 h-3 rounded-full border border-emerald-500/20 bg-emerald-500/5 geo-float-delay" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">{searchQuery ? 'No Results Found' : 'Start Your Collection'}</h3>
                    <p className="text-sm text-vault-text-muted max-w-sm leading-relaxed">{searchQuery ? `No prompts match "${searchQuery}". Try different terms or browse categories.` : 'Your prompt library is empty. Add your first prompt to begin building your vault.'}</p>
                  </div>
                  <button
                    onClick={() => searchQuery ? setSearchQuery('') : setIsNewModalOpen(true)}
                    className="btn-primary flex items-center gap-2 !rounded-full !px-8"
                  >
                    {searchQuery ? 'Clear Search' : <><Plus size={14} /> Add First Prompt</>}
                  </button>
                </MotionDiv>
              )}
            </div>
          )}
        </div>
        {isMobile ? (
          /* ─── Mobile Footer: compact bottom action bar ─── */
          <footer className="border-t border-vault-border bg-vault-panel/95 backdrop-blur-sm shrink-0 px-4 py-2 flex items-center justify-between">
            {/* Left: save indicator + schema */}
            <div className="flex items-center gap-2">
              {MotionSpan ? (
                <MotionSpan
                  key={isSaved ? 'saved' : 'idle'}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-[9px] font-mono uppercase tracking-widest ${isSaved ? 'text-emerald-400' : 'text-vault-text-muted'
                    }`}
                >
                  {isSaved ? '✓ Saved' : `v${SCHEMA_VERSION}`}
                </MotionSpan>
              ) : (
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest ${isSaved ? 'text-emerald-400' : 'text-vault-text-muted'
                    }`}
                >
                  {isSaved ? '✓ Saved' : `v${SCHEMA_VERSION}`}
                </span>
              )}
              <span className="text-vault-border">·</span>
              <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Offline</span>
            </div>

            {/* Center: prompt count pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-vault-panel-bright border border-vault-border">
              <span className="text-[10px] font-mono font-bold text-vault-accent">{filteredPrompts.length}</span>
              <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-wider">prompts</span>
            </div>

            {/* Right: settings shortcut */}
            <button
              id="mobile-settings-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="flex items-center gap-1.5 text-vault-text-muted hover:text-vault-accent transition-colors"
            >
              <Settings size={13} />
              <span className="text-[9px] font-mono uppercase tracking-widest">Settings</span>
            </button>
          </footer>
        ) : (
          /* ─── Desktop Footer ─── */
          <footer className="h-10 shrink-0 relative">
            <div className="divider-glow" />
            <div className="h-full px-8 flex items-center justify-between text-[10px] font-mono text-vault-text-muted uppercase tracking-widest bg-vault-panel/50">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-vault-text-muted">PromptVault</span>
                <span className="text-vault-border">·</span>
                <span>v{SCHEMA_VERSION}</span>
              </div>
              <div className="flex items-center gap-3">
                {MotionSpan ? (
                  <MotionSpan key={isSaved ? 'saved' : 'idle'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={isSaved ? 'text-emerald-400/80' : ''}>
                    {isSaved ? '✓ Saved' : 'Offline-First'}
                  </MotionSpan>
                ) : (
                  <span className={isSaved ? 'text-emerald-400/80' : ''}>
                    {isSaved ? '✓ Saved' : 'Offline-First'}
                  </span>
                )}
                <span className="text-vault-border">·</span>
                <span>Encrypted Storage</span>
              </div>
            </div>
          </footer>
        )}
      </main>

      <Suspense fallback={null}>
        <AiAssistantWidget
          categories={data.categories}
          onCreatePrompt={handleCreatePromptFromAi}
          onToggleFavorite={handleToggleFavorite}
        />
      </Suspense>

      {/* --- MODALS --- */}

      {/* Create Modal */}
      {isNewModalOpen && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={isNewModalOpen}
            onClose={() => setIsNewModalOpen(false)}
            title="New Librarian Entry"
          >
            <PromptForm
              categories={data.categories}
              onSubmit={handleAddPrompt}
              onCancel={() => setIsNewModalOpen(false)}
            />
          </Modal>
        </Suspense>
      )}

      {/* Edit Modal */}
      {editingPrompt && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={true}
            onClose={() => setEditingPrompt(null)}
            title="Modify Entry"
          >
            <PromptForm
              initialData={editingPrompt}
              categories={data.categories}
              onSubmit={handleUpdatePrompt}
              onCancel={() => setEditingPrompt(null)}
            />
          </Modal>
        </Suspense>
      )}

      {/* View Modal */}
      {viewingPrompt && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={true}
            onClose={() => setViewingPrompt(null)}
            title="Vault Record"
            footer={(
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingPrompt(viewingPrompt);
                      setViewingPrompt(null);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-vault-border text-vault-text hover:bg-vault-accent-blue hover:text-vault-bg rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => {
                      handleDuplicatePrompt(viewingPrompt);
                      setViewingPrompt(null);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 border border-vault-border text-vault-text-muted hover:text-vault-text rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  >
                    Clone
                  </button>
                </div>
                {confirmDeleteId === viewingPrompt.id ? (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-mono text-red-500 uppercase font-bold tracking-widest">Confirm?</span>
                    <button
                      onClick={() => handleDeletePrompt(viewingPrompt.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold transition-all hover:bg-red-600 uppercase tracking-widest"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1 text-vault-text-muted hover:text-vault-text text-xs font-bold transition-all uppercase tracking-widest"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(viewingPrompt.id)}
                    className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Delete Prompt"
                  >
                    <AlertCircle size={20} />
                  </button>
                )}
              </div>
            )}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-vault-border pb-4">
                <h3 className="text-2xl font-bold text-vault-accent">{viewingPrompt.title}</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-vault-accent/10 text-vault-accent rounded-full text-[10px] font-mono font-bold uppercase">
                  {data.categories.find(c => c.id === viewingPrompt.categoryId)?.name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.2em]">Prompt Body</label>
                <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-xl font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {viewingPrompt.body}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {viewingPrompt.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-vault-border/50 text-vault-text-muted rounded-full text-[10px] font-mono">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-vault-border h-24">
                <div className="flex flex-col items-center justify-center p-4 bg-vault-panel/50 rounded-xl border border-vault-border/50">
                  <span className="text-xl font-mono-tight font-bold">{viewingPrompt.usageCount}</span>
                  <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Extractions</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-vault-panel/50 rounded-xl border border-vault-border/50">
                  <span className="text-[11px] font-mono font-bold">{new Date(viewingPrompt.createdAt).toLocaleDateString()}</span>
                  <span className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Archived On</span>
                </div>
              </div>
            </div>
          </Modal>
        </Suspense>
      )}

      {/* Variables Modal */}
      {variablePrompt && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={true}
            onClose={() => setVariablePrompt(null)}
            title="Dynamic Injection"
          >
            <VariableForm
              prompt={variablePrompt.prompt}
              variables={variablePrompt.vars}
              onCopy={(body) => handleCopyPrompt(variablePrompt.prompt, body)}
              onCancel={() => {
                // If skipped, use default body but still record usage
                handleCopyPrompt(variablePrompt.prompt, variablePrompt.prompt.body);
              }}
            />
          </Modal>
        </Suspense>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={true}
            onClose={() => setShowSettings(false)}
            title="Vault Protocol Settings"
          >
            <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
              <ShieldCheck size={14} />
              <span>PIN Lock</span>
            </div>
            <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{data.settings.pinHash ? 'Remove Lock' : 'Create PIN'}</p>
                <p className="text-xs text-vault-text-muted font-mono">
                  {data.settings.pinHash ? 'Require your PIN to confirm removal.' : 'Set a PIN to protect the vault.'}
                </p>
              </div>
              {data.settings.pinHash ? (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setIsRemovingLock(true);
                  }}
                  className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all"
                >
                  Remove Lock
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setIsLocked(true);
                  }}
                  className="px-4 py-2 bg-vault-accent text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
                >
                  Create PIN
                </button>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-vault-accent-blue font-mono uppercase tracking-widest text-[10px] font-bold">
              <Cloud size={14} />
              <span>Cloud Sync</span>
            </div>
            <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-4">
              {!supabaseConfigured ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Supabase not configured</p>
                  <p className="text-xs text-vault-text-muted font-mono">
                    Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cross-device sync.
                  </p>
                </div>
              ) : !authReady ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Checking sign-in status</p>
                  <p className="text-xs text-vault-text-muted font-mono">Please wait while we load your session.</p>
                </div>
              ) : session ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vault-panel-bright border border-vault-border flex items-center justify-center">
                        <User size={16} className="text-vault-text-muted" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Signed in</p>
                        <p className="text-xs text-vault-text-muted font-mono">{session.user.email || 'Unknown user'}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                    >
                      <LogOut size={12} />
                      Sign out
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-vault-border bg-vault-panel-bright/40">
                      <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Sync status</p>
                      <p className={`text-sm font-semibold ${syncStatus === 'error' ? 'text-red-400' : syncStatus === 'syncing' ? 'text-vault-accent-blue' : 'text-vault-text'}`}>
                        {syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'error' ? 'Error' : 'Idle'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-vault-border bg-vault-panel-bright/40">
                      <p className="text-[9px] font-mono text-vault-text-muted uppercase tracking-widest">Last synced</p>
                      <p className="text-sm font-semibold text-vault-text">{formatTimestamp(lastSyncedAt)}</p>
                    </div>
                  </div>

                  {syncError && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
                      {syncError}
                    </div>
                  )}

                  <div className="flex items-center justify-center">
                    <button
                      onClick={handleManualSync}
                      className="px-4 py-2 bg-vault-accent-blue text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                    >
                      <RefreshCcw size={12} />
                      Sync now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Sign in to sync your vault</p>
                    <p className="text-xs text-vault-text-muted font-mono">Continue with Google to keep prompts in sync.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleSignIn}
                      className="px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg 360deg)' }}
                      />
                      Continue with Google
                    </button>
                  </div>

                  {syncError && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono">
                      {syncError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
              <Download size={14} />
              <span>Data Management</span>
            </div>
            <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Backup & Restore</p>
                <p className="text-xs text-vault-text-muted font-mono">Export your vault to a JSON file or import an existing backup.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 border border-vault-border text-vault-text-muted hover:text-vault-text hover:border-vault-text-muted rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2">
                  <Upload size={14} /> Import
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-vault-border text-vault-text hover:bg-vault-accent hover:text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-vault-accent-blue font-mono uppercase tracking-widest text-[10px] font-bold">
              <Command size={14} />
              <span>Architecture Details</span>
            </div>
            <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-vault-text-muted font-mono">Schema Version</span>
                <span className="font-mono text-vault-accent-blue">{SCHEMA_VERSION}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-vault-text-muted font-mono">Storage Engine</span>
                <span className="font-mono">LocalStorage + Supabase (optional)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-vault-text-muted font-mono">Encryption</span>
                <span className="font-mono opacity-50 italic">SHA-256 Hashed PIN</span>
              </div>
            </div>
          </section>
            </div>
          </Modal>
        </Suspense>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <Suspense fallback={modalFallback}>
          <Modal
            isOpen={true}
            onClose={() => setShowShortcuts(false)}
            title="Protocol Shortcuts"
          >
            <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-vault-bg border border-vault-border rounded-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">Spotlight Search</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm">⌘</kbd>
                <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm">K</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-vault-bg border border-vault-border rounded-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">New Entry</span>
              <div className="flex gap-1">
                <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm">⌘</kbd>
                <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm">N</kbd>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-vault-bg border border-vault-border rounded-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">Close Interface</span>
              <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm uppercase">Esc</kbd>
            </div>
            <div className="flex items-center justify-between p-4 bg-vault-bg border border-vault-border rounded-xl">
              <span className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">Toggle Manual</span>
              <kbd className="px-2 py-1 bg-vault-panel border border-vault-border rounded-md text-[10px] font-mono shadow-sm">?</kbd>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-vault-accent/10 border border-vault-accent/20 rounded-xl">
            <Command size={18} className="text-vault-accent" />
            <p className="text-[10px] font-mono text-vault-text-muted uppercase leading-relaxed">System-wide hotkeys active while vault is decrypted.</p>
          </div>
            </div>
          </Modal>
        </Suspense>
      )}

      <div className="fixed bottom-19.5 right-30 pointer-events-none group">
        <button
          onClick={() => setShowShortcuts(true)}
          aria-label="Keyboard shortcuts help"
          className="pointer-events-auto w-9 h-9 bg-vault-panel/80 border border-vault-border rounded-full flex items-center justify-center text-vault-text-muted/50 hover:text-vault-accent hover:border-vault-accent/30 transition-all shadow-lg backdrop-blur-sm"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </div>
  );
}

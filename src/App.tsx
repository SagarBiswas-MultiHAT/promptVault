/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Sub-components
import { Sidebar } from './components/Sidebar.tsx';
import { PromptCard } from './components/PromptCard.tsx';
import { Modal } from './components/Modal.tsx';
import { PromptForm } from './components/PromptForm.tsx';
import { PinLock } from './components/PinLock.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';
import { VariableForm } from './components/VariableForm.tsx';
import { AiAssistantWidget } from './components/AiAssistantWidget.tsx';

// Types and Constants
import { Prompt, Category, VaultData, SortOption } from './types.ts';
import { INITIAL_DATA, LOCAL_STORAGE_KEY, SCHEMA_VERSION } from './constants.ts';

export default function App() {
  // --- STATE ---
  const [data, setData] = useState<VaultData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as VaultData;
        // Basic schema guard: ensure required fields exist
        if (parsed && parsed.schemaVersion && Array.isArray(parsed.prompts) && Array.isArray(parsed.categories)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('[PromptVault] Failed to parse saved data, resetting to defaults:', err);
    }
    return INITIAL_DATA;
  });

  const [isLocked, setIsLocked] = useState(data.settings.pinHash !== null);
  const [isRemovingLock, setIsRemovingLock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('RECENTLY_ADDED');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth <= 768);
  const [isMobile, setIsMobile] = useState(false);

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
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
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

  const [showSettings, setShowSettings] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  // --- ACTIONS ---
  const handleSetPin = async (hash: string) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, pinHash: hash } }));
  };

  const handleClearPin = () => {
    if (confirm('Disable PIN lock? This will remove the privacy screen.')) {
      setData(prev => ({ ...prev, settings: { ...prev.settings, pinHash: null } }));
    }
  };

  // Update logic for the lock button in header
  const handleLockButtonClick = () => {
    if (data.settings.pinHash && !isRemovingLock) {
      // If there's a PIN set and we're not already removing, start the removal process
      setIsRemovingLock(true);
    } else if (!data.settings.pinHash) {
      // If no PIN is set, show settings to create one
      setShowLockModal(true);
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
        document.getElementById('main-search')?.focus();
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

  // --- RENDER ---
  if (isLocked || isRemovingLock) {
    return (
      <PinLock
        storedHash={data.settings.pinHash}
        onUnlocked={() => setIsLocked(false)}
        onSetPin={handleSetPin}
        isRemovingLock={isRemovingLock}
        onRemoveLock={handleRemoveLock}
        onCancelRemove={handleCancelRemoveLock}
      />
    );
  }

  // Compute the current view label for the section header
  const currentViewLabel = showFavorites ? '⭐ Favorites' : selectedCategoryId ? `# ${data.categories.find(c => c.id === selectedCategoryId)?.name || 'Unknown'}` : 'All Prompts';

  return (
    <div className="flex h-screen w-full bg-vault-bg text-vault-text overflow-hidden transition-colors duration-300 relative z-[1]">
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

      <main className="flex-1 flex flex-col min-w-0 h-full">
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
                    <div className="w-5 h-5 rounded-md shrink-0 accent-glow" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }} />
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
                    aria-label={data.settings.pinHash ? 'Vault locked' : 'Vault unlocked'}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-vault-bg/80 border border-vault-border rounded-xl pl-9 pr-4 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/40"
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
                  id="main-search"
                  type="text"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-vault-bg/60 border border-vault-border rounded-xl pl-10 pr-12 py-2.5 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm placeholder:text-vault-text-muted/40"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-vault-text-muted group-focus-within/search:text-vault-accent transition-colors" size={14} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 border border-vault-border/60 rounded-md text-[10px] text-vault-text-muted/60 font-mono">⌘K</div>
              </div>

              <div className="flex items-center gap-3">
                {/* Security chip */}
                <div className="badge badge-emerald">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  <span>Secured</span>
                </div>

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
                  title="Vault Lock Settings"
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
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'px-10 py-8'}`}>
          {showStats ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tight">Vault <span className="text-gradient">Intelligence</span></h2>
                <button onClick={() => setShowStats(false)} className="text-[11px] font-mono text-vault-text-muted hover:text-vault-accent uppercase px-4 py-2 border border-vault-border hover:border-vault-accent/30 rounded-xl transition-all">Back to Prompts</button>
              </div>
              <StatsDashboard prompts={data.prompts} categories={data.categories} />
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-tight">{currentViewLabel}</h2>
                  <span className="badge badge-amber">{filteredPrompts.length} prompts</span>
                </div>
              </div>

              {/* Grid */}
              {filteredPrompts.length > 0 ? (
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
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center justify-center py-28 space-y-8"
                >
                  {/* Animated geometric illustration */}
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl border border-vault-border bg-vault-panel/50 flex items-center justify-center geo-float">
                        {searchQuery ? <Search size={32} className="text-vault-text-muted/30" /> : <Briefcase size={32} className="text-vault-text-muted/30" />}
                      </div>
                    </div>
                    <div className="absolute top-0 right-2 w-6 h-6 rounded-lg border border-vault-accent/20 bg-vault-accent/5 geo-float-delay" />
                    <div className="absolute bottom-2 left-0 w-4 h-4 rounded-md border border-vault-accent-blue/20 bg-vault-accent-blue/5 geo-float-delay-2" />
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
                </motion.div>
              )}
            </div>
          )}
        </div>
        {isMobile ? (
          /* ─── Mobile Footer: compact bottom action bar ─── */
          <footer className="border-t border-vault-border bg-vault-panel/95 backdrop-blur-sm shrink-0 px-4 py-2 flex items-center justify-between">
            {/* Left: save indicator + schema */}
            <div className="flex items-center gap-2">
              <motion.span
                key={isSaved ? 'saved' : 'idle'}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-[9px] font-mono uppercase tracking-widest ${isSaved ? 'text-emerald-400' : 'text-vault-text-muted/50'
                  }`}
              >
                {isSaved ? '✓ Saved' : `v${SCHEMA_VERSION}`}
              </motion.span>
              <span className="text-vault-border">·</span>
              <span className="text-[9px] font-mono text-vault-text-muted/40 uppercase tracking-widest">Offline</span>
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
            <div className="h-full px-8 flex items-center justify-between text-[10px] font-mono text-vault-text-muted/60 uppercase tracking-widest bg-vault-panel/50">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-vault-text-muted">PromptVault</span>
                <span className="text-vault-border">·</span>
                <span>v{SCHEMA_VERSION}</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.span key={isSaved ? 'saved' : 'idle'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={isSaved ? 'text-emerald-400/80' : ''}>
                  {isSaved ? '✓ Saved' : 'Offline-First'}
                </motion.span>
                <span className="text-vault-border">·</span>
                <span>Encrypted Storage</span>
              </div>
            </div>
          </footer>
        )}
      </main>

      <AiAssistantWidget
        categories={data.categories}
        onCreatePrompt={handleCreatePromptFromAi}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* --- MODALS --- */}

      {/* Create Modal */}
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

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingPrompt}
        onClose={() => setEditingPrompt(null)}
        title="Modify Entry"
      >
        {editingPrompt && (
          <PromptForm
            initialData={editingPrompt}
            categories={data.categories}
            onSubmit={handleUpdatePrompt}
            onCancel={() => setEditingPrompt(null)}
          />
        )}
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={!!viewingPrompt}
        onClose={() => setViewingPrompt(null)}
        title="Vault Record"
        footer={viewingPrompt && (
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
        {viewingPrompt && (
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
        )}
      </Modal>

      {/* Variables Modal */}
      <Modal
        isOpen={!!variablePrompt}
        onClose={() => setVariablePrompt(null)}
        title="Dynamic Injection"
      >
        {variablePrompt && (
          <VariableForm
            prompt={variablePrompt.prompt}
            variables={variablePrompt.vars}
            onCopy={(body) => handleCopyPrompt(variablePrompt.prompt, body)}
            onCancel={() => {
              // If skipped, use default body but still record usage
              handleCopyPrompt(variablePrompt.prompt, variablePrompt.prompt.body);
            }}
          />
        )}
      </Modal>

      {/* Lock Modal */}
      <Modal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        title="Privacy Layer"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
            <ShieldCheck size={14} />
            <span>Access PIN Lock</span>
          </div>
          <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Security Status</p>
              <p className="text-xs text-vault-text-muted font-mono">{data.settings.pinHash ? 'Vault is currently protected by hash logic.' : 'Security is currently disabled.'}</p>
            </div>
            {data.settings.pinHash ? (
              <button
                onClick={handleClearPin}
                className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setIsLocked(true);
                }}
                className="px-4 py-2 bg-vault-accent text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
              >
                Enable PIN
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Vault Protocol Settings"
      >
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-[10px] font-bold">
              <ShieldCheck size={14} />
              <span>Privacy Layer</span>
            </div>
            <div className="p-6 bg-vault-bg/50 border border-vault-border rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Access PIN Lock</p>
                <p className="text-xs text-vault-text-muted font-mono">{data.settings.pinHash ? 'Vault is currently protected by hash logic.' : 'Security is currently disabled.'}</p>
              </div>
              {data.settings.pinHash ? (
                <button
                  onClick={handleClearPin}
                  className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setIsLocked(true);
                  }}
                  className="px-4 py-2 bg-vault-accent text-vault-bg rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
                >
                  Enable PIN
                </button>
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
                <span className="font-mono">Web LocalStorage</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-vault-text-muted font-mono">Encryption</span>
                <span className="font-mono opacity-50 italic">SHA-256 Hashed PIN</span>
              </div>
            </div>
          </section>
        </div>
      </Modal>

      {/* Shortcuts Modal */}
      <Modal
        isOpen={showShortcuts}
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

      <div className="fixed bottom-19.5 right-30 pointer-events-none group">
        <button
          onClick={() => setShowShortcuts(true)}
          className="pointer-events-auto w-9 h-9 bg-vault-panel/80 border border-vault-border rounded-full flex items-center justify-center text-vault-text-muted/50 hover:text-vault-accent hover:border-vault-accent/30 transition-all shadow-lg backdrop-blur-sm"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </div>
  );
}

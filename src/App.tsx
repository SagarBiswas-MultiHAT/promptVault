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

// Types and Constants
import { Prompt, Category, VaultData, SortOption } from './types.ts';
import { INITIAL_DATA, LOCAL_STORAGE_KEY, SCHEMA_VERSION } from './constants.ts';

export default function App() {
  // --- STATE ---
  const [data, setData] = useState<VaultData>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  const [isLocked, setIsLocked] = useState(data.settings.pinHash !== null);
  const [isRemovingLock, setIsRemovingLock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('RECENTLY_ADDED');
  
  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<Prompt | null>(null);
  const [variablePrompt, setVariablePrompt] = useState<{prompt: Prompt, vars: string[]} | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // --- PERSISTENCE ---
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (data.settings.isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [data.settings.isDarkMode]);

  const [showSettings, setShowSettings] = useState(false);

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
      setShowSettings(true);
    }
  };

  const handleRemoveLock = () => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, pinHash: null } }));
    setIsRemovingLock(false);
  };

  const handleCancelRemoveLock = () => {
    setIsRemovingLock(false);
  };

  const handleAddPrompt = (promptData: Partial<Prompt>) => {
    const newPrompt: Prompt = {
      id: crypto.randomUUID(),
      title: promptData.title!,
      body: promptData.body!,
      categoryId: promptData.categoryId!,
      tags: promptData.tags || [],
      isFavorite: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setData(prev => ({ ...prev, prompts: [newPrompt, ...prev.prompts] }));
    setIsNewModalOpen(false);
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
    if (confirm('Permanently delete this prompt?')) {
      setData(prev => ({ ...prev, prompts: prev.prompts.filter(p => p.id !== id) }));
      setViewingPrompt(null);
      setEditingPrompt(null);
    }
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
      
      if (isCmdOrCtrl && e.key === 'k') {
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

  return (
    <div className="flex h-screen w-full bg-vault-bg text-vault-text overflow-hidden transition-colors duration-300">
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
      />

      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-[72px] border-b border-vault-border flex items-center justify-between px-8 bg-[#0D0D0D]/80 backdrop-blur-[10px] z-10 shrink-0">
          <div className="w-[400px] relative">
            <input
              id="main-search"
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-vault-panel border border-vault-border rounded-lg pl-10 pr-12 py-2 focus:border-vault-accent outline-none transition-all font-mono text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-text-muted" size={14} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 border border-vault-border rounded text-[10px] text-vault-text-muted font-mono">⌘ K</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-vault-text-muted font-mono uppercase tracking-widest leading-none">Vault Status</span>
              <span className="text-[11px] text-[#10B981] font-bold uppercase tracking-tight">● Encrypted</span>
            </div>
            
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="bg-vault-accent text-vault-bg px-5 py-2.5 rounded-lg font-mono font-bold text-xs uppercase tracking-tight hover:opacity-90 active:scale-95 transition-all"
            >
              + New Prompt
            </button>

            <button
              onClick={handleLockButtonClick}
              className="p-2.5 border border-vault-border text-vault-text-muted hover:text-vault-accent rounded-lg transition-colors"
            >
              {data.settings.pinHash ? <Lock size={18} /> : <Unlock size={18} />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          {showStats ? (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                 <h2 className="text-3xl font-mono font-bold uppercase tracking-tighter">Vault <span className="text-vault-accent">Intelligence</span></h2>
                 <button onClick={() => setShowStats(false)} className="text-xs font-mono text-vault-text-muted hover:text-vault-accent uppercase px-4 py-2 border border-vault-border rounded-lg">Back to Prompts</button>
              </div>
              <StatsDashboard prompts={data.prompts} categories={data.categories} />
            </div>
          ) : (
            <div className="space-y-12 max-w-7xl mx-auto">
              {/* Grid */}
              {filteredPrompts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 space-y-6"
                >
                  <div className="w-24 h-24 bg-vault-panel border border-vault-border rounded-3xl flex items-center justify-center text-vault-text-muted/30">
                    {searchQuery ? <Search size={48} /> : <Briefcase size={48} />}
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-mono-tight font-bold uppercase">Empty Sector</h3>
                    <p className="text-sm text-vault-text-muted max-w-xs">{searchQuery ? `No results for "${searchQuery}". Try broad terms.` : 'You haven’t archived any prompts in this category yet.'}</p>
                  </div>
                  <button 
                    onClick={() => searchQuery ? setSearchQuery('') : setIsNewModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 border border-vault-accent text-vault-accent hover:bg-vault-accent hover:text-vault-bg rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    {searchQuery ? 'Reset Archive' : 'Add First Prompt'}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
        <footer className="h-10 border-t border-vault-border px-8 flex items-center justify-between text-[10px] font-mono text-vault-text-muted uppercase tracking-widest bg-vault-panel shrink-0">
          <div className="flex gap-4">
            <span>Schema: {SCHEMA_VERSION}</span>
            <span>Last Saved: {new Date().toLocaleTimeString()}</span>
          </div>
          <div>PromptVault — Offline First Encrypted Storage</div>
        </footer>
      </main>

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
            <button
               onClick={() => handleDeletePrompt(viewingPrompt.id)}
               className="p-2.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <AlertCircle size={20} />
            </button>
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

      <div className="fixed bottom-6 right-8 pointer-events-none group">
        <button 
          onClick={() => setShowShortcuts(true)}
          className="pointer-events-auto w-10 h-10 bg-vault-panel border border-vault-border rounded-full flex items-center justify-center text-vault-text-muted hover:text-vault-accent hover:border-vault-accent transition-all shadow-lg"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
}

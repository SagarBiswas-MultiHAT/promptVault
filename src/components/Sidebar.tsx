/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, ChevronLeft, ChevronRight, Star, Trash2, Edit2, BarChart3, Hash, FolderOpen, GripVertical } from 'lucide-react';
import { Category, Prompt } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';

interface SidebarProps {
  categories: Category[];
  prompts: Prompt[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onToggleCollapse: (id: string) => void;
  showFavorites: boolean;
  onToggleFavorites: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  isCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Sidebar({
  categories,
  prompts,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  onRenameCategory,
  onToggleCollapse,
  showFavorites,
  onToggleFavorites,
  showStats,
  onToggleStats,
  isCollapsed,
  onToggleSidebar,
}: SidebarProps) {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close sidebar on mobile after selecting a nav item
  const handleMobileAutoClose = useCallback(() => {
    if (isMobile && !isCollapsed) {
      onToggleSidebar();
    }
  }, [isMobile, isCollapsed, onToggleSidebar]);
  
  const getPromptCount = (categoryId: string) => {
    return prompts.filter(p => p.categoryId === categoryId).length;
  };

  const favoritesCount = prompts.filter(p => p.isFavorite).length;

  const handleRenameClick = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
  };

  const handleSaveRename = (categoryId: string) => {
    if (editingName.trim()) {
      onRenameCategory(categoryId, editingName.trim());
    }
    setEditingCategoryId(null);
    setEditingName('');
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Delete this category and all its prompts? This cannot be undone.')) {
      onDeleteCategory(id);
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <AnimatePresence>
        {isMobile && !isCollapsed && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0, pointerEvents: 'none' }}
            animate={{ opacity: 1, pointerEvents: 'auto' }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.2 }}
            className="sidebar-backdrop"
            onClick={onToggleSidebar}
          />
        )}
      </AnimatePresence>

    {/* On mobile: fixed position removes it from flow, so no width override is needed */}
    <div className={`relative flex h-full shrink-0 group/sidebar ${isMobile ? 'sidebar-mobile-overlay' : ''} ${isMobile && isCollapsed ? 'pointer-events-none' : ''}`}
    >
      {/* Main Sidebar Panel */}
      <motion.div
        animate={{ width: isMobile ? (isCollapsed ? 0 : 280) : (isCollapsed ? 64 : 280) }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="h-full flex flex-col bg-vault-panel border-r border-vault-border overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {isCollapsed && !isMobile ? (
            /* ==================== COLLAPSED STATE (Desktop Only) ==================== */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col items-center"
            >
              {/* Brand Icon */}
              <div className="pt-6 pb-4 flex justify-center">
                <div className="w-6 h-6 bg-vault-accent rounded-[4px] shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.15)]" />
              </div>

              {/* Nav Icons */}
              <div className="flex-1 flex flex-col items-center py-3 space-y-1 w-full px-2">
                {/* Favorites */}
                <button
                  onClick={() => { onToggleFavorites(); handleMobileAutoClose(); }}
                  data-tooltip="Favorites"
                  className={`sidebar-tooltip w-10 h-10 flex items-center justify-center rounded-lg transition-all relative ${
                    showFavorites 
                      ? 'bg-vault-accent/10 text-vault-accent shadow-[inset_0_0_12px_rgba(245,158,11,0.08)]' 
                      : 'text-vault-text-muted hover:text-vault-accent hover:bg-vault-border/50'
                  }`}
                >
                  <Star size={17} />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-vault-accent text-vault-bg text-[8px] font-bold rounded-full flex items-center justify-center">
                      {favoritesCount}
                    </span>
                  )}
                </button>

                {/* All Prompts */}
                <button
                  onClick={() => { handleMobileAutoClose();
                    onSelectCategory(null);
                    if (showFavorites) onToggleFavorites();
                  }}
                  data-tooltip="All Prompts"
                  className={`sidebar-tooltip w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                    selectedCategoryId === null && !showFavorites 
                      ? 'bg-vault-accent/10 text-vault-accent shadow-[inset_0_0_12px_rgba(245,158,11,0.08)]' 
                      : 'text-vault-text-muted hover:text-vault-accent hover:bg-vault-border/50'
                  }`}
                >
                  <FolderOpen size={17} />
                </button>

                {/* Divider */}
                <div className="w-6 h-px bg-vault-border my-2!" />

                {/* Category Icons */}
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { onSelectCategory(cat.id); handleMobileAutoClose(); }}
                    data-tooltip={cat.name}
                    className={`sidebar-tooltip w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                      selectedCategoryId === cat.id 
                        ? 'bg-vault-accent/10 text-vault-accent' 
                        : 'text-vault-text-muted hover:text-vault-accent hover:bg-vault-border/50'
                    }`}
                  >
                    <Hash size={15} />
                  </button>
                ))}

                {/* Add Category */}
                <button
                  onClick={onAddCategory}
                  data-tooltip="Add Category"
                  className="sidebar-tooltip w-10 h-10 flex items-center justify-center rounded-lg text-vault-accent/60 hover:text-vault-accent hover:bg-vault-border/50 transition-all"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Footer */}
              <div className="pb-4 pt-3 border-t border-vault-border w-full flex justify-center">
                <button
                  onClick={onToggleStats}
                  data-tooltip="Analytics"
                  className="sidebar-tooltip w-10 h-10 flex items-center justify-center rounded-lg text-vault-text-muted hover:text-vault-accent hover:bg-vault-border/50 transition-all"
                >
                  <BarChart3 size={17} />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ==================== EXPANDED STATE ==================== */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full flex flex-col"
            >
              {/* Brand */}
              <div className="p-6 pb-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-vault-accent rounded-[3px] shrink-0" />
                  <h1 className="text-lg font-mono font-bold tracking-tighter">PromptVault</h1>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Main Filters */}
                <div className="space-y-4">
                  <span className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest block mb-3 px-2">Library</span>
                  <div className="space-y-1">
                    <button
                      onClick={onToggleFavorites}
                      className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
                        showFavorites ? 'text-vault-accent font-bold' : 'hover:text-vault-accent text-vault-text-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">⭐ Favorites</span>
                      </div>
                      <span className="text-[10px] bg-vault-panel-bright px-1.5 py-0.5 rounded text-vault-text-muted">{favoritesCount}</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectCategory(null);
                        if (showFavorites) onToggleFavorites();
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
                        selectedCategoryId === null && !showFavorites ? 'text-vault-accent font-bold' : 'hover:text-vault-accent text-vault-text-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">📁 All Prompts</span>
                      </div>
                      <span className="text-[10px] bg-vault-panel-bright px-1.5 py-0.5 rounded text-vault-text-muted">{prompts.length}</span>
                    </button>
                  </div>
                </div>

                {/* Categories Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest">Categories</h3>
                    <button 
                      onClick={onAddCategory}
                      className="p-1 hover:bg-vault-border text-vault-accent rounded transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {categories.map((category) => (
                      <div key={category.id} className="group flex flex-col">
                        <div className="flex items-center gap-1">
                          {editingCategoryId === category.id ? (
                            <div className="flex-1 flex items-center gap-2 px-2 py-1">
                              <input
                                autoFocus
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => handleSaveRename(category.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(category.id);
                                  if (e.key === 'Escape') {
                                    setEditingCategoryId(null);
                                    setEditingName('');
                                  }
                                }}
                                className="flex-1 bg-vault-border rounded px-2 py-1 text-sm text-vault-text font-mono focus:outline-none focus:border-vault-accent"
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => onSelectCategory(category.id)}
                                className={`flex-1 flex items-center justify-between p-2 rounded-md text-left transition-all ${
                                  selectedCategoryId === category.id ? 'text-vault-accent font-bold' : 'text-vault-text-muted hover:text-vault-accent'
                                }`}
                              >
                                <span className="text-sm"># {category.name}</span>
                                <span className="text-[10px] bg-vault-panel-bright px-1.5 py-0.5 rounded opacity-60">{getPromptCount(category.id)}</span>
                              </button>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleRenameClick(category)}
                                  className="p-1.5 hover:bg-vault-border text-vault-text-muted hover:text-vault-accent rounded transition-colors"
                                  title="Rename category"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-1.5 hover:bg-vault-border text-vault-text-muted hover:text-red-500 rounded transition-colors"
                                  title="Delete category"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-vault-border flex flex-col gap-4 mt-auto">
                <span className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest">Vault Health</span>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-vault-text-muted">Total Uses</span>
                    <span className="text-vault-accent font-bold">{prompts.reduce((acc, p) => acc + p.usageCount, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                     <button onClick={onToggleStats} className="text-[11px] font-mono hover:text-vault-accent transition-colors opacity-60">Press ? for analytics</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ==================== SLIDE HANDLE BAR (desktop only) ==================== */}
      {!isMobile && (
      <div
        onClick={onToggleSidebar}
        className="slide-handle w-[6px] h-full cursor-pointer flex items-center justify-center shrink-0 relative z-20"
      >
        {/* Background glow on hover */}
        <div className="absolute inset-0 bg-vault-border/40 opacity-0 hover-trigger-bg transition-all duration-300" />
        
        {/* Grip dots indicator */}
        <div className="grip-indicator absolute flex flex-col gap-[3px] transition-all duration-300 z-10">
          <div className="w-[3px] h-[3px] bg-vault-text-muted rounded-full" />
          <div className="w-[3px] h-[3px] bg-vault-text-muted rounded-full" />
          <div className="w-[3px] h-[3px] bg-vault-text-muted rounded-full" />
          <div className="w-[3px] h-[3px] bg-vault-text-muted rounded-full" />
          <div className="w-[3px] h-[3px] bg-vault-text-muted rounded-full" />
        </div>

        {/* Chevron indicator knob */}
        <div className="slide-knob absolute z-20 transition-all duration-300">
          <div className="w-6 h-10 bg-vault-panel border border-vault-border rounded-full flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:border-vault-accent hover:shadow-[0_0_16px_rgba(245,158,11,0.2)] transition-all duration-200">
            {isCollapsed ? (
              <ChevronRight size={12} className="text-vault-accent" />
            ) : (
              <ChevronLeft size={12} className="text-vault-accent" />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
    </>
  );
}

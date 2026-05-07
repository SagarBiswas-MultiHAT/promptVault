/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus, ChevronDown, ChevronRight, LayoutGrid, Star, Trash2, Edit2, BarChart3 } from 'lucide-react';
import { Category, Prompt } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';

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
}: SidebarProps) {
  
  const getPromptCount = (categoryId: string) => {
    return prompts.filter(p => p.categoryId === categoryId).length;
  };

  const favoritesCount = prompts.filter(p => p.isFavorite).length;

  return (
    <div className="w-[280px] h-full flex flex-col bg-vault-panel border-r border-vault-border overflow-hidden">
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
                <div className="flex items-center">
                  <button
                    onClick={() => onSelectCategory(category.id)}
                    className={`flex-1 flex items-center justify-between p-2 rounded-md text-left transition-all ${
                      selectedCategoryId === category.id ? 'text-vault-accent font-bold' : 'text-vault-text-muted hover:text-vault-accent'
                    }`}
                  >
                    <span className="text-sm"># {category.name}</span>
                    <span className="text-[10px] bg-vault-panel-bright px-1.5 py-0.5 rounded opacity-60">{getPromptCount(category.id)}</span>
                  </button>
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
    </div>
  );
}

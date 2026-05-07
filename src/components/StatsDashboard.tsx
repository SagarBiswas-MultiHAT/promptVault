/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prompt, Category } from '../types.ts';
import { BarChart3, TrendingUp, Hash, Star, Layout, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';

interface StatsDashboardProps {
  prompts: Prompt[];
  categories: Category[];
}

export function StatsDashboard({ prompts, categories }: StatsDashboardProps) {
  const totalPrompts = prompts.length;
  const totalCategories = categories.length;
  const totalFavorites = prompts.filter(p => p.isFavorite).length;
  const totalUsage = prompts.reduce((acc, p) => acc + p.usageCount, 0);

  const topPrompts = [...prompts]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)
    .filter(p => p.usageCount > 0);

  const addedThisWeek = prompts.filter(p => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return p.createdAt > oneWeekAgo;
  }).length;

  const stats = [
    { label: 'Total Prompts', value: totalPrompts, icon: Bookmark, color: 'text-vault-accent' },
    { label: 'Categories', value: totalCategories, icon: Layout, color: 'text-vault-accent-blue' },
    { label: 'Favorites', value: totalFavorites, icon: Star, color: 'text-amber-400' },
    { label: 'Recent (Week)', value: addedThisWeek, icon: TrendingUp, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 glass-panel rounded-xl flex flex-col items-center justify-center text-center space-y-3"
          >
            <div className={`p-3 rounded-lg bg-vault-bg/50 ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-mono font-bold tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Prompts */}
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-widest text-xs font-bold">
            <TrendingUp size={14} />
            <span>Most Active Prompts</span>
          </div>
          <div className="space-y-3">
            {topPrompts.length > 0 ? (
              topPrompts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-vault-bg/50 rounded-lg border border-vault-border/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-vault-text-muted">0{i + 1}</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-vault-text-muted">Copies:</span>
                    <span className="text-xs font-bold text-vault-accent font-mono">{p.usageCount}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-vault-text-muted italic p-4 text-center">No usage data logged yet.</p>
            )}
          </div>
        </div>

        {/* Efficiency */}
        <div className="glass-panel rounded-xl p-6 flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full border-2 border-vault-accent-blue/30 border-t-vault-accent-blue flex items-center justify-center">
             <Hash size={32} className="text-vault-accent-blue" />
          </div>
          <div className="space-y-1">
            <h4 className="text-3xl font-mono font-bold tracking-tight">{totalUsage}</h4>
            <p className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest leading-loose">
              Total Clipboard Injectors <br/> Across Workflow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

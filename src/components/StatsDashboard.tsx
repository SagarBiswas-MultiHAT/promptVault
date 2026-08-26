/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Prompt, Category } from '../types.ts';
import { BarChart3, TrendingUp, Hash, Star, Layout, Bookmark, Trophy, Award, Medal } from 'lucide-react';
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
    { label: 'Total Prompts', value: totalPrompts, icon: Bookmark, color: 'text-vault-accent', bg: 'bg-vault-accent/10', border: 'border-vault-accent/20' },
    { label: 'Categories', value: totalCategories, icon: Layout, color: 'text-vault-accent-blue', bg: 'bg-vault-accent-blue/10', border: 'border-vault-accent-blue/20' },
    { label: 'Favorites', value: totalFavorites, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'This Week', value: addedThisWeek, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ];

  const rankIcons = [Trophy, Award, Medal];
  const rankColors = ['text-amber-400', 'text-gray-400', 'text-amber-600'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`p-5 rounded-2xl glass-panel-subtle flex flex-col items-center justify-center text-center space-y-3 border ${stat.border}`}
          >
            <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight font-mono tabular-nums">{stat.value}</p>
              <p className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] mt-0.5">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Prompts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel-subtle rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-vault-accent font-mono uppercase tracking-[0.1em] text-xs font-bold">
            <TrendingUp size={14} />
            <span>Most Active Prompts</span>
          </div>
          <div className="space-y-2">
            {topPrompts.length > 0 ? (
              topPrompts.map((p, i) => {
                const RankIcon = i < 3 ? rankIcons[i] : null;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-vault-bg/40 rounded-xl border border-vault-border/30 group hover:border-vault-accent/20 transition-all">
                    <div className="flex items-center gap-3">
                      {RankIcon ? (
                        <RankIcon size={14} className={rankColors[i]} />
                      ) : (
                        <span className="text-[10px] font-mono text-vault-text-muted/50 w-[14px] text-center">{i + 1}</span>
                      )}
                      <span className="text-sm font-medium truncate max-w-[200px]">{p.title}</span>
                    </div>
                    <span className="text-xs font-bold text-vault-accent font-mono tabular-nums">{p.usageCount}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-vault-text-muted italic p-4 text-center">No usage data logged yet.</p>
            )}
          </div>
        </motion.div>

        {/* Usage Counter */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-panel-subtle rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-5"
        >
          {/* Animated ring */}
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full score-ring">
              <circle cx="50" cy="50" r="42" className="score-ring-track" />
              <circle
                cx="50" cy="50" r="42"
                className="score-ring-fill"
                stroke="url(#statsGradient)"
                strokeDasharray={`${Math.min(totalUsage * 2, 264)} 264`}
              />
              <defs>
                <linearGradient id="statsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-mono tabular-nums">{totalUsage}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] leading-relaxed">
              Total Clipboard<br/>Extractions
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

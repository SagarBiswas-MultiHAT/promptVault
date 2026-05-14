/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Copy, Star, ExternalLink, Clock, Hash, Zap, Check, SquarePen, Tags } from 'lucide-react';
import { Prompt } from '../types.ts';
import { motion } from 'motion/react';
import React, { useState, MouseEvent } from 'react';

interface PromptCardProps {
  prompt: Prompt;
  onCopy: (prompt: Prompt) => void;
  onToggleFavorite: (id: string) => void;
  onClick: (prompt: Prompt) => void;
  onDuplicate: (prompt: Prompt) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onCopy, onToggleFavorite, onClick, onDuplicate }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    onCopy(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(prompt.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onClick(prompt)}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(prompt); } }}
      role="article"
      tabIndex={0}
      aria-label={`Prompt: ${prompt.title}`}
      className="group relative flex flex-col h-64 bg-vault-panel/80 border border-vault-border rounded-2xl overflow-hidden cursor-pointer card-hover-glow card-accent-stripe focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-vault-bg"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 max-w-[85%]">
          <h3 className="text-sm font-bold truncate text-vault-text tracking-tight">{prompt.title}</h3>
        </div>
        <button
          onClick={handleFavorite}
          aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className={`p-1.5 rounded-md transition-all ${
            prompt.isFavorite 
              ? 'text-vault-accent scale-110' 
              : 'text-vault-text-muted hover:text-vault-accent opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
        >
          <Star size={14} fill={prompt.isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Body Preview */}
      <div className="px-5 flex-1 relative">
        <p className="text-xs text-vault-text-muted line-clamp-4 leading-relaxed">
          {prompt.body.split('{{').map((part, i) => {
            if (i === 0) return part;
            const [varName, ...rest] = part.split('}}');
            return (
              <React.Fragment key={i}>
                <span className="text-vault-accent bg-vault-accent/10 px-1 py-0.5 rounded-md text-[11px] font-mono">{`{{${varName}}}`}</span>
                {rest.join('}}')}
              </React.Fragment>
            );
          })}
        </p>
        {/* Fade-out gradient mask */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-vault-panel/80 to-transparent pointer-events-none" />
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-2 flex items-center justify-between mt-auto">
        <div className="flex gap-1.5">
          {prompt.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[9px] bg-vault-panel-bright/80 border border-vault-border/50 px-2 py-0.5 rounded-full text-vault-text-muted font-mono">#{tag}</span>
          ))}
          {prompt.tags.length > 2 && (
            <span className="text-[9px] text-vault-text-muted/50 font-mono">+{prompt.tags.length - 2}</span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy prompt to clipboard'}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all whitespace-nowrap ${
            copied 
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
              : 'text-vault-text-muted bg-vault-bg/50 border border-vault-border hover:text-vault-accent hover:border-vault-accent/30'
          }`}
        >
          {copied ? (
            <><Check size={11} /> <span>Copied</span></>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy{prompt.usageCount > 0 ? ` · ${prompt.usageCount}` : ''}</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick(prompt)}
      className="group relative flex flex-col h-64 bg-vault-panel border border-vault-border rounded-xl overflow-hidden cursor-pointer transition-all hover:border-vault-accent/50"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-[85%]">
          <h3 className="text-sm font-mono font-bold truncate text-vault-accent uppercase tracking-tight">{prompt.title}</h3>
        </div>
        <button
          onClick={handleFavorite}
          className={`p-1.5 transition-colors ${
            prompt.isFavorite ? 'text-vault-accent' : 'text-vault-text-muted hover:text-vault-accent'
          }`}
        >
          <Star size={14} fill={prompt.isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Body Preview */}
      <div className="px-5 flex-1 relative">
        <p className="text-xs text-vault-text-muted line-clamp-4 leading-relaxed font-sans">
          {prompt.body.split('{{').map((part, i) => {
            if (i === 0) return part;
            const [varName, ...rest] = part.split('}}');
            return (
              <React.Fragment key={i}>
                <span className="text-vault-accent bg-vault-accent/10 px-0.5 rounded">{`{{${varName}}}`}</span>
                {rest.join('}}')}
              </React.Fragment>
            );
          })}
        </p>
      </div>

      {/* Footer */}
      <div className="p-5 flex items-center justify-between mt-auto">
        <div className="flex gap-2">
          {prompt.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[9px] bg-vault-panel-bright px-2 py-0.5 rounded-full text-vault-text-muted">#{tag}</span>
          ))}
        </div>
        
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all bg-vault-panel-bright hover:text-vault-accent ${
            copied ? 'text-vault-accent' : 'text-vault-text'
          }`}
        >
          {copied ? 'Copied' : `Copy (${prompt.usageCount})`}
        </button>
      </div>
    </motion.div>
  );
}

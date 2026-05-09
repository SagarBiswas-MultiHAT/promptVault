/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, FormEvent } from 'react';
import { Prompt, Category } from '../types.ts';
import { Plus, X, Tag as TagIcon, Layout, Info } from 'lucide-react';

interface PromptFormProps {
  initialData?: Partial<Prompt>;
  categories: Category[];
  onSubmit: (data: Partial<Prompt>) => void;
  onCancel: () => void;
}

export function PromptForm({ initialData, categories, onSubmit, onCancel }: PromptFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || '');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);

  const detectedVariables = useMemo(() => {
    const matches = body.match(/{{([^{}]+)}}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
  }, [body]);

  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

  const handleAddTag = () => {
    if (tagsInput.trim() && !tags.includes(tagsInput.trim())) {
      setTags([...tags, tagsInput.trim()]);
      setTagsInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title || !body || !categoryId) return;
    onSubmit({
      title,
      body,
      categoryId,
      tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] pl-1 font-semibold">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="A descriptive name for your prompt"
          required
          className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-4 py-3 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] pl-1 font-semibold">Category</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-4 py-3 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all appearance-none text-sm"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vault-text-muted">
              <Layout size={14} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] pl-1 font-semibold">Tags</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add tag..."
              className="flex-1 bg-vault-bg/60 border border-vault-border rounded-xl px-4 py-3 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all text-sm"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="p-3 bg-vault-panel-bright hover:bg-vault-accent hover:text-vault-bg rounded-xl transition-all border border-vault-border hover:border-vault-accent"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-accent/10 border border-vault-accent/20 text-vault-accent rounded-full text-xs font-mono">
              <TagIcon size={10} />
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-vault-text transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-[0.1em] pl-1 flex justify-between font-semibold">
          <span>Prompt Content</span>
          <span className="text-[9px] opacity-50 font-normal">Use &#123;&#123;variable&#125;&#125; for dynamic fields</span>
        </label>
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            placeholder="Type your prompt here..."
            className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-4 py-3 focus:border-vault-accent/50 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] outline-none transition-all font-mono text-sm leading-relaxed resize-none"
          />
          <div className="absolute bottom-3 right-3 text-[9px] font-mono text-vault-text-muted/40 tabular-nums">
            {wordCount} words
          </div>
        </div>
      </div>

      {detectedVariables.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-vault-accent-blue/8 border border-vault-accent-blue/15 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-vault-accent-blue/15 flex items-center justify-center shrink-0">
            <Info size={14} className="text-vault-accent-blue" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-vault-accent-blue">Variables Detected</p>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map(v => (
                <code key={v} className="text-[10px] bg-vault-accent-blue/15 px-2 py-0.5 rounded-md text-vault-accent-blue border border-vault-accent-blue/20 font-mono">
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-vault-border hover:border-vault-text-muted/30 rounded-xl font-bold uppercase tracking-widest text-xs transition-all text-vault-text-muted hover:text-vault-text"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 btn-primary !rounded-xl !py-3"
        >
          Save Prompt
        </button>
      </div>
    </form>
  );
}

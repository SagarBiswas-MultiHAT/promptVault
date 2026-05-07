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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest pl-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friendly display name"
          required
          className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 focus:border-vault-accent outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest pl-1">Category</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 focus:border-vault-accent outline-none transition-all appearance-none"
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
          <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest pl-1">Tags</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="Add tag..."
              className="flex-1 bg-vault-bg border border-vault-border rounded-lg px-4 py-3 focus:border-vault-accent outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="p-3 bg-vault-panel-bright hover:bg-vault-accent hover:text-vault-bg rounded-lg transition-all"
            >
              <Plus size={18} />
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
              <button onClick={() => removeTag(tag)} className="hover:text-vault-text transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest pl-1 flex justify-between">
          <span>Prompt Content</span>
          <span className="text-[8px] opacity-60">Use &#123;&#123;variable&#125;&#125; syntax for dynamic fields</span>
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={8}
          placeholder="Type your prompt here..."
          className="w-full bg-vault-bg border border-vault-border rounded-lg px-4 py-3 focus:border-vault-accent outline-none transition-all font-mono text-sm leading-relaxed"
        />
      </div>

      {detectedVariables.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-vault-accent-blue/10 border border-vault-accent-blue/20 rounded-lg">
          <Info size={16} className="text-vault-accent-blue mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-vault-accent-blue font-mono uppercase tracking-tight">Variables Detected</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {detectedVariables.map(v => (
                <code key={v} className="text-[10px] bg-vault-accent-blue/20 px-1.5 py-0.5 rounded text-vault-accent-blue border border-vault-accent-blue/30">
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-vault-border rounded-lg font-bold uppercase tracking-widest text-xs transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-vault-accent text-vault-bg hover:opacity-90 rounded-lg font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-vault-accent/10"
        >
          Save Prompt
        </button>
      </div>
    </form>
  );
}

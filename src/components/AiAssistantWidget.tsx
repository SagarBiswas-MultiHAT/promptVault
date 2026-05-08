/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X, AlertTriangle, Wand2, Check, Star } from 'lucide-react';
import { Category } from '../types.ts';

interface AnalysisResult {
  rating: number;
  weaknesses: string[];
  improvements: string[];
  title?: string;
  category?: string;
  tags?: string[];
  improvedPrompt?: string;
  provider?: string;
}

interface AiAssistantWidgetProps {
  categories: Category[];
  onCreatePrompt: (data: { title: string; body: string; categoryId: string; tags: string[] }) => string | null;
  onToggleFavorite: (id: string) => void;
}

export function AiAssistantWidget({ categories, onCreatePrompt, onToggleFavorite }: AiAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSuggestions, setEditingSuggestions] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [createdPromptId, setCreatedPromptId] = useState<string | null>(null);
  const [askFavorite, setAskFavorite] = useState(false);
  const [improveProvider, setImproveProvider] = useState<string | null>(null);

  const availableCategoryNames = useMemo(() => categories.map(c => c.name), [categories]);

  const canConfirm = Boolean(analysis && suggestedTitle.trim() && suggestedCategory.trim());
  const canModify = Boolean(analysis);

  const ratingColor = analysis
    ? analysis.rating >= 8
      ? 'text-emerald-400'
      : analysis.rating >= 6
        ? 'text-amber-400'
        : 'text-red-400'
    : 'text-vault-text-muted';

  const formatProvider = (provider?: string) => {
    const normalized = provider?.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === 'gemini') return 'Gemini';
    if (normalized === 'groq') return 'Groq';
    return normalized;
  };

  const analysisProvider = analysis ? formatProvider(analysis.provider) : '';

  const resetAssistant = () => {
    setPromptInput('');
    setAnalysis(null);
    setImprovedPrompt('');
    setIsLoading(false);
    setError(null);
    setEditingSuggestions(false);
    setSuggestedTitle('');
    setSuggestedCategory('');
    setTagsInput('');
    setCreatedPromptId(null);
    setAskFavorite(false);
    setImproveProvider(null);
  };

  const parseTags = (value: string) => {
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  };

  const resolveCategoryId = (categoryName: string) => {
    const normalized = categoryName.trim().toLowerCase();
    const exactMatch = categories.find(c => c.name.toLowerCase() === normalized);
    if (exactMatch) return exactMatch.id;

    const general = categories.find(c => c.name.toLowerCase() === 'general');
    return general?.id || categories[0]?.id || '';
  };

  const handleAnalyze = async (overridePrompt?: string) => {
    let promptToAnalyze = overridePrompt || promptInput;
    promptToAnalyze = promptToAnalyze.trim();

    if (!promptToAnalyze) {
      setError('Please enter a prompt to analyze.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setImprovedPrompt('');
    setImproveProvider(null);
    setCreatedPromptId(null);
    setAskFavorite(false);

    try {
      const payload = {
        prompt: promptToAnalyze,
        categories: availableCategoryNames,
        mode: 'analyze',
      };

      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to analyze prompt.');
      }

      const normalized = {
        rating: Number.isFinite(Number(data?.rating)) ? Number(data.rating) : 0,
        weaknesses: Array.isArray(data?.weaknesses) ? data.weaknesses : [],
        improvements: Array.isArray(data?.improvements) ? data.improvements : [],
        title: data?.title || '',
        category: data?.category || '',
        tags: Array.isArray(data?.tags) ? data.tags : [],
        provider: typeof data?.provider === 'string' ? data.provider : '',
      } as AnalysisResult;

      setAnalysis(normalized);
      setSuggestedTitle(normalized.title || '');
      setSuggestedCategory(normalized.category || (availableCategoryNames[0] || 'General'));
      setTagsInput((normalized.tags || []).join(', '));
      setEditingSuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!promptInput.trim()) {
      setError('Please enter a prompt to improve.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setImproveProvider(null);

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput.trim(),
          categories: availableCategoryNames,
          mode: 'improve',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to improve prompt.');
      }

      setImprovedPrompt(data.improvedPrompt || '');
      setImproveProvider(typeof data?.provider === 'string' ? data.provider : null);
      if (data.weaknesses || data.improvements) {
        setAnalysis(prev => prev ? { ...prev, weaknesses: data.weaknesses || prev.weaknesses, improvements: data.improvements || prev.improvements } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseImprovedPrompt = async () => {
    if (!improvedPrompt.trim()) return;
    const updatedPrompt = improvedPrompt.trim();
    setPromptInput(updatedPrompt);
    setImprovedPrompt('');
    setImproveProvider(null);
    await handleAnalyze(updatedPrompt);
  };

  const handleConfirm = () => {
    if (!analysis) return;

    const categoryId = resolveCategoryId(suggestedCategory);
    if (!categoryId) {
      setError('No categories available. Create a category first.');
      return;
    }

    const tags = parseTags(tagsInput);
    const createdId = onCreatePrompt({
      title: suggestedTitle.trim(),
      body: promptInput.trim(),
      categoryId,
      tags,
    });

    if (!createdId) {
      setError('Unable to create prompt.');
      return;
    }

    setCreatedPromptId(createdId);
    setEditingSuggestions(false);
    setError(null);
    resetAssistant();
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-24 right-4 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] max-h-[65vh] glass-panel rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-vault-border">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-vault-text-muted">AI Librarian</p>
                <h3 className="text-lg font-mono font-bold text-vault-accent">Prompt Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-vault-border transition-colors"
                aria-label="Close assistant"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest">Prompt to Analyze</label>
                <textarea
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Paste your prompt here"
                  className="w-full bg-vault-bg border border-vault-border rounded-lg px-3 py-2 text-sm font-mono focus:border-vault-accent outline-none"
                />
              </div>

              {analysis && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Quality Score</p>
                      <p className={`text-xl font-bold ${ratingColor}`}>{analysis.rating.toFixed(1)} / 10</p>
                      {analysisProvider && (
                        <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Provider: {analysisProvider}</p>
                      )}
                    </div>
                    {analysis.rating < 8 && (
                      <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                        <AlertTriangle size={12} />
                        Consider improving
                      </div>
                    )}
                  </div>

                  {(analysis.weaknesses.length > 0 || analysis.improvements.length > 0) && (
                    <div className="space-y-3">
                      {analysis.weaknesses.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Weak Spots</p>
                          <ul className="mt-2 space-y-1 text-xs text-vault-text-muted">
                            {analysis.weaknesses.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-vault-text-muted" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.improvements.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Improvements</p>
                          <ul className="mt-2 space-y-1 text-xs text-vault-text-muted">
                            {analysis.improvements.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-vault-accent" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Suggestions</p>

                      {editingSuggestions ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Title</label>
                            <input
                              value={suggestedTitle}
                              onChange={(e) => setSuggestedTitle(e.target.value)}
                              className="w-full bg-vault-bg border border-vault-border rounded-lg px-3 py-2 text-sm focus:border-vault-accent outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Category</label>
                            <input
                              list="ai-category-options"
                              value={suggestedCategory}
                              onChange={(e) => setSuggestedCategory(e.target.value)}
                              className="w-full bg-vault-bg border border-vault-border rounded-lg px-3 py-2 text-sm focus:border-vault-accent outline-none"
                            />
                            <datalist id="ai-category-options">
                              {availableCategoryNames.map((name) => (
                                <option key={name} value={name} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Tags</label>
                            <input
                              value={tagsInput}
                              onChange={(e) => setTagsInput(e.target.value)}
                              placeholder="tag1, tag2"
                              className="w-full bg-vault-bg border border-vault-border rounded-lg px-3 py-2 text-sm focus:border-vault-accent outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2.5 text-sm items-start">
                          <span className="text-vault-text-muted text-xs pt-0.5 shrink-0">Title</span>
                          <span className="text-vault-text font-medium leading-snug">{suggestedTitle || 'Untitled'}</span>

                          <span className="text-vault-text-muted text-xs pt-0.5 shrink-0">Category</span>
                          <span className="text-vault-text">{suggestedCategory || 'General'}</span>

                          <span className="text-vault-text-muted text-xs pt-1 shrink-0">Tags</span>
                          <div className="flex flex-wrap gap-1.5">
                            {parseTags(tagsInput).length > 0
                              ? parseTags(tagsInput).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 bg-vault-border/60 text-vault-text-muted rounded-full text-[10px] font-mono"
                                  >
                                    #{tag}
                                  </span>
                                ))
                              : <span className="text-vault-text-muted text-xs">None</span>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {improvedPrompt && (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Improved Prompt</p>
                  {improveProvider && (
                    <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Provider: {formatProvider(improveProvider)}</p>
                  )}
                  <div className="bg-vault-bg border border-vault-border rounded-lg p-3 text-xs text-vault-text-muted whitespace-pre-wrap">
                    {improvedPrompt}
                  </div>
                  <button
                    onClick={handleUseImprovedPrompt}
                    className="text-xs font-mono uppercase tracking-widest text-vault-accent hover:text-vault-text"
                  >
                    Use improved prompt and re-analyze
                  </button>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-vault-border bg-vault-panel/70">
              {!analysis ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAnalyze()}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-vault-accent text-vault-bg rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    <Send size={14} /> Analyze
                  </button>
                  <button
                    onClick={() => {
                      resetAssistant();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm || isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-vault-accent text-vault-bg rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    <Check size={14} /> Confirm
                  </button>
                  <button
                    onClick={() => setEditingSuggestions(prev => !prev)}
                    disabled={!canModify || isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => handleImprove()}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                  >
                    <Wand2 size={14} /> Improve
                  </button>
                  <button
                    onClick={() => {
                      resetAssistant();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-22 right-6 z-[9999] w-12 h-12 rounded-full bg-vault-accent text-vault-bg shadow-xl shadow-vault-accent/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open prompt assistant"
      >
        <Sparkles size={22} />
      </button>
    </>
  );
}

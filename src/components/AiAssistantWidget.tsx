/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Send, X, AlertTriangle, Check, Shield, Zap, Wand2 } from 'lucide-react';
import { Category } from '../types.ts';

interface EvaluationResult {
  qualityScore: number;
  scoreLabel: string;
  weakSpots: string[];
  improvements: string[];
  confidence: string;
  confidenceNote: string;
  title: string;
  category: string;
  tags: string[];
  provider?: string;
}

interface ImproveResult {
  improvedPrompt: string;
  improvementsMade: string[];
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
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [improveResult, setImproveResult] = useState<ImproveResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSuggestions, setEditingSuggestions] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const availableCategoryNames = useMemo(() => categories.map(c => c.name), [categories]);

  const canConfirm = Boolean(evaluation && suggestedTitle.trim() && suggestedCategory.trim());
  const canModify = Boolean(evaluation);

  const scoreLabelConfig: Record<string, { color: string; bg: string; border: string }> = {
    'EXCELLENT': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    'GOOD': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    'CONSIDER IMPROVING': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  const getScoreConfig = (label: string) => scoreLabelConfig[label] || scoreLabelConfig['CONSIDER IMPROVING'];

  const formatProvider = (provider?: string) => {
    const normalized = provider?.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized === 'gemini') return 'Gemini';
    if (normalized === 'groq') return 'Groq';
    return normalized;
  };

  const resetAssistant = () => {
    setPromptInput('');
    setEvaluation(null);
    setImproveResult(null);
    setIsLoading(false);
    setIsImproving(false);
    setError(null);
    setEditingSuggestions(false);
    setSuggestedTitle('');
    setSuggestedCategory('');
    setTagsInput('');
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

  // Step 1: Evaluate — score + weak spots + metadata (no rewrite)
  const handleEvaluate = async (overridePrompt?: string) => {
    let promptToEvaluate = overridePrompt || promptInput;
    promptToEvaluate = promptToEvaluate.trim();

    if (!promptToEvaluate) {
      setError('Please enter a prompt to evaluate.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    setImproveResult(null);

    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToEvaluate,
          categories: availableCategoryNames,
          mode: 'analyze',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to evaluate prompt.');
      }

      const result: EvaluationResult = {
        qualityScore: Number.isFinite(Number(data?.qualityScore)) ? Number(data.qualityScore) : 0,
        scoreLabel: data?.scoreLabel || 'CONSIDER IMPROVING',
        weakSpots: Array.isArray(data?.weakSpots) ? data.weakSpots : [],
        improvements: Array.isArray(data?.improvements) ? data.improvements : [],
        confidence: data?.confidence || 'HIGH',
        confidenceNote: data?.confidenceNote || '',
        title: data?.title || '',
        category: data?.category || '',
        tags: Array.isArray(data?.tags) ? data.tags : [],
        provider: typeof data?.provider === 'string' ? data.provider : '',
      };

      setEvaluation(result);
      setSuggestedTitle(result.title || '');
      setSuggestedCategory(result.category || (availableCategoryNames[0] || 'General'));
      setTagsInput((result.tags || []).join(', '));
      setEditingSuggestions(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Improve — generate improved prompt (only on button click)
  const handleImprove = async () => {
    if (!promptInput.trim()) {
      setError('Please enter a prompt to improve.');
      return;
    }

    setIsImproving(true);
    setError(null);

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

      setImproveResult({
        improvedPrompt: data?.improvedPrompt || '',
        improvementsMade: Array.isArray(data?.improvementsMade) ? data.improvementsMade : [],
        provider: typeof data?.provider === 'string' ? data.provider : '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve prompt.');
    } finally {
      setIsImproving(false);
    }
  };

  // Use improved prompt: swap it in and re-evaluate
  const handleUseImprovedPrompt = async () => {
    if (!improveResult?.improvedPrompt?.trim()) return;
    const updatedPrompt = improveResult.improvedPrompt.trim();
    setPromptInput(updatedPrompt);
    setImproveResult(null);
    await handleEvaluate(updatedPrompt);
  };

  const handleConfirm = () => {
    if (!evaluation) return;

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

    setEditingSuggestions(false);
    setError(null);
    resetAssistant();
    setIsOpen(false);
  };

  const scoreConfig = evaluation ? getScoreConfig(evaluation.scoreLabel) : null;
  const providerLabel = evaluation ? formatProvider(evaluation.provider) : '';
  const anyLoading = isLoading || isImproving;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed bottom-24 right-4 z-[9999] w-[400px] max-w-[calc(100vw-2rem)] max-h-[70vh] glass-panel rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Top accent line — indigo for AI */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-vault-border/50">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-vault-text-muted font-semibold">AI Librarian</p>
                <h3 className="text-base font-bold tracking-tight text-gradient-blue">Prompt Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-vault-border/50 text-vault-text-muted hover:text-vault-text transition-all"
                aria-label="Close assistant"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Prompt Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-vault-text-muted uppercase tracking-widest">Prompt to Analyze</label>
                <textarea
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Paste your prompt here..."
                  className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-3 py-2.5 text-sm font-mono focus:border-indigo-500/50 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] outline-none resize-none transition-all"
                />
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                  <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs font-mono text-vault-text-muted uppercase tracking-[0.1em]">Evaluating prompt quality...</span>
                </div>
              )}

              {/* Evaluation Results */}
              {evaluation && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Quality Score + Label */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Quality Score</p>
                      <p className={`text-2xl font-bold ${scoreConfig?.color}`}>
                        {evaluation.qualityScore.toFixed(1)} <span className="text-sm opacity-60">/ 10</span>
                      </p>
                      {providerLabel && (
                        <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted mt-0.5">Provider: {providerLabel}</p>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${scoreConfig?.color} ${scoreConfig?.bg} ${scoreConfig?.border} border`}>
                      {evaluation.scoreLabel === 'EXCELLENT' && <Shield size={10} />}
                      {evaluation.scoreLabel === 'GOOD' && <Zap size={10} />}
                      {evaluation.scoreLabel === 'CONSIDER IMPROVING' && <AlertTriangle size={10} />}
                      {evaluation.scoreLabel}
                    </div>
                  </div>

                  {/* Weak Spots */}
                  {evaluation.weakSpots.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted mb-2">Weak Spots</p>
                      <ul className="space-y-1.5 text-xs text-vault-text-muted">
                        {evaluation.weakSpots.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400/70 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements (suggestions from analyze) */}
                  {evaluation.improvements.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted mb-2">Improvements</p>
                      <ul className="space-y-1.5 text-xs text-vault-text-muted">
                        {evaluation.improvements.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-vault-accent shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confidence Badge */}
                  <div className="flex items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${evaluation.confidence === 'HIGH'
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${evaluation.confidence === 'HIGH' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      Confidence: {evaluation.confidence}
                    </div>
                    {evaluation.confidenceNote && (
                      <span className="text-[10px] text-vault-text-muted font-mono">{evaluation.confidenceNote}</span>
                    )}
                  </div>

                  {/* Improved Prompt — only shown after IMPROVE button click */}
                  {isImproving && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-xs font-mono text-vault-text-muted uppercase tracking-[0.1em]">Generating improved prompt...</span>
                    </div>
                  )}

                  {improveResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* Improvements Made */}
                      {improveResult.improvementsMade.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted mb-2">Improvements Made</p>
                          <ul className="space-y-1.5 text-xs text-vault-text-muted">
                            {improveResult.improvementsMade.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improved Prompt */}
                      {improveResult.improvedPrompt && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Improved Prompt</p>
                          {improveResult.provider && (
                            <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Provider: {formatProvider(improveResult.provider)}</p>
                          )}
                          <div className="bg-vault-bg border border-vault-border rounded-lg p-3 text-xs text-vault-text-muted whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                            {improveResult.improvedPrompt}
                          </div>
                          <button
                            onClick={handleUseImprovedPrompt}
                            disabled={anyLoading}
                            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-vault-accent hover:text-vault-text transition-colors disabled:opacity-50"
                          >
                            <Zap size={12} />
                            Use improved prompt & re-analyze
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Suggestions (Title / Category / Tags) */}
                  <div className="space-y-2 pt-2 border-t border-vault-border/50">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Suggestions</p>

                    {editingSuggestions ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Title</label>
                          <input
                            value={suggestedTitle}
                            onChange={(e) => setSuggestedTitle(e.target.value)}
                            className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-3 py-2 text-sm focus:border-indigo-500/50 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase tracking-widest text-vault-text-muted">Category</label>
                          <input
                            list="ai-category-options"
                            value={suggestedCategory}
                            onChange={(e) => setSuggestedCategory(e.target.value)}
                            className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-3 py-2 text-sm focus:border-indigo-500/50 outline-none transition-all"
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
                            className="w-full bg-vault-bg/60 border border-vault-border rounded-xl px-3 py-2 text-sm focus:border-indigo-500/50 outline-none transition-all"
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
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 border-t border-vault-border bg-vault-panel/70">
              {!evaluation ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEvaluate()}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.97] text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    <Send size={14} /> Analyze
                  </button>
                  <button
                    onClick={() => {
                      resetAssistant();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 border border-vault-border text-vault-text-muted rounded-xl text-xs font-bold uppercase tracking-wider hover:text-vault-text hover:border-vault-text-muted/30 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm || anyLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 btn-primary !rounded-xl !text-[10px] disabled:opacity-50"
                  >
                    <Check size={14} /> Confirm
                  </button>
                  <button
                    onClick={() => setEditingSuggestions(prev => !prev)}
                    disabled={!canModify || anyLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50 hover:text-vault-text transition-colors"
                  >
                    Modify
                  </button>
                  <button
                    onClick={handleImprove}
                    disabled={anyLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50 hover:text-vault-text transition-colors"
                  >
                    <Wand2 size={14} /> Improve
                  </button>
                  <button
                    onClick={() => {
                      resetAssistant();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-vault-border text-vault-text-muted rounded-lg text-xs font-bold uppercase tracking-widest hover:text-vault-text transition-colors"
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
        className="fixed bottom-18.5 right-10 z-[9999] w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all accent-glow-blue"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        aria-label="Open prompt assistant"
      >
        <Sparkles size={20} />
      </button>
    </>
  );
}

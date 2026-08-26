/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** The two pipeline steps the AI Librarian exposes. */
export type Mode = 'analyze' | 'improve';

/** Result of the `analyze` step, as returned to the client. */
export interface AnalyzeResult {
  qualityScore: number;
  scoreLabel: string;
  weakSpots: string[];
  improvements: string[];
  confidence: 'HIGH' | 'MEDIUM';
  confidenceNote: string;
  title: string;
  category: string;
  tags: string[];
}

/** Result of the `improve` step, as returned to the client. */
export interface ImproveResult {
  improvedPrompt: string;
  improvementsMade: string[];
}

/**
 * The wire shape of `POST /api/suggest`. `provider` tells the client which
 * upstream actually answered, which is what makes the Gemini→Groq fallback
 * visible instead of silent.
 */
export type SuggestionResult = (AnalyzeResult | ImproveResult) & { provider: string };

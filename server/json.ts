/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pull a JSON object out of a model response.
 *
 * Even with provider-side JSON mode enabled this stays defensive: JSON mode is a
 * strong hint, not a guarantee, and the Groq default model only supports
 * `json_object` (no schema enforcement), so prose or fences can still appear.
 *
 * Strategy, in order:
 *   1. A ```json fenced block, then any fenced block.
 *   2. The outermost `{ … }` span in the raw text.
 *
 * A fenced block that fails to parse falls through to (2) rather than throwing
 * immediately — a model that emits a fence *and* prose around valid JSON used to
 * fail here even though the object was recoverable.
 *
 * @throws SyntaxError or Error when no parsable object is present. Callers treat
 *         that as a retryable provider failure, not a server bug.
 */
export function extractJson(text: string): unknown {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```([\s\S]*?)```/i);
  const fenced = fencedMatch?.[1];
  if (fenced !== undefined && fenced.trim() !== '') {
    try {
      return JSON.parse(fenced);
    } catch {
      // Fall through to the brace scan below.
    }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response.');
  }

  return JSON.parse(text.slice(start, end + 1));
}

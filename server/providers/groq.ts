/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GROQ_API_KEY, GROQ_MODEL, GROQ_TIMEOUT_MS, TEMPERATURE } from '../config.ts';
import { ProviderError } from '../errors.ts';
import { fetchWithDeadline, readErrorBody } from './http.ts';

export const GROQ = 'groq';

/**
 * Groq free tier caps TPM at 8 000 tokens per minute.
 * Groq counts max_tokens (requested output) toward that limit, so
 * MAX_OUTPUT_TOKENS (8 192) alone blows the cap before any input is counted.
 * The JSON response from PromptVault analysis is ~200–400 tokens, so 1 024
 * is generous and keeps input + output well under 8 000.
 */
const GROQ_MAX_OUTPUT_TOKENS = 1_024;

/**
 * Groq free tier caps all models at 8 000 tokens per minute per org.
 * The system prompt + JSON scaffolding costs ~300 tokens, so cap the
 * user-facing prompt at 6 000 chars (≈ 4 000 tokens at ~1.5 chars/token)
 * to stay safely under the wall even with a long user prompt.
 */
const GROQ_MAX_PROMPT_CHARS = 6_000;

function truncateForGroq(text: string): string {
  if (text.length <= GROQ_MAX_PROMPT_CHARS) return text;
  return (
    text.slice(0, GROQ_MAX_PROMPT_CHARS) +
    '\n\n[NOTE: Input was truncated to fit the fallback provider token limit. Evaluate what is present.]'
  );
}

/** Only the fields we actually read from a chat-completions response. */
interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

const SYSTEM_PROMPT =
  'You are the PromptVault AI Librarian — a world-class prompt engineer and quality analyst. ' +
  'Return strict JSON only.';

export async function requestGroq(promptText: string): Promise<string> {
  const response = await fetchWithDeadline(
    GROQ,
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: TEMPERATURE,
        top_p: 0.95,
        max_tokens: GROQ_MAX_OUTPUT_TOKENS,
        // Every Groq model supports schema-less `json_object`; the strict
        // `json_schema` mode is limited to a handful of models that do not
        // include the default `llama-3.3-70b-versatile`, so using it here would
        // 400 for most deployments. `json_object` guarantees syntactic validity
        // only — the normalizers remain the real contract.
        //
        // `json_object` also requires the word JSON to appear in the messages.
        // Both prompt builders say "return ONLY valid JSON", and the system
        // prompt above repeats it, so that requirement is satisfied by
        // construction rather than by luck.
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: truncateForGroq(promptText) },
        ],
      }),
    },
    GROQ_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new ProviderError(GROQ, `HTTP ${response.status}: ${await readErrorBody(response)}`, response.status);
  }

  const data = (await response.json()) as GroqChatCompletionResponse;
  const choice = data.choices?.[0];

  if (choice?.finish_reason === 'length') {
    throw new ProviderError(GROQ, `response truncated at max_tokens (${GROQ_MAX_OUTPUT_TOKENS})`);
  }

  const text = (choice?.message?.content ?? '').trim();
  if (!text) {
    throw new ProviderError(GROQ, `empty response (finish_reason: ${choice?.finish_reason ?? 'none'})`);
  }

  return text;
}

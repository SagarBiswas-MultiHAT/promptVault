/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GROQ_API_KEY, GROQ_MODEL, GROQ_TIMEOUT_MS, MAX_OUTPUT_TOKENS, TEMPERATURE } from '../config.ts';
import { ProviderError } from '../errors.ts';
import { fetchWithDeadline, readErrorBody } from './http.ts';

export const GROQ = 'groq';

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
        max_tokens: MAX_OUTPUT_TOKENS,
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
          { role: 'user', content: promptText },
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
    throw new ProviderError(GROQ, `response truncated at max_tokens (${MAX_OUTPUT_TOKENS})`);
  }

  const text = (choice?.message?.content ?? '').trim();
  if (!text) {
    throw new ProviderError(GROQ, `empty response (finish_reason: ${choice?.finish_reason ?? 'none'})`);
  }

  return text;
}

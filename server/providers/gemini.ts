/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  TEMPERATURE,
} from '../config.ts';
import { ProviderError } from '../errors.ts';
import { fetchWithDeadline, readErrorBody } from './http.ts';

export const GEMINI = 'gemini';

/** Only the fields we actually read from a `generateContent` response. */
interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Whether the configured model accepts the structured-output fields.
 *
 * Google's `generateContent` surface is in flux — the Interactions API is now the
 * recommended one, and `responseSchema` support varies by model. Rather than
 * assume every value someone might put in `GEMINI_MODEL` accepts these fields,
 * a 400 that names them flips this off and the call is retried plainly. Without
 * that, one unsupported field would 400 *every* Gemini request and silently
 * demote the whole app to Groq-only — a fallback that looks healthy while the
 * primary provider is dead.
 */
let structuredOutputSupported = true;

/** Error text that indicates the structured-output fields were the problem. */
const SCHEMA_REJECTION_PATTERN =
  /response_?schema|response_?mime_?type|responseJsonSchema|generation_?config|json.?mode/i;

export function isStructuredOutputEnabled(): boolean {
  return structuredOutputSupported;
}

export async function requestGemini(promptText: string, responseSchema: unknown): Promise<string> {
  if (structuredOutputSupported) {
    try {
      return await callGemini(promptText, responseSchema);
    } catch (error) {
      if (!isSchemaRejection(error)) throw error;
      structuredOutputSupported = false;
      console.warn(
        `[ai-proxy] ${GEMINI_MODEL} rejected structured-output config; ` +
          'falling back to plain generation for the rest of this process.'
      );
    }
  }

  return callGemini(promptText, undefined);
}

function isSchemaRejection(error: unknown): boolean {
  return (
    error instanceof ProviderError &&
    error.status === 400 &&
    SCHEMA_REJECTION_PATTERN.test(error.message)
  );
}

async function callGemini(promptText: string, responseSchema: unknown): Promise<string> {
  const response = await fetchWithDeadline(
    GEMINI,
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Was `?key=…` in the query string, which leaks the key into proxy and
        // CDN access logs, browser history on any accidental GET, and upstream
        // error traces. The header form is the documented one.
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          ...(responseSchema === undefined
            ? {}
            : { responseMimeType: 'application/json', responseSchema }),
        },
      }),
    },
    GEMINI_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new ProviderError(GEMINI, `HTTP ${response.status}: ${await readErrorBody(response)}`, response.status);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new ProviderError(GEMINI, `prompt blocked upstream (${blockReason})`);
  }

  const candidate = data.candidates?.[0];

  // A response truncated at the token budget yields half a JSON object. Treating
  // that as a provider failure lets the fallback answer, instead of handing
  // unparsable text to the JSON extractor and reporting a parse error.
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new ProviderError(GEMINI, `response truncated at maxOutputTokens (${MAX_OUTPUT_TOKENS})`);
  }

  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    const reason = candidate?.finishReason ?? 'no candidates';
    throw new ProviderError(GEMINI, `empty response (finishReason: ${reason})`);
  }

  return text;
}

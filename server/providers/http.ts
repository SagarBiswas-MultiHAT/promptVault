/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderError } from '../errors.ts';

/**
 * Run an upstream `fetch` under a deadline.
 *
 * Neither provider call had a timeout before. That is worse than it sounds: a
 * hung connection to the primary provider means the fallback **never fires**,
 * because the code is still awaiting the first call. The request hangs until the
 * client gives up, so the two-provider redundancy silently does nothing in the
 * exact scenario it exists for.
 *
 * An expired deadline is reported as an ordinary provider failure so the caller
 * moves on to the next provider instead of surfacing an abort.
 */
export async function fetchWithDeadline(
  provider: string,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    // `AbortSignal.timeout` rejects with a DOMException named TimeoutError;
    // some runtimes and manual aborts surface AbortError instead.
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new ProviderError(provider, `timed out after ${timeoutMs}ms`, undefined, { cause: error });
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new ProviderError(provider, `network error: ${message}`, undefined, { cause: error });
  }
}

/**
 * Read an error body without letting a huge or streaming response become a
 * second failure, and without putting a wall of upstream HTML into the logs.
 */
export async function readErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500).replace(/\s+/g, ' ').trim();
  } catch {
    return '<unreadable response body>';
  }
}

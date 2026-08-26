/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * An error carrying the HTTP status the client should see.
 *
 * `message` is sent to the client verbatim, so only ever construct these with
 * text that is safe to expose. Anything internal belongs in `cause`.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** An upstream provider (or the whole provider chain) failed. */
export class UpstreamError extends HttpError {
  constructor(message: string, options?: ErrorOptions) {
    super(502, message, options);
    this.name = 'UpstreamError';
  }
}

/**
 * A single provider call failed. Carries the upstream HTTP status when there was
 * one so the pipeline can log it and `/api/health` can report which provider is
 * degraded.
 */
export class ProviderError extends Error {
  readonly provider: string;
  readonly status: number | undefined;

  constructor(provider: string, message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProviderError';
    this.provider = provider;
    this.status = status;
  }
}

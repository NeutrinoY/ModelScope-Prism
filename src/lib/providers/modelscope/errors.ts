import OpenAI from 'openai';
import type { PrismError, PrismErrorCode } from '../../contracts';
import {
  classifyUpstreamStatus,
  createPrismError,
  refineInvalidRequestCode,
  userMessageForCode,
} from '../../domain';

/**
 * ModelScope upstream error convergence. Every upstream failure is
 * normalized into a ProviderError carrying a PrismErrorCode and an
 * HTTP status suitable for the API route response.
 */

export class ProviderError extends Error {
  readonly code: PrismErrorCode;
  readonly status: number;
  readonly upstreamMessage?: string;

  constructor(code: PrismErrorCode, status: number, upstreamMessage?: string) {
    super(userMessageForCode(code));
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    this.upstreamMessage = upstreamMessage;
  }

  toPrismError(): PrismError {
    return createPrismError(
      this.code,
      this.message,
      this.upstreamMessage ? { upstream: this.upstreamMessage } : undefined
    );
  }
}

/** Map an upstream HTTP status to the status our API route should return. */
export function sanitizeUpstreamStatus(status: number): number {
  if (status === 401 || status === 403) return 401;
  if (status === 402) return 402;
  if (status === 404) return 404;
  if (status === 429) return 429;
  if (status >= 500) return 502;
  return 400;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Converge OpenAI SDK errors (Conversation path) into ProviderError. */
export function fromOpenAiError(error: unknown): ProviderError {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new ProviderError('UPSTREAM_TIMEOUT', 504);
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new ProviderError('NETWORK_ERROR', 502, error.message);
  }
  if (error instanceof OpenAI.APIError) {
    const status = typeof error.status === 'number' ? error.status : 500;
    const code = refineInvalidRequestCode(status, error.message ?? '');
    return new ProviderError(code, sanitizeUpstreamStatus(status), error.message);
  }
  if (isAbortError(error)) {
    return new ProviderError('UPSTREAM_TIMEOUT', 504);
  }
  return new ProviderError('UPSTREAM_ERROR', 502, error instanceof Error ? error.message : '');
}

/** Converge fetch-based upstream responses (AIGC path) into ProviderError. */
export function fromUpstreamResponse(status: number, bodyText: string): ProviderError {
  let upstreamMessage = bodyText.slice(0, 500);
  try {
    const parsed = JSON.parse(bodyText) as {
      errors?: { message?: string };
      error?: { message?: string } | string;
      message?: string;
    };
    upstreamMessage =
      parsed.errors?.message ??
      (typeof parsed.error === 'string' ? parsed.error : parsed.error?.message) ??
      parsed.message ??
      upstreamMessage;
  } catch {
    // keep the raw slice
  }

  const code =
    status === 400 || status === 422
      ? refineInvalidRequestCode(status, upstreamMessage)
      : classifyUpstreamStatus(status);
  return new ProviderError(code, sanitizeUpstreamStatus(status), upstreamMessage);
}

export function fromNetworkError(error: unknown): ProviderError {
  if (isAbortError(error)) {
    return new ProviderError('UPSTREAM_TIMEOUT', 504);
  }
  return new ProviderError('NETWORK_ERROR', 502, error instanceof Error ? error.message : '');
}

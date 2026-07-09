import type { PrismError, PrismErrorCode } from '../contracts';

/**
 * Error helpers shared by API routes, services, and features (pure rules).
 * User-facing copy abstracts upstream noise into cause + next step, while
 * the underlying PrismErrorCode stays distinguishable (docs/rebuild/00).
 */

export function createPrismError(
  code: PrismErrorCode,
  message: string,
  details?: unknown
): PrismError {
  const error: PrismError = { error: { code, message } };
  if (details !== undefined) error.error.details = details;
  return error;
}

export function isPrismError(value: unknown): value is PrismError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { error?: { code?: unknown; message?: unknown } };
  return (
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof candidate.error.code === 'string' &&
    typeof candidate.error.message === 'string'
  );
}

/** Map an upstream HTTP status to a Prism error code. */
export function classifyUpstreamStatus(status: number): PrismErrorCode {
  if (status === 401 || status === 403) return 'AUTH_FAILED';
  if (status === 402) return 'QUOTA_LIMITED';
  if (status === 404) return 'MODEL_UNAVAILABLE';
  if (status === 413) return 'PAYLOAD_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 400 || status === 422) return 'INVALID_REQUEST';
  if (status === 408 || status === 504) return 'UPSTREAM_TIMEOUT';
  if (status >= 500) return 'UPSTREAM_ERROR';
  return 'UPSTREAM_ERROR';
}

/**
 * Refine a 400/422 classification using the upstream message: parameter
 * rejections surface as UNSUPPORTED_PARAMETER so the UI can name the cause.
 */
export function refineInvalidRequestCode(status: number, upstreamMessage: string): PrismErrorCode {
  const base = classifyUpstreamStatus(status);
  if (base !== 'INVALID_REQUEST') return base;

  const message = upstreamMessage.toLowerCase();
  const parameterHints = [
    'unsupported',
    'unknown parameter',
    'unknown field',
    'extra field',
    'unexpected keyword',
    'not support',
    'invalid parameter',
    'enable_thinking',
    'chat_template',
    'thinking',
    'image_url',
    'loras',
  ];
  if (parameterHints.some((hint) => message.includes(hint))) {
    return 'UNSUPPORTED_PARAMETER';
  }

  const quotaHints = ['quota', 'balance', 'insufficient', 'bill'];
  if (quotaHints.some((hint) => message.includes(hint))) {
    return 'QUOTA_LIMITED';
  }

  return 'INVALID_REQUEST';
}

/** User-facing copy per error code (cause + next step, not generic failure). */
const USER_MESSAGES: Record<PrismErrorCode, string> = {
  MISSING_API_KEY: 'No access token set. Add your ModelScope token in Settings.',
  AUTH_FAILED: 'ModelScope rejected the token. Check or update it in Settings.',
  QUOTA_LIMITED: 'Quota or balance is insufficient on your ModelScope account.',
  RATE_LIMITED: 'Too many requests right now. Wait a moment and retry.',
  MODEL_UNAVAILABLE: 'This model is unavailable on API-Inference. Try another model ID.',
  UNSUPPORTED_PARAMETER: 'The model rejected a request parameter. Adjust or disable it and retry.',
  INVALID_REQUEST: 'The request was invalid. Check the inputs and retry.',
  PAYLOAD_TOO_LARGE: 'The request is too large. Reduce image size or message length.',
  UPSTREAM_TIMEOUT: 'ModelScope took too long to respond. Retry in a moment.',
  UPSTREAM_ERROR: 'ModelScope returned an error. Retry, or try another model.',
  NETWORK_ERROR: 'Network request failed. Check your connection and retry.',
  TASK_FAILED: 'The generation task failed upstream. Adjust the prompt or parameters and retry.',
  INTERNAL_ERROR: 'Something went wrong inside Prism. Retry the request.',
};

export function userMessageForCode(code: PrismErrorCode): string {
  return USER_MESSAGES[code] ?? USER_MESSAGES.INTERNAL_ERROR;
}

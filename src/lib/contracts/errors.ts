export type PrismErrorCode =
  | 'MISSING_API_KEY'
  | 'AUTH_FAILED'
  | 'QUOTA_LIMITED'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'UNSUPPORTED_PARAMETER'
  | 'INVALID_REQUEST'
  | 'PAYLOAD_TOO_LARGE'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'NETWORK_ERROR'
  | 'TASK_FAILED'
  | 'INTERNAL_ERROR';

export type PrismError = {
  error: {
    code: PrismErrorCode;
    message: string;
    details?: unknown;
  };
};

type IntEnvOptions = {
  min: number;
  max: number;
  fallback: number;
};

function intFromEnv(name: string, options: IntEnvOptions): number {
  const raw = process.env[name];
  if (!raw) return options.fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return options.fallback;
  const intValue = Math.trunc(value);
  if (intValue < options.min || intValue > options.max) return options.fallback;
  return intValue;
}

/**
 * Server-side API route configuration (docs/rebuild/07 config layer).
 * Values are env-tunable within safe bounds so deploys can adjust limits
 * without code changes.
 */
export const apiConfig = {
  conversation: {
    rateMax: intFromEnv('PRISM_CONVERSATION_RATE_MAX', { min: 1, max: 600, fallback: 30 }),
    rateWindowMs: intFromEnv('PRISM_CONVERSATION_RATE_WINDOW_MS', {
      min: 1000,
      max: 600_000,
      fallback: 60_000,
    }),
    maxBodyBytes: intFromEnv('PRISM_CONVERSATION_MAX_BODY_BYTES', {
      min: 1024,
      max: 30_000_000,
      fallback: 15_000_000,
    }),
    timeoutMs: intFromEnv('PRISM_CONVERSATION_TIMEOUT_MS', {
      min: 1000,
      max: 180_000,
      fallback: 60_000,
    }),
  },
  imageGenerate: {
    rateMax: intFromEnv('PRISM_IMAGE_GENERATE_RATE_MAX', { min: 1, max: 300, fallback: 10 }),
    rateWindowMs: intFromEnv('PRISM_IMAGE_GENERATE_RATE_WINDOW_MS', {
      min: 1000,
      max: 600_000,
      fallback: 60_000,
    }),
    maxBodyBytes: intFromEnv('PRISM_IMAGE_GENERATE_MAX_BODY_BYTES', {
      min: 1024,
      max: 30_000_000,
      fallback: 15_000_000,
    }),
    timeoutMs: intFromEnv('PRISM_IMAGE_GENERATE_TIMEOUT_MS', {
      min: 1000,
      max: 180_000,
      fallback: 30_000,
    }),
  },
  imageStatus: {
    rateMax: intFromEnv('PRISM_IMAGE_STATUS_RATE_MAX', { min: 1, max: 1000, fallback: 120 }),
    rateWindowMs: intFromEnv('PRISM_IMAGE_STATUS_RATE_WINDOW_MS', {
      min: 1000,
      max: 600_000,
      fallback: 60_000,
    }),
    timeoutMs: intFromEnv('PRISM_IMAGE_STATUS_TIMEOUT_MS', {
      min: 1000,
      max: 180_000,
      fallback: 20_000,
    }),
  },
} as const;

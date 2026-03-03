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

export const apiConfig = {
  chat: {
    rateMax: intFromEnv('PRISM_CHAT_RATE_MAX', { min: 1, max: 600, fallback: 30 }),
    rateWindowMs: intFromEnv('PRISM_CHAT_RATE_WINDOW_MS', { min: 1000, max: 600_000, fallback: 60_000 }),
    maxBodyBytes: intFromEnv('PRISM_CHAT_MAX_BODY_BYTES', { min: 1024, max: 10_000_000, fallback: 350_000 }),
    timeoutMs: intFromEnv('PRISM_CHAT_TIMEOUT_MS', { min: 1000, max: 180_000, fallback: 45_000 }),
  },
  vision: {
    rateMax: intFromEnv('PRISM_VISION_RATE_MAX', { min: 1, max: 600, fallback: 20 }),
    rateWindowMs: intFromEnv('PRISM_VISION_RATE_WINDOW_MS', { min: 1000, max: 600_000, fallback: 60_000 }),
    maxBodyBytes: intFromEnv('PRISM_VISION_MAX_BODY_BYTES', { min: 1024, max: 30_000_000, fallback: 15_000_000 }),
    timeoutMs: intFromEnv('PRISM_VISION_TIMEOUT_MS', { min: 1000, max: 180_000, fallback: 60_000 }),
  },
  imageGenerate: {
    rateMax: intFromEnv('PRISM_IMAGE_GENERATE_RATE_MAX', { min: 1, max: 300, fallback: 10 }),
    rateWindowMs: intFromEnv('PRISM_IMAGE_GENERATE_RATE_WINDOW_MS', { min: 1000, max: 600_000, fallback: 60_000 }),
    maxBodyBytes: intFromEnv('PRISM_IMAGE_GENERATE_MAX_BODY_BYTES', { min: 1024, max: 30_000_000, fallback: 15_000_000 }),
    timeoutMs: intFromEnv('PRISM_IMAGE_GENERATE_TIMEOUT_MS', { min: 1000, max: 180_000, fallback: 30_000 }),
    maxRetries: intFromEnv('PRISM_IMAGE_GENERATE_MAX_RETRIES', { min: 1, max: 6, fallback: 3 }),
    retryDelayMs: intFromEnv('PRISM_IMAGE_GENERATE_RETRY_DELAY_MS', { min: 100, max: 30_000, fallback: 1000 }),
  },
  imageStatus: {
    rateMax: intFromEnv('PRISM_IMAGE_STATUS_RATE_MAX', { min: 1, max: 1000, fallback: 120 }),
    rateWindowMs: intFromEnv('PRISM_IMAGE_STATUS_RATE_WINDOW_MS', { min: 1000, max: 600_000, fallback: 60_000 }),
    timeoutMs: intFromEnv('PRISM_IMAGE_STATUS_TIMEOUT_MS', { min: 1000, max: 180_000, fallback: 20_000 }),
  },
} as const;

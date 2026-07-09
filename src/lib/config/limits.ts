/**
 * Product-level limits and defaults shared across features
 * (docs/rebuild/07 config layer — values must not scatter into components).
 */

/** Output limit two-tier values for built-in models (docs/rebuild/06). */
export const OUTPUT_LIMIT_TIERS = {
  standard: 16_384,
  high: 65_536,
} as const;

/** AIGC async task polling (docs/rebuild/03 task lifecycle). */
export const IMAGE_TASK_POLLING = {
  delaysMs: [3000, 5000, 8000],
  maxDurationMs: 3 * 60 * 1000,
} as const;

/** Image input constraints shared by Conversation and AIGC composers. */
export const IMAGE_INPUT_LIMITS = {
  maxUploadSizeMb: 10,
  uploadQuality: 0.8,
  conversationMaxImages: 4,
  imageEditMaxImages: 4,
  aigcRequestBodySoftLimitBytes: 14_000_000,
} as const;

/** AIGC size presets offered by the parameter panel (docs range hints only). */
export const IMAGE_SIZE_PRESETS = [
  '1024x1024',
  '768x1344',
  '832x1216',
  '768x1280',
  '704x1408',
  '1024x1536',
  '1536x1536',
  '1728x1344',
  '1344x1728',
  '1824x1248',
  '1248x1824',
  '2016x1152',
  '1152x2016',
] as const;

/** Session title derivation. */
export const SESSION_TITLE_MAX_LENGTH = 30;

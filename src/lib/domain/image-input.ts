import type { ImageInputValue } from '../contracts';

/**
 * Image input normalization shared by Conversation and AIGC (pure rules).
 * Remote images use public URLs; local images arrive as base64 data URLs.
 */

const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;
const DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/;

export function isValidRemoteImageUrl(value: string): boolean {
  return HTTP_URL_PATTERN.test(value.trim());
}

export function isValidImageDataUrl(value: string): boolean {
  return DATA_URL_PATTERN.test(value.trim());
}

export function isValidImageSource(value: string): boolean {
  return isValidRemoteImageUrl(value) || isValidImageDataUrl(value);
}

export function detectImageSource(value: string): ImageInputValue['source'] | null {
  const trimmed = value.trim();
  if (isValidImageDataUrl(trimmed)) return 'data_url';
  if (isValidRemoteImageUrl(trimmed)) return 'remote_url';
  return null;
}

/** Normalize a raw string into an ImageInputValue, or null when invalid. */
export function toImageInputValue(raw: string): ImageInputValue | null {
  const trimmed = raw.trim();
  const source = detectImageSource(trimmed);
  if (!source) return null;

  const value: ImageInputValue = { url: trimmed, source };
  if (source === 'data_url') {
    const mime = /^data:(image\/[a-zA-Z0-9.+-]+);/.exec(trimmed)?.[1];
    if (mime) value.mimeType = mime;
  }
  return value;
}

/**
 * AIGC image_url payload shape:
 * 0 images -> undefined (do not send)
 * 1 image  -> single string
 * n images -> string array
 */
export function toAigcImageUrlPayload(
  images: ImageInputValue[] | undefined
): string | string[] | undefined {
  if (!images || images.length === 0) return undefined;
  if (images.length === 1) return images[0].url;
  return images.map((image) => image.url);
}

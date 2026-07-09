import type { NextRequest } from 'next/server';
import type { PrismErrorCode } from '@/lib/contracts';

/**
 * HTTP boundary helpers for API routes: request id, rate limiting,
 * body parsing, token extraction, unified error responses.
 * Routes stay thin — business rules live in domain/provider layers.
 */

type RateLimitOptions = {
  max: number;
  windowMs: number;
  routeKey: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type JsonParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

const RATE_LIMIT_STORE_KEY = '__prism_rate_limit_store__';

function getRateLimitStore(): Map<string, RateLimitBucket> {
  const g = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitBucket>;
  };
  if (!g[RATE_LIMIT_STORE_KEY]) {
    g[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitBucket>();
  }
  return g[RATE_LIMIT_STORE_KEY];
}

function cleanupRateLimitStore(store: Map<string, RateLimitBucket>, now: number): void {
  if (store.size < 5000) return;
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export function jsonError(
  code: PrismErrorCode,
  message: string,
  status: number,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function applyRateLimit(req: NextRequest, options: RateLimitOptions): Response | null {
  const now = Date.now();
  const store = getRateLimitStore();
  cleanupRateLimitStore(store, now);

  const key = `${options.routeKey}:${getClientIp(req)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  current.count += 1;
  store.set(key, current);

  if (current.count > options.max) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return jsonError('RATE_LIMITED', 'Too many requests. Please retry later.', 429, {
      'Retry-After': String(retryAfterSec),
    });
  }

  return null;
}

export async function parseJsonBody<T>(
  req: NextRequest,
  maxBytes: number
): Promise<JsonParseResult<T>> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      response: jsonError('INVALID_REQUEST', 'Content-Type must be application/json.', 415),
    };
  }

  const raw = await req.text();
  const size = new TextEncoder().encode(raw).length;
  if (size > maxBytes) {
    return {
      ok: false,
      response: jsonError('PAYLOAD_TOO_LARGE', 'Request body is too large.', 413),
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: jsonError('INVALID_REQUEST', 'Invalid JSON body.', 400),
    };
  }
}

export function createRequestId(req: NextRequest): string {
  const fromHeader = req.headers.get('x-request-id')?.trim();
  if (fromHeader && fromHeader.length <= 120) return fromHeader;
  return crypto.randomUUID();
}

export function attachRequestId(response: Response, requestId: string): Response {
  response.headers.set('X-Request-Id', requestId);
  return response;
}

/**
 * Token boundary: Authorization header first, body apiKey as compat path.
 * The route reads the token for the current request only and never
 * persists it (docs/rebuild/05 token contract).
 */
export function extractApiKey(req: NextRequest, bodyApiKey?: unknown): string {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return typeof bodyApiKey === 'string' ? bodyApiKey.trim() : '';
}

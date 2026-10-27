/**
 * In-memory rate limiter keyed by IP address.
 * Resets on cold start; effective against most bots on a low-traffic deployment.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Clean up expired windows every 5 minutes to prevent memory growth. */
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, win]) => {
    if (now >= win.resetAt) store.delete(key);
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Unique bucket name (e.g. "login", "register") */
  action: string;
  /** IP address or other identifier */
  ip: string;
  /** Max requests in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function checkRateLimit({ action, ip, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return { allowed, remaining: Math.max(0, limit - existing.count) };
}

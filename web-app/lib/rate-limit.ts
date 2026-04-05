/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per key (typically IP address).
 * Suitable for single-instance Vercel serverless — not distributed,
 * but sufficient to block trivial abuse and runaway cost.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Check whether a request from `key` is allowed.
   * Returns { allowed, remaining, resetAt }.
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    // Prune expired entries lazily (keep map small)
    if (this.store.size > 10_000) {
      for (const [k, v] of this.store) {
        if (v.resetAt <= now) this.store.delete(k);
      }
    }

    if (!entry || entry.resetAt <= now) {
      // New window
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.maxRequests - 1, resetAt };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetAt: entry.resetAt };
  }
}

/**
 * Extract a reasonable client identifier from a Next.js request.
 * Falls back to "unknown" so rate limiting still works (global bucket).
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}

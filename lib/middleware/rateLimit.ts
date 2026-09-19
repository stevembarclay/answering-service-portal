import { NextResponse } from 'next/server'

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 10

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// In-memory store — resets on server restart. For production, replace with Redis.
const store = new Map<string, RateLimitEntry>()

/**
 * Simple in-memory rate limiter: MAX_REQUESTS per WINDOW_MS per id.
 * For production use, replace with a Redis-backed implementation.
 */
export async function rateLimitAsync(id: string): Promise<RateLimitResult> {
  const now = Date.now()
  const entry = store.get(id)

  if (!entry || now > entry.resetAt) {
    store.set(id, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS }
  }

  entry.count += 1

  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  }
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait a moment and try again.',
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': String(result.remaining),
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  )
}

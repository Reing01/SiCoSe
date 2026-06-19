import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { withRedis } from '../lib/redis.js'

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitCheck = {
  allowed: boolean
  retryAfterSeconds?: number
}

const memoryBuckets = new Map<string, Bucket>()

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function getRequestIp(request: Request) {
  return request.ip || request.socket.remoteAddress || 'unknown'
}

function cleanupMemoryBuckets() {
  const now = Date.now()

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key)
    }
  }
}

function checkMemoryLimit(key: string, maxAttempts: number, windowMs: number): RateLimitCheck {
  cleanupMemoryBuckets()

  const now = Date.now()
  const current = memoryBuckets.get(key)

  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (current.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { allowed: true }
}

async function checkRedisLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitCheck> {
  return withRedis(async (redis) => {
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.pexpire(key, windowMs)
    }

    if (count <= maxAttempts) {
      return { allowed: true }
    }

    const ttlMs = await redis.pttl(key)

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 1000) / 1000)),
    }
  })
}

async function checkLimit(key: string, maxAttempts: number, windowMs: number) {
  try {
    return await checkRedisLimit(key, maxAttempts, windowMs)
  } catch {
    return checkMemoryLimit(key, maxAttempts, windowMs)
  }
}

function rejectRateLimited(
  response: Response,
  retryAfterSeconds: number,
  scope: 'ip' | 'email',
) {
  response.setHeader('Retry-After', String(retryAfterSeconds))

  return response.status(429).json({
    error: 'Too many login attempts. Try again later.',
    code: 429,
    scope,
    retryAfter: retryAfterSeconds,
  })
}

export async function loginRateLimit(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const ip = getRequestIp(request)
  const email = normalizeEmail(request.body?.email)

  const ipCheck = await checkLimit(
    `login:ip:${ip}`,
    env.RATE_LIMIT_MAX,
    env.RATE_LIMIT_WINDOW_MS,
  )

  if (!ipCheck.allowed) {
    console.warn(`Rate limit exceeded for login IP: ${ip}`)
    return rejectRateLimited(response, ipCheck.retryAfterSeconds ?? 60, 'ip')
  }

  if (email) {
    const emailCheck = await checkLimit(
      `login:email:${email}`,
      env.RATE_LIMIT_EMAIL_MAX,
      env.RATE_LIMIT_EMAIL_WINDOW_MS,
    )

    if (!emailCheck.allowed) {
      return rejectRateLimited(response, emailCheck.retryAfterSeconds ?? 300, 'email')
    }
  }

  return next()
}

export async function resetLoginEmailAttempts(email: string) {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return
  }

  const key = `login:email:${normalizedEmail}`

  try {
    await withRedis((redis) => redis.del(key))
  } catch {
    memoryBuckets.delete(key)
  }
}

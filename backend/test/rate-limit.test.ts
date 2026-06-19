import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { Request } from 'express'
import type { loginRateLimit as loginRateLimitType } from '../src/middleware/rate-limit.js'

let loginRateLimit: typeof loginRateLimitType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL = 'redis://localhost:1'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'
  process.env.RATE_LIMIT_WINDOW_MS = '60000'
  process.env.RATE_LIMIT_MAX = '10'
  process.env.RATE_LIMIT_EMAIL_WINDOW_MS = '300000'
  process.env.RATE_LIMIT_EMAIL_MAX = '5'

  ;({ loginRateLimit } = await import('../src/middleware/rate-limit.js'))
})

function createRequest(ip: string, email: string) {
  return {
    ip,
    socket: { remoteAddress: ip },
    body: { email },
  } as Request
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: new Map<string, string>(),
    setHeader(name: string, value: string) {
      this.headers.set(name, value)
      return this
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
}

async function runLimit(ip: string, email: string) {
  const request = createRequest(ip, email)
  const response = createResponse()
  let nextCalled = false

  await loginRateLimit(request, response as never, () => {
    nextCalled = true
  })

  return { response, nextCalled }
}

describe('loginRateLimit middleware', () => {
  it('allows the first ten attempts from the same IP and blocks the eleventh', async () => {
    for (let index = 0; index < 10; index += 1) {
      const { response, nextCalled } = await runLimit(
        '10.0.0.21',
        `ip-limit-${index}@sicose.test`,
      )

      assert.equal(response.statusCode, 200)
      assert.equal(nextCalled, true)
    }

    const { response, nextCalled } = await runLimit('10.0.0.21', 'ip-limit-11@sicose.test')

    assert.equal(response.statusCode, 429)
    assert.equal(response.headers.has('Retry-After'), true)
    assert.deepEqual(response.body, {
      error: 'Too many login attempts. Try again later.',
      code: 429,
      scope: 'ip',
      retryAfter: 60,
    })
    assert.equal(nextCalled, false)
  })

  it('blocks the sixth attempt for the same email', async () => {
    for (let index = 0; index < 5; index += 1) {
      const { response, nextCalled } = await runLimit(
        `10.0.1.${index}`,
        'email-limit@sicose.test',
      )

      assert.equal(response.statusCode, 200)
      assert.equal(nextCalled, true)
    }

    const { response, nextCalled } = await runLimit('10.0.1.6', 'email-limit@sicose.test')

    assert.equal(response.statusCode, 429)
    assert.equal(response.headers.has('Retry-After'), true)
    assert.deepEqual(response.body, {
      error: 'Too many login attempts. Try again later.',
      code: 429,
      scope: 'email',
      retryAfter: 300,
    })
    assert.equal(nextCalled, false)
  })
})

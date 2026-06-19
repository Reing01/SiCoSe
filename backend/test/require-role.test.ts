import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { AuthenticatedRequest } from '../src/types/auth.js'
import type { requireRole as requireRoleType } from '../src/middleware/require-role.js'

let requireRole: typeof requireRoleType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'

  ;({ requireRole } = await import('../src/middleware/require-role.js'))
})

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
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

describe('requireRole middleware', () => {
  it('returns 401 when request has no authenticated user', () => {
    const request = {} as AuthenticatedRequest
    const response = createResponse()
    let nextCalled = false

    requireRole('admin')(request, response as never, () => {
      nextCalled = true
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.body, {
      error: 'Authentication required',
      code: 401,
    })
    assert.equal(nextCalled, false)
  })

  it('returns 403 when authenticated user has a forbidden role', () => {
    const request = {
      user: {
        id: 'user-1',
        email: 'secretaria@sicose.test',
        rol: 'secretaria',
      },
    } as AuthenticatedRequest
    const response = createResponse()
    let nextCalled = false

    requireRole('admin', 'tesorero')(request, response as never, () => {
      nextCalled = true
    })

    assert.equal(response.statusCode, 403)
    assert.deepEqual(response.body, {
      error: 'Forbidden role',
      code: 403,
    })
    assert.equal(nextCalled, false)
  })

  it('calls next when authenticated user has an allowed role', () => {
    const request = {
      user: {
        id: 'user-2',
        email: 'tesorero@sicose.test',
        rol: 'tesorero',
      },
    } as AuthenticatedRequest
    const response = createResponse()
    let nextCalled = false

    requireRole('admin', 'tesorero')(request, response as never, () => {
      nextCalled = true
    })

    assert.equal(response.statusCode, 200)
    assert.equal(nextCalled, true)
  })
})

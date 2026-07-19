import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import type { errorHandler as errorHandlerType } from '../src/middleware/error-handler.js'

let errorHandler: typeof errorHandlerType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL ??= 'redis://localhost:6379'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'
  process.env.NODE_ENV = 'test'

  ;({ errorHandler } = await import('../src/middleware/error-handler.js'))
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

describe('errorHandler', () => {
  it('does not expose internal database details to clients', () => {
    const response = createResponse()
    const prismaError = new Error(
      'Invalid `prisma.usuario.findUnique()` invocation: Error querying the database: FATAL: tenant/user not found',
    )

    errorHandler(
      prismaError,
      {} as Request,
      response as unknown as Response,
      (() => undefined) as NextFunction,
    )

    assert.equal(response.statusCode, 500)
    assert.deepEqual(response.body, {
      error: 'No fue posible completar la solicitud.',
      code: 500,
    })
  })

  it('keeps known validation messages public', () => {
    const response = createResponse()
    const validationError = new Error('Invalid period format. Expected YYYY-MM')

    errorHandler(
      validationError,
      {} as Request,
      response as unknown as Response,
      (() => undefined) as NextFunction,
    )

    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.body, {
      error: 'Invalid period format. Expected YYYY-MM',
      code: 400,
    })
  })
})

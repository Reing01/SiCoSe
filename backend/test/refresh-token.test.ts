import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import type {
    consumeRefreshToken as consumeRefreshTokenType,
    issueRefreshToken as issueRefreshTokenType,
    revokeRefreshToken as revokeRefreshTokenType,
} from '../src/lib/refresh-token.js'

let issueRefreshToken: typeof issueRefreshTokenType
let consumeRefreshToken: typeof consumeRefreshTokenType
let revokeRefreshToken: typeof revokeRefreshTokenType

before(async () => {
  process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/sicose_test'
  process.env.REDIS_URL = 'redis://localhost:1'
  process.env.JWT_SECRET ??= 'test-secret-with-at-least-sixteen-chars'
  process.env.REFRESH_TOKEN_EXPIRES = '2s'

  ;({ issueRefreshToken, consumeRefreshToken, revokeRefreshToken } = await import(
    '../src/lib/refresh-token.js'
  ))
})

describe('refresh-token', () => {
  it('emite un token válido y lo resuelve al userId original', async () => {
    const { token } = await issueRefreshToken('user-1')
    const userId = await consumeRefreshToken(token)

    assert.equal(userId, 'user-1')
  })

  it('rota: un token ya consumido no puede volver a usarse', async () => {
    const { token } = await issueRefreshToken('user-2')

    const firstUse = await consumeRefreshToken(token)
    const secondUse = await consumeRefreshToken(token)

    assert.equal(firstUse, 'user-2')
    assert.equal(secondUse, null)
  })

  it('un token inexistente/inválido devuelve null', async () => {
    const userId = await consumeRefreshToken('token-que-no-existe')

    assert.equal(userId, null)
  })

  it('revocar un token evita que pueda consumirse después', async () => {
    const { token } = await issueRefreshToken('user-3')

    await revokeRefreshToken(token)
    const userId = await consumeRefreshToken(token)

    assert.equal(userId, null)
  })

  it('un token expira pasado su TTL', async () => {
    const { token } = await issueRefreshToken('user-4')

    await new Promise((resolve) => setTimeout(resolve, 2100))
    const userId = await consumeRefreshToken(token)

    assert.equal(userId, null)
  })
})
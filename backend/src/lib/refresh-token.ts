import { createHash, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'
import { parseDurationToSeconds } from './duration.js'
import { withRedis } from './redis.js'

export const REFRESH_TOKEN_COOKIE = 'refresh_token'
export const REFRESH_TOKEN_TTL_SECONDS = parseDurationToSeconds(env.REFRESH_TOKEN_EXPIRES)

type MemoryEntry = {
  userId: string
  expiresAt: number
}

const memoryStore = new Map<string, MemoryEntry>()

function cleanupMemoryStore() {
  const now = Date.now()

  for (const [hash, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(hash)
    }
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function redisKey(hash: string) {
  return `refresh:${hash}`
}

function generateToken() {
  return randomBytes(48).toString('hex')
}

/**
 * Emite un nuevo refresh token para el usuario y lo persiste (Redis, con
 * fallback en memoria si Redis no responde). El valor guardado nunca es el
 * token en texto plano (RN-02): se guarda el hash como llave.
 */
export async function issueRefreshToken(userId: string) {
  const token = generateToken()
  const hash = hashToken(token)
  const ttlSeconds = REFRESH_TOKEN_TTL_SECONDS

  try {
    await withRedis((redis) => redis.set(redisKey(hash), userId, 'EX', ttlSeconds))
  } catch {
    cleanupMemoryStore()
    memoryStore.set(hash, { userId, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  return { token, ttlSeconds }
}

/**
 * Valida un refresh token y lo consume (single-use). Si es válido, lo borra
 * inmediatamente del almacenamiento — así cada renovación exige emitir uno
 * nuevo (RN-01: rotación en cada renovación) y un token usado dos veces
 * queda automáticamente invalidado.
 */
export async function consumeRefreshToken(token: string): Promise<string | null> {
  const hash = hashToken(token)

  try {
    const userId = await withRedis((redis) => redis.get(redisKey(hash)))

    if (!userId) {
      return null
    }

    await withRedis((redis) => redis.del(redisKey(hash)))
    return userId
  } catch {
    cleanupMemoryStore()
    const entry = memoryStore.get(hash)
    memoryStore.delete(hash)

    if (!entry || entry.expiresAt <= Date.now()) {
      return null
    }

    return entry.userId
  }
}

/**
 * Revoca un refresh token sin necesidad de leer a quién pertenece
 * (usado en logout).
 */
export async function revokeRefreshToken(token: string) {
  const hash = hashToken(token)

  try {
    await withRedis((redis) => redis.del(redisKey(hash)))
  } catch {
    memoryStore.delete(hash)
  }
}
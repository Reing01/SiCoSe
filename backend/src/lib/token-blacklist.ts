import { withRedis } from './redis.js'

const memoryBlacklist = new Map<string, number>()

function cleanupMemoryBlacklist() {
  const now = Date.now()

  for (const [token, expiresAt] of memoryBlacklist.entries()) {
    if (expiresAt <= now) {
      memoryBlacklist.delete(token)
    }
  }
}

export async function blacklistToken(token: string, expiresAt: number) {
  const ttlSeconds = Math.max(1, Math.ceil((expiresAt * 1000 - Date.now()) / 1000))

  try {
    await withRedis((redis) => redis.set(`jwt:blacklist:${token}`, '1', 'EX', ttlSeconds))
  } catch {
    memoryBlacklist.set(token, Date.now() + ttlSeconds * 1000)
  }
}

export async function isTokenBlacklisted(token: string) {
  try {
    return (await withRedis((redis) => redis.exists(`jwt:blacklist:${token}`))) === 1
  } catch {
    cleanupMemoryBlacklist()
    return memoryBlacklist.has(token)
  }
}

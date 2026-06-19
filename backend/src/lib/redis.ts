import { Redis } from 'ioredis'
import { env } from '../config/env.js'

let redisClient: Redis | null = null
let redisUnavailable = false

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    })

    redisClient.on('error', () => {
      redisUnavailable = true
    })
  }

  return redisClient
}

export async function withRedis<T>(operation: (redis: Redis) => Promise<T>) {
  if (redisUnavailable) {
    throw new Error('Redis unavailable')
  }

  const redis = getRedisClient()

  if (redis.status === 'wait') {
    await redis.connect()
  }

  return operation(redis)
}

import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redisClient: Redis | null = null;
let redisConnectPromise: Promise<void> | null = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      enableOfflineQueue: false,
      retryStrategy: (attempt) =>
        attempt <= 3 ? Math.min(attempt * 100, 500) : null,
    });

    // ioredis emite `error` aunque el consumidor maneje el rechazo de la
    // operacion. El listener evita errores sin manejar mientras la estrategia
    // de reintento conserva la capacidad de recuperarse.
    redisClient.on("error", () => undefined);
  }

  return redisClient;
}

function warmRedisConnection(redis: Redis) {
  if (redis.status !== "wait" && redis.status !== "end") {
    return;
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redis
      .connect()
      .catch(() => undefined)
      .finally(() => {
        redisConnectPromise = null;
      });
  }
}

export async function withRedis<T>(operation: (redis: Redis) => Promise<T>) {
  const redis = getRedisClient();

  if (redis.status !== "ready") {
    warmRedisConnection(redis);
    throw new Error("Redis unavailable");
  }

  return operation(redis);
}

export async function closeRedisClient() {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  if (client.status === "end") {
    return;
  }

  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}

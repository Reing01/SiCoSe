import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { withRedis } from "../lib/redis.js";

const HEALTH_CHECK_TIMEOUT_MS = 1500;
const SERVICE_NAME = "sicose-backend";
const SERVICE_LAYERS = ["api-gateway", "business", "data"] as const;

export type HealthProbeResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type HealthProbe = () => Promise<void>;

export type ReadinessReport = {
  ok: boolean;
  status: "ready" | "degraded";
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  layers: readonly string[];
  checks: {
    database: HealthProbeResult;
    redis: HealthProbeResult;
  };
};

export type LivenessReport = {
  ok: true;
  status: "alive";
  service: string;
  uptimeSeconds: number;
  timestamp: string;
  layers: readonly string[];
};

type ReadinessDependencies = {
  databaseProbe?: HealthProbe;
  redisProbe?: HealthProbe;
};

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown health check failure";
}

async function withTimeout(probe: HealthProbe, timeoutMs: number) {
  let timeoutHandle: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      probe(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Health probe timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function measureProbe(
  probe: HealthProbe,
  timeoutMs = HEALTH_CHECK_TIMEOUT_MS,
): Promise<HealthProbeResult> {
  const startedAt = Date.now();

  try {
    await withTimeout(probe, timeoutMs);

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: stringifyError(error),
    };
  }
}

async function probeDatabase(client: Pick<PrismaClient, "$queryRaw"> = prisma) {
  await client.$queryRaw`SELECT 1 FROM "Usuario" LIMIT 1`;
}

async function probeRedis() {
  const pong = await withRedis((redis) => redis.ping());

  if (pong !== "PONG") {
    throw new Error(`Unexpected Redis response: ${pong}`);
  }
}

export async function getReadinessReport(
  dependencies: ReadinessDependencies = {},
): Promise<ReadinessReport> {
  const [database, redis] = await Promise.all([
    measureProbe(dependencies.databaseProbe ?? (() => probeDatabase())),
    measureProbe(dependencies.redisProbe ?? probeRedis),
  ]);

  const ok = database.ok && redis.ok;

  return {
    ok,
    status: ok ? "ready" : "degraded",
    service: SERVICE_NAME,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    layers: SERVICE_LAYERS,
    checks: {
      database,
      redis,
    },
  };
}

export function getLivenessReport(): LivenessReport {
  return {
    ok: true,
    status: "alive",
    service: SERVICE_NAME,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    layers: ["api-gateway"],
  };
}

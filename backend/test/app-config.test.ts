import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { createApp as createAppType } from "../src/app.js";

let createApp: typeof createAppType;

before(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://user:pass@localhost:5432/sicose_test";
  process.env.REDIS_URL ??= "redis://localhost:6379";
  process.env.JWT_SECRET ??= "test-secret-with-at-least-sixteen-chars";
  ({ createApp } = await import("../src/app.js"));
});

describe("application proxy configuration", () => {
  it("trusts only the configured number of proxy hops", () => {
    const app = createApp();
    const trustProxy = app.get("trust proxy fn") as (
      address: string,
      hop: number,
    ) => boolean;

    assert.equal(app.get("trust proxy"), 1);
    assert.equal(trustProxy("10.10.0.15", 0), true);
    assert.equal(trustProxy("10.10.0.16", 1), false);
  });
});

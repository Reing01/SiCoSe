import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { prisma } from "../src/lib/prisma.js";
import { leadsRouter } from "../src/routes/leads.js";

describe("Leads API & Service", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;

  before(async () => {
    process.env.DATABASE_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.DIRECT_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.REDIS_URL ??= "redis://localhost:6379";
    process.env.JWT_SECRET ??= "test-secret-with-at-least-sixteen-chars";

    const app = express();
    app.use(express.json());
    app.use("/api/leads", leadsRouter);

    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    port = (server.address() as AddressInfo).port;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("creates a lead and returns 201 when the payload is normalized and persisted", async () => {
    const createdData: any[] = [];

    (prisma.lead.create as any) = async (args: any) => {
      createdData.push(args.data);
      return {
        id: "lead-uuid-1",
        ...args.data,
        createdAt: new Date(),
      };
    };

    const response = await fetch(`http://127.0.0.1:${port}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre: "  Juan Pérez  ",
        comite: "  Junta Auxiliar Centro  ",
        contacto: "  222 123 4567  ",
      }),
    });

    assert.equal(response.status, 201);

    const payload = (await response.json()) as { message: string };

    assert.equal(payload.message, "Lead received");
    assert.equal(createdData.length, 1);
    assert.deepEqual(createdData[0], {
      nombre: "Juan Pérez",
      comite: "Junta Auxiliar Centro",
      contacto: "222 123 4567",
    });
  });
});

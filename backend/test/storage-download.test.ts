import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import express from "express";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";

let prisma: typeof import("../src/lib/prisma.js").prisma;
let signAuthToken: typeof import("../src/lib/jwt.js").signAuthToken;
let storageDownloadRouter: typeof import("../src/routes/storage-download.js").storageDownloadRouter;

describe("storage download API", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;
  let authToken = "";
  let originalFetch: typeof globalThis.fetch;
  let originalFindFirst: typeof prisma.usuario.findFirst;

  before(async () => {
    process.env.DATABASE_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.DIRECT_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.REDIS_URL ??= "redis://localhost:6379";
    process.env.JWT_SECRET ??= "test-secret-with-at-least-sixteen-chars";
    process.env.SUPABASE_URL ??= "https://wruzbnpaiyvmaldkdcmf.supabase.co";
    process.env.SUPABASE_SERVICE_KEY ??= "service-key-for-tests";
    process.env.SUPABASE_STORAGE_BUCKET ??= "comprobantes";

    ({ prisma } = await import("../src/lib/prisma.js"));
    ({ signAuthToken } = await import("../src/lib/jwt.js"));
    ({ storageDownloadRouter } = await import(
      "../src/routes/storage-download.js"
    ));

    originalFetch = globalThis.fetch;
    originalFindFirst = prisma.usuario.findFirst;

    prisma.usuario.findFirst = (async () => ({
      id: "user-1",
      email: "tesorero@sicose.test",
      rol: "tesorero",
    })) as typeof prisma.usuario.findFirst;

    authToken = await signAuthToken({
      sub: "user-1",
      email: "tesorero@sicose.test",
      rol: "tesorero",
    });

    const app = express();
    app.use(express.json());
    app.use("/api/storage-download", storageDownloadRouter);

    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    port = (server.address() as AddressInfo).port;
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    prisma.usuario.findFirst = originalFindFirst;

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

  function request(path: string, headers: Record<string, string> = {}) {
    return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>(
      (resolve, reject) => {
        const req = httpRequest(
          {
            hostname: "127.0.0.1",
            port,
            path,
            method: "GET",
            headers,
          },
          (response) => {
            const chunks: Buffer[] = [];

            response.on("data", (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            response.on("end", () => {
              resolve({
                status: response.statusCode ?? 0,
                headers: response.headers,
                body: Buffer.concat(chunks),
              });
            });
          },
        );

        req.on("error", reject);
        req.end();
      },
    );
  }

  it("returns 401 when the request has no auth token", async () => {
    let upstreamCalled = false;
    globalThis.fetch = (async () => {
      upstreamCalled = true;
      return new Response("should not be reached", { status: 500 });
    }) as typeof fetch;

    const sourceUrl =
      "https://wruzbnpaiyvmaldkdcmf.supabase.co/storage/v1/object/authenticated/comprobantes/recibos/recibo-123.pdf";
    const response = await request(
      `/api/storage-download?url=${encodeURIComponent(sourceUrl)}`,
    );

    assert.equal(response.status, 401);
    assert.equal(upstreamCalled, false);
  });

  it("rejects storage urls outside the configured bucket", async () => {
    let upstreamCalled = false;
    globalThis.fetch = (async () => {
      upstreamCalled = true;
      return new Response("should not be reached", { status: 500 });
    }) as typeof fetch;

    const response = await request(
      `/api/storage-download?url=${encodeURIComponent(
        "https://example.com/storage/v1/object/authenticated/comprobantes/recibos/recibo-123.pdf",
      )}`,
      {
        Authorization: `Bearer ${authToken}`,
      },
    );

    assert.equal(response.status, 400);
    assert.equal(upstreamCalled, false);
    assert.match(response.body.toString("utf8"), /File url is not allowed/);
  });

  it("proxies an authenticated storage object and relays the headers", async () => {
    const sourceUrl =
      "https://wruzbnpaiyvmaldkdcmf.supabase.co/storage/v1/object/authenticated/comprobantes/recibos/recibo-123.pdf";
    const upstreamCalls: Array<{
      url: string;
      authorization: string | null;
      apikey: string | null;
    }> = [];

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);

      upstreamCalls.push({
        url,
        authorization: headers.get("authorization"),
        apikey: headers.get("apikey"),
      });

      assert.equal(url, sourceUrl);

      return new Response(Buffer.from("pdf-bytes"), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'inline; filename="recibo-123.pdf"',
          "cache-control": "private, max-age=60",
        },
      });
    }) as typeof fetch;

    const response = await request(
      `/api/storage-download?url=${encodeURIComponent(sourceUrl)}`,
      {
        Authorization: `Bearer ${authToken}`,
      },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.equal(
      response.headers["content-disposition"],
      'inline; filename="recibo-123.pdf"',
    );
    assert.equal(response.headers["cache-control"], "private, max-age=60");
    assert.equal(response.body.toString("utf8"), "pdf-bytes");
    assert.equal(upstreamCalls.length, 1);
    assert.equal(
      upstreamCalls[0]?.authorization,
      "Bearer service-key-for-tests",
    );
    assert.equal(upstreamCalls[0]?.apikey, "service-key-for-tests");
  });

  it("proxies a signed storage url used by reports", async () => {
    const sourceUrl =
      "https://wruzbnpaiyvmaldkdcmf.supabase.co/storage/v1/object/sign/comprobantes/reportes/reporte-mensual.xlsx?token=abc123";
    let receivedUrl = "";

    globalThis.fetch = (async (input, init) => {
      receivedUrl = String(input);
      const headers = new Headers(init?.headers);

      assert.equal(headers.get("authorization"), "Bearer service-key-for-tests");
      assert.equal(headers.get("apikey"), "service-key-for-tests");

      return new Response(Buffer.from("xlsx-bytes"), {
        status: 200,
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }) as typeof fetch;

    const response = await request(
      `/api/storage-download?url=${encodeURIComponent(sourceUrl)}`,
      {
        Authorization: `Bearer ${authToken}`,
      },
    );

    assert.equal(response.status, 200);
    assert.equal(receivedUrl, sourceUrl);
    assert.equal(
      response.headers["content-type"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.equal(response.body.toString("utf8"), "xlsx-bytes");
  });
});

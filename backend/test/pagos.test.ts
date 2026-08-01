import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { detectReceiptFileSignature } from "../src/lib/file-signature.js";
import type {
  registerCashPayment as registerCashPaymentType,
  registerTransferPayment as registerTransferPaymentType,
} from "../src/services/pagos.js";

let registerCashPayment: typeof registerCashPaymentType;
let registerTransferPayment: typeof registerTransferPaymentType;

before(async () => {
  process.env.DATABASE_URL ??=
    "postgresql://user:pass@localhost:5432/sicose_test";
  process.env.DIRECT_URL ??=
    "postgresql://user:pass@localhost:5432/sicose_test";
  process.env.REDIS_URL ??= "redis://localhost:6379";
  process.env.JWT_SECRET ??= "test-secret-with-at-least-sixteen-chars";
  ({ registerCashPayment, registerTransferPayment } =
    await import("../src/services/pagos.js"));
});

function createPaymentClient(
  options: { paid?: boolean; existingPaymentsTotal?: number } = {},
) {
  const calls = {
    paymentCreated: undefined as unknown,
    debtUpdate: undefined as unknown,
    auditCreated: undefined as unknown,
  };

  const adeudo = {
    id: "00000000-0000-4000-8000-000000000002",
    ciudadanoId: "00000000-0000-4000-8000-000000000001",
    servicioId: "00000000-0000-4000-8000-000000000003",
    monto: 100,
    periodo: "2026-06",
    vencimiento: new Date("2026-06-30T00:00:00.000Z"),
    pagado: options.paid ?? false,
    estado: options.paid ? "pagado" : "pendiente",
    created_at: new Date("2026-06-01T00:00:00.000Z"),
    updated_at: new Date("2026-06-01T00:00:00.000Z"),
  };

  const tx = {
    adeudo: {
      findFirst: async () => adeudo,
      update: async (args: unknown) => {
        calls.debtUpdate = args;
        return { ...adeudo, pagado: true, estado: "pagado" };
      },
    },
    pago: {
      findUnique: async () => null,
      findFirst: async () => null,
      aggregate: async () => ({
        _sum: {
          monto: options.existingPaymentsTotal ?? 0,
        },
      }),
      create: async (args: { data: { folio: string } }) => {
        calls.paymentCreated = args;

        return {
          id: "00000000-0000-4000-8000-000000000004",
          ciudadanoId: adeudo.ciudadanoId,
          adeudoId: adeudo.id,
          monto: 100,
          metodo: "efectivo",
          folio: args.data.folio,
          recibo: args.data.folio,
          creado_por: "00000000-0000-4000-8000-000000000005",
          fecha: new Date("2026-06-18T00:00:00.000Z"),
          created_at: new Date("2026-06-18T00:00:00.000Z"),
          updated_at: new Date("2026-06-18T00:00:00.000Z"),
          ciudadano: { id: adeudo.ciudadanoId },
          adeudo,
        };
      },
    },
    auditoria: {
      create: async (args: unknown) => {
        calls.auditCreated = args;
        return args;
      },
    },
    $queryRaw: async () => {},
  };

  const client = {
    $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) =>
      callback(tx),
  };

  return { client, calls };
}

describe("registerCashPayment", () => {
  it("registers a cash payment, marks the debt as paid and writes audit data", async () => {
    const { client, calls } = createPaymentClient();

    const payment = await registerCashPayment(
      {
        metodo: "efectivo",
        ciudadanoId: "00000000-0000-4000-8000-000000000001",
        adeudoId: "00000000-0000-4000-8000-000000000002",
        monto: 100,
        usuarioId: "00000000-0000-4000-8000-000000000005",
        ip: "127.0.0.1",
      },
      client as never,
    );

    assert.match(payment.folio ?? "", /^SCS-20\d{2}-\d{6}$/);
    assert.deepEqual(calls.debtUpdate, {
      where: { id: "00000000-0000-4000-8000-000000000002" },
      data: {
        pagado: true,
        estado: "pagado",
      },
    });
    assert.deepEqual(calls.auditCreated, {
      data: {
        usuarioId: "00000000-0000-4000-8000-000000000005",
        accion: "REGISTRO_PAGO_EFECTIVO",
        entidad: "Pago",
        entidad_id: "00000000-0000-4000-8000-000000000004",
        ip: "127.0.0.1",
        timestamp: (calls.auditCreated as { data: { timestamp: Date } }).data
          .timestamp,
        detalles: (calls.auditCreated as { data: { detalles: string } }).data
          .detalles,
      },
    });
  });

  it("returns 409 when trying to pay an already paid debt", async () => {
    const { client } = createPaymentClient({ paid: true });

    await assert.rejects(
      registerCashPayment(
        {
          metodo: "efectivo",
          ciudadanoId: "00000000-0000-4000-8000-000000000001",
          adeudoId: "00000000-0000-4000-8000-000000000002",
          monto: 100,
          usuarioId: "00000000-0000-4000-8000-000000000005",
          ip: "127.0.0.1",
        },
        client as never,
      ),
      {
        name: "Error",
        message: "Debt is already paid",
        statusCode: 409,
      },
    );
  });

  it("rejects a payment greater than the pending debt amount", async () => {
    const { client } = createPaymentClient({ existingPaymentsTotal: 25 });

    await assert.rejects(
      registerCashPayment(
        {
          metodo: "efectivo",
          ciudadanoId: "00000000-0000-4000-8000-000000000001",
          adeudoId: "00000000-0000-4000-8000-000000000002",
          monto: 80,
          usuarioId: "00000000-0000-4000-8000-000000000005",
          ip: "127.0.0.1",
        },
        client as never,
      ),
      {
        name: "Error",
        message: "Payment amount cannot be greater than pending debt",
        statusCode: 400,
      },
    );
  });

  it("handles partial payments correctly without marking the debt as fully paid", async () => {
    const { client, calls } = createPaymentClient();

    const payment = await registerCashPayment(
      {
        metodo: "efectivo",
        ciudadanoId: "00000000-0000-4000-8000-000000000001",
        adeudoId: "00000000-0000-4000-8000-000000000002",
        monto: 40,
        usuarioId: "00000000-0000-4000-8000-000000000005",
        ip: "127.0.0.1",
      },
      client as never,
    );

    assert.equal(payment.monto, 100); // Mock returns full cash payment payload
    const updateCallArgs = calls.debtUpdate as {
      data: { pagado: boolean; estado: string };
    };
    assert.equal(updateCallArgs.data.pagado, false);
    assert.equal(updateCallArgs.data.estado, "parcial");
  });

  it("rejects duplicate cash payments within the 5 seconds lock window", async () => {
    const { client } = createPaymentClient();

    const txMockWithDuplicate = {
      ...client,
      $transaction: async (callback: any) => {
        const customTx = {
          adeudo: {
            findFirst: async () => ({
              id: "adeudo-1",
              monto: 100,
              pagado: false,
              estado: "pendiente",
            }),
            update: async () => ({ id: "adeudo-1" }),
          },
          pago: {
            findFirst: async () => ({ id: "pago-1" }),
            aggregate: async () => ({ _sum: { monto: 0 } }),
            create: async () => ({ id: "pago-2" }),
          },
          auditoria: {
            create: async () => ({}),
          },
          $queryRaw: async () => {},
        };
        return callback(customTx);
      },
    };

    await assert.rejects(
      registerCashPayment(
        {
          metodo: "efectivo",
          ciudadanoId: "00000000-0000-4000-8000-000000000001",
          adeudoId: "00000000-0000-4000-8000-000000000002",
          monto: 50,
          usuarioId: "00000000-0000-4000-8000-000000000005",
          ip: "127.0.0.1",
        },
        txMockWithDuplicate as never,
      ),
      {
        name: "Error",
        message: "Duplicate cash payment detected. Please wait.",
        statusCode: 429,
      },
    );
  });
});

describe("registerTransferPayment", () => {
  it("rejects an executable file even when it is uploaded as a receipt", async () => {
    const { client } = createPaymentClient();
    const exeLikeBuffer = Buffer.from("MZ fake executable payload");

    assert.equal(detectReceiptFileSignature(exeLikeBuffer), null);

    await assert.rejects(
      registerTransferPayment(
        {
          metodo: "transferencia",
          ciudadanoId: "00000000-0000-4000-8000-000000000001",
          adeudoId: "00000000-0000-4000-8000-000000000002",
          monto: 100,
          referenciaBancaria: "SPEI-123456",
          comprobante: {
            buffer: exeLikeBuffer,
            originalName: "comprobante.exe",
          },
          usuarioId: "00000000-0000-4000-8000-000000000005",
          ip: "127.0.0.1",
        },
        client as never,
        async () => {
          throw new Error("storage upload should not be called");
        },
      ),
      {
        name: "Error",
        message: "Receipt file must be a real jpg, png or pdf",
        statusCode: 400,
      },
    );
  });

  it("rejects duplicate transfer reference values with a Conflict error", async () => {
    const { client } = createPaymentClient();
    const validPdfBuffer = Buffer.from("%PDF-1.4 mock pdf contents");
    const txMockWithDuplicate = {
      ...client,
      $transaction: async (callback: any) => {
        const customTx = {
          adeudo: {
            findFirst: async () => ({
              id: "adeudo-1",
              monto: 100,
              pagado: false,
              estado: "pendiente",
            }),
            update: async () => ({ id: "adeudo-1" }),
          },
          pago: {
            findFirst: async () => ({ id: "pago-existing" }),
            aggregate: async () => ({ _sum: { monto: 0 } }),
            create: async () => ({ id: "pago-2" }),
          },
          comprobante: {
            create: async () => ({}),
          },
          auditoria: {
            create: async () => ({}),
          },
          $queryRaw: async () => {},
        };
        return callback(customTx);
      },
    };

    await assert.rejects(
      registerTransferPayment(
        {
          metodo: "transferencia",
          ciudadanoId: "00000000-0000-4000-8000-000000000001",
          adeudoId: "00000000-0000-4000-8000-000000000002",
          monto: 100,
          referenciaBancaria: "SPEI-DUPLICATE",
          comprobante: {
            buffer: validPdfBuffer,
            originalName: "comprobante.pdf",
          },
          usuarioId: "00000000-0000-4000-8000-000000000005",
          ip: "127.0.0.1",
        },
        txMockWithDuplicate as never,
        async () => ({
          url: "http://supabase.test/file.pdf",
          path: "file.pdf",
          bucket: "comprobantes",
        }),
      ),
      {
        name: "Error",
        message: "Payment with this bank reference is already registered",
        statusCode: 409,
      },
    );
  });
});

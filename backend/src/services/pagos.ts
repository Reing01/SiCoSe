import type { Prisma, Pago } from "@prisma/client";
import { createHash, randomInt } from "node:crypto";
import { detectReceiptFileSignature } from "../lib/file-signature.js";
import { prisma } from "../lib/prisma.js";
import { uploadPrivateReceipt } from "../lib/supabase-storage.js";
import { auditLogger } from "./audit.js";

const CASH_PAYMENT_METHOD = "efectivo";
const TRANSFER_PAYMENT_METHOD = "transferencia";
const PAID_STATUS = "pagado";
const PENDING_STATUS = "pendiente";
const MAX_FOLIO_ATTEMPTS = 10;
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

type TransactionClient = Prisma.TransactionClient;

export type RegisterCashPaymentInput = {
  metodo: string;
  ciudadanoId: string;
  adeudoId: string;
  monto: number;
  usuarioId: string;
  ip: string;
};

export type ReceiptUpload = {
  buffer: Buffer;
  originalName: string;
};

export type RegisterTransferPaymentInput = RegisterCashPaymentInput & {
  referenciaBancaria: string;
  comprobante: ReceiptUpload;
};

export class PaymentError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

function normalizePaymentMethod(method: string) {
  return method.trim().toLowerCase();
}

function createFolioCandidate(date = new Date()) {
  const year = date.getFullYear();
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, "0");

  return `SCS-${year}-${suffix}`;
}

async function generateUniqueFolio(tx: TransactionClient) {
  for (let attempt = 0; attempt < MAX_FOLIO_ATTEMPTS; attempt += 1) {
    const folio = createFolioCandidate();
    const existing = await tx.pago.findUnique({
      where: { folio },
      select: { id: true },
    });

    if (!existing) {
      return folio;
    }
  }

  throw new PaymentError(500, "Unable to generate unique payment folio");
}

type PrismaClientLike = Pick<typeof prisma, "$transaction">;
type StorageUploader = typeof uploadPrivateReceipt;

export async function registerCashPayment(
  input: RegisterCashPaymentInput,
  client: PrismaClientLike = prisma,
) {
  if (normalizePaymentMethod(input.metodo) !== CASH_PAYMENT_METHOD) {
    throw new PaymentError(400, "Payment method must be efectivo");
  }

  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new PaymentError(400, "Payment amount must be greater than zero");
  }

  return client.$transaction(async (tx) => {
    // 1. Prevent double submission within a 5-second window for cash
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentCashPayment = await tx.pago.findFirst({
      where: {
        adeudoId: input.adeudoId,
        monto: input.monto,
        metodo: CASH_PAYMENT_METHOD,
        creado_por: input.usuarioId,
        fecha: {
          gte: fiveSecondsAgo,
        },
      },
    });
    if (recentCashPayment) {
      throw new PaymentError(
        429,
        "Duplicate cash payment detected. Please wait.",
      );
    }

    const adeudo = await tx.adeudo.findFirst({
      where: {
        id: input.adeudoId,
        ciudadanoId: input.ciudadanoId,
      },
    });

    if (!adeudo) {
      throw new PaymentError(404, "Debt not found for citizen");
    }

    if (adeudo.pagado || adeudo.estado === PAID_STATUS) {
      throw new PaymentError(409, "Debt is already paid");
    }

    // 2. Lock the row to serialize concurrent transactions
    await tx.$queryRaw`SELECT 1 FROM "Adeudo" WHERE id = ${input.adeudoId} FOR UPDATE`;

    const paidAmount = await tx.pago.aggregate({
      where: { adeudoId: adeudo.id },
      _sum: { monto: true },
    });
    const pendingAmount = adeudo.monto - (paidAmount._sum.monto ?? 0);

    if (input.monto > pendingAmount) {
      throw new PaymentError(
        400,
        "Payment amount cannot be greater than pending debt",
      );
    }

    const folio = await generateUniqueFolio(tx);
    const payment = await tx.pago.create({
      data: {
        ciudadanoId: input.ciudadanoId,
        adeudoId: input.adeudoId,
        monto: input.monto,
        metodo: CASH_PAYMENT_METHOD,
        folio,
        recibo: folio,
        creado_por: input.usuarioId,
      },
      include: {
        ciudadano: true,
        adeudo: true,
      },
    });

    // 3. Mark paid only if this payment covers the remaining balance
    const isFullyPaid = Math.abs(pendingAmount - input.monto) < 0.001;
    await tx.adeudo.update({
      where: { id: adeudo.id },
      data: {
        pagado: isFullyPaid,
        estado: isFullyPaid ? PAID_STATUS : "parcial",
      },
    });

    await auditLogger(tx, {
      usuarioId: input.usuarioId,
      accion: "REGISTRO_PAGO_EFECTIVO",
      entidad: "Pago",
      entidadId: payment.id,
      ip: input.ip,
      detalles: {
        folio,
        ciudadanoId: input.ciudadanoId,
        adeudoId: input.adeudoId,
        monto: input.monto,
        estadoAnterior: adeudo.estado || PENDING_STATUS,
        estadoNuevo: isFullyPaid ? PAID_STATUS : "parcial",
      },
    });

    return payment as Pago & {
      ciudadano: unknown;
      adeudo: unknown;
    };
  });
}

function validateReceiptFile(file: ReceiptUpload) {
  if (!file.buffer.length) {
    throw new PaymentError(400, "Receipt file is required");
  }

  if (file.buffer.length > MAX_RECEIPT_BYTES) {
    throw new PaymentError(400, "Receipt file must be 5MB or smaller");
  }

  const signature = detectReceiptFileSignature(file.buffer);

  if (!signature) {
    throw new PaymentError(400, "Receipt file must be a real jpg, png or pdf");
  }

  return signature;
}

function createReceiptHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function registerTransferPayment(
  input: RegisterTransferPaymentInput,
  client: PrismaClientLike = prisma,
  storageUploader: StorageUploader = uploadPrivateReceipt,
) {
  if (normalizePaymentMethod(input.metodo) !== TRANSFER_PAYMENT_METHOD) {
    throw new PaymentError(400, "Payment method must be transferencia");
  }

  if (!input.referenciaBancaria.trim()) {
    throw new PaymentError(400, "Bank reference is required");
  }

  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    throw new PaymentError(400, "Payment amount must be greater than zero");
  }

  const fileSignature = validateReceiptFile(input.comprobante);
  const hashSha256 = createReceiptHash(input.comprobante.buffer);

  return client.$transaction(async (tx) => {
    // 1. Prevent duplicate transfer reference (double submission)
    const existingTransfer = await tx.pago.findFirst({
      where: {
        metodo: TRANSFER_PAYMENT_METHOD,
        recibo: input.referenciaBancaria.trim(),
      },
    });
    if (existingTransfer) {
      throw new PaymentError(
        409,
        "Payment with this bank reference is already registered",
      );
    }

    const adeudo = await tx.adeudo.findFirst({
      where: {
        id: input.adeudoId,
        ciudadanoId: input.ciudadanoId,
      },
    });

    if (!adeudo) {
      throw new PaymentError(404, "Debt not found for citizen");
    }

    if (adeudo.pagado || adeudo.estado === PAID_STATUS) {
      throw new PaymentError(409, "Debt is already paid");
    }

    // 2. Lock the row to serialize concurrent transactions
    await tx.$queryRaw`SELECT 1 FROM "Adeudo" WHERE id = ${input.adeudoId} FOR UPDATE`;

    const paidAmount = await tx.pago.aggregate({
      where: { adeudoId: adeudo.id },
      _sum: { monto: true },
    });
    const pendingAmount = adeudo.monto - (paidAmount._sum.monto ?? 0);

    if (input.monto > pendingAmount) {
      throw new PaymentError(
        400,
        "Payment amount cannot be greater than pending debt",
      );
    }

    const folio = await generateUniqueFolio(tx);
    const storagePath = `pagos/${new Date().getFullYear()}/${folio}.${fileSignature.extension}`;
    const storage = await storageUploader({
      path: storagePath,
      buffer: input.comprobante.buffer,
      contentType: fileSignature.mime,
    });

    const payment = await tx.pago.create({
      data: {
        ciudadanoId: input.ciudadanoId,
        adeudoId: input.adeudoId,
        monto: input.monto,
        metodo: TRANSFER_PAYMENT_METHOD,
        folio,
        recibo: input.referenciaBancaria.trim(),
        creado_por: input.usuarioId,
      },
      include: {
        ciudadano: true,
        adeudo: true,
      },
    });

    await tx.comprobante.create({
      data: {
        ciudadanoId: input.ciudadanoId,
        adeudoId: input.adeudoId,
        pagoId: payment.id,
        tipo: fileSignature.mime,
        url: storage.url,
        hash_sha256: hashSha256,
        nombre_archivo: input.comprobante.originalName,
        mime_type: fileSignature.mime,
        tamano_bytes: input.comprobante.buffer.length,
        storage_path: storage.path,
      },
    });

    // 3. Mark paid only if this payment covers the remaining balance
    const isFullyPaid = Math.abs(pendingAmount - input.monto) < 0.001;
    await tx.adeudo.update({
      where: { id: adeudo.id },
      data: {
        pagado: isFullyPaid,
        estado: isFullyPaid ? PAID_STATUS : "parcial",
      },
    });

    await auditLogger(tx, {
      usuarioId: input.usuarioId,
      accion: "REGISTRO_PAGO_TRANSFERENCIA",
      entidad: "Pago",
      entidadId: payment.id,
      ip: input.ip,
      detalles: {
        folio,
        referenciaBancaria: input.referenciaBancaria.trim(),
        ciudadanoId: input.ciudadanoId,
        adeudoId: input.adeudoId,
        monto: input.monto,
        comprobanteUrl: storage.url,
        hashSha256,
        estadoAnterior: adeudo.estado || PENDING_STATUS,
        estadoNuevo: isFullyPaid ? PAID_STATUS : "parcial",
      },
    });

    return {
      ...payment,
      comprobante: {
        url: storage.url,
        hash_sha256: hashSha256,
        mime_type: fileSignature.mime,
        storage_path: storage.path,
      },
    } as Pago & {
      ciudadano: unknown;
      adeudo: unknown;
      comprobante: {
        url: string;
        hash_sha256: string;
        mime_type: string;
        storage_path: string;
      };
    };
  });
}

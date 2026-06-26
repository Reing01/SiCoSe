import type { Prisma } from '@prisma/client'

type AuditTransactionClient = Pick<Prisma.TransactionClient, 'auditoria'>

export type AuditEntryInput = {
  usuarioId: string
  accion: string
  entidad: string
  entidadId: string
  detalles?: Record<string, unknown>
  ip?: string
}

export async function auditLogger(
  tx: AuditTransactionClient,
  input: AuditEntryInput,
) {
  await tx.auditoria.create({
    data: {
      usuarioId: input.usuarioId,
      accion: input.accion,
      entidad: input.entidad,
      entidad_id: input.entidadId,
      ip: input.ip,
      timestamp: new Date(),
      detalles: input.detalles ? JSON.stringify(input.detalles) : undefined,
    },
  })
}

import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const DEFAULT_PAGE_SIZE = 20

export type ListAuditoriasInput = {
  pagina?: number
  limite?: number
  usuarioId?: string
  accion?: string
  entidad?: string
  desde?: string
  hasta?: string
}

type AuditoriaClient = Pick<typeof prisma, '$transaction' | 'auditoria'>

function toUtcStart(dateText: string) {
  return new Date(`${dateText}T00:00:00.000Z`)
}

function toUtcEnd(dateText: string) {
  return new Date(`${dateText}T23:59:59.999Z`)
}

function buildWhere(input: ListAuditoriasInput): Prisma.AuditoriaWhereInput {
  const where: Prisma.AuditoriaWhereInput = {}
  let timestampFilter: Prisma.DateTimeFilter | undefined

  if (input.usuarioId) {
    where.usuarioId = input.usuarioId
  }

  if (input.accion) {
    where.accion = {
      contains: input.accion,
      mode: 'insensitive',
    }
  }

  if (input.entidad) {
    where.entidad = {
      contains: input.entidad,
      mode: 'insensitive',
    }
  }

  if (input.desde || input.hasta) {
    timestampFilter = {}
  }

  if (input.desde) {
    timestampFilter ??= {}
    timestampFilter.gte = toUtcStart(input.desde)
  }

  if (input.hasta) {
    timestampFilter ??= {}
    timestampFilter.lte = toUtcEnd(input.hasta)
  }

  if (timestampFilter) {
    where.timestamp = timestampFilter
  }

  return where
}

export async function listAuditorias(
  input: ListAuditoriasInput = {},
  client: AuditoriaClient = prisma,
) {
  const pagina = Math.max(1, input.pagina ?? 1)
  const limite = Math.min(100, Math.max(1, input.limite ?? DEFAULT_PAGE_SIZE))
  const where = buildWhere(input)

  const [total, auditorias] = await client.$transaction([
    client.auditoria.count({ where }),
    client.auditoria.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      skip: (pagina - 1) * limite,
      take: limite,
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
          },
        },
      },
    }),
  ])

  return {
    data: auditorias,
    metadata: {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    },
  }
}
import { prisma } from '../src/lib/prisma.js'

const WATER_MONTHLY_FEE_MXN = 30

async function main() {
  const waterServices = await prisma.servicio.findMany({
    where: {
      nombre: {
        contains: 'agua',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      nombre: true,
      tarifa: true,
    },
  })

  if (waterServices.length === 0) {
    console.log('No water services were found. Nothing to normalize.')
    return
  }

  const waterServiceIds = waterServices.map((service) => service.id)

  const [serviceResult, adeudosToNormalize, pagosToNormalize] = await Promise.all([
    prisma.servicio.updateMany({
      where: {
        id: { in: waterServiceIds },
        tarifa: {
          not: WATER_MONTHLY_FEE_MXN,
        },
      },
      data: {
        tarifa: WATER_MONTHLY_FEE_MXN,
      },
    }),
    prisma.adeudo.findMany({
      where: {
        servicioId: { in: waterServiceIds },
        monto: {
          not: WATER_MONTHLY_FEE_MXN,
        },
      },
      select: {
        id: true,
        monto: true,
        periodo: true,
      },
    }),
    prisma.pago.findMany({
      where: {
        monto: {
          not: WATER_MONTHLY_FEE_MXN,
        },
        adeudo: {
          servicioId: {
            in: waterServiceIds,
          },
        },
      },
      select: {
        id: true,
        monto: true,
        adeudoId: true,
      },
    }),
  ])

  const adeudoIds = adeudosToNormalize.map((adeudo) => adeudo.id)
  const pagoIds = pagosToNormalize.map((pago) => pago.id)

  const [adeudoResult, pagoResult] = await Promise.all([
    adeudoIds.length > 0
      ? prisma.adeudo.updateMany({
          where: {
            id: {
              in: adeudoIds,
            },
          },
          data: {
            monto: WATER_MONTHLY_FEE_MXN,
          },
        })
      : Promise.resolve({ count: 0 }),
    pagoIds.length > 0
      ? prisma.pago.updateMany({
          where: {
            id: {
              in: pagoIds,
            },
          },
          data: {
            monto: WATER_MONTHLY_FEE_MXN,
          },
        })
      : Promise.resolve({ count: 0 }),
  ])

  console.log(
    [
      `Water services normalized: ${serviceResult.count}`,
      `Adeudos normalized: ${adeudoResult.count}`,
      `Payments normalized: ${pagoResult.count}`,
      `Affected water services: ${waterServices
        .map((service) => service.nombre)
        .join(', ')}`,
    ].join('\n'),
  )
}

main()
  .catch((error) => {
    console.error('Water history normalization failed')
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

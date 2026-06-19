import { createRequire } from 'node:module'
import type { Reporte, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { uploadPrivateStorageObject } from '../lib/supabase-storage.js'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit') as new (options?: Record<string, unknown>) => PdfDocument

const INSTITUTIONAL_BLUE = '#0B4F8A'
const TEAL = '#008C8C'
const DARK_TEXT = '#1F2937'
const MUTED_TEXT = '#6B7280'
const LIGHT_FILL = '#F3F7FA'
const TABLE_HEADER_FILL = '#DCEAF5'
const TABLE_BORDER = '#D8E3EC'

type PdfDocument = {
  fontSize(size: number): PdfDocument
  font(name: string): PdfDocument
  fillColor(color: string): PdfDocument
  rect(x: number, y: number, width: number, height: number): PdfDocument
  fill(color?: string): PdfDocument
  strokeColor(color: string): PdfDocument
  lineWidth(width: number): PdfDocument
  moveTo(x: number, y: number): PdfDocument
  lineTo(x: number, y: number): PdfDocument
  stroke(): PdfDocument
  text(text: string, x?: number, y?: number, options?: Record<string, unknown>): PdfDocument
  moveDown(lines?: number): PdfDocument
  addPage(): PdfDocument
  end(): void
  on(event: 'data', callback: (chunk: Buffer) => void): void
  on(event: 'end', callback: () => void): void
  on(event: 'error', callback: (error: Error) => void): void
  page: {
    height: number
    width: number
    margins: { top: number; bottom: number; left: number; right: number }
  }
  y: number
}

type PrismaClientLike = Pick<typeof prisma, '$transaction'>
type StorageUploader = typeof uploadPrivateStorageObject

export type GenerateMonthlyReportInput = {
  periodo?: string
  usuarioId: string
}

type PaymentRow = {
  monto: number
  fecha: Date
  adeudo: {
    servicio: {
      id: string
      nombre: string
    }
  }
}

type OverdueDebtRow = {
  id: string
  ciudadano: {
    nombre: string
    apellido: string
    clave_catastral: string
    zona: string | null
  }
  servicio: {
    nombre: string
  }
  periodo: string
  monto: number
  vencimiento: Date
}

type ServiceRevenueRow = {
  servicioId: string
  servicio: string
  pagos: number
  recaudado: number
  promedio: number
}

export class ReportError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

function normalizePeriod(periodo?: string) {
  const normalized = periodo?.trim() || getCurrentPeriod()

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalized)) {
    throw new ReportError(400, 'Invalid period format. Expected YYYY-MM')
  }

  return normalized
}

function getCurrentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getPreviousPeriod(periodo: string) {
  const [yearText, monthText] = periodo.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const previousMonth = month - 1

  if (previousMonth >= 1) {
    return `${year}-${String(previousMonth).padStart(2, '0')}`
  }

  return `${year - 1}-12`
}

function getPeriodRange(periodo: string) {
  const [yearText, monthText] = periodo.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  return { start, end }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

function formatPeriod(periodo: string) {
  const [yearText, monthText] = periodo.split('-')
  const monthIndex = Number(monthText) - 1
  const monthLabel = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(yearText), monthIndex, 1)))

  return `${monthLabel} ${yearText}`
}

function addPageIfNeeded(doc: PdfDocument, requiredHeight: number) {
  if (doc.y + requiredHeight <= doc.page.height - doc.page.margins.bottom) {
    return
  }

  doc.addPage()
}

function addHeader(doc: PdfDocument, periodo: string) {
  doc.rect(0, 0, doc.page.width, 104).fill(INSTITUTIONAL_BLUE)
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('SiCoSe - Reporte Mensual', 54, 28)
  doc
    .font('Helvetica')
    .fontSize(10)
    .text('Recaudacion, cartera vencida y comparativo operativo', 54, 56)
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`Periodo: ${formatPeriod(periodo)}`, 404, 32, {
      width: 154,
      align: 'right',
    })
}

function addSummaryCard(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  note: string,
) {
  doc.rect(x, y, width, height).fill(LIGHT_FILL)
  doc.rect(x, y, width, height).strokeColor(TABLE_BORDER).lineWidth(1).stroke()
  doc
    .fillColor(MUTED_TEXT)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label, x + 14, y + 12, { width: width - 28 })
  doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(18).text(value, x + 14, y + 30, {
    width: width - 28,
  })
  doc.fillColor(MUTED_TEXT).font('Helvetica').fontSize(8.5).text(note, x + 14, y + 56, {
    width: width - 28,
  })
}

function drawSectionTitle(doc: PdfDocument, title: string) {
  addPageIfNeeded(doc, 42)
  doc.fillColor(INSTITUTIONAL_BLUE).font('Helvetica-Bold').fontSize(13).text(title)
  doc
    .strokeColor(TABLE_BORDER)
    .lineWidth(1)
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
    .stroke()
  doc.moveDown(1)
}

function drawTable<T>(
  doc: PdfDocument,
  columns: Array<{
    header: string
    width: number
    align?: 'left' | 'right' | 'center'
    render: (row: T) => string
  }>,
  rows: T[],
  rowHeight = 30,
) {
  const xStart = doc.page.margins.left
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)

  const drawHeaderRow = () => {
    doc.rect(xStart, doc.y, totalWidth, 26).fill(TABLE_HEADER_FILL)
    doc.rect(xStart, doc.y, totalWidth, 26).strokeColor(TABLE_BORDER).lineWidth(1).stroke()

    let x = xStart
    for (const column of columns) {
      doc
        .fillColor(DARK_TEXT)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(column.header, x + 6, doc.y + 8, {
          width: column.width - 12,
          align: column.align ?? 'left',
        })
      x += column.width
    }

    doc.y += 26
  }

  drawHeaderRow()

  for (const row of rows) {
    addPageIfNeeded(doc, rowHeight + 8)

    const rowY = doc.y
    doc.rect(xStart, rowY, totalWidth, rowHeight).strokeColor(TABLE_BORDER).lineWidth(1).stroke()

    let x = xStart
    for (const column of columns) {
      doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(9)
      doc.text(column.render(row), x + 6, rowY + 7, {
        width: column.width - 12,
        height: rowHeight - 10,
        align: column.align ?? 'left',
        ellipsis: true,
      })
      x += column.width
    }

    doc.y = rowY + rowHeight
  }
}

function createServiceRevenue(rows: PaymentRow[]): ServiceRevenueRow[] {
  const grouped = new Map<
    string,
    {
      servicio: string
      pagos: number
      recaudado: number
    }
  >()

  for (const payment of rows) {
    const service = payment.adeudo.servicio
    const current = grouped.get(service.id) ?? {
      servicio: service.nombre,
      pagos: 0,
      recaudado: 0,
    }

    current.pagos += 1
    current.recaudado += payment.monto
    grouped.set(service.id, current)
  }

  return Array.from(grouped.entries())
    .map(([serviceId, value]) => ({
      servicioId: serviceId,
      servicio: value.servicio,
      pagos: value.pagos,
      recaudado: value.recaudado,
      promedio: value.pagos > 0 ? value.recaudado / value.pagos : 0,
    }))
    .sort((left, right) => right.recaudado - left.recaudado)
}

async function buildMonthlyReportPdf(input: {
  periodo: string
  generatedAt: Date
  currentPayments: PaymentRow[]
  previousPayments: PaymentRow[]
  serviceRevenue: ServiceRevenueRow[]
  topMorosos: OverdueDebtRow[]
  totalMorosos: number
  carteraVencida: number
}) {
  const chunks: Buffer[] = []
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 54,
    info: {
      Title: `Reporte mensual ${input.periodo}`,
      Author: 'SiCoSe',
      Subject: 'Reporte mensual de recaudacion',
    },
  })

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    addHeader(doc, input.periodo)
    doc.y = 126

    doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(10.5).text(
      'Este documento resume la recaudacion mensual, los principales adeudos vencidos y el comportamiento frente al mes anterior.',
      doc.page.margins.left,
      doc.y,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right },
    )

    doc.moveDown(2)

    const currentTotal = input.currentPayments.reduce((sum, payment) => sum + payment.monto, 0)
    const previousTotal = input.previousPayments.reduce((sum, payment) => sum + payment.monto, 0)
    const difference = currentTotal - previousTotal
    const percentChange = previousTotal > 0 ? (difference / previousTotal) * 100 : null

    drawSectionTitle(doc, 'Resumen ejecutivo')
    const cardWidth = 159
    const cardHeight = 82
    const gap = 13
    const startX = doc.page.margins.left
    const rowY = doc.y

    addSummaryCard(
      doc,
      startX,
      rowY,
      cardWidth,
      cardHeight,
      'Recaudado mes',
      formatCurrency(currentTotal),
      `${input.currentPayments.length} pagos registrados`,
    )
    addSummaryCard(
      doc,
      startX + cardWidth + gap,
      rowY,
      cardWidth,
      cardHeight,
      'Mes anterior',
      formatCurrency(previousTotal),
      `${input.previousPayments.length} pagos en el periodo previo`,
    )
    addSummaryCard(
      doc,
      startX + (cardWidth + gap) * 2,
      rowY,
      cardWidth,
      cardHeight,
      'Variacion',
      `${difference >= 0 ? '+' : ''}${formatCurrency(difference)}`,
      percentChange === null ? 'Sin base comparativa' : `${percentChange.toFixed(1)}% vs mes anterior`,
    )

    doc.y = rowY + cardHeight + 18

    addSummaryCard(
      doc,
      startX,
      doc.y,
      cardWidth,
      cardHeight,
      'Cartera vencida',
      formatCurrency(input.carteraVencida),
      `${input.totalMorosos} adeudos morosos detectados`,
    )
    addSummaryCard(
      doc,
      startX + cardWidth + gap,
      doc.y,
      cardWidth,
      cardHeight,
      'Cobranza actual',
      `${input.serviceRevenue.length} servicios`,
      'Distribucion por servicio facturado',
    )
    addSummaryCard(
      doc,
      startX + (cardWidth + gap) * 2,
      doc.y,
      cardWidth,
      cardHeight,
      'Fecha de corte',
      formatDate(input.generatedAt),
      'Generado automaticamente por SiCoSe',
    )

    doc.y += cardHeight + 18

    drawSectionTitle(doc, 'Recaudacion por servicio')
    drawTable(
      doc,
      [
        {
          header: 'Servicio',
          width: 250,
          render: (row: ServiceRevenueRow) => row.servicio,
        },
        {
          header: 'Pagos',
          width: 70,
          align: 'right',
          render: (row: ServiceRevenueRow) => String(row.pagos),
        },
        {
          header: 'Recaudado',
          width: 110,
          align: 'right',
          render: (row: ServiceRevenueRow) => formatCurrency(row.recaudado),
        },
        {
          header: 'Promedio',
          width: 74,
          align: 'right',
          render: (row: ServiceRevenueRow) => formatCurrency(row.promedio),
        },
      ],
      input.serviceRevenue,
    )

    const serviceTotal = input.serviceRevenue.reduce((sum, row) => sum + row.recaudado, 0)
    doc
      .fillColor(TEAL)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(
        `Total recaudado: ${formatCurrency(serviceTotal)}`,
        doc.page.margins.left,
        doc.y,
        {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'right',
        },
      )

    doc.moveDown(1.4)

    drawSectionTitle(doc, 'Top 10 morosos')
    drawTable(
      doc,
      [
        {
          header: 'Ciudadano',
          width: 190,
          render: (row: OverdueDebtRow) => `${row.ciudadano.nombre} ${row.ciudadano.apellido}`.trim(),
        },
        {
          header: 'Servicio',
          width: 130,
          render: (row: OverdueDebtRow) => row.servicio.nombre,
        },
        {
          header: 'Periodo',
          width: 66,
          align: 'center',
          render: (row: OverdueDebtRow) => row.periodo,
        },
        {
          header: 'Vencimiento',
          width: 74,
          align: 'center',
          render: (row: OverdueDebtRow) => formatDate(row.vencimiento),
        },
        {
          header: 'Monto',
          width: 72,
          align: 'right',
          render: (row: OverdueDebtRow) => formatCurrency(row.monto),
        },
      ],
      input.topMorosos,
      34,
    )

    doc.moveDown(1.2)
    doc
      .fillColor(MUTED_TEXT)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Reporte almacenado con folio de periodo ${input.periodo}. La version historica queda disponible para consulta permanente en el sistema.`,
        doc.page.margins.left,
        doc.y,
        {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'left',
        },
      )

    doc.end()
  })
}

export async function generateMonthlyReport(
  input: GenerateMonthlyReportInput = { usuarioId: '' },
  client: PrismaClientLike = prisma,
  storageUploader: StorageUploader = uploadPrivateStorageObject,
) {
  if (!input.usuarioId.trim()) {
    throw new ReportError(400, 'User id is required to generate the report')
  }

  const periodo = normalizePeriod(input.periodo)
  const previousPeriodo = getPreviousPeriod(periodo)
  const currentRange = getPeriodRange(periodo)
  const previousRange = getPeriodRange(previousPeriodo)

  return client.$transaction(async (tx) => {
    const [currentPayments, previousPayments, topMorososResult] = await Promise.all([
      tx.pago.findMany({
        where: {
          fecha: {
            gte: currentRange.start,
            lte: currentRange.end,
          },
        },
        include: {
          adeudo: {
            include: {
              servicio: true,
            },
          },
        },
        orderBy: {
          fecha: 'asc',
        },
      }) as Promise<PaymentRow[]>,
      tx.pago.findMany({
        where: {
          fecha: {
            gte: previousRange.start,
            lte: previousRange.end,
          },
        },
        include: {
          adeudo: {
            include: {
              servicio: true,
            },
          },
        },
        orderBy: {
          fecha: 'asc',
        },
      }) as Promise<PaymentRow[]>,
      (async () => {
        const { end } = getPeriodRange(periodo)
        const where: Prisma.AdeudoWhereInput = {
          pagado: false,
          OR: [
            {
              estado: 'vencido',
            },
            {
              vencimiento: {
                lt: end,
              },
            },
          ],
        }

        const [total, cartera] = await Promise.all([
          tx.adeudo.count({ where }),
          tx.adeudo.aggregate({
            where,
            _sum: {
              monto: true,
            },
          }),
        ])

        const rows = await tx.adeudo.findMany({
          where,
          include: {
            ciudadano: true,
            servicio: true,
          },
          orderBy: {
            monto: 'desc',
          },
          take: 10,
        })

        return {
          total,
          carteraVencida: cartera._sum.monto ?? 0,
          rows: rows as OverdueDebtRow[],
        }
      })(),
    ])

    const serviceRevenue = createServiceRevenue(currentPayments)
    const generatedAt = new Date()
    const pdfBuffer = await buildMonthlyReportPdf({
      periodo,
      generatedAt,
      currentPayments,
      previousPayments,
      serviceRevenue,
      topMorosos: topMorososResult.rows,
      totalMorosos: topMorososResult.total,
      carteraVencida: topMorososResult.carteraVencida,
    })

    const fileName = `reporte-mensual-${periodo}.pdf`
    const storagePath = `reportes/${periodo}/${Date.now()}-${fileName}`
    const storage = await storageUploader({
      path: storagePath,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    })

    const report = await tx.reporte.create({
      data: {
        titulo: `Reporte mensual ${formatPeriod(periodo)}`,
        descripcion:
          'PDF institucional con recaudacion por servicio, top de morosos y comparativo frente al mes anterior.',
        tipo: 'MENSUAL',
        estado: 'GENERADO',
        periodo,
        archivo_url: storage.url,
        archivo_path: storage.path,
        generado_por: input.usuarioId,
        resumen_json: {
          periodo,
          periodoAnterior: previousPeriodo,
          recaudadoActual: currentPayments.reduce((sum, payment) => sum + payment.monto, 0),
          recaudadoAnterior: previousPayments.reduce((sum, payment) => sum + payment.monto, 0),
          carteraVencida: topMorososResult.carteraVencida,
          morosos: topMorososResult.total,
          recaudacionPorServicio: serviceRevenue,
          topMorosos: topMorososResult.rows,
        },
      },
    })

    return {
      report: report as Reporte,
      storage,
      periodo,
      previousPeriodo,
      serviceRevenue,
      topMorosos: topMorososResult.rows,
      carteraVencida: topMorososResult.carteraVencida,
      pdfFilename: fileName,
    }
  })
}

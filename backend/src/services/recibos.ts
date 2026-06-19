import { createRequire } from 'node:module'
import { prisma } from '../lib/prisma.js'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit') as new (options?: Record<string, unknown>) => PdfDocument

const INSTITUTIONAL_BLUE = '#0B4F8A'
const TEAL = '#008C8C'
const DARK_TEXT = '#1F2937'
const MUTED_TEXT = '#6B7280'
const LIGHT_FILL = '#F3F7FA'

type PdfDocument = {
  fontSize(size: number): PdfDocument
  font(name: string): PdfDocument
  fillColor(color: string): PdfDocument
  fillOpacity(opacity: number): PdfDocument
  rect(x: number, y: number, width: number, height: number): PdfDocument
  fill(color?: string): PdfDocument
  strokeColor(color: string): PdfDocument
  lineWidth(width: number): PdfDocument
  moveTo(x: number, y: number): PdfDocument
  lineTo(x: number, y: number): PdfDocument
  stroke(): PdfDocument
  text(text: string, x?: number, y?: number, options?: Record<string, unknown>): PdfDocument
  moveDown(lines?: number): PdfDocument
  end(): void
  on(event: 'data', callback: (chunk: Buffer) => void): void
  on(event: 'end', callback: () => void): void
  on(event: 'error', callback: (error: Error) => void): void
  y: number
}

type PaymentReceipt = Awaited<ReturnType<typeof findPaymentForReceipt>>

export class ReceiptError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

function fullName(ciudadano: { nombre: string; apellido: string }) {
  return `${ciudadano.nombre} ${ciudadano.apellido}`.trim()
}

async function findPaymentForReceipt(paymentId: string) {
  return prisma.pago.findUnique({
    where: { id: paymentId },
    include: {
      ciudadano: true,
      adeudo: {
        include: {
          servicio: true,
        },
      },
    },
  })
}

function addHeader(doc: PdfDocument, folio: string) {
  doc.rect(0, 0, 612, 96).fill(INSTITUTIONAL_BLUE)
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text('SiCoSe - Recibo de Pago', 54, 28)
  doc
    .font('Helvetica')
    .fontSize(10)
    .text('Sistema de Control de Servicios', 54, 54)
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`Folio: ${folio}`, 390, 36, {
      width: 150,
      align: 'right',
    })
}

function addLabelValue(doc: PdfDocument, label: string, value: string, x: number, y: number) {
  doc.fillColor(MUTED_TEXT).font('Helvetica-Bold').fontSize(9).text(label, x, y)
  doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(11).text(value || 'No registrado', x, y + 14)
}

function addSectionTitle(doc: PdfDocument, title: string, y: number) {
  doc.fillColor(INSTITUTIONAL_BLUE).font('Helvetica-Bold').fontSize(13).text(title, 54, y)
  doc.strokeColor('#D8E3EC').lineWidth(1).moveTo(54, y + 19).lineTo(558, y + 19).stroke()
}

function addAmountBox(doc: PdfDocument, amount: number, y: number) {
  doc.rect(54, y, 504, 78).fill(LIGHT_FILL)
  doc
    .fillColor(MUTED_TEXT)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('MONTO PAGADO', 78, y + 16)
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(28).text(formatCurrency(amount), 78, y + 34)
}

function addSignature(doc: PdfDocument, y: number) {
  doc.strokeColor('#9CA3AF').lineWidth(1).moveTo(168, y).lineTo(444, y).stroke()
  doc
    .fillColor(DARK_TEXT)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Firma del tesorero', 168, y + 10, {
      width: 276,
      align: 'center',
    })
  doc
    .fillColor(MUTED_TEXT)
    .font('Helvetica')
    .fontSize(9)
    .text('Recibo generado automaticamente por SiCoSe', 54, y + 48, {
      width: 504,
      align: 'center',
    })
}

function buildReceiptPdf(payment: NonNullable<PaymentReceipt>) {
  const chunks: Buffer[] = []
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 54,
    info: {
      Title: `Recibo ${payment.folio ?? payment.id}`,
      Author: 'SiCoSe',
      Subject: 'Recibo de pago',
    },
  })

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const folio = payment.folio ?? payment.recibo ?? payment.id
    addHeader(doc, folio)

    doc
      .fillColor(DARK_TEXT)
      .font('Helvetica')
      .fontSize(10)
      .text('Comprobante oficial de pago registrado en el sistema SiCoSe.', 54, 122)

    addAmountBox(doc, payment.monto, 150)

    addSectionTitle(doc, 'Datos del pago', 252)
    addLabelValue(doc, 'Fecha', formatDate(payment.fecha), 54, 286)
    addLabelValue(doc, 'Metodo', payment.metodo, 318, 286)
    addLabelValue(doc, 'Folio', folio, 54, 338)
    addLabelValue(doc, 'ID de pago', payment.id, 318, 338)

    addSectionTitle(doc, 'Datos del ciudadano', 410)
    addLabelValue(doc, 'Nombre', fullName(payment.ciudadano), 54, 444)
    addLabelValue(doc, 'Clave catastral', payment.ciudadano.clave_catastral, 318, 444)
    addLabelValue(doc, 'Zona', payment.ciudadano.zona ?? 'No registrada', 54, 496)
    addLabelValue(doc, 'Direccion', payment.ciudadano.direccion ?? 'No registrada', 318, 496)

    addSectionTitle(doc, 'Servicio pagado', 568)
    addLabelValue(doc, 'Servicio', payment.adeudo.servicio.nombre, 54, 602)
    addLabelValue(doc, 'Periodo', payment.adeudo.periodo, 318, 602)
    addLabelValue(doc, 'Estado del adeudo', payment.adeudo.estado, 54, 654)
    addLabelValue(doc, 'Vencimiento', formatDate(payment.adeudo.vencimiento), 318, 654)

    addSignature(doc, 720)
    doc.end()
  })
}

export async function generatePaymentReceiptPdf(paymentId: string) {
  const payment = await findPaymentForReceipt(paymentId)

  if (!payment) {
    throw new ReceiptError(404, 'Payment not found')
  }

  if (!payment.folio && !payment.recibo) {
    throw new ReceiptError(409, 'Payment has no receipt folio')
  }

  const folio = payment.folio ?? payment.recibo ?? payment.id
  const buffer = await buildReceiptPdf(payment)

  return {
    filename: `recibo-${folio}.pdf`,
    buffer,
  }
}

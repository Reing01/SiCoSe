import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { authenticate, requireRole } from '../middleware/require-role.js'
import type { AuthenticatedRequest } from '../types/auth.js'
import { PaymentError, registerCashPayment, registerTransferPayment } from '../services/pagos.js'
import { generatePaymentReceiptPdf, ReceiptError } from '../services/recibos.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
})

const createCashPaymentSchema = z.object({
  metodo: z.literal('efectivo'),
  ciudadano_id: z.string().uuid(),
  adeudo_id: z.string().uuid(),
  monto: z.number().positive(),
})

const createTransferPaymentSchema = z.object({
  metodo: z.literal('transferencia'),
  ciudadano_id: z.string().uuid(),
  adeudo_id: z.string().uuid(),
  monto: z.coerce.number().positive(),
  referencia_bancaria: z.string().min(1),
})

function getRequestIp(request: AuthenticatedRequest) {
  return request.ip || request.socket.remoteAddress || 'unknown'
}

export const pagosRouter = Router()

function getParamId(id: string | string[] | undefined) {
  return Array.isArray(id) ? id[0] : id
}

pagosRouter.get(
  '/:id/recibo',
  authenticate,
  requireRole('admin', 'tesorero', 'secretaria'),
  async (request, response, next) => {
    try {
      const paymentId = getParamId(request.params.id)

      if (!paymentId) {
        return response.status(400).json({
          error: 'Missing payment id',
          code: 400,
        })
      }

      const receipt = await generatePaymentReceiptPdf(paymentId)

      response.setHeader('Content-Type', 'application/pdf')
      response.setHeader('Content-Length', String(receipt.buffer.length))
      response.setHeader('Content-Disposition', `inline; filename="${receipt.filename}"`)

      return response.send(receipt.buffer)
    } catch (error) {
      if (error instanceof ReceiptError) {
        return response.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode,
        })
      }

      return next(error)
    }
  },
)

pagosRouter.post(
  '/',
  authenticate,
  requireRole('admin', 'tesorero', 'secretaria'),
  upload.single('comprobante'),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      if (request.body?.metodo === 'transferencia') {
        const parsed = createTransferPaymentSchema.safeParse(request.body)

        if (!parsed.success) {
          return response.status(400).json({
            error: 'Invalid transfer payment payload',
            details: parsed.error.flatten(),
          })
        }

        if (!request.file) {
          return response.status(400).json({
            error: 'Receipt file is required',
            code: 400,
          })
        }

        const payment = await registerTransferPayment({
          metodo: parsed.data.metodo,
          ciudadanoId: parsed.data.ciudadano_id,
          adeudoId: parsed.data.adeudo_id,
          monto: parsed.data.monto,
          referenciaBancaria: parsed.data.referencia_bancaria,
          comprobante: {
            buffer: request.file.buffer,
            originalName: request.file.originalname,
          },
          usuarioId: request.user?.id ?? '',
          ip: getRequestIp(request),
        })

        return response.status(201).json({
          data: payment,
        })
      }

      const parsed = createCashPaymentSchema.safeParse(request.body)

      if (!parsed.success) {
        return response.status(400).json({
          error: 'Invalid payment payload',
          details: parsed.error.flatten(),
        })
      }

      const payment = await registerCashPayment({
        metodo: parsed.data.metodo,
        ciudadanoId: parsed.data.ciudadano_id,
        adeudoId: parsed.data.adeudo_id,
        monto: parsed.data.monto,
        usuarioId: request.user?.id ?? '',
        ip: getRequestIp(request),
      })

      return response.status(201).json({
        data: payment,
      })
    } catch (error) {
      if (error instanceof PaymentError) {
        return response.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode,
        })
      }

      return next(error)
    }
  },
)

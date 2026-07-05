import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../middleware/require-role.js'
import { listAuditorias } from '../services/auditorias.js'

const auditoriasQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  usuario_id: z.string().uuid().optional(),
  accion: z.string().trim().min(1).optional(),
  entidad: z.string().trim().min(1).optional(),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  hasta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const auditoriasRouter = Router()

auditoriasRouter.use(authenticate)
auditoriasRouter.use(requireRole('admin'))

auditoriasRouter.get('/', async (request, response, next) => {
  try {
    const parsed = auditoriasQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return response.status(400).json({
        error: 'Invalid auditorias query',
        details: parsed.error.flatten(),
      })
    }

    const result = await listAuditorias({
      pagina: parsed.data.pagina,
      limite: parsed.data.limite,
      usuarioId: parsed.data.usuario_id,
      accion: parsed.data.accion,
      entidad: parsed.data.entidad,
      desde: parsed.data.desde,
      hasta: parsed.data.hasta,
    })

    return response.json(result)
  } catch (error) {
    next(error)
  }
})

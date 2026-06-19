import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

const leadSchema = z.object({
  nombre: z.string().min(2),
  comite: z.string().min(2),
  contacto: z.string().min(3),
})

export const leadsRouter = Router()

leadsRouter.post('/', (request, response) => {
  const parsed = leadSchema.safeParse(request.body)

  if (!parsed.success) {
    return response.status(400).json({
      error: 'Invalid lead payload',
      details: parsed.error.flatten(),
    })
  }

  return response.status(201).json({
    message: 'Lead received',
    data: {
      ...parsed.data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    },
  })
})

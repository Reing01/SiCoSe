import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { adeudosRouter } from './routes/adeudos.js'
import { authRouter } from './routes/auth.js'
import { ciudadanosRouter } from './routes/ciudadanos.js'
import { dashboardRouter } from './routes/dashboard.js'
import { healthRouter } from './routes/health.js'
import { leadsRouter } from './routes/leads.js'
import { pagosRouter } from './routes/pagos.js'
import { reportesRouter } from './routes/reportes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(morgan('dev'))

  app.use('/health', healthRouter)
  app.use('/api/health', healthRouter)
  app.use('/api/leads', leadsRouter)
  app.use('/api/adeudos', adeudosRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/adeudos', adeudosRouter)
  app.use('/api/ciudadanos', ciudadanosRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/pagos', pagosRouter)
  app.use('/api/reportes', reportesRouter)

  app.use((_request, response) => {
    response.status(404).json({
      error: 'Route not found',
      code: 404,
    })
  })

  app.use(errorHandler)

  return app
}

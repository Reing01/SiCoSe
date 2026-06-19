import cors from 'cors'
import fs from 'node:fs'
import express from 'express'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
  const frontendDistPath = path.resolve(currentDirectory, '../../../frontend/dist')
  const frontendIndexPath = path.join(frontendDistPath, 'index.html')

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

  if (fs.existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath))

    app.get(/^\/(?!api\/).*/, (_request, response) => {
      response.sendFile(frontendIndexPath)
    })
  }

  app.use((_request, response) => {
    response.status(404).json({
      error: 'Route not found',
      code: 404,
    })
  })

  app.use(errorHandler)

  return app
}

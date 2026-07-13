import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { adeudosRouter } from './routes/adeudos.js'
import { auditoriasRouter } from './routes/auditorias.js'
import { authRouter } from './routes/auth.js'
import { ciudadanosRouter } from './routes/ciudadanos.js'
import { dashboardRouter } from './routes/dashboard.js'
import { docsRouter } from './routes/docs.js'
import { healthRouter } from './routes/health.js'
import { leadsRouter } from './routes/leads.js'
import { pagosRouter } from './routes/pagos.js'
import { reportesRouter } from './routes/reportes.js'
import { usuariosRouter } from './routes/usuarios.js'

export function createApp() {
  const app = express()
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
  const frontendDistPath = path.resolve(currentDirectory, '../../../frontend/dist')
  const frontendIndexPath = path.join(frontendDistPath, 'index.html')

  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  // Acepta cualquier preview deployment de Vercel de este equipo/proyecto
  // (el prefijo del proyecto se trunca distinto en cada preview, pero el
  // slug del equipo "cesaro4pacheco09-7836s-projects" se mantiene fijo),
  // ademas de los origenes explicitos configurados en CORS_ORIGIN.
  const vercelPreviewPattern =
    /^https:\/\/[a-z0-9-]+-cesaro4pacheco09-7836s-projects\.vercel\.app$/

  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          // Peticiones sin header Origin (curl, health checks, server-to-server).
          return callback(null, true)
        }

        if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
          return callback(null, true)
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())
  app.use(morgan('dev'))

  app.use('/health', healthRouter)
  app.use('/api/health', healthRouter)
  app.use('/api/leads', leadsRouter)
  app.use('/api/adeudos', adeudosRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/adeudos', adeudosRouter)
  app.use('/api/auditorias', auditoriasRouter)
  app.use('/api/ciudadanos', ciudadanosRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/docs', docsRouter)
  app.use('/api/pagos', pagosRouter)
  app.use('/api/reportes', reportesRouter)
  app.use('/api/usuarios', usuariosRouter)

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
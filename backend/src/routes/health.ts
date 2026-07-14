import { Router } from 'express'
import { getLivenessReport, getReadinessReport } from '../services/health.js'

export const healthRouter = Router()

healthRouter.get('/live', (_request, response) => {
  response.json(getLivenessReport())
})

healthRouter.get(['/ready', '/'], async (_request, response, next) => {
  try {
    const report = await getReadinessReport()
    response.status(report.ok ? 200 : 503).json(report)
  } catch (error) {
    next(error)
  }
})

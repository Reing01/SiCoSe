import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/require-role.js'
import { getDashboardMetrics } from '../services/dashboard.js'

export const dashboardRouter = Router()

dashboardRouter.get(
  '/metricas',
  authenticate,
  requireRole('admin', 'tesorero'),
  async (_request, response, next) => {
    try {
      const metrics = await getDashboardMetrics()

      response.json({
        data: metrics,
      })
    } catch (error) {
      next(error)
    }
  },
)

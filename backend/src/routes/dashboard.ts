import { Router } from "express";
import { z } from "zod";
import { authenticate, requireResource } from "../middleware/require-role.js";
import { getDashboardMetrics } from "../services/dashboard.js";

export const dashboardRouter = Router();

const metricsQuerySchema = z.object({
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

function periodToDate(periodo?: string) {
  if (!periodo) {
    return new Date();
  }

  const [year, month] = periodo.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

dashboardRouter.get(
  "/metricas",
  authenticate,
  requireResource("dashboard"),
  async (request, response, next) => {
    try {
      const parsed = metricsQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        return response.status(400).json({
          error: "Invalid dashboard query",
          details: parsed.error.flatten(),
        });
      }

      const metrics = await getDashboardMetrics(undefined, periodToDate(parsed.data.periodo));

      response.json({
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  },
);

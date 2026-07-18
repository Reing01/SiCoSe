import { Router } from "express";
import { z } from "zod";
import { authenticate, requireResource } from "../middleware/require-role.js";
import {
  ReportError,
  exportMonthlyReport,
  generateMonthlyReport,
} from "../services/reportes.js";
import type { AuthenticatedRequest } from "../types/auth.js";
import { createPrivateStorageSignedUrl } from "../lib/supabase-storage.js";

const generateReportSchema = z.object({
  periodo: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

const exportReportSchema = z.object({
  periodo: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  formato: z.enum(["pdf", "xlsx"]).default("xlsx"),
});

export const reportesRouter = Router();

reportesRouter.post(
  "/generar",
  authenticate,
  requireResource("reportes"),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = generateReportSchema.safeParse(request.body ?? {});

      if (!parsed.success) {
        return response.status(400).json({
          error: "Invalid report payload",
          details: parsed.error.flatten(),
        });
      }

      const result = await generateMonthlyReport({
        periodo: parsed.data.periodo,
        usuarioId: request.user?.id ?? "",
      });
      const downloadUrl = await createPrivateStorageSignedUrl(
        result.storage.path,
      );

      return response.status(201).json({
        message: "Monthly report generated",
        data: {
          id: result.report.id,
          periodo: result.periodo,
          titulo: result.report.titulo,
          tipo: result.report.tipo,
          estado: result.report.estado,
          archivo_url: downloadUrl,
          archivo_path: result.report.archivo_path,
          resumen_json: result.report.resumen_json,
          fecha: result.report.fecha,
        },
      });
    } catch (error) {
      if (error instanceof ReportError) {
        return response.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode,
        });
      }

      return next(error);
    }
  },
);

reportesRouter.post(
  "/exportar",
  authenticate,
  requireResource("reportes"),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const parsed = exportReportSchema.safeParse(request.body ?? {});

      if (!parsed.success) {
        return response.status(400).json({
          error: "Invalid report export payload",
          details: parsed.error.flatten(),
        });
      }

      const result = await exportMonthlyReport(
        {
          periodo: parsed.data.periodo,
          usuarioId: request.user?.id ?? "",
        },
        undefined,
        undefined,
        parsed.data.formato,
      );
      const downloadUrl = await createPrivateStorageSignedUrl(
        result.storage.path,
      );

      return response.status(201).json({
        message: "Monthly report export generated",
        data: {
          id: result.report.id,
          periodo: result.periodo,
          formato: result.format,
          titulo: result.report.titulo,
          tipo: result.report.tipo,
          estado: result.report.estado,
          archivo_url: downloadUrl,
          archivo_path: result.report.archivo_path,
          resumen_json: result.report.resumen_json,
          fecha: result.report.fecha,
        },
      });
    } catch (error) {
      if (error instanceof ReportError) {
        return response.status(error.statusCode).json({
          error: error.message,
          code: error.statusCode,
        });
      }

      return next(error);
    }
  },
);

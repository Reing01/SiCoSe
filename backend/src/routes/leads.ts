import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const leadSchema = z.object({
  nombre: z.string().min(2),
  comite: z.string().min(2),
  contacto: z.string().min(3),
});

export const leadsRouter = Router();

leadsRouter.post("/", async (request, response, next) => {
  try {
    const parsed = leadSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid lead payload",
        details: parsed.error.flatten(),
      });
    }

    const lead = await prisma.lead.create({
      data: {
        nombre: parsed.data.nombre,
        comite: parsed.data.comite,
        contacto: parsed.data.contacto,
      },
    });

    return response.status(201).json({
      message: "Lead received",
      data: lead,
    });
  } catch (error) {
    return next(error);
  }
});

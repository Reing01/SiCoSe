ALTER TABLE "Ciudadano" ADD COLUMN "zona" TEXT;
ALTER TABLE "Ciudadano" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Ciudadano_zona_idx" ON "Ciudadano"("zona");

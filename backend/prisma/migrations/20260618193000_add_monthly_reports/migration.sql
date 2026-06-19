-- Allow historical reports without tying them to a citizen
ALTER TABLE "Reporte" DROP CONSTRAINT IF EXISTS "Reporte_ciudadanoId_fkey";
ALTER TABLE "Reporte" ALTER COLUMN "ciudadanoId" DROP NOT NULL;

ALTER TABLE "Reporte"
ADD COLUMN IF NOT EXISTS "periodo" TEXT,
ADD COLUMN IF NOT EXISTS "archivo_url" TEXT,
ADD COLUMN IF NOT EXISTS "archivo_path" TEXT,
ADD COLUMN IF NOT EXISTS "generado_por" TEXT,
ADD COLUMN IF NOT EXISTS "resumen_json" JSONB;

UPDATE "Reporte"
SET "estado" = 'GENERADO'
WHERE "estado" IS NULL;

ALTER TABLE "Reporte"
ALTER COLUMN "estado" SET DEFAULT 'GENERADO';

ALTER TABLE "Reporte"
ADD CONSTRAINT "Reporte_ciudadanoId_fkey"
FOREIGN KEY ("ciudadanoId") REFERENCES "Ciudadano"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Reporte_periodo_idx" ON "Reporte" ("periodo");
CREATE INDEX IF NOT EXISTS "Reporte_tipo_idx" ON "Reporte" ("tipo");

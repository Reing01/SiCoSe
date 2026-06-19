ALTER TABLE "Adeudo" ADD COLUMN "estado" TEXT NOT NULL DEFAULT 'pendiente';

UPDATE "Adeudo"
SET "estado" = CASE
  WHEN "pagado" = true THEN 'pagado'
  ELSE 'pendiente'
END;

ALTER TABLE "Pago" ADD COLUMN "folio" TEXT;

CREATE UNIQUE INDEX "Pago_folio_key" ON "Pago"("folio");

ALTER TABLE "Auditoria" ADD COLUMN "ip" TEXT;
ALTER TABLE "Auditoria" ADD COLUMN "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

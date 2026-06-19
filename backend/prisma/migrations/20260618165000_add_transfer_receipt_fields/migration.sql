ALTER TABLE "Comprobante" ADD COLUMN "pagoId" TEXT;
ALTER TABLE "Comprobante" ADD COLUMN "hash_sha256" TEXT;
ALTER TABLE "Comprobante" ADD COLUMN "nombre_archivo" TEXT;
ALTER TABLE "Comprobante" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "Comprobante" ADD COLUMN "tamano_bytes" INTEGER;
ALTER TABLE "Comprobante" ADD COLUMN "storage_path" TEXT;

CREATE INDEX "Comprobante_pagoId_idx" ON "Comprobante"("pagoId");
CREATE INDEX "Comprobante_hash_sha256_idx" ON "Comprobante"("hash_sha256");

ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

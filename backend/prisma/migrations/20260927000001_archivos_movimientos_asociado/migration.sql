-- Add asociadoId to movimientos_stock
ALTER TABLE "movimientos_stock" ADD COLUMN "asociadoId" TEXT;
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_asociadoId_fkey"
  FOREIGN KEY ("asociadoId") REFERENCES "asociados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "movimientos_stock_asociadoId_idx" ON "movimientos_stock"("asociadoId");

-- Create archivos_lotes table
CREATE TABLE "archivos_lotes" (
  "id"        TEXT        NOT NULL,
  "loteId"    TEXT        NOT NULL,
  "nombre"    TEXT        NOT NULL,
  "tipo"      TEXT        NOT NULL,
  "tamanio"   INTEGER     NOT NULL,
  "contenido" BYTEA       NOT NULL,
  "creadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "archivos_lotes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "archivos_lotes_loteId_idx" ON "archivos_lotes"("loteId");
ALTER TABLE "archivos_lotes" ADD CONSTRAINT "archivos_lotes_loteId_fkey"
  FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

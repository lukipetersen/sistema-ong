-- Trazabilidad restructure: multi-genetic lots, geneticaId on plantas, loteId on movimientos

-- Create LoteGenetica junction table
CREATE TABLE "lote_geneticas" (
  "id" TEXT NOT NULL,
  "loteId" TEXT NOT NULL,
  "geneticaId" TEXT NOT NULL,
  "stockGramos" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lote_geneticas_pkey" PRIMARY KEY ("id")
);

-- Populate LoteGenetica from existing Lote.geneticaId (one genetic per existing lot)
INSERT INTO "lote_geneticas" ("id", "loteId", "geneticaId", "stockGramos", "creadoEn")
SELECT gen_random_uuid()::text, l.id, l."geneticaId", 0, NOW()
FROM "lotes" l
WHERE l."geneticaId" IS NOT NULL;

-- Add geneticaId to plantas (nullable first, then fill, then make NOT NULL)
ALTER TABLE "plantas" ADD COLUMN "geneticaId" TEXT;
UPDATE "plantas" p SET "geneticaId" = l."geneticaId" FROM "lotes" l WHERE p."loteId" = l.id;
-- For any plantas where lote has no geneticaId (shouldn't happen but safety net)
-- Leave them NULL for now; we'll handle the NOT NULL constraint after ensuring data integrity
ALTER TABLE "plantas" ALTER COLUMN "geneticaId" SET NOT NULL;

-- Add loteId to movimientos_stock (nullable)
ALTER TABLE "movimientos_stock" ADD COLUMN "loteId" TEXT;

-- Indexes and unique constraints
CREATE UNIQUE INDEX "lote_geneticas_loteId_geneticaId_key" ON "lote_geneticas"("loteId", "geneticaId");
CREATE INDEX "lote_geneticas_loteId_idx" ON "lote_geneticas"("loteId");
CREATE INDEX "lote_geneticas_geneticaId_idx" ON "lote_geneticas"("geneticaId");
CREATE INDEX "movimientos_stock_loteId_idx" ON "movimientos_stock"("loteId");
CREATE INDEX IF NOT EXISTS "plantas_loteId_idx" ON "plantas"("loteId");
CREATE INDEX IF NOT EXISTS "plantas_geneticaId_idx" ON "plantas"("geneticaId");

-- Foreign keys for lote_geneticas
ALTER TABLE "lote_geneticas" ADD CONSTRAINT "lote_geneticas_loteId_fkey"
  FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lote_geneticas" ADD CONSTRAINT "lote_geneticas_geneticaId_fkey"
  FOREIGN KEY ("geneticaId") REFERENCES "geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key for plantas.geneticaId
ALTER TABLE "plantas" ADD CONSTRAINT "plantas_geneticaId_fkey"
  FOREIGN KEY ("geneticaId") REFERENCES "geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key for movimientos_stock.loteId
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_loteId_fkey"
  FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop geneticaId from lotes (after data has been migrated to lote_geneticas)
ALTER TABLE "lotes" DROP CONSTRAINT IF EXISTS "lotes_geneticaId_fkey";
DROP INDEX IF EXISTS "lotes_geneticaId_idx";
ALTER TABLE "lotes" DROP COLUMN IF EXISTS "geneticaId";

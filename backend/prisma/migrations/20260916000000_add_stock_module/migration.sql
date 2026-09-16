-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'EGRESO');

-- AlterTable: stock actual en gramos por genética
ALTER TABLE "geneticas" ADD COLUMN "stockGramos" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id"             TEXT NOT NULL,
    "geneticaId"     TEXT NOT NULL,
    "tipo"           "TipoMovimiento" NOT NULL,
    "cantidadGramos" INTEGER NOT NULL,
    "fecha"          TIMESTAMP(3) NOT NULL,
    "observaciones"  TEXT,
    "usuarioId"      TEXT,
    "creadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimientos_stock_geneticaId_idx" ON "movimientos_stock"("geneticaId");
CREATE INDEX "movimientos_stock_fecha_idx"      ON "movimientos_stock"("fecha");

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_geneticaId_fkey"
    FOREIGN KEY ("geneticaId") REFERENCES "geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

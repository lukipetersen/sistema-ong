-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('PRODUCCION', 'ACTIVO', 'FINALIZADO', 'DESCARTADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "EstadoPlanta" AS ENUM ('ACTIVA', 'SELECCIONADA', 'CLONADA', 'DESCARTADA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "Sala" AS ENUM ('SALA_1', 'SALA_2');

-- CreateTable
CREATE TABLE "geneticas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geneticas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "geneticaId" TEXT NOT NULL,
    "sala" "Sala" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFinalizacion" TIMESTAMP(3),
    "estado" "EstadoLote" NOT NULL DEFAULT 'PRODUCCION',
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "alias" TEXT,
    "estado" "EstadoPlanta" NOT NULL DEFAULT 'ACTIVA',
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_lotes" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geneticas_nombre_key" ON "geneticas"("nombre");

-- CreateIndex
CREATE INDEX "geneticas_nombre_idx" ON "geneticas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "lotes_codigo_key" ON "lotes"("codigo");

-- CreateIndex
CREATE INDEX "lotes_geneticaId_idx" ON "lotes"("geneticaId");

-- CreateIndex
CREATE INDEX "lotes_estado_idx" ON "lotes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "plantas_codigo_key" ON "plantas"("codigo");

-- CreateIndex
CREATE INDEX "plantas_loteId_idx" ON "plantas"("loteId");

-- CreateIndex
CREATE INDEX "plantas_estado_idx" ON "plantas"("estado");

-- CreateIndex
CREATE INDEX "plantas_alias_idx" ON "plantas"("alias");

-- CreateIndex
CREATE INDEX "historial_lotes_loteId_idx" ON "historial_lotes"("loteId");

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_geneticaId_fkey" FOREIGN KEY ("geneticaId") REFERENCES "geneticas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantas" ADD CONSTRAINT "plantas_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_lotes" ADD CONSTRAINT "historial_lotes_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_terapeuticos" ADD CONSTRAINT "seguimientos_terapeuticos_geneticaId_fkey" FOREIGN KEY ("geneticaId") REFERENCES "geneticas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_terapeuticos" ADD CONSTRAINT "seguimientos_terapeuticos_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_terapeuticos" ADD CONSTRAINT "seguimientos_terapeuticos_plantaId_fkey" FOREIGN KEY ("plantaId") REFERENCES "plantas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

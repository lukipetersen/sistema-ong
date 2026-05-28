-- CreateEnum
CREATE TYPE "EstadoAsociado" AS ENUM ('ACTIVO', 'PENDIENTE', 'INACTIVO');

-- CreateEnum
CREATE TYPE "Patologia" AS ENUM ('ANSIEDAD', 'INSOMNIO', 'DOLOR', 'EPILEPSIA', 'ESTRES', 'DEPRESION', 'MIGRANA', 'ARTRITIS', 'FIBROMIALGIA', 'PARKINSON', 'TEA', 'APETITO', 'NAUSEAS', 'INFLAMACION', 'OTRA');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('AL_DIA', 'VENCIDA', 'PENDIENTE');

-- CreateTable
CREATE TABLE "asociados" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoAsociado" NOT NULL DEFAULT 'PENDIENTE',
    "patologia" "Patologia",
    "patologiaOtra" TEXT,
    "observaciones" TEXT,
    "notasInternas" TEXT,
    "estadoCuota" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asociados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos_terapeuticos" (
    "id" TEXT NOT NULL,
    "asociadoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT NOT NULL,
    "observaciones" TEXT,
    "continuidad" BOOLEAN NOT NULL DEFAULT true,
    "geneticaId" TEXT,
    "loteId" TEXT,
    "plantaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seguimientos_terapeuticos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_asociados" (
    "id" TEXT NOT NULL,
    "asociadoId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto" TEXT,
    "medioPago" "MedioPago",
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_asociados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asociados_dni_key" ON "asociados"("dni");
CREATE INDEX "asociados_dni_idx" ON "asociados"("dni");
CREATE INDEX "asociados_estado_idx" ON "asociados"("estado");
CREATE INDEX "asociados_apellido_nombre_idx" ON "asociados"("apellido", "nombre");
CREATE INDEX "seguimientos_terapeuticos_asociadoId_idx" ON "seguimientos_terapeuticos"("asociadoId");
CREATE INDEX "pagos_asociados_asociadoId_idx" ON "pagos_asociados"("asociadoId");

-- AddForeignKey
ALTER TABLE "seguimientos_terapeuticos" ADD CONSTRAINT "seguimientos_terapeuticos_asociadoId_fkey" FOREIGN KEY ("asociadoId") REFERENCES "asociados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_asociados" ADD CONSTRAINT "pagos_asociados_asociadoId_fkey" FOREIGN KEY ("asociadoId") REFERENCES "asociados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

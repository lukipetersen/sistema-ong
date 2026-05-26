-- CreateEnum
CREATE TYPE "TipoIngreso" AS ENUM ('VENTA', 'CUOTA', 'DONACION');

-- CreateEnum
CREATE TYPE "CategoriaIngreso" AS ENUM ('FIJO', 'VARIABLE');

-- CreateEnum
CREATE TYPE "EstadoIngreso" AS ENUM ('COBRADO', 'PENDIENTE');

-- CreateTable
CREATE TABLE "ingresos" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoIngreso" NOT NULL,
    "categoria" "CategoriaIngreso" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoIngreso" NOT NULL DEFAULT 'COBRADO',
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id")
);

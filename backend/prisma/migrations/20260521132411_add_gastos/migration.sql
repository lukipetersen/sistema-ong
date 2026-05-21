-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('FIJOS', 'VARIABLES', 'ADMINISTRACION', 'INVERSION');

-- CreateEnum
CREATE TYPE "SubcategoriaGasto" AS ENUM ('ALQUILER', 'INSUMOS', 'SUELDOS', 'SERVICIOS', 'MANTENIMIENTO', 'OTROS');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE');

-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PAGADO', 'PENDIENTE');

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "subcategoria" "SubcategoriaGasto" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "medioPago" "MedioPago",
    "estado" "EstadoGasto" NOT NULL DEFAULT 'PAGADO',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

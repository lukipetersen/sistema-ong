-- Crear enum types si no existen (pueden existir si la migración anterior los creó)
DO $$ BEGIN
  CREATE TYPE "TipoIngreso" AS ENUM ('VENTA', 'CUOTA', 'DONACION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CategoriaIngreso" AS ENUM ('FIJO', 'VARIABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoIngreso" AS ENUM ('COBRADO', 'PENDIENTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agregar columnas faltantes a la tabla ingresos (IF NOT EXISTS para idempotencia)
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "tipo"      "TipoIngreso"      NOT NULL DEFAULT 'VENTA';
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "categoria" "CategoriaIngreso" NOT NULL DEFAULT 'VARIABLE';
ALTER TABLE "ingresos" ADD COLUMN IF NOT EXISTS "estado"    "EstadoIngreso"    NOT NULL DEFAULT 'COBRADO';

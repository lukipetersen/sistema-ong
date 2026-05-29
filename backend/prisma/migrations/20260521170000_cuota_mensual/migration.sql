-- Add PARCIAL to EstadoCuota enum
ALTER TYPE "EstadoCuota" ADD VALUE 'PARCIAL';

-- Add cuotaMensual to asociados
ALTER TABLE "asociados" ADD COLUMN "cuotaMensual" DECIMAL(14,2);

-- Add mesCuota to pagos_asociados
ALTER TABLE "pagos_asociados" ADD COLUMN "mesCuota" TEXT;

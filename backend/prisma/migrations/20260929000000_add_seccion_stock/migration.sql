-- CreateEnum
CREATE TYPE "SeccionStock" AS ENUM ('STOCK_TOTAL', 'DISPENSARIO');

-- AlterTable
ALTER TABLE "movimientos_stock" ADD COLUMN "seccion" "SeccionStock" NOT NULL DEFAULT 'STOCK_TOTAL';

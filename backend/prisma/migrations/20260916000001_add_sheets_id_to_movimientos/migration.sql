ALTER TABLE "movimientos_stock" ADD COLUMN "sheetsId" TEXT;
CREATE UNIQUE INDEX "movimientos_stock_sheetsId_key" ON "movimientos_stock"("sheetsId");

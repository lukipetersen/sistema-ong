-- AlterTable
ALTER TABLE "gastos" ADD COLUMN "sheetsId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gastos_sheetsId_key" ON "gastos"("sheetsId");

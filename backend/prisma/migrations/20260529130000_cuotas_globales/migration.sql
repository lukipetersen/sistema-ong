-- CreateTable cuotas_globales
CREATE TABLE "cuotas_globales" (
    "id"             TEXT NOT NULL,
    "mes"            TEXT NOT NULL,
    "monto"          DECIMAL(14,2) NOT NULL,
    "totalAsociados" INTEGER NOT NULL DEFAULT 0,
    "creadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuotas_globales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cuotas_globales_mes_key" ON "cuotas_globales"("mes");

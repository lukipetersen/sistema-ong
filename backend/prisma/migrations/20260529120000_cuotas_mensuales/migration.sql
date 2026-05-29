-- CreateTable cuotas_mensuales
CREATE TABLE "cuotas_mensuales" (
    "id"         TEXT NOT NULL,
    "asociadoId" TEXT NOT NULL,
    "mes"        TEXT NOT NULL,
    "monto"      DECIMAL(14,2) NOT NULL,
    "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuotas_mensuales_pkey" PRIMARY KEY ("id")
);

-- UniqueConstraint: un valor de cuota por asociado por mes
CREATE UNIQUE INDEX "cuotas_mensuales_asociadoId_mes_key" ON "cuotas_mensuales"("asociadoId", "mes");

-- Index
CREATE INDEX "cuotas_mensuales_asociadoId_idx" ON "cuotas_mensuales"("asociadoId");

-- ForeignKey
ALTER TABLE "cuotas_mensuales" ADD CONSTRAINT "cuotas_mensuales_asociadoId_fkey"
    FOREIGN KEY ("asociadoId") REFERENCES "asociados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

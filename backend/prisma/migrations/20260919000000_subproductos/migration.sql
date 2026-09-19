-- CreateTable subproductos
CREATE TABLE "subproductos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subproductos_pkey" PRIMARY KEY ("id")
);

-- CreateTable movimientos_subproductos
CREATE TABLE "movimientos_subproductos" (
    "id" TEXT NOT NULL,
    "subproductoId" TEXT NOT NULL,
    "loteId" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "observaciones" TEXT,
    "usuarioId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_subproductos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subproductos_nombre_key" ON "subproductos"("nombre");
CREATE INDEX "movimientos_subproductos_subproductoId_idx" ON "movimientos_subproductos"("subproductoId");
CREATE INDEX "movimientos_subproductos_loteId_idx" ON "movimientos_subproductos"("loteId");
CREATE INDEX "movimientos_subproductos_fecha_idx" ON "movimientos_subproductos"("fecha");

-- AddForeignKey
ALTER TABLE "movimientos_subproductos" ADD CONSTRAINT "movimientos_subproductos_subproductoId_fkey"
    FOREIGN KEY ("subproductoId") REFERENCES "subproductos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_subproductos" ADD CONSTRAINT "movimientos_subproductos_loteId_fkey"
    FOREIGN KEY ("loteId") REFERENCES "lotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "movimientos_subproductos" ADD CONSTRAINT "movimientos_subproductos_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

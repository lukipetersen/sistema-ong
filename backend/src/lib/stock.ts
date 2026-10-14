import { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

export interface StockResult {
  gramos: number
  gramosDisp: number
}

/**
 * Fuente única de verdad del modelo de inventario dual — mitiga RC-2 y RC-4.
 *
 * Modelo de negocio:
 *   STOCK_TOTAL INGRESO  → +stockGramos
 *   STOCK_TOTAL EGRESO   → -stockGramos
 *   DISPENSARIO INGRESO  → -stockGramos, +stockGramosDispensario  (traslado)
 *   DISPENSARIO EGRESO   → -stockGramosDispensario                (dispensación)
 *
 * Recorre TODOS los movimientos de la genética y aplica el modelo desde cero,
 * evitando que errores incrementales acumulados persistan entre operaciones.
 */
export async function recalcularStockGenetica(
  tx: Tx,
  geneticaId: string,
): Promise<StockResult> {
  const movs = await tx.movimientoStock.findMany({
    where:  { geneticaId },
    select: { tipo: true, seccion: true, cantidadGramos: true },
  })

  let gramos = 0
  let gramosDisp = 0

  for (const m of movs) {
    if (m.seccion === 'STOCK_TOTAL') {
      gramos += m.tipo === 'INGRESO' ? m.cantidadGramos : -m.cantidadGramos
    } else { // DISPENSARIO
      if (m.tipo === 'INGRESO') {
        gramos     -= m.cantidadGramos // traslado: sale del almacén
        gramosDisp += m.cantidadGramos // entra al dispensario
      } else {
        gramosDisp -= m.cantidadGramos // dispensación: solo baja dispensario
      }
    }
  }

  await tx.genetica.update({
    where: { id: geneticaId },
    data:  { stockGramos: gramos, stockGramosDispensario: gramosDisp },
  })

  return { gramos, gramosDisp }
}

/**
 * Recalcula LoteGenetica.stockGramos para un par lote+genética.
 * Solo considera movimientos STOCK_TOTAL; los de DISPENSARIO no afectan el
 * stock por lote.
 */
export async function recalcularLoteGenetica(
  tx: Tx,
  loteId: string,
  geneticaId: string,
): Promise<number> {
  const movs = await tx.movimientoStock.findMany({
    where:  { loteId, geneticaId, seccion: 'STOCK_TOTAL' },
    select: { tipo: true, cantidadGramos: true },
  })

  let stock = 0
  for (const m of movs) {
    stock += m.tipo === 'INGRESO' ? m.cantidadGramos : -m.cantidadGramos
  }

  await tx.loteGenetica.upsert({
    where:  { loteId_geneticaId: { loteId, geneticaId } },
    update: { stockGramos: stock },
    create: { loteId, geneticaId, stockGramos: stock },
  })

  return stock
}

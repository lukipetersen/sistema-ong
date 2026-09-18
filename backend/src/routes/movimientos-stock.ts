import { Router, Request, Response } from 'express'
import { TipoMovimiento } from '@prisma/client'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// ─── GET /api/movimientos-stock ──────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, loteId, tipo, mes, page = '1', limit = '50' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (geneticaId) where.geneticaId = geneticaId
    if (loteId)     where.loteId     = loteId
    if (tipo && ['INGRESO', 'EGRESO'].includes(tipo)) where.tipo = tipo
    if (mes) {
      const [anio, m] = mes.split('-').map(Number)
      where.fecha = { gte: new Date(anio, m - 1, 1), lt: new Date(anio, m, 1) }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [movimientos, total] = await Promise.all([
      prisma.movimientoStock.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
        skip,
        take: Number(limit),
        include: {
          genetica: { select: { id: true, nombre: true } },
          lote:     { select: { id: true, codigo: true } },
          usuario:  { select: { id: true, nombre: true, apellido: true } },
        },
      }),
      prisma.movimientoStock.count({ where }),
    ])

    res.json({ movimientos, total, page: Number(page), limit: Number(limit) })
  } catch {
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// ─── GET /api/movimientos-stock/resumen ──────────────────────────────────────
router.get('/resumen', async (_req: Request, res: Response) => {
  try {
    const geneticas = await prisma.genetica.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true, nombre: true, stockGramos: true,
        movimientos: { orderBy: { fecha: 'desc' }, take: 1, select: { fecha: true, tipo: true } },
        loteGeneticas: {
          select: {
            stockGramos: true,
            lote: { select: { id: true, codigo: true } },
          },
        },
      },
    })

    res.json(geneticas.map(g => ({
      id: g.id,
      nombre: g.nombre,
      stockGramos: g.stockGramos,
      ultimoMov: g.movimientos[0] ?? null,
      lotes: g.loteGeneticas.map(lg => ({
        loteId:     lg.lote.id,
        loteCodigo: lg.lote.codigo,
        stockGramos: lg.stockGramos,
      })),
    })))
  } catch {
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

// ─── POST /api/movimientos-stock ─────────────────────────────────────────────
// Crea movimiento + actualiza stock en transacción. Permite stock negativo (avisa).
router.post('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, loteId, tipo, cantidadGramos, fecha, observaciones } = req.body

    if (!geneticaId)                           return res.status(400).json({ error: 'Falta geneticaId' })
    if (!['INGRESO', 'EGRESO'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido (INGRESO | EGRESO)' })
    if (!cantidadGramos || Number(cantidadGramos) <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
    if (!fecha)                                return res.status(400).json({ error: 'Falta la fecha' })

    const gramos    = Math.round(Number(cantidadGramos))
    const delta     = tipo === 'INGRESO' ? gramos : -gramos
    const usuarioId = req.usuarioId ?? null

    const [movimiento, stockActual] = await prisma.$transaction(async (tx) => {
      // Update genetica stock
      const genetica = await tx.genetica.update({
        where: { id: geneticaId },
        data:  { stockGramos: { increment: delta } },
      })

      // Update loteGenetica stock if loteId provided
      if (loteId) {
        await tx.loteGenetica.upsert({
          where: { loteId_geneticaId: { loteId, geneticaId } },
          update: { stockGramos: { increment: delta } },
          create: { loteId, geneticaId, stockGramos: delta < 0 ? delta : delta },
        })
      }

      const mov = await tx.movimientoStock.create({
        data: {
          geneticaId,
          loteId: loteId || null,
          tipo: tipo as TipoMovimiento,
          cantidadGramos: gramos,
          fecha: new Date(fecha),
          observaciones: observaciones || null,
          usuarioId,
        },
        include: {
          genetica: { select: { id: true, nombre: true, stockGramos: true } },
          lote:     { select: { id: true, codigo: true } },
          usuario:  { select: { id: true, nombre: true, apellido: true } },
        },
      })
      return [mov, genetica.stockGramos]
    })

    res.status(201).json({ ...movimiento, stockNegativo: stockActual < 0, stockActual })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al crear movimiento' })
  }
})

// ─── POST /api/movimientos-stock/importar ────────────────────────────────────
// Importación desde Sheets o histórica. Usa sheetsId como clave estable.
// Al final recalcula stockGramos desde cero por cada genética afectada.
router.post('/importar', async (req: Request, res: Response) => {
  try {
    const { movimientos: raw } = req.body as { movimientos: unknown[] }
    if (!Array.isArray(raw) || raw.length === 0) return res.status(400).json({ error: 'Se requiere un array de movimientos' })

    type FilaMov = {
      sheetsId: string | null; geneticaId: string; loteId: string | null; tipo: TipoMovimiento
      cantidadGramos: number; fecha: Date; observaciones: string | null
    }
    const datos: FilaMov[] = []
    const errores: { fila: number; error: string }[] = []

    for (let i = 0; i < raw.length; i++) {
      const m = raw[i] as Record<string, unknown>
      const fila = i + 2
      if (!m.geneticaId)                                      { errores.push({ fila, error: 'Falta geneticaId' }); continue }
      if (!['INGRESO', 'EGRESO'].includes(String(m.tipo)))    { errores.push({ fila, error: `Tipo inválido: ${m.tipo}` }); continue }
      if (!m.cantidadGramos || Number(m.cantidadGramos) <= 0) { errores.push({ fila, error: 'Cantidad inválida' }); continue }
      if (!m.fecha)                                           { errores.push({ fila, error: 'Falta fecha' }); continue }
      datos.push({
        sheetsId:       (m.sheetsId && String(m.sheetsId).trim()) ? String(m.sheetsId).trim() : null,
        geneticaId:     String(m.geneticaId),
        loteId:         m.loteId ? String(m.loteId) : null,
        tipo:           String(m.tipo) as TipoMovimiento,
        cantidadGramos: Math.round(Number(m.cantidadGramos)),
        fecha:          new Date(String(m.fecha)),
        observaciones:  m.observaciones ? String(m.observaciones) : null,
      })
    }

    if (datos.length === 0) return res.status(400).json({ error: 'Sin filas válidas', errores })

    const conId = datos.filter(d => d.sheetsId !== null)
    const sinId = datos.filter(d => d.sheetsId === null)

    let cantInsertados   = 0
    let cantActualizados = 0

    // Genéticas afectadas (para recalcular stock al final)
    const geneticasAfectadas = new Set<string>(datos.map(d => d.geneticaId))

    // Existentes sin sheetsId para fallback de migración
    const existentesSinId = await prisma.movimientoStock.findMany({
      where:  { sheetsId: null },
      select: { id: true, geneticaId: true, tipo: true, cantidadGramos: true, fecha: true, observaciones: true },
    })
    const claveFallback = (r: typeof existentesSinId[0]) =>
      `${new Date(r.fecha).toISOString().slice(0, 10)}|${r.geneticaId}|${r.tipo}|${r.cantidadGramos}`
    const mapaFallback = new Map(existentesSinId.map(e => [claveFallback(e), e]))

    await prisma.$transaction(async (tx) => {

      // ── Filas CON sheetsId ────────────────────────────────────────────────
      for (const d of conId) {
        const porId = await tx.movimientoStock.findUnique({ where: { sheetsId: d.sheetsId! } })

        if (porId) {
          const sinCambios =
            porId.geneticaId     === d.geneticaId &&
            porId.tipo           === d.tipo &&
            porId.cantidadGramos === d.cantidadGramos &&
            new Date(porId.fecha).toISOString().slice(0, 10) === d.fecha.toISOString().slice(0, 10) &&
            (porId.observaciones ?? null) === (d.observaciones ?? null)

          if (!sinCambios) {
            if (porId.geneticaId !== d.geneticaId) geneticasAfectadas.add(porId.geneticaId)
            await tx.movimientoStock.update({
              where: { sheetsId: d.sheetsId! },
              data:  {
                geneticaId: d.geneticaId, loteId: d.loteId,
                tipo: d.tipo, cantidadGramos: d.cantidadGramos,
                fecha: d.fecha, observaciones: d.observaciones,
              },
            })
            cantActualizados++
          }
          continue
        }

        // Migración: buscar por clave entre registros sin sheetsId
        const k = `${d.fecha.toISOString().slice(0, 10)}|${d.geneticaId}|${d.tipo}|${d.cantidadGramos}`
        const porClave = mapaFallback.get(k)
        if (porClave) {
          await tx.movimientoStock.update({
            where: { id: porClave.id },
            data:  { sheetsId: d.sheetsId, observaciones: d.observaciones },
          })
          mapaFallback.delete(k)
          cantActualizados++
          continue
        }

        await tx.movimientoStock.create({ data: { ...d } })
        cantInsertados++
      }

      // ── Filas SIN sheetsId ────────────────────────────────────────────────
      for (const d of sinId) {
        const k = `${d.fecha.toISOString().slice(0, 10)}|${d.geneticaId}|${d.tipo}|${d.cantidadGramos}`
        if (mapaFallback.has(k)) continue

        await tx.movimientoStock.create({ data: { ...d } })
        cantInsertados++
      }

      // ── Recalcular stockGramos exacto por cada genética afectada ─────────
      for (const geneticaId of geneticasAfectadas) {
        const movs = await tx.movimientoStock.findMany({
          where:  { geneticaId },
          select: { tipo: true, cantidadGramos: true },
        })
        const stock = movs.reduce(
          (sum, m) => sum + (m.tipo === 'INGRESO' ? m.cantidadGramos : -m.cantidadGramos),
          0
        )
        await tx.genetica.update({ where: { id: geneticaId }, data: { stockGramos: stock } })
      }
    })

    const omitidos = datos.length - cantInsertados - cantActualizados
    res.status(201).json({ importados: cantInsertados, actualizados: cantActualizados, omitidos, errores })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al importar' })
  }
})

// ─── POST /api/movimientos-stock/recalcular ───────────────────────────────────
// Recalcula stockGramos de TODAS las genéticas desde sus movimientos.
// También recalcula LoteGenetica.stockGramos.
router.post('/recalcular', async (_req: Request, res: Response) => {
  try {
    const [movimientos, geneticas, loteGeneticas] = await Promise.all([
      prisma.movimientoStock.findMany({ select: { geneticaId: true, loteId: true, tipo: true, cantidadGramos: true } }),
      prisma.genetica.findMany({ select: { id: true } }),
      prisma.loteGenetica.findMany({ select: { loteId: true, geneticaId: true } }),
    ])

    // Calculate genetica stocks
    const stocksGenetica = new Map<string, number>()
    for (const m of movimientos) {
      const delta = m.tipo === 'INGRESO' ? m.cantidadGramos : -m.cantidadGramos
      stocksGenetica.set(m.geneticaId, (stocksGenetica.get(m.geneticaId) ?? 0) + delta)
    }

    // Calculate lote-genetica stocks
    const stocksLoteGenetica = new Map<string, number>()
    for (const m of movimientos) {
      if (!m.loteId) continue
      const key = `${m.loteId}|${m.geneticaId}`
      const delta = m.tipo === 'INGRESO' ? m.cantidadGramos : -m.cantidadGramos
      stocksLoteGenetica.set(key, (stocksLoteGenetica.get(key) ?? 0) + delta)
    }

    await prisma.$transaction(async (tx) => {
      // Update genetica stocks
      for (const g of geneticas) {
        await tx.genetica.update({
          where: { id: g.id },
          data:  { stockGramos: stocksGenetica.get(g.id) ?? 0 },
        })
      }

      // Update lote-genetica stocks
      for (const lg of loteGeneticas) {
        const key = `${lg.loteId}|${lg.geneticaId}`
        await tx.loteGenetica.update({
          where: { loteId_geneticaId: { loteId: lg.loteId, geneticaId: lg.geneticaId } },
          data:  { stockGramos: stocksLoteGenetica.get(key) ?? 0 },
        })
      }
    })

    res.json({ ok: true, actualizadas: geneticas.length, lotesActualizados: loteGeneticas.length })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al recalcular' })
  }
})

// ─── DELETE /api/movimientos-stock/:id ───────────────────────────────────────
// Elimina y revierte el stock. Permite stock negativo resultante (avisa).
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const stockActual = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoStock.delete({ where: { id: req.params.id } })
      const delta = mov.tipo === 'INGRESO' ? -mov.cantidadGramos : mov.cantidadGramos
      const g = await tx.genetica.update({ where: { id: mov.geneticaId }, data: { stockGramos: { increment: delta } } })

      // Revert loteGenetica stock if movement had loteId
      if (mov.loteId) {
        await tx.loteGenetica.upsert({
          where: { loteId_geneticaId: { loteId: mov.loteId, geneticaId: mov.geneticaId } },
          update: { stockGramos: { increment: delta } },
          create: { loteId: mov.loteId, geneticaId: mov.geneticaId, stockGramos: delta },
        })
      }

      return g.stockGramos
    })
    res.json({ ok: true, stockNegativo: stockActual < 0, stockActual })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error al eliminar movimiento' })
  }
})

export default router

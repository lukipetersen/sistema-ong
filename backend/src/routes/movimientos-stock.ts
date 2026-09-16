import { Router, Request, Response } from 'express'
import { TipoMovimiento } from '@prisma/client'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// ─── GET /api/movimientos-stock ──────────────────────────────────────────────
// Filtros: geneticaId, tipo, mes (YYYY-MM), page, limit
router.get('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, tipo, mes, page = '1', limit = '50' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (geneticaId) where.geneticaId = geneticaId
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
// Stock actual de todas las genéticas con al menos un movimiento
router.get('/resumen', async (_req: Request, res: Response) => {
  try {
    const geneticas = await prisma.genetica.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true, nombre: true, stockGramos: true,
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true, tipo: true },
        },
      },
    })

    const data = geneticas.map(g => ({
      id:           g.id,
      nombre:       g.nombre,
      stockGramos:  g.stockGramos,
      ultimoMov:    g.movimientos[0] ?? null,
    }))

    res.json(data)
  } catch {
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

// ─── POST /api/movimientos-stock ─────────────────────────────────────────────
// Crea el movimiento y actualiza el stock de la genética en una sola transacción
router.post('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, tipo, cantidadGramos, fecha, observaciones } = req.body

    // Validaciones básicas
    if (!geneticaId)                           return res.status(400).json({ error: 'Falta geneticaId' })
    if (!['INGRESO', 'EGRESO'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido (INGRESO | EGRESO)' })
    if (!cantidadGramos || Number(cantidadGramos) <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
    if (!fecha)                                return res.status(400).json({ error: 'Falta la fecha' })

    const gramos    = Math.round(Number(cantidadGramos))
    const delta     = tipo === 'INGRESO' ? gramos : -gramos
    const usuarioId = req.usuarioId ?? null

    const [movimiento] = await prisma.$transaction(async (tx) => {
      // 1. Actualizar stock (con increment atómico)
      const genetica = await tx.genetica.update({
        where: { id: geneticaId },
        data:  { stockGramos: { increment: delta } },
      })

      // 2. Bloquear egreso que dejaría el stock negativo
      if (genetica.stockGramos < 0) {
        throw new Error(`Stock insuficiente. Stock actual: ${genetica.stockGramos - delta} g`)
      }

      // 3. Registrar el movimiento
      const mov = await tx.movimientoStock.create({
        data: {
          geneticaId,
          tipo:          tipo as TipoMovimiento,
          cantidadGramos: gramos,
          fecha:         new Date(fecha),
          observaciones: observaciones || null,
          usuarioId,
        },
        include: {
          genetica: { select: { id: true, nombre: true, stockGramos: true } },
          usuario:  { select: { id: true, nombre: true, apellido: true } },
        },
      })

      return [mov]
    })

    res.status(201).json(movimiento)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear movimiento'
    res.status(400).json({ error: msg })
  }
})

// ─── POST /api/movimientos-stock/importar ────────────────────────────────────
// Importación histórica en bloque: no valida stock negativo (datos históricos)
router.post('/importar', async (req: Request, res: Response) => {
  try {
    const { movimientos } = req.body as { movimientos: unknown[] }
    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de movimientos' })
    }

    type FilaMov = {
      geneticaId: string; tipo: TipoMovimiento
      cantidadGramos: number; fecha: Date; observaciones: string | null
    }
    const datos: FilaMov[] = []
    const errores: { fila: number; error: string }[] = []

    for (let i = 0; i < movimientos.length; i++) {
      const m = movimientos[i] as Record<string, unknown>
      const fila = i + 2
      if (!m.geneticaId)                                       { errores.push({ fila, error: 'Falta geneticaId' }); continue }
      if (!['INGRESO', 'EGRESO'].includes(String(m.tipo)))     { errores.push({ fila, error: `Tipo inválido: ${m.tipo}` }); continue }
      if (!m.cantidadGramos || Number(m.cantidadGramos) <= 0)  { errores.push({ fila, error: 'Cantidad inválida' }); continue }
      if (!m.fecha)                                            { errores.push({ fila, error: 'Falta fecha' }); continue }
      datos.push({
        geneticaId:    String(m.geneticaId),
        tipo:          String(m.tipo) as TipoMovimiento,
        cantidadGramos: Math.round(Number(m.cantidadGramos)),
        fecha:         new Date(String(m.fecha)),
        observaciones: m.observaciones ? String(m.observaciones) : null,
      })
    }

    if (datos.length === 0) return res.status(400).json({ error: 'Sin filas válidas', errores })

    await prisma.$transaction(async (tx) => {
      await tx.movimientoStock.createMany({ data: datos })

      // Recalcular el delta neto por genética y actualizar de una vez
      const deltas = new Map<string, number>()
      for (const d of datos) {
        const delta = d.tipo === 'INGRESO' ? d.cantidadGramos : -d.cantidadGramos
        deltas.set(d.geneticaId, (deltas.get(d.geneticaId) ?? 0) + delta)
      }
      for (const [geneticaId, delta] of deltas) {
        await tx.genetica.update({ where: { id: geneticaId }, data: { stockGramos: { increment: delta } } })
      }
    })

    res.status(201).json({ importados: datos.length, errores })
  } catch (e) {
    res.status(500).json({ error: 'Error al importar' })
  }
})

// ─── DELETE /api/movimientos-stock/:id ───────────────────────────────────────
// Elimina el movimiento y revierte el efecto en el stock (transacción)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoStock.delete({ where: { id: req.params.id } })

      // Delta invertido: si era INGRESO, restar; si era EGRESO, sumar
      const delta = mov.tipo === 'INGRESO' ? -mov.cantidadGramos : mov.cantidadGramos

      const genetica = await tx.genetica.update({
        where: { id: mov.geneticaId },
        data:  { stockGramos: { increment: delta } },
      })

      // No permitir que la eliminación de un ingreso deje stock negativo
      if (genetica.stockGramos < 0) {
        throw new Error('No se puede eliminar este ingreso: el stock quedaría negativo')
      }
    })

    res.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar movimiento'
    res.status(400).json({ error: msg })
  }
})

export default router

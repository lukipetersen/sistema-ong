import { Router, Request, Response } from 'express'
import { TipoMovimiento } from '@prisma/client'
import prisma from '../lib/prisma'
import { autenticar, tieneModulo } from '../middleware/auth'

const router = Router()
router.use(autenticar)
router.use(tieneModulo('/dispensario'))

function puedeIngreso(req: Request): boolean {
  if (req.usuarioRol === 'ADMINISTRADOR') return true
  return req.usuarioModulos.includes('/dispensario:ingresos')
}

// ─── GET /api/dispensario ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, tipo, mes, asociadoId, page = '1', limit = '50' } = req.query as Record<string, string>

    const where: Record<string, unknown> = { seccion: 'DISPENSARIO' }
    if (geneticaId)  where.geneticaId  = geneticaId
    if (asociadoId)  where.asociadoId  = asociadoId
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
          genetica:  { select: { id: true, nombre: true } },
          usuario:   { select: { id: true, nombre: true, apellido: true } },
          asociado:  { select: { id: true, nombre: true, apellido: true } },
        },
      }),
      prisma.movimientoStock.count({ where }),
    ])

    res.json({ movimientos, total, page: Number(page), limit: Number(limit) })
  } catch {
    res.status(500).json({ error: 'Error al obtener movimientos de dispensario' })
  }
})

// ─── GET /api/dispensario/resumen ─────────────────────────────────────────────
// Devuelve stock total y stock dispensario por genética
router.get('/resumen', async (_req: Request, res: Response) => {
  try {
    const geneticas = await prisma.genetica.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        stockGramos: true,
        stockGramosDispensario: true,
        movimientos: {
          where: { seccion: 'DISPENSARIO' },
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true, tipo: true },
        },
      },
    })

    res.json(geneticas.map(g => ({
      id:                    g.id,
      nombre:                g.nombre,
      stockGramos:           g.stockGramos,
      stockGramosDispensario: g.stockGramosDispensario,
      ultimoMov:             g.movimientos[0] ?? null,
    })))
  } catch {
    res.status(500).json({ error: 'Error al obtener resumen de dispensario' })
  }
})

// ─── POST /api/dispensario ───────────────────────────────────────────────────
// INGRESO = transferencia desde stock total → baja stockGramos, sube stockGramosDispensario
// EGRESO  = dispensación → baja stockGramosDispensario únicamente
router.post('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, loteId, tipo, cantidadGramos, fecha, observaciones, asociadoId } = req.body

    if (!geneticaId)                           return res.status(400).json({ error: 'Falta geneticaId' })
    if (!['INGRESO', 'EGRESO'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido (INGRESO | EGRESO)' })
    if (!cantidadGramos || Number(cantidadGramos) <= 0) return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
    if (!fecha)                                return res.status(400).json({ error: 'Falta la fecha' })

    if (tipo === 'INGRESO' && !puedeIngreso(req)) {
      return res.status(403).json({ error: 'No tenés permiso para trasladar stock al dispensario.' })
    }

    const gramos    = Math.round(Number(cantidadGramos))
    const usuarioId = req.usuarioId ?? null

    const [movimiento, stockActual] = await prisma.$transaction(async (tx) => {
      let genetica

      if (tipo === 'INGRESO') {
        // Traslado: baja del stock total, sube en dispensario
        genetica = await tx.genetica.update({
          where: { id: geneticaId },
          data: {
            stockGramos:            { decrement: gramos },
            stockGramosDispensario: { increment: gramos },
          },
        })
      } else {
        // Egreso: solo baja del dispensario
        genetica = await tx.genetica.update({
          where: { id: geneticaId },
          data: { stockGramosDispensario: { decrement: gramos } },
        })
      }

      const mov = await tx.movimientoStock.create({
        data: {
          geneticaId,
          loteId:     loteId    || null,
          asociadoId: tipo === 'EGRESO' ? (asociadoId || null) : null,
          tipo:       tipo as TipoMovimiento,
          seccion:    'DISPENSARIO',
          cantidadGramos: gramos,
          fecha:      new Date(fecha),
          observaciones: observaciones || null,
          usuarioId,
        },
        include: {
          genetica:  { select: { id: true, nombre: true, stockGramos: true, stockGramosDispensario: true } },
          usuario:   { select: { id: true, nombre: true, apellido: true } },
          asociado:  { select: { id: true, nombre: true, apellido: true } },
        },
      })
      return [mov, genetica.stockGramosDispensario]
    })

    res.status(201).json({
      ...movimiento,
      stockNegativo: stockActual < 0,
      stockDispensario: stockActual,
    })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al crear movimiento' })
  }
})

// ─── PUT /api/dispensario/:id ─────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (req.usuarioRol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo los administradores pueden editar movimientos.' })
    }

    const { cantidadGramos, fecha, observaciones, asociadoId } = req.body
    const existing = await prisma.movimientoStock.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' })
    if (existing.seccion !== 'DISPENSARIO') return res.status(400).json({ error: 'Este movimiento no es de dispensario' })

    const gramosNuevos = cantidadGramos ? Math.round(Number(cantidadGramos)) : existing.cantidadGramos
    const diferencia   = gramosNuevos - existing.cantidadGramos

    const [movimiento] = await prisma.$transaction(async (tx) => {
      if (diferencia !== 0) {
        if (existing.tipo === 'INGRESO') {
          // Traslado: ajuste en ambas columnas
          await tx.genetica.update({
            where: { id: existing.geneticaId },
            data: {
              stockGramos:            { decrement: diferencia },
              stockGramosDispensario: { increment: diferencia },
            },
          })
        } else {
          // Egreso: solo ajuste en dispensario
          await tx.genetica.update({
            where: { id: existing.geneticaId },
            data: { stockGramosDispensario: { decrement: diferencia } },
          })
        }
      }

      const mov = await tx.movimientoStock.update({
        where: { id: req.params.id },
        data: {
          cantidadGramos: gramosNuevos,
          fecha:          fecha ? new Date(fecha) : existing.fecha,
          observaciones:  observaciones !== undefined ? (observaciones || null) : existing.observaciones,
          asociadoId:     asociadoId !== undefined ? (asociadoId || null) : existing.asociadoId,
        },
        include: {
          genetica:  { select: { id: true, nombre: true } },
          usuario:   { select: { id: true, nombre: true, apellido: true } },
          asociado:  { select: { id: true, nombre: true, apellido: true } },
        },
      })
      return [mov]
    })

    res.json(movimiento)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al editar movimiento' })
  }
})

// ─── DELETE /api/dispensario/:id ─────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (req.usuarioRol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Solo los administradores pueden eliminar movimientos.' })
    }

    const existing = await prisma.movimientoStock.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' })
    if (existing.seccion !== 'DISPENSARIO') return res.status(400).json({ error: 'Este movimiento no es de dispensario' })

    await prisma.$transaction(async (tx) => {
      if (existing.tipo === 'INGRESO') {
        // Revertir traslado: vuelven al stock total
        await tx.genetica.update({
          where: { id: existing.geneticaId },
          data: {
            stockGramos:            { increment: existing.cantidadGramos },
            stockGramosDispensario: { decrement: existing.cantidadGramos },
          },
        })
      } else {
        // Revertir egreso: vuelven al dispensario
        await tx.genetica.update({
          where: { id: existing.geneticaId },
          data: { stockGramosDispensario: { increment: existing.cantidadGramos } },
        })
      }
      await tx.movimientoStock.delete({ where: { id: req.params.id } })
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al eliminar movimiento' })
  }
})

export default router

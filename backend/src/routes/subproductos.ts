import { Router, Request, Response } from 'express'
import { TipoMovimiento } from '@prisma/client'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// ─── GET /api/subproductos ────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const subs = await prisma.subproducto.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { movimientos: true } },
        movimientos: { orderBy: { fecha: 'desc' }, take: 1, select: { fecha: true, tipo: true } },
      },
    })
    res.json(subs.map(s => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      unidad: s.unidad,
      stockActual: s.stockActual,
      creadoEn: s.creadoEn,
      actualizadoEn: s.actualizadoEn,
      totalMovimientos: s._count.movimientos,
      ultimoMov: s.movimientos[0] ?? null,
    })))
  } catch {
    res.status(500).json({ error: 'Error al obtener subproductos' })
  }
})

// ─── GET /api/subproductos/movimientos ───────────────────────────────────────
// Debe ir ANTES de /:id para que Express no interprete "movimientos" como un id
router.get('/movimientos', async (req: Request, res: Response) => {
  try {
    const { subproductoId, loteId, tipo, mes, page = '1', limit = '50' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (subproductoId) where.subproductoId = subproductoId
    if (loteId)        where.loteId        = loteId
    if (tipo && ['INGRESO', 'EGRESO'].includes(tipo)) where.tipo = tipo
    if (mes) {
      const [anio, m] = mes.split('-').map(Number)
      where.fecha = { gte: new Date(anio, m - 1, 1), lt: new Date(anio, m, 1) }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [movimientos, total] = await Promise.all([
      prisma.movimientoSubproducto.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
        skip,
        take: Number(limit),
        include: {
          subproducto: { select: { id: true, nombre: true, unidad: true } },
          lote:        { select: { id: true, codigo: true } },
          usuario:     { select: { id: true, nombre: true, apellido: true } },
        },
      }),
      prisma.movimientoSubproducto.count({ where }),
    ])

    res.json({ movimientos, total, page: Number(page), limit: Number(limit) })
  } catch {
    res.status(500).json({ error: 'Error al obtener movimientos de subproductos' })
  }
})

// ─── POST /api/subproductos/movimientos ──────────────────────────────────────
router.post('/movimientos', async (req: Request, res: Response) => {
  try {
    const { subproductoId, loteId, tipo, cantidad, fecha, observaciones } = req.body

    if (!subproductoId)                           return res.status(400).json({ error: 'Falta subproductoId' })
    if (!['INGRESO', 'EGRESO'].includes(tipo))    return res.status(400).json({ error: 'Tipo inválido (INGRESO | EGRESO)' })
    if (!cantidad || Number(cantidad) <= 0)        return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' })
    if (!fecha)                                    return res.status(400).json({ error: 'Falta la fecha' })

    const cant      = Math.round(Number(cantidad))
    const delta     = tipo === 'INGRESO' ? cant : -cant
    const usuarioId = req.usuarioId ?? null

    const [movimiento, stockActual] = await prisma.$transaction(async (tx) => {
      const sub = await tx.subproducto.update({
        where: { id: subproductoId },
        data:  { stockActual: { increment: delta } },
      })
      const mov = await tx.movimientoSubproducto.create({
        data: {
          subproductoId,
          loteId: loteId || null,
          tipo: tipo as TipoMovimiento,
          cantidad: cant,
          fecha: new Date(fecha),
          observaciones: observaciones || null,
          usuarioId,
        },
        include: {
          subproducto: { select: { id: true, nombre: true, unidad: true } },
          lote:        { select: { id: true, codigo: true } },
          usuario:     { select: { id: true, nombre: true, apellido: true } },
        },
      })
      return [mov, sub.stockActual]
    })

    res.status(201).json({ ...movimiento, stockNegativo: stockActual < 0, stockActual })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error al crear movimiento' })
  }
})

// ─── DELETE /api/subproductos/movimientos/:id ────────────────────────────────
router.delete('/movimientos/:id', async (req: Request, res: Response) => {
  try {
    const stockActual = await prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoSubproducto.delete({ where: { id: req.params.id } })
      const delta = mov.tipo === 'INGRESO' ? -mov.cantidad : mov.cantidad
      const s = await tx.subproducto.update({
        where: { id: mov.subproductoId },
        data:  { stockActual: { increment: delta } },
      })
      return s.stockActual
    })
    res.json({ ok: true, stockNegativo: stockActual < 0, stockActual })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error al eliminar movimiento' })
  }
})

// ─── POST /api/subproductos ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, unidad } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const s = await prisma.subproducto.create({
      data: {
        nombre:      nombre.trim(),
        descripcion: descripcion?.trim() || null,
        unidad:      unidad?.trim() || 'unidad',
      },
    })
    res.status(201).json(s)
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') return res.status(409).json({ error: 'Ya existe un subproducto con ese nombre' })
    res.status(500).json({ error: 'Error al crear subproducto' })
  }
})

// ─── PUT /api/subproductos/:id ───────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, unidad } = req.body
    const data: Record<string, string | null | undefined> = {}
    if (nombre?.trim())  data.nombre      = nombre.trim()
    if (unidad?.trim())  data.unidad      = unidad.trim()
    if ('descripcion' in req.body) data.descripcion = descripcion?.trim() || null

    const s = await prisma.subproducto.update({ where: { id: req.params.id }, data })
    res.json(s)
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') return res.status(409).json({ error: 'Ya existe un subproducto con ese nombre' })
    if ((e as { code?: string }).code === 'P2025') return res.status(404).json({ error: 'Subproducto no encontrado' })
    res.status(500).json({ error: 'Error al actualizar subproducto' })
  }
})

// ─── DELETE /api/subproductos/:id ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const count = await prisma.movimientoSubproducto.count({ where: { subproductoId: req.params.id } })
    if (count > 0) return res.status(400).json({ error: `No se puede eliminar: tiene ${count} movimiento${count !== 1 ? 's' : ''} registrado${count !== 1 ? 's' : ''}` })
    await prisma.subproducto.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return res.status(404).json({ error: 'Subproducto no encontrado' })
    res.status(500).json({ error: 'Error al eliminar subproducto' })
  }
})

export default router

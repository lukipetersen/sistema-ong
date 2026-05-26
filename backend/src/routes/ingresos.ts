import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// GET /api/ingresos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mes, tipo, categoria, estado, page = '1', limit = '200' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}

    if (mes) {
      const [anio, m] = mes.split('-').map(Number)
      where.fecha = {
        gte: new Date(anio, m - 1, 1),
        lt:  new Date(anio, m, 1),
      }
    }
    if (tipo)      where.tipo      = tipo
    if (categoria) where.categoria = categoria
    if (estado)    where.estado    = estado

    const skip = (Number(page) - 1) * Number(limit)

    const [ingresos, total] = await Promise.all([
      prisma.ingreso.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.ingreso.count({ where }),
    ])

    res.json({ ingresos, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener ingresos' })
  }
})

// GET /api/ingresos/resumen?mes=2026-05
router.get('/resumen', async (req: Request, res: Response) => {
  try {
    const { mes } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (mes) {
      const [anio, m] = mes.split('-').map(Number)
      where.fecha = {
        gte: new Date(anio, m - 1, 1),
        lt:  new Date(anio, m, 1),
      }
    }

    const ingresos = await prisma.ingreso.findMany({ where })

    const total       = ingresos.reduce((s, i) => s + Number(i.monto), 0)
    const totalFijo   = ingresos.filter(i => i.categoria === 'FIJO').reduce((s, i) => s + Number(i.monto), 0)
    const totalVar    = ingresos.filter(i => i.categoria === 'VARIABLE').reduce((s, i) => s + Number(i.monto), 0)
    const pendientes  = ingresos.filter(i => i.estado === 'PENDIENTE').reduce((s, i) => s + Number(i.monto), 0)
    const cantPend    = ingresos.filter(i => i.estado === 'PENDIENTE').length

    const porTipo = ['VENTA', 'CUOTA', 'DONACION'].map(t => ({
      tipo:  t,
      total: ingresos.filter(i => i.tipo === t).reduce((s, i) => s + Number(i.monto), 0),
    }))

    res.json({ total, totalFijo, totalVar, pendientes, cantPend, porTipo })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

// POST /api/ingresos
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fecha, tipo, categoria, descripcion, monto, estado, observaciones } = req.body

    if (!fecha || !tipo || !categoria || !descripcion || monto == null) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    const ingreso = await prisma.ingreso.create({
      data: {
        fecha:         new Date(fecha),
        tipo,
        categoria,
        descripcion,
        monto,
        estado:        estado || 'COBRADO',
        observaciones: observaciones || null,
      },
    })
    res.status(201).json(ingreso)
  } catch (e) {
    res.status(500).json({ error: 'Error al crear ingreso' })
  }
})

// PUT /api/ingresos/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { fecha, tipo, categoria, descripcion, monto, estado, observaciones } = req.body

    const ingreso = await prisma.ingreso.update({
      where: { id: req.params.id },
      data: {
        ...(fecha        && { fecha: new Date(fecha) }),
        ...(tipo         && { tipo }),
        ...(categoria    && { categoria }),
        ...(descripcion  && { descripcion }),
        ...(monto != null && { monto }),
        ...(estado       && { estado }),
        observaciones: observaciones ?? null,
      },
    })
    res.json(ingreso)
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar ingreso' })
  }
})

// DELETE /api/ingresos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.ingreso.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar ingreso' })
  }
})

export default router

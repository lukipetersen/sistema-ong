import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// GET /api/gastos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { mes, categoria, estado, page = '1', limit = '50' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}

    if (mes) {
      const [anio, m] = mes.split('-').map(Number)
      where.fecha = {
        gte: new Date(anio, m - 1, 1),
        lt:  new Date(anio, m, 1),
      }
    }
    if (categoria) where.categoria = categoria
    if (estado)    where.estado    = estado

    const skip = (Number(page) - 1) * Number(limit)

    const [gastos, total] = await Promise.all([
      prisma.gasto.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.gasto.count({ where }),
    ])

    res.json({ gastos, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener gastos' })
  }
})

// GET /api/gastos/resumen?mes=2026-05
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

    const gastos = await prisma.gasto.findMany({ where })

    const total       = gastos.reduce((s, g) => s + Number(g.monto), 0)
    const totalFijos  = gastos.filter(g => g.categoria === 'FIJOS').reduce((s, g) => s + Number(g.monto), 0)
    const totalVar    = gastos.filter(g => g.categoria === 'VARIABLES').reduce((s, g) => s + Number(g.monto), 0)
    const pendientes  = gastos.filter(g => g.estado === 'PENDIENTE').reduce((s, g) => s + Number(g.monto), 0)
    const cantPend    = gastos.filter(g => g.estado === 'PENDIENTE').length

    const porCategoria = ['FIJOS','VARIABLES','ADMINISTRACION','INVERSION'].map(cat => ({
      categoria: cat,
      total: gastos.filter(g => g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0),
    }))

    res.json({ total, totalFijos, totalVar, pendientes, cantPend, porCategoria })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener resumen' })
  }
})

// POST /api/gastos
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fecha, categoria, subcategoria, descripcion, monto, medioPago, estado, notas } = req.body

    if (!fecha || !categoria || !subcategoria || !descripcion || monto == null) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    const gasto = await prisma.gasto.create({
      data: {
        fecha:        new Date(fecha),
        categoria,
        subcategoria,
        descripcion,
        monto,
        medioPago:    medioPago || null,
        estado:       estado || 'PAGADO',
        notas:        notas || null,
      },
    })
    res.status(201).json(gasto)
  } catch (e) {
    res.status(500).json({ error: 'Error al crear gasto' })
  }
})

// PUT /api/gastos/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { fecha, categoria, subcategoria, descripcion, monto, medioPago, estado, notas } = req.body

    const gasto = await prisma.gasto.update({
      where: { id: req.params.id },
      data: {
        ...(fecha        && { fecha: new Date(fecha) }),
        ...(categoria    && { categoria }),
        ...(subcategoria && { subcategoria }),
        ...(descripcion  && { descripcion }),
        ...(monto != null && { monto }),
        medioPago: medioPago || null,
        ...(estado       && { estado }),
        notas: notas ?? null,
      },
    })
    res.json(gasto)
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar gasto' })
  }
})

// DELETE /api/gastos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.gasto.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar gasto' })
  }
})

export default router

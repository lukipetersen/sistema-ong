import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// ─── Utilidades ────────────────────────────────────────────────────────────────

export function abreviarNombre(nombre: string): string {
  const palabras = nombre
    .toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 1) return palabras[0].slice(0, 4)
  return palabras.map(p => p.slice(0, 2)).join('').slice(0, 4)
}

// GET /api/geneticas — lista con stats
router.get('/', async (_req: Request, res: Response) => {
  try {
    const geneticas = await prisma.genetica.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { lotes: true } },
        lotes: {
          select: {
            estado: true,
            _count: { select: { plantas: true } },
            plantas: { select: { estado: true } },
          },
        },
      },
    })

    const data = geneticas.map(g => {
      const totalPlantas  = g.lotes.flatMap(l => l.plantas).length
      const plantasActivas = g.lotes.flatMap(l => l.plantas).filter(p => p.estado === 'ACTIVA').length
      const lotesActivos  = g.lotes.filter(l => ['PRODUCCION', 'ACTIVO'].includes(l.estado)).length
      return {
        id: g.id, nombre: g.nombre, descripcion: g.descripcion, observaciones: g.observaciones,
        creadoEn: g.creadoEn,
        totalLotes: g._count.lotes, lotesActivos, totalPlantas, plantasActivas,
      }
    })

    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener genéticas' })
  }
})

// GET /api/geneticas/buscar?q= — búsqueda global
router.get('/buscar', async (req: Request, res: Response) => {
  try {
    const { q = '' } = req.query as Record<string, string>
    if (q.trim().length < 2) return res.json({ geneticas: [], lotes: [], plantas: [] })

    const term = q.trim()
    const [geneticas, lotes, plantas] = await Promise.all([
      prisma.genetica.findMany({
        where: { nombre: { contains: term, mode: 'insensitive' } },
        select: { id: true, nombre: true, descripcion: true },
        take: 10,
      }),
      prisma.lote.findMany({
        where: { OR: [
          { codigo: { contains: term, mode: 'insensitive' } },
          { observaciones: { contains: term, mode: 'insensitive' } },
          { genetica: { nombre: { contains: term, mode: 'insensitive' } } },
        ]},
        select: { id: true, codigo: true, estado: true, sala: true, genetica: { select: { nombre: true } } },
        take: 10,
      }),
      prisma.planta.findMany({
        where: { OR: [
          { codigo: { contains: term, mode: 'insensitive' } },
          { alias: { contains: term, mode: 'insensitive' } },
          { observaciones: { contains: term, mode: 'insensitive' } },
        ]},
        select: {
          id: true, codigo: true, alias: true, estado: true,
          lote: { select: { codigo: true, genetica: { select: { nombre: true } } } },
        },
        take: 20,
      }),
    ])

    res.json({ geneticas, lotes, plantas })
  } catch (e) {
    res.status(500).json({ error: 'Error en búsqueda' })
  }
})

// GET /api/geneticas/:id — detalle con lotes y conteo de plantas
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const genetica = await prisma.genetica.findUnique({
      where: { id: req.params.id },
      include: {
        lotes: {
          orderBy: { creadoEn: 'desc' },
          include: {
            _count: { select: { plantas: true } },
            plantas: { select: { estado: true } },
          },
        },
      },
    })
    if (!genetica) return res.status(404).json({ error: 'Genética no encontrada' })

    const lotes = genetica.lotes.map(l => ({
      id: l.id, codigo: l.codigo, sala: l.sala, estado: l.estado,
      fechaInicio: l.fechaInicio, fechaFinalizacion: l.fechaFinalizacion,
      observaciones: l.observaciones, creadoEn: l.creadoEn,
      totalPlantas: l._count.plantas,
      plantasActivas: l.plantas.filter(p => p.estado === 'ACTIVA').length,
      plantasSeleccionadas: l.plantas.filter(p => p.estado === 'SELECCIONADA').length,
    }))

    res.json({ ...genetica, lotes })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener genética' })
  }
})

// POST /api/geneticas
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, observaciones } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' })

    const existente = await prisma.genetica.findFirst({ where: { nombre: { equals: nombre.trim(), mode: 'insensitive' } } })
    if (existente) return res.status(409).json({ error: `Ya existe una genética con el nombre "${nombre}"` })

    const genetica = await prisma.genetica.create({
      data: { nombre: nombre.trim(), descripcion: descripcion || null, observaciones: observaciones || null },
    })
    res.status(201).json(genetica)
  } catch (e) {
    res.status(500).json({ error: 'Error al crear genética' })
  }
})

// PUT /api/geneticas/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, observaciones } = req.body

    if (nombre) {
      const dup = await prisma.genetica.findFirst({
        where: { nombre: { equals: nombre.trim(), mode: 'insensitive' }, NOT: { id: req.params.id } },
      })
      if (dup) return res.status(409).json({ error: `Ya existe una genética con el nombre "${nombre}"` })
    }

    const genetica = await prisma.genetica.update({
      where: { id: req.params.id },
      data: {
        ...(nombre       && { nombre: nombre.trim() }),
        descripcion:  descripcion  ?? undefined,
        observaciones: observaciones ?? undefined,
      },
    })
    res.json(genetica)
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar genética' })
  }
})

// DELETE /api/geneticas/:id — solo si no tiene lotes
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const lotes = await prisma.lote.count({ where: { geneticaId: req.params.id } })
    if (lotes > 0) return res.status(409).json({ error: 'No se puede eliminar una genética con lotes asociados' })

    await prisma.genetica.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar genética' })
  }
})

export default router

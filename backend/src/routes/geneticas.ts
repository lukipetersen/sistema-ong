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
        _count: { select: { loteGeneticas: true } },
        loteGeneticas: {
          select: {
            stockGramos: true,
            lote: { select: { estado: true } },
          },
        },
        plantas: { select: { estado: true } },
      },
    })

    const data = geneticas.map(g => {
      const totalLotes    = g._count.loteGeneticas
      const lotesActivos  = g.loteGeneticas.filter(lg => ['PRODUCCION', 'ACTIVO'].includes(lg.lote.estado)).length
      const totalPlantas  = g.plantas.length
      const plantasActivas = g.plantas.filter(p => p.estado === 'ACTIVA').length
      return {
        id: g.id, nombre: g.nombre, descripcion: g.descripcion, observaciones: g.observaciones,
        creadoEn: g.creadoEn, stockGramos: g.stockGramos,
        totalLotes, lotesActivos, totalPlantas, plantasActivas,
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
          { loteGeneticas: { some: { genetica: { nombre: { contains: term, mode: 'insensitive' } } } } },
        ]},
        select: {
          id: true, codigo: true, estado: true, sala: true,
          loteGeneticas: { select: { genetica: { select: { nombre: true } } }, take: 1 },
        },
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
          lote:    { select: { codigo: true } },
          genetica: { select: { nombre: true } },
        },
        take: 20,
      }),
    ])

    // Shape lotes to include first genetic name for compatibility
    const lotesConGenetica = lotes.map(l => ({
      id: l.id, codigo: l.codigo, estado: l.estado, sala: l.sala,
      genetica: l.loteGeneticas[0]?.genetica ?? null,
    }))

    res.json({ geneticas, lotes: lotesConGenetica, plantas })
  } catch (e) {
    res.status(500).json({ error: 'Error en búsqueda' })
  }
})

// GET /api/geneticas/:id — detalle con loteGeneticas
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const genetica = await prisma.genetica.findUnique({
      where: { id: req.params.id },
      include: {
        loteGeneticas: {
          orderBy: { creadoEn: 'desc' },
          include: {
            lote: {
              select: {
                id: true, codigo: true, sala: true, estado: true,
                fechaInicio: true, fechaFinalizacion: true,
                observaciones: true, creadoEn: true,
                _count: { select: { plantas: true } },
              },
            },
          },
        },
        plantas: { select: { estado: true } },
      },
    })
    if (!genetica) return res.status(404).json({ error: 'Genética no encontrada' })

    const loteGeneticas = genetica.loteGeneticas.map(lg => {
      const lote = lg.lote
      return {
        id: lg.id, stockGramos: lg.stockGramos, creadoEn: lg.creadoEn,
        lote: {
          id: lote.id, codigo: lote.codigo, sala: lote.sala, estado: lote.estado,
          fechaInicio: lote.fechaInicio, fechaFinalizacion: lote.fechaFinalizacion,
          observaciones: lote.observaciones, creadoEn: lote.creadoEn,
          totalPlantas: lote._count.plantas,
        },
      }
    })

    res.json({ ...genetica, loteGeneticas, lotes: loteGeneticas.map(lg => lg.lote) })
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

// DELETE /api/geneticas/:id — solo si no tiene loteGeneticas ni plantas
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [loteGeneticas, plantas] = await Promise.all([
      prisma.loteGenetica.count({ where: { geneticaId: req.params.id } }),
      prisma.planta.count({ where: { geneticaId: req.params.id } }),
    ])
    if (loteGeneticas > 0) return res.status(409).json({ error: 'No se puede eliminar una genética con lotes asociados' })
    if (plantas > 0)       return res.status(409).json({ error: 'No se puede eliminar una genética con plantas asociadas' })

    await prisma.genetica.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar genética' })
  }
})

export default router

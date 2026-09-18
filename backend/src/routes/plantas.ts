import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'
import { abreviarNombre } from './geneticas'

const router = Router()
router.use(autenticar)

// ─── Generación de código ───────────────────────────────────────────────────

async function generarCodigoPlanta(loteId: string, geneticaId: string): Promise<string> {
  const [lote, genetica] = await Promise.all([
    prisma.lote.findUnique({ where: { id: loteId }, select: { codigo: true } }),
    prisma.genetica.findUnique({ where: { id: geneticaId }, select: { nombre: true } }),
  ])
  if (!lote)    throw new Error('Lote no encontrado')
  if (!genetica) throw new Error('Genética no encontrada')

  const genAbbrev = abreviarNombre(genetica.nombre)
  const partes    = lote.codigo.split('-')
  const loteSeq   = partes[partes.length - 1] ?? '001'
  const prefix    = `PL-${genAbbrev}-L${loteSeq}-P`

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.planta.findMany({
      where:  { codigo: { startsWith: prefix } },
      select: { codigo: true },
    })
    const maxSeq = existentes.reduce((max, p) => {
      const n = parseInt(p.codigo.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
  })
}

// GET /api/plantas — lista con filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { loteId, geneticaId, estado, search, page = '1', limit = '200' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (loteId)    where.loteId    = loteId
    if (geneticaId) where.geneticaId = geneticaId
    if (estado)    where.estado    = estado
    if (search?.trim()) {
      const term = search.trim()
      where.OR = [
        { codigo: { contains: term, mode: 'insensitive' } },
        { alias:  { contains: term, mode: 'insensitive' } },
        { observaciones: { contains: term, mode: 'insensitive' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [plantas, total] = await Promise.all([
      prisma.planta.findMany({
        where,
        orderBy: { codigo: 'asc' },
        skip,
        take: Number(limit),
        include: {
          lote:    { select: { id: true, codigo: true, sala: true } },
          genetica: { select: { id: true, nombre: true } },
        },
      }),
      prisma.planta.count({ where }),
    ])

    res.json({ plantas, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener plantas' })
  }
})

// GET /api/plantas/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const planta = await prisma.planta.findUnique({
      where:   { id: req.params.id },
      include: {
        lote:    { select: { id: true, codigo: true, sala: true, estado: true } },
        genetica: { select: { id: true, nombre: true } },
      },
    })
    if (!planta) return res.status(404).json({ error: 'Planta no encontrada' })
    res.json(planta)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener planta' })
  }
})

// POST /api/plantas
router.post('/', async (req: Request, res: Response) => {
  try {
    const { loteId, geneticaId, alias, observaciones } = req.body
    if (!loteId)    return res.status(400).json({ error: 'El loteId es obligatorio' })
    if (!geneticaId) return res.status(400).json({ error: 'El geneticaId es obligatorio' })

    // Verify the (loteId, geneticaId) combination exists in lote_geneticas
    const loteGenetica = await prisma.loteGenetica.findUnique({
      where: { loteId_geneticaId: { loteId, geneticaId } },
    })
    if (!loteGenetica) {
      return res.status(400).json({
        error: 'La genética seleccionada no está asociada a este lote. Agregala primero.',
      })
    }

    const codigo = await generarCodigoPlanta(loteId, geneticaId)

    const planta = await prisma.planta.create({
      data: {
        codigo,
        loteId,
        geneticaId,
        alias:         alias         || null,
        observaciones: observaciones || null,
      },
      include: {
        genetica: { select: { id: true, nombre: true } },
      },
    })
    res.status(201).json(planta)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    res.status(500).json({ error: msg || 'Error al crear planta' })
  }
})

// PUT /api/plantas/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { alias, estado, observaciones } = req.body

    const planta = await prisma.planta.update({
      where: { id: req.params.id },
      data: {
        ...(alias  !== undefined && { alias:  alias  || null }),
        ...(estado               && { estado }),
        observaciones: observaciones ?? undefined,
      },
      include: {
        genetica: { select: { id: true, nombre: true } },
      },
    })
    res.json(planta)
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar planta' })
  }
})

// DELETE /api/plantas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.planta.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar planta' })
  }
})

export default router

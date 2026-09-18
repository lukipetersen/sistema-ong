import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'
import { abreviarNombre } from './geneticas'

const router = Router()
router.use(autenticar)

// ─── Generación de códigos ──────────────────────────────────────────────────

function parseSalaNum(sala: string): string {
  if (sala === 'SALA_1') return 'S1'
  if (sala === 'SALA_2') return 'S2'
  return 'SX'
}

async function generarCodigoLote(sala: string): Promise<string> {
  const anio   = new Date().getFullYear()
  const salaCode = parseSalaNum(sala)
  const prefix = `LOT-${salaCode}-${anio}-`

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.lote.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    })
    const maxSeq = existentes.reduce((max, l) => {
      const n = parseInt(l.codigo.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
  })
}

export async function generarCodigosPlanta(
  loteId: string,
  geneticaId: string,
  cantidad: number,
  loteCodigo: string,
): Promise<string[]> {
  const genetica = await prisma.genetica.findUnique({ where: { id: geneticaId }, select: { nombre: true } })
  if (!genetica) throw new Error('Genética no encontrada')

  const genAbbrev = abreviarNombre(genetica.nombre)
  // Extract lote seq from lote code: LOT-S1-2026-001 → last part "001"
  const partes  = loteCodigo.split('-')
  const loteSeq = partes[partes.length - 1] ?? '001'
  const prefix  = `PL-${genAbbrev}-L${loteSeq}-P`

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.planta.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    })
    const maxSeq = existentes.reduce((max, p) => {
      const n = parseInt(p.codigo.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)

    return Array.from({ length: cantidad }, (_, i) =>
      `${prefix}${String(maxSeq + i + 1).padStart(3, '0')}`,
    )
  })
}

// GET /api/lotes — lista con filtros
router.get('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, estado, sala, page = '1', limit = '200' } = req.query as Record<string, string>

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado
    if (sala)   where.sala   = sala
    if (geneticaId) {
      where.loteGeneticas = { some: { geneticaId } }
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [lotes, total] = await Promise.all([
      prisma.lote.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip,
        take: Number(limit),
        include: {
          loteGeneticas: {
            include: { genetica: { select: { id: true, nombre: true } } },
          },
          _count:  { select: { plantas: true } },
          plantas: { select: { estado: true } },
        },
      }),
      prisma.lote.count({ where }),
    ])

    const data = lotes.map(l => ({
      id: l.id, codigo: l.codigo, sala: l.sala, estado: l.estado,
      fechaInicio: l.fechaInicio, fechaFinalizacion: l.fechaFinalizacion,
      observaciones: l.observaciones, creadoEn: l.creadoEn,
      loteGeneticas: l.loteGeneticas.map(lg => ({
        id: lg.id, geneticaId: lg.geneticaId, genetica: lg.genetica,
        stockGramos: lg.stockGramos,
        plantasCount: l.plantas.length, // total, per-genetic calculated below
      })),
      // Legacy compat: first genetic (or null)
      genetica: l.loteGeneticas[0]?.genetica ?? null,
      totalPlantas:         l._count.plantas,
      plantasActivas:       l.plantas.filter(p => p.estado === 'ACTIVA').length,
      plantasSeleccionadas: l.plantas.filter(p => p.estado === 'SELECCIONADA').length,
    }))

    res.json({ lotes: data, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener lotes' })
  }
})

// GET /api/lotes/:id — detalle con loteGeneticas, plantas e historial
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where:   { id: req.params.id },
      include: {
        loteGeneticas: {
          include: {
            genetica: { select: { id: true, nombre: true, descripcion: true } },
          },
          orderBy: { creadoEn: 'asc' },
        },
        plantas: {
          orderBy: { codigo: 'asc' },
          include: { genetica: { select: { id: true, nombre: true } } },
        },
        historial: { orderBy: { creadoEn: 'desc' }, take: 50 },
      },
    })
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' })

    // Enrich loteGeneticas with per-genetic plant counts
    const loteGeneticasConConteo = lote.loteGeneticas.map(lg => {
      const plantasDeEstaGenetica = lote.plantas.filter(p => p.geneticaId === lg.geneticaId)
      return {
        id: lg.id, geneticaId: lg.geneticaId, genetica: lg.genetica,
        stockGramos: lg.stockGramos, creadoEn: lg.creadoEn,
        totalPlantas:   plantasDeEstaGenetica.length,
        plantasActivas: plantasDeEstaGenetica.filter(p => p.estado === 'ACTIVA').length,
      }
    })

    // Legacy compat
    const primeraGenetica = lote.loteGeneticas[0]?.genetica ?? null

    res.json({
      ...lote,
      loteGeneticas: loteGeneticasConConteo,
      genetica: primeraGenetica,
    })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener lote' })
  }
})

// POST /api/lotes
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      sala, fechaInicio, observaciones,
      geneticaIds = [] as string[],
      cantidadPlantas = 0,
    } = req.body

    if (!sala || !fechaInicio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (sala, fechaInicio)' })
    }

    const codigo = await generarCodigoLote(sala)

    const lote = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.lote.create({
        data: {
          codigo,
          sala,
          fechaInicio:   new Date(fechaInicio),
          observaciones: observaciones || null,
        },
      })

      // Create LoteGenetica records for each provided genetic
      if (Array.isArray(geneticaIds) && geneticaIds.length > 0) {
        await tx.loteGenetica.createMany({
          data: geneticaIds.map((gId: string) => ({
            loteId: nuevo.id,
            geneticaId: gId,
            stockGramos: 0,
          })),
          skipDuplicates: true,
        })
      }

      // Create plants if requested
      const totalPlantas = Number(cantidadPlantas)
      if (totalPlantas > 0 && Array.isArray(geneticaIds) && geneticaIds.length > 0) {
        // Distribute plants evenly across genetics
        const gIds: string[] = geneticaIds
        const plantasPorGenetica = Math.floor(totalPlantas / gIds.length)
        const resto = totalPlantas % gIds.length

        for (let i = 0; i < gIds.length; i++) {
          const cantidad = plantasPorGenetica + (i < resto ? 1 : 0)
          if (cantidad <= 0) continue

          const codigos = await generarCodigosPlanta(nuevo.id, gIds[i], cantidad, codigo)
          await tx.planta.createMany({
            data: codigos.map(c => ({ codigo: c, loteId: nuevo.id, geneticaId: gIds[i] })),
          })
        }
      }

      await tx.historialLote.create({
        data: {
          loteId:   nuevo.id,
          accion:   'CREADO',
          detalles: `Genéticas: ${geneticaIds.length}${totalPlantas > 0 ? `, ${totalPlantas} plantas` : ''}`,
        },
      })

      return nuevo
    })

    const loteCompleto = await prisma.lote.findUnique({
      where:   { id: lote.id },
      include: {
        loteGeneticas: { include: { genetica: { select: { id: true, nombre: true } } } },
        plantas:  { orderBy: { codigo: 'asc' }, include: { genetica: { select: { id: true, nombre: true } } } },
        historial: { orderBy: { creadoEn: 'desc' }, take: 20 },
        _count:    { select: { plantas: true } },
      },
    })
    res.status(201).json(loteCompleto)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear lote'
    res.status(500).json({ error: msg })
  }
})

// POST /api/lotes/:id/geneticas — add a genetic to an existing lot
router.post('/:id/geneticas', async (req: Request, res: Response) => {
  try {
    const { geneticaId } = req.body
    if (!geneticaId) return res.status(400).json({ error: 'Falta geneticaId' })

    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } })
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' })

    const existente = await prisma.loteGenetica.findUnique({
      where: { loteId_geneticaId: { loteId: req.params.id, geneticaId } },
    })
    if (existente) return res.status(409).json({ error: 'Esta genética ya está en el lote' })

    const loteGenetica = await prisma.loteGenetica.create({
      data: { loteId: req.params.id, geneticaId, stockGramos: 0 },
      include: { genetica: { select: { id: true, nombre: true } } },
    })

    res.status(201).json(loteGenetica)
  } catch (e) {
    res.status(500).json({ error: 'Error al agregar genética al lote' })
  }
})

// DELETE /api/lotes/:id/geneticas/:geneticaId — remove a genetic from lot
router.delete('/:id/geneticas/:geneticaId', async (req: Request, res: Response) => {
  try {
    const { id: loteId, geneticaId } = req.params

    // Check no plants of this genetic exist in the lot
    const plantasCount = await prisma.planta.count({
      where: { loteId, geneticaId },
    })
    if (plantasCount > 0) {
      return res.status(409).json({
        error: `No se puede quitar esta genética: el lote tiene ${plantasCount} plantas de esta variedad`,
      })
    }

    await prisma.loteGenetica.delete({
      where: { loteId_geneticaId: { loteId, geneticaId } },
    })

    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al quitar genética del lote' })
  }
})

// PUT /api/lotes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { sala, fechaInicio, fechaFinalizacion, estado, observaciones } = req.body

    const anterior = await prisma.lote.findUnique({ where: { id: req.params.id } })
    if (!anterior) return res.status(404).json({ error: 'Lote no encontrado' })

    const lote = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.lote.update({
        where: { id: req.params.id },
        data: {
          ...(sala              && { sala }),
          ...(fechaInicio       && { fechaInicio: new Date(fechaInicio) }),
          ...(fechaFinalizacion !== undefined && {
            fechaFinalizacion: fechaFinalizacion ? new Date(fechaFinalizacion) : null,
          }),
          ...(estado            && { estado }),
          observaciones: observaciones ?? undefined,
        },
      })

      if (estado && estado !== anterior.estado) {
        await tx.historialLote.create({
          data: {
            loteId:   req.params.id,
            accion:   'ESTADO_CAMBIADO',
            detalles: `${anterior.estado} → ${estado}`,
          },
        })
      }

      return actualizado
    })

    res.json(lote)
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar lote' })
  }
})

// DELETE /api/lotes/:id — solo si no tiene plantas
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const total = await prisma.planta.count({ where: { loteId: req.params.id } })
    if (total > 0) return res.status(409).json({ error: 'No se puede eliminar un lote con plantas asociadas' })

    await prisma.lote.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar lote' })
  }
})

export default router

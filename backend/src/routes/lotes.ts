import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'
import { abreviarNombre } from './geneticas'

const router = Router()
router.use(autenticar)

// ─── Generación de códigos ──────────────────────────────────────────────────

async function generarCodigoLote(geneticaId: string): Promise<string> {
  const genetica = await prisma.genetica.findUnique({ where: { id: geneticaId } })
  if (!genetica) throw new Error('Genética no encontrada')

  const abbrev = abreviarNombre(genetica.nombre)
  const anio   = new Date().getFullYear()
  const prefix = `LOT-${abbrev}-${anio}-`

  return await prisma.$transaction(async (tx) => {
    const existentes = await tx.lote.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    })
    const maxSeq = existentes.reduce((max, l) => {
      const n = parseInt(l.codigo.slice(prefix.length), 10)
      return isNaN(n) ? max : Math.max(max, n)
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
  })
}

async function generarCodigosPlanta(loteId: string, cantidad: number, loteCodigo: string): Promise<string[]> {
  return await prisma.$transaction(async (tx) => {
    const partes   = loteCodigo.split('-')   // ['LOT', 'ABBREV', '2026', '01']
    const abbrev   = partes[1] ?? 'XX'
    const loteSeq  = partes[3] ?? '01'
    const prefix   = `PL-${abbrev}-L${loteSeq}-P`

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
    if (geneticaId) where.geneticaId = geneticaId
    if (estado)     where.estado     = estado
    if (sala)       where.sala       = sala

    const skip = (Number(page) - 1) * Number(limit)

    const [lotes, total] = await Promise.all([
      prisma.lote.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip,
        take: Number(limit),
        include: {
          genetica: { select: { id: true, nombre: true } },
          _count:   { select: { plantas: true } },
          plantas:  { select: { estado: true } },
        },
      }),
      prisma.lote.count({ where }),
    ])

    const data = lotes.map(l => ({
      id: l.id, codigo: l.codigo, sala: l.sala, estado: l.estado,
      fechaInicio: l.fechaInicio, fechaFinalizacion: l.fechaFinalizacion,
      observaciones: l.observaciones, creadoEn: l.creadoEn,
      genetica: l.genetica,
      totalPlantas:      l._count.plantas,
      plantasActivas:    l.plantas.filter(p => p.estado === 'ACTIVA').length,
      plantasSeleccionadas: l.plantas.filter(p => p.estado === 'SELECCIONADA').length,
    }))

    res.json({ lotes: data, total, page: Number(page), limit: Number(limit) })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener lotes' })
  }
})

// GET /api/lotes/:id — detalle con plantas e historial
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where:   { id: req.params.id },
      include: {
        genetica:  { select: { id: true, nombre: true } },
        plantas:   { orderBy: { codigo: 'asc' } },
        historial: { orderBy: { creadoEn: 'desc' }, take: 50 },
      },
    })
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' })
    res.json(lote)
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener lote' })
  }
})

// POST /api/lotes
router.post('/', async (req: Request, res: Response) => {
  try {
    const { geneticaId, sala, fechaInicio, observaciones, cantidadPlantas = 0 } = req.body

    if (!geneticaId || !sala || !fechaInicio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    const codigo = await generarCodigoLote(geneticaId)

    const lote = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.lote.create({
        data: {
          codigo,
          geneticaId,
          sala,
          fechaInicio:   new Date(fechaInicio),
          observaciones: observaciones || null,
        },
      })

      if (cantidadPlantas > 0) {
        const codigos = await generarCodigosPlanta(nuevo.id, cantidadPlantas, codigo)
        await tx.planta.createMany({
          data: codigos.map(c => ({ codigo: c, loteId: nuevo.id })),
        })
      }

      await tx.historialLote.create({
        data: {
          loteId:   nuevo.id,
          accion:   'CREADO',
          detalles: cantidadPlantas > 0 ? `${cantidadPlantas} plantas generadas` : undefined,
        },
      })

      return nuevo
    })

    const loteConPlantas = await prisma.lote.findUnique({
      where:   { id: lote.id },
      include: {
        genetica:  { select: { id: true, nombre: true } },
        plantas:   { orderBy: { codigo: 'asc' } },
        historial: { orderBy: { creadoEn: 'desc' }, take: 20 },
        _count:    { select: { plantas: true } },
      },
    })
    res.status(201).json(loteConPlantas)
  } catch (e) {
    res.status(500).json({ error: 'Error al crear lote' })
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

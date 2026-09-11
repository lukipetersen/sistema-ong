import { Router, Request, Response } from 'express'
import { CategoriaGasto, SubcategoriaGasto, MedioPago, EstadoGasto } from '@prisma/client'
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

// POST /api/gastos/importar  — bulk insert desde Excel
router.post('/importar', async (req: Request, res: Response) => {
  try {
    const { gastos } = req.body as { gastos: unknown[] }

    if (!Array.isArray(gastos) || gastos.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de gastos' })
    }

    const CATEGORIAS_VALIDAS  = new Set(['FIJOS', 'VARIABLES', 'ADMINISTRACION', 'INVERSION'])
    const SUBCATEGORIAS_VALIDAS = new Set(['ALQUILER', 'INSUMOS', 'SUELDOS', 'SERVICIOS', 'MANTENIMIENTO', 'OTROS'])
    const MEDIOS_VALIDOS      = new Set(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'CHEQUE', null, undefined, ''])
    const ESTADOS_VALIDOS     = new Set(['PAGADO', 'PENDIENTE'])

    type FilaGasto = {
      fecha: Date; categoria: CategoriaGasto; subcategoria: SubcategoriaGasto
      descripcion: string; monto: number; medioPago: MedioPago | null
      estado: EstadoGasto; notas: string | null
    }
    const datos: FilaGasto[] = []
    const errores: { fila: number; error: string }[] = []

    for (let i = 0; i < gastos.length; i++) {
      const g = gastos[i] as Record<string, unknown>
      const fila = i + 2

      if (!g.fecha)        { errores.push({ fila, error: 'Falta la fecha' }); continue }
      if (!g.categoria || !CATEGORIAS_VALIDAS.has(String(g.categoria)))         { errores.push({ fila, error: `Categoría inválida: "${g.categoria}"` }); continue }
      if (!g.subcategoria || !SUBCATEGORIAS_VALIDAS.has(String(g.subcategoria))){ errores.push({ fila, error: `Subcategoría inválida: "${g.subcategoria}"` }); continue }
      if (!g.descripcion)  { errores.push({ fila, error: 'Falta la descripción' }); continue }
      if (g.monto == null || isNaN(Number(g.monto)) || Number(g.monto) <= 0)    { errores.push({ fila, error: 'Monto inválido' }); continue }
      if (!MEDIOS_VALIDOS.has(g.medioPago as string))                           { errores.push({ fila, error: `Medio de pago inválido: "${g.medioPago}"` }); continue }
      if (g.estado && !ESTADOS_VALIDOS.has(String(g.estado)))                   { errores.push({ fila, error: `Estado inválido: "${g.estado}"` }); continue }

      datos.push({
        fecha:        new Date(String(g.fecha)),
        categoria:    String(g.categoria) as CategoriaGasto,
        subcategoria: String(g.subcategoria) as SubcategoriaGasto,
        descripcion:  String(g.descripcion),
        monto:        Number(g.monto),
        medioPago:    (g.medioPago && String(g.medioPago) !== '') ? String(g.medioPago) as MedioPago : null,
        estado:       (g.estado ? String(g.estado) : 'PAGADO') as EstadoGasto,
        notas:        g.notas ? String(g.notas) : null,
      })
    }

    // Deduplicar por fecha+monto+categoria+subcategoria (clave estable aunque cambie la descripcion)
    const existentes = await prisma.gasto.findMany({
      select: { id: true, fecha: true, monto: true, categoria: true, subcategoria: true, descripcion: true, notas: true, medioPago: true, estado: true },
    })

    const clave = (fecha: Date, monto: number | string, categoria: string, subcategoria: string) =>
      `${new Date(fecha).toISOString().slice(0, 10)}|${parseFloat(String(monto))}|${categoria}|${subcategoria}`

    const mapaExistentes = new Map(existentes.map(g => [clave(g.fecha, g.monto.toString(), g.categoria, g.subcategoria), g]))

    const nuevos: typeof datos    = []
    let   cantActualizados        = 0

    for (const d of datos) {
      const k = clave(d.fecha, d.monto, d.categoria, d.subcategoria)
      const existente = mapaExistentes.get(k)
      if (!existente) {
        nuevos.push(d)
      } else {
        // Actualizar solo si cambió algún campo editable
        const cambio: Record<string, unknown> = {}
        if (existente.descripcion !== d.descripcion)                cambio.descripcion = d.descripcion
        if ((existente.notas ?? null) !== (d.notas ?? null))        cambio.notas       = d.notas
        if ((existente.medioPago ?? null) !== (d.medioPago ?? null)) cambio.medioPago  = d.medioPago
        if (existente.estado !== d.estado)                          cambio.estado      = d.estado
        if (Object.keys(cambio).length > 0) {
          await prisma.gasto.update({ where: { id: existente.id }, data: cambio })
          cantActualizados++
        }
      }
    }

    const { count } = nuevos.length > 0
      ? await prisma.gasto.createMany({ data: nuevos })
      : { count: 0 }

    const omitidos = datos.length - nuevos.length - cantActualizados

    res.status(201).json({ importados: count, omitidos, actualizados: cantActualizados, errores })
  } catch (e) {
    res.status(500).json({ error: 'Error al importar gastos' })
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

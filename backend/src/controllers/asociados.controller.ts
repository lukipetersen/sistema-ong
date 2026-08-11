import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'

// ─── Schemas de validación ────────────────────────────────────────────────────

const esquemaAsociado = z.object({
  nombre:          z.string().min(1, 'El nombre es obligatorio'),
  apellido:        z.string().min(1, 'El apellido es obligatorio'),
  dni:             z.string().min(7, 'El DNI debe tener al menos 7 caracteres').max(8),
  fechaNacimiento: z.string().optional().nullable(),
  telefono:        z.string().optional().nullable(),
  email:           z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  direccion:       z.string().optional().nullable(),
  sede:            z.string().optional().nullable(),
  estado:          z.enum(['ACTIVO', 'PENDIENTE', 'INACTIVO']).default('PENDIENTE'),
  fechaAlta:       z.string().optional().nullable(),
  patologia:       z.enum(['ANSIEDAD','INSOMNIO','DOLOR','EPILEPSIA','ESTRES','DEPRESION',
                           'MIGRANA','ARTRITIS','FIBROMIALGIA','PARKINSON','TEA','APETITO',
                           'NAUSEAS','INFLAMACION','OTRA']).optional().nullable(),
  patologiaOtra:   z.string().optional().nullable(),
  observaciones:   z.string().optional().nullable(),
  notasInternas:   z.string().optional().nullable(),
  estadoCuota:     z.enum(['AL_DIA', 'PARCIAL', 'VENCIDA', 'PENDIENTE']).default('PENDIENTE'),
  cuotaMensual:    z.coerce.number().positive().optional().nullable(),
})

const esquemaSeguimiento = z.object({
  fecha:         z.string().min(1, 'La fecha es obligatoria'),
  resultado:     z.string().min(1, 'El resultado es obligatorio'),
  observaciones: z.string().optional().nullable(),
  continuidad:   z.boolean().default(true),
})

const esquemaPago = z.object({
  monto:     z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha:     z.string().min(1, 'La fecha es obligatoria'),
  mesCuota:  z.string().optional().nullable(), // YYYY-MM
  concepto:  z.string().optional().nullable(),
  medioPago: z.enum(['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO','CHEQUE']).optional().nullable(),
})

const esquemaCuotaMes = z.object({
  mes:   z.string().regex(/^\d{4}-\d{2}$/, 'Formato inválido (YYYY-MM)'),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBusqueda(q: string) {
  const termino = q.trim()
  return {
    OR: [
      { nombre:   { contains: termino, mode: 'insensitive' as const } },
      { apellido: { contains: termino, mode: 'insensitive' as const } },
      { dni:      { contains: termino, mode: 'insensitive' as const } },
      { telefono: { contains: termino, mode: 'insensitive' as const } },
      { email:    { contains: termino, mode: 'insensitive' as const } },
    ],
  }
}

// ─── Helper: recalcular estadoCuota ──────────────────────────────────────────

async function recalcularEstadoCuota(asociadoId: string) {
  const ahora     = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  const asociado = await prisma.asociado.findUnique({
    where: { id: asociadoId },
    select: {
      cuotaMensual: true,
      pagos:  { select: { monto: true, mesCuota: true } },
      cuotas: { where: { mes: mesActual }, select: { monto: true } },
    },
  })
  if (!asociado) return

  // Cuota del mes actual: tabla cuotas_mensuales primero, luego cuotaMensual por defecto
  const cuotaMes = asociado.cuotas[0] ? Number(asociado.cuotas[0].monto) : null
  const cuota    = cuotaMes ?? (asociado.cuotaMensual ? Number(asociado.cuotaMensual) : null)

  // Si no hay cuota definida, solo verificar si hay pagos
  if (!cuota) {
    const tienePagos = asociado.pagos.length > 0
    await prisma.asociado.update({
      where: { id: asociadoId },
      data:  { estadoCuota: tienePagos ? 'AL_DIA' : 'PENDIENTE' },
    })
    return
  }

  // Sumar pagos del mes actual
  const totalPagado = asociado.pagos
    .filter(p => p.mesCuota === mesActual)
    .reduce((s, p) => s + Number(p.monto), 0)

  let nuevoEstado: 'AL_DIA' | 'PARCIAL' | 'PENDIENTE'
  if (totalPagado >= cuota)  nuevoEstado = 'AL_DIA'
  else if (totalPagado > 0)  nuevoEstado = 'PARCIAL'
  else                       nuevoEstado = 'PENDIENTE'

  await prisma.asociado.update({
    where: { id: asociadoId },
    data:  { estadoCuota: nuevoEstado },
  })
}

// ─── Controladores ────────────────────────────────────────────────────────────

// GET /api/asociados
export async function listar(req: Request, res: Response) {
  const { q, estado, patologia, estadoCuota, page = '1', limit = '20', orden = 'apellido' } = req.query as Record<string, string>

  const where: Record<string, unknown> = {}
  if (q)           Object.assign(where, buildBusqueda(q))
  if (estado)      where.estado      = estado
  if (patologia)   where.patologia   = patologia
  if (estadoCuota) where.estadoCuota = estadoCuota

  const skip = (Number(page) - 1) * Number(limit)
  const orderBy = orden === 'nombre' ? { nombre: 'asc' as const }
                : orden === 'fechaAlta' ? { fechaAlta: 'desc' as const }
                : { apellido: 'asc' as const }

  const [asociados, total] = await Promise.all([
    prisma.asociado.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
      select: {
        id: true, nombre: true, apellido: true, dni: true,
        telefono: true, email: true, fechaAlta: true,
        sede: true, estado: true, patologia: true, estadoCuota: true,
        _count: { select: { seguimientos: true } },
      },
    }),
    prisma.asociado.count({ where }),
  ])

  res.json({ asociados, total, page: Number(page), limit: Number(limit) })
}

// GET /api/asociados/buscar?q=
export async function buscar(req: Request, res: Response) {
  const { q = '' } = req.query as Record<string, string>
  if (!q.trim()) return res.json([])

  const resultados = await prisma.asociado.findMany({
    where: buildBusqueda(q),
    take: 10,
    select: { id: true, nombre: true, apellido: true, dni: true, estado: true, patologia: true },
    orderBy: { apellido: 'asc' },
  })
  res.json(resultados)
}

// GET /api/asociados/alertas
export async function alertas(req: Request, res: Response) {
  const hace90Dias = new Date()
  hace90Dias.setDate(hace90Dias.getDate() - 90)

  const [cuotaVencida, pendientes, sinSeguimiento] = await Promise.all([
    prisma.asociado.findMany({
      where: { estadoCuota: 'VENCIDA', estado: 'ACTIVO' },
      select: { id: true, nombre: true, apellido: true, dni: true },
    }),
    prisma.asociado.findMany({
      where: { estado: 'PENDIENTE' },
      select: { id: true, nombre: true, apellido: true, dni: true, fechaAlta: true },
    }),
    prisma.asociado.findMany({
      where: {
        estado: 'ACTIVO',
        OR: [
          { seguimientos: { none: {} } },
          { seguimientos: { every: { fecha: { lt: hace90Dias } } } },
        ],
      },
      select: { id: true, nombre: true, apellido: true, dni: true,
        seguimientos: { orderBy: { fecha: 'desc' }, take: 1, select: { fecha: true } },
      },
    }),
  ])

  res.json({
    cuotaVencida,
    pendientes,
    sinSeguimiento: sinSeguimiento.map(a => ({
      ...a,
      ultimoSeguimiento: a.seguimientos[0]?.fecha ?? null,
      seguimientos: undefined,
    })),
    total: cuotaVencida.length + pendientes.length + sinSeguimiento.length,
  })
}

// GET /api/asociados/:id
export async function obtener(req: Request, res: Response) {
  const asociado = await prisma.asociado.findUnique({
    where: { id: req.params.id },
    include: {
      seguimientos: { orderBy: { fecha: 'desc' } },
      pagos:        { orderBy: { fecha: 'desc' } },
      cuotas:       { orderBy: { mes: 'desc' } },
    },
  })
  if (!asociado) return res.status(404).json({ error: 'Asociado no encontrado.' })
  res.json(asociado)
}

// POST /api/asociados
export async function crear(req: Request, res: Response) {
  const datos = esquemaAsociado.parse(req.body)

  const existe = await prisma.asociado.findUnique({ where: { dni: datos.dni } })
  if (existe) return res.status(409).json({ error: `Ya existe un asociado con DNI ${datos.dni}.` })

  const asociado = await prisma.asociado.create({
    data: {
      ...datos,
      email:           datos.email           || null,
      fechaNacimiento: datos.fechaNacimiento  ? new Date(datos.fechaNacimiento) : null,
      fechaAlta:       datos.fechaAlta        ? new Date(datos.fechaAlta)        : undefined,
    },
  })

  await prisma.auditoria.create({
    data: { usuarioId: req.usuarioId, accion: 'CREAR_ASOCIADO', entidad: 'Asociado', entidadId: asociado.id },
  })

  res.status(201).json(asociado)
}

// PUT /api/asociados/:id
export async function actualizar(req: Request, res: Response) {
  const datos = esquemaAsociado.partial().parse(req.body)

  // Verificar DNI duplicado si se está cambiando
  if (datos.dni) {
    const existe = await prisma.asociado.findFirst({ where: { dni: datos.dni, NOT: { id: req.params.id } } })
    if (existe) return res.status(409).json({ error: `Ya existe un asociado con DNI ${datos.dni}.` })
  }

  const estadoAnterior = await prisma.asociado.findUnique({
    where: { id: req.params.id }, select: { estado: true },
  })

  const asociado = await prisma.asociado.update({
    where: { id: req.params.id },
    data: {
      ...datos,
      email:           datos.email           || null,
      fechaNacimiento: datos.fechaNacimiento  ? new Date(datos.fechaNacimiento) : undefined,
      fechaAlta:       datos.fechaAlta        ? new Date(datos.fechaAlta)        : undefined,
    },
  })

  // Auditoría liviana: solo si cambió el estado
  if (datos.estado && datos.estado !== estadoAnterior?.estado) {
    await prisma.auditoria.create({
      data: {
        usuarioId: req.usuarioId,
        accion: 'CAMBIO_ESTADO_ASOCIADO',
        entidad: 'Asociado',
        entidadId: asociado.id,
        detalles: { de: estadoAnterior?.estado, a: datos.estado },
      },
    })
  }

  res.json(asociado)
}

// DELETE /api/asociados/:id
export async function eliminar(req: Request, res: Response) {
  await prisma.asociado.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}

// ─── Seguimientos ─────────────────────────────────────────────────────────────

export async function listarSeguimientos(req: Request, res: Response) {
  const seguimientos = await prisma.seguimientoTerapeutico.findMany({
    where: { asociadoId: req.params.id },
    orderBy: { fecha: 'desc' },
  })
  res.json(seguimientos)
}

export async function crearSeguimiento(req: Request, res: Response) {
  const datos = esquemaSeguimiento.parse(req.body)
  const seguimiento = await prisma.seguimientoTerapeutico.create({
    data: {
      asociadoId:    req.params.id,
      fecha:         new Date(datos.fecha),
      resultado:     datos.resultado,
      observaciones: datos.observaciones || null,
      continuidad:   datos.continuidad,
    },
  })
  await prisma.auditoria.create({
    data: { usuarioId: req.usuarioId, accion: 'CREAR_SEGUIMIENTO', entidad: 'SeguimientoTerapeutico', entidadId: seguimiento.id },
  })
  res.status(201).json(seguimiento)
}

export async function actualizarSeguimiento(req: Request, res: Response) {
  const datos = esquemaSeguimiento.partial().parse(req.body)
  const seguimiento = await prisma.seguimientoTerapeutico.update({
    where: { id: req.params.sid },
    data: {
      ...(datos.fecha         && { fecha: new Date(datos.fecha) }),
      ...(datos.resultado     && { resultado: datos.resultado }),
      ...(datos.observaciones !== undefined && { observaciones: datos.observaciones }),
      ...(datos.continuidad   !== undefined && { continuidad: datos.continuidad }),
    },
  })
  res.json(seguimiento)
}

export async function eliminarSeguimiento(req: Request, res: Response) {
  await prisma.seguimientoTerapeutico.delete({ where: { id: req.params.sid } })
  res.json({ ok: true })
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

export async function listarPagos(req: Request, res: Response) {
  const pagos = await prisma.pagoAsociado.findMany({
    where: { asociadoId: req.params.id },
    orderBy: { fecha: 'desc' },
  })
  res.json(pagos)
}

export async function crearPago(req: Request, res: Response) {
  const datos = esquemaPago.parse(req.body)

  const asociado = await prisma.asociado.findUnique({
    where: { id: req.params.id },
    select: { nombre: true, apellido: true },
  })

  // Mes al que aplica (default: mes del pago)
  const fechaPago  = new Date(datos.fecha)
  const mesCuota   = datos.mesCuota ||
    `${fechaPago.getFullYear()}-${String(fechaPago.getMonth() + 1).padStart(2, '0')}`

  const descripcionIngreso = datos.concepto ||
    `Cuota ${mesCuota} — ${asociado?.apellido}, ${asociado?.nombre}`

  // Crear ingreso primero para obtener su ID
  const ingreso = await prisma.ingreso.create({
    data: {
      fecha:         fechaPago,
      tipo:          'CUOTA',
      categoria:     'FIJO',
      descripcion:   descripcionIngreso,
      monto:         datos.monto,
      estado:        'COBRADO',
      observaciones: `Asociado: ${asociado?.apellido}, ${asociado?.nombre}`,
    },
  })

  const pago = await prisma.pagoAsociado.create({
    data: {
      asociadoId: req.params.id,
      monto:      datos.monto,
      fecha:      fechaPago,
      mesCuota,
      concepto:   datos.concepto  || null,
      medioPago:  datos.medioPago || null,
      ingresoId:  ingreso.id,
    },
  })

  await recalcularEstadoCuota(req.params.id)

  res.status(201).json(pago)
}

export async function eliminarPago(req: Request, res: Response) {
  // Obtener el pago para saber si tiene ingreso vinculado
  const pago = await prisma.pagoAsociado.findUnique({ where: { id: req.params.pid } })

  await prisma.pagoAsociado.delete({ where: { id: req.params.pid } })

  // Eliminar el ingreso vinculado si existe
  if (pago?.ingresoId) {
    await prisma.ingreso.delete({ where: { id: pago.ingresoId } }).catch(() => {})
  }

  await recalcularEstadoCuota(req.params.id)
  res.json({ ok: true })
}

// ─── Cuotas por mes ───────────────────────────────────────────────────────────

export async function listarCuotas(req: Request, res: Response) {
  const cuotas = await prisma.cuotaMes.findMany({
    where: { asociadoId: req.params.id },
    orderBy: { mes: 'desc' },
  })
  res.json(cuotas)
}

export async function upsertCuota(req: Request, res: Response) {
  const datos = esquemaCuotaMes.parse(req.body)
  const cuota = await prisma.cuotaMes.upsert({
    where:  { asociadoId_mes: { asociadoId: req.params.id, mes: datos.mes } },
    update: { monto: datos.monto },
    create: { asociadoId: req.params.id, mes: datos.mes, monto: datos.monto },
  })
  await recalcularEstadoCuota(req.params.id)
  res.json(cuota)
}

export async function eliminarCuota(req: Request, res: Response) {
  await prisma.cuotaMes.delete({
    where: { asociadoId_mes: { asociadoId: req.params.id, mes: req.params.mes } },
  }).catch(() => {})
  await recalcularEstadoCuota(req.params.id)
  res.json({ ok: true })
}

// ─── Cuotas globales ─────────────────────────────────────────────────────────

export async function listarCuotasGlobales(_req: Request, res: Response) {
  const cuotas = await prisma.cuotaGlobal.findMany({ orderBy: { mes: 'desc' } })
  res.json(cuotas)
}

export async function aplicarCuotaGlobal(req: Request, res: Response) {
  const datos = esquemaCuotaMes.parse(req.body)

  // Todos los asociados activos y pendientes
  const asociados = await prisma.asociado.findMany({
    where: { estado: { in: ['ACTIVO', 'PENDIENTE'] } },
    select: { id: true },
  })

  // Upsert en cuotas_mensuales para cada asociado
  await Promise.all(
    asociados.map(a =>
      prisma.cuotaMes.upsert({
        where:  { asociadoId_mes: { asociadoId: a.id, mes: datos.mes } },
        update: { monto: datos.monto },
        create: { asociadoId: a.id, mes: datos.mes, monto: datos.monto },
      })
    )
  )

  // Recalcular estadoCuota de todos (en paralelo, máx 10 a la vez)
  const ids = asociados.map(a => a.id)
  for (let i = 0; i < ids.length; i += 10) {
    await Promise.all(ids.slice(i, i + 10).map(id => recalcularEstadoCuota(id)))
  }

  // Guardar registro histórico
  const global = await prisma.cuotaGlobal.upsert({
    where:  { mes: datos.mes },
    update: { monto: datos.monto, totalAsociados: asociados.length },
    create: { mes: datos.mes, monto: datos.monto, totalAsociados: asociados.length },
  })

  res.json({ ...global, actualizados: asociados.length })
}

export async function eliminarCuotaGlobal(req: Request, res: Response) {
  const { mes } = req.params

  // Borrar la cuota de todos los asociados para ese mes
  await prisma.cuotaMes.deleteMany({ where: { mes } })

  // Borrar el registro global
  await prisma.cuotaGlobal.delete({ where: { mes } }).catch(() => {})

  // Recalcular todos los afectados
  const asociados = await prisma.asociado.findMany({
    where: { estado: { in: ['ACTIVO', 'PENDIENTE'] } },
    select: { id: true },
  })
  for (let i = 0; i < asociados.length; i += 10) {
    await Promise.all(asociados.slice(i, i + 10).map(a => recalcularEstadoCuota(a.id)))
  }

  res.json({ ok: true })
}

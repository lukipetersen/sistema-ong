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
  estado:          z.enum(['ACTIVO', 'PENDIENTE', 'INACTIVO']).default('PENDIENTE'),
  patologia:       z.enum(['ANSIEDAD','INSOMNIO','DOLOR','EPILEPSIA','ESTRES','DEPRESION',
                           'MIGRANA','ARTRITIS','FIBROMIALGIA','PARKINSON','TEA','APETITO',
                           'NAUSEAS','INFLAMACION','OTRA']).optional().nullable(),
  patologiaOtra:   z.string().optional().nullable(),
  observaciones:   z.string().optional().nullable(),
  notasInternas:   z.string().optional().nullable(),
  estadoCuota:     z.enum(['AL_DIA', 'VENCIDA', 'PENDIENTE']).default('PENDIENTE'),
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
  concepto:  z.string().optional().nullable(),
  medioPago: z.enum(['EFECTIVO','TRANSFERENCIA','TARJETA_DEBITO','TARJETA_CREDITO','CHEQUE']).optional().nullable(),
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
        estado: true, patologia: true, estadoCuota: true,
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

// DELETE /api/asociados/:id  → soft delete
export async function eliminar(req: Request, res: Response) {
  await prisma.asociado.update({
    where: { id: req.params.id },
    data: { estado: 'INACTIVO' },
  })
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
  const pago = await prisma.pagoAsociado.create({
    data: {
      asociadoId: req.params.id,
      monto:      datos.monto,
      fecha:      new Date(datos.fecha),
      concepto:   datos.concepto  || null,
      medioPago:  datos.medioPago || null,
    },
  })
  // Actualizar estadoCuota a AL_DIA automáticamente
  await prisma.asociado.update({
    where: { id: req.params.id },
    data:  { estadoCuota: 'AL_DIA' },
  })
  res.status(201).json(pago)
}

export async function eliminarPago(req: Request, res: Response) {
  await prisma.pagoAsociado.delete({ where: { id: req.params.pid } })
  res.json({ ok: true })
}

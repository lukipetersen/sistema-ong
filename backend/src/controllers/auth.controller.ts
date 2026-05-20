import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma'
import {
  generarToken,
  generarRefreshToken,
  verificarRefreshToken,
  calcularExpiracion,
} from '../lib/jwt'

const esquemaLogin = z.object({
  email: z.string().email('El email no es válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
})

const esquemaRefresh = z.object({
  refreshToken: z.string().min(1),
})

export async function login(req: Request, res: Response) {
  const datos = esquemaLogin.parse(req.body)

  const usuario = await prisma.usuario.findUnique({
    where: { email: datos.email, activo: true },
    include: { sede: { select: { id: true, nombre: true } } },
  })

  if (!usuario) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' })
  }

  const passwordValida = await bcrypt.compare(datos.password, usuario.password)
  if (!passwordValida) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos.' })
  }

  const accessToken = generarToken({
    sub: usuario.id,
    rol: usuario.rol,
    sedeId: usuario.sedeId,
  })

  const refreshToken = generarRefreshToken({ sub: usuario.id })

  await prisma.sesion.create({
    data: {
      usuarioId: usuario.id,
      refreshToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiraEn: calcularExpiracion(7),
    },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId: usuario.id,
      accion: 'LOGIN',
      entidad: 'Usuario',
      entidadId: usuario.id,
      ip: req.ip,
    },
  })

  const { password: _, ...usuarioSinPassword } = usuario

  return res.json({
    usuario: usuarioSinPassword,
    token: accessToken,
    refreshToken,
  })
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = esquemaRefresh.parse(req.body)

  await prisma.sesion.updateMany({
    where: { refreshToken, usuarioId: req.usuarioId },
    data: { activo: false },
  })

  await prisma.auditoria.create({
    data: {
      usuarioId: req.usuarioId,
      accion: 'LOGOUT',
      entidad: 'Usuario',
      entidadId: req.usuarioId,
      ip: req.ip,
    },
  })

  return res.json({ mensaje: 'Sesión cerrada correctamente.' })
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = esquemaRefresh.parse(req.body)

  let payload: { sub: string }
  try {
    payload = verificarRefreshToken(refreshToken)
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado.' })
  }

  const sesion = await prisma.sesion.findFirst({
    where: {
      refreshToken,
      usuarioId: payload.sub,
      activo: true,
      expiraEn: { gt: new Date() },
    },
    include: {
      usuario: { select: { id: true, rol: true, sedeId: true, activo: true } },
    },
  })

  if (!sesion || !sesion.usuario.activo) {
    return res.status(401).json({ error: 'Sesión no encontrada o expirada.' })
  }

  const nuevoToken = generarToken({
    sub: sesion.usuario.id,
    rol: sesion.usuario.rol,
    sedeId: sesion.usuario.sedeId,
  })

  return res.json({ token: nuevoToken })
}

export async function yo(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuarioId },
    select: {
      id: true,
      cuil: true,
      nombre: true,
      apellido: true,
      email: true,
      rol: true,
      activo: true,
      sede: { select: { id: true, nombre: true } },
      creadoEn: true,
    },
  })

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado.' })
  }

  return res.json(usuario)
}

import { Request, Response, NextFunction } from 'express'
import { Rol } from '@prisma/client'
import { verificarToken } from '../lib/jwt'
import prisma from '../lib/prisma'

declare global {
  namespace Express {
    interface Request {
      usuarioId: string
      usuarioRol: Rol
      usuarioSedeId?: string | null
    }
  }
}

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Iniciá sesión para continuar.' })
  }

  const token = authHeader.replace('Bearer ', '')
  try {
    const payload = verificarToken(token)
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub, activo: true },
      select: { id: true, rol: true, sedeId: true },
    })

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' })
    }

    req.usuarioId = usuario.id
    req.usuarioRol = usuario.rol
    req.usuarioSedeId = usuario.sedeId
    next()
  } catch {
    return res.status(401).json({ error: 'Sesión expirada. Iniciá sesión nuevamente.' })
  }
}

export function autorizar(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.usuarioRol)) {
      return res.status(403).json({
        error: 'No tenés permiso para realizar esta acción.',
      })
    }
    next()
  }
}

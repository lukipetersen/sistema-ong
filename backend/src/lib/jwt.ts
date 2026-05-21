import jwt from 'jsonwebtoken'
import { Rol } from '@prisma/client'

export interface PayloadJWT {
  sub: string
  rol: Rol
  sedeId?: string | null
}

export interface PayloadRefresh {
  sub: string
}

export function generarToken(payload: PayloadJWT): string {
  const secret = process.env.JWT_SECRET as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: jwt.SignOptions = { expiresIn: (process.env.JWT_EXPIRY || '15m') as any }
  return jwt.sign(payload as jwt.JwtPayload, secret, opts)
}

export function generarRefreshToken(payload: PayloadRefresh): string {
  const secret = process.env.JWT_REFRESH_SECRET as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: jwt.SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any }
  return jwt.sign(payload as jwt.JwtPayload, secret, opts)
}

export function verificarToken(token: string): PayloadJWT {
  return jwt.verify(token, process.env.JWT_SECRET as string) as PayloadJWT
}

export function verificarRefreshToken(token: string): PayloadRefresh {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as PayloadRefresh
}

export function calcularExpiracion(dias: number): Date {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha
}

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
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRY || '15m',
  })
}

export function generarRefreshToken(payload: PayloadRefresh): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  })
}

export function verificarToken(token: string): PayloadJWT {
  return jwt.verify(token, process.env.JWT_SECRET!) as PayloadJWT
}

export function verificarRefreshToken(token: string): PayloadRefresh {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as PayloadRefresh
}

export function calcularExpiracion(dias: number): Date {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha
}

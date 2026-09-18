import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { Rol } from '@prisma/client'
import prisma from '../lib/prisma'
import { autenticar, autorizar } from '../middleware/auth'

const router = Router()
router.use(autenticar)
router.use(autorizar('ADMINISTRADOR'))

const CAMPOS_SEGUROS = {
  id: true, cuil: true, nombre: true, apellido: true, email: true,
  rol: true, activo: true, sedeId: true, creadoEn: true,
} as const

// ─── GET / ────────────────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: [{ activo: 'desc' }, { apellido: 'asc' }, { nombre: 'asc' }],
      select: CAMPOS_SEGUROS,
    })
    res.json(usuarios)
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// ─── POST / ───────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, cuil, password, rol } = req.body

    if (!nombre?.trim())    return res.status(400).json({ error: 'Falta el nombre' })
    if (!apellido?.trim())  return res.status(400).json({ error: 'Falta el apellido' })
    if (!email?.trim())     return res.status(400).json({ error: 'Falta el email' })
    if (!cuil?.trim())      return res.status(400).json({ error: 'Falta el CUIL' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    if (!rol || !Object.values(Rol).includes(rol)) return res.status(400).json({ error: 'Rol inválido' })

    const existe = await prisma.usuario.findFirst({ where: { OR: [{ email }, { cuil }] } })
    if (existe) return res.status(409).json({ error: existe.email === email ? 'El email ya está registrado' : 'El CUIL ya está registrado' })

    const hash = await bcrypt.hash(password, 12)
    const usuario = await prisma.usuario.create({
      data: { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim().toLowerCase(), cuil: cuil.trim(), password: hash, rol },
      select: CAMPOS_SEGUROS,
    })
    res.status(201).json(usuario)
  } catch {
    res.status(500).json({ error: 'Error al crear usuario' })
  }
})

// ─── PUT /:id ─────────────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, cuil, rol, activo } = req.body
    const { id } = req.params

    // No puede desactivarse a sí mismo
    if (req.usuarioId === id && activo === false) {
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario' })
    }
    // No puede quitarse el rol ADMINISTRADOR a sí mismo
    if (req.usuarioId === id && rol && rol !== 'ADMINISTRADOR') {
      return res.status(400).json({ error: 'No podés cambiar tu propio rol' })
    }

    const data: Record<string, unknown> = {}
    if (nombre    !== undefined) data.nombre    = nombre.trim()
    if (apellido  !== undefined) data.apellido  = apellido.trim()
    if (email     !== undefined) data.email     = email.trim().toLowerCase()
    if (cuil      !== undefined) data.cuil      = cuil.trim()
    if (rol       !== undefined) data.rol       = rol
    if (activo    !== undefined) data.activo    = activo

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: CAMPOS_SEGUROS,
    })
    res.json(usuario)
  } catch (e) {
    const msg = (e as { code?: string })?.code === 'P2025'
      ? 'Usuario no encontrado'
      : 'Error al actualizar usuario'
    res.status(400).json({ error: msg })
  }
})

// ─── PUT /:id/password ────────────────────────────────────────────────────────
router.put('/:id/password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    const hash = await bcrypt.hash(password, 12)
    await prisma.usuario.update({ where: { id: req.params.id }, data: { password: hash } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
})

export default router

import { Router } from 'express'
import { login, logout, refresh, yo } from '../controllers/auth.controller'
import { autenticar } from '../middleware/auth'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

const router = Router()

router.post('/login', login)
router.post('/logout', autenticar, logout)
router.post('/refresh', refresh)
router.get('/yo', autenticar, yo)

// Ruta de setup inicial — solo funciona si no hay ningún usuario
router.post('/setup', async (req, res) => {
  const count = await prisma.usuario.count()
  if (count > 0) return res.status(403).json({ error: 'Setup ya realizado.' })
  const hash = await bcrypt.hash('lucas123', 10)
  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Lucas Petersen',
      email: 'lukipetersenn@gmail.com',
      password: hash,
      rol: 'ADMINISTRADOR',
      activo: true,
    },
  })
  res.json({ ok: true, email: usuario.email, password: 'lucas123' })
})

export default router

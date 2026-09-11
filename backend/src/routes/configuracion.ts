import { Router } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()

router.use(autenticar)

router.get('/:clave', async (req, res) => {
  const config = await prisma.configuracionOrg.findUnique({
    where: { clave: req.params.clave },
  })
  res.json({ clave: req.params.clave, valor: config?.valor ?? null })
})

router.put('/:clave', async (req, res) => {
  const { valor } = req.body
  if (typeof valor !== 'string') return res.status(400).json({ error: 'valor requerido' })
  const config = await prisma.configuracionOrg.upsert({
    where: { clave: req.params.clave },
    update: { valor },
    create: { clave: req.params.clave, valor },
  })
  res.json(config)
})

router.delete('/:clave', async (req, res) => {
  await prisma.configuracionOrg.deleteMany({ where: { clave: req.params.clave } })
  res.json({ ok: true })
})

export default router

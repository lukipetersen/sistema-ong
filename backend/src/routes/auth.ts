import { Router } from 'express'
import { login, logout, refresh, yo } from '../controllers/auth.controller'
import { autenticar } from '../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/logout', autenticar, logout)
router.post('/refresh', refresh)
router.get('/yo', autenticar, yo)

export default router

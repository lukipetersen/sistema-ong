import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import bcrypt from 'bcryptjs'
import prisma from './lib/prisma'
import authRoutes from './routes/auth'
import gastosRoutes from './routes/gastos'
import ingresosRoutes from './routes/ingresos'
import asociadosRoutes from './routes/asociados'
import geneticasRoutes from './routes/geneticas'
import lotesRoutes from './routes/lotes'
import plantasRoutes from './routes/plantas'
import reportesRoutes from './routes/reportes'
import { manejadorErrores } from './middleware/errores'

const app = express()
const puerto = parseInt(process.env.PORT || '3001', 10)

// ─── Middlewares de seguridad ────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://localhost:4173']
      : true, // En producción Electron accede localmente
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Rutas ───────────────────────────────────────────────────────────────────
app.get('/api/salud', (_req, res) => {
  res.json({
    estado: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/gastos', gastosRoutes)
app.use('/api/ingresos', ingresosRoutes)
app.use('/api/asociados', asociadosRoutes)
app.use('/api/geneticas', geneticasRoutes)
app.use('/api/lotes', lotesRoutes)
app.use('/api/plantas', plantasRoutes)
app.use('/api/reportes', reportesRoutes)

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' })
})

// ─── Manejo de errores ───────────────────────────────────────────────────────
app.use(manejadorErrores)

// ─── Inicio ──────────────────────────────────────────────────────────────────
async function resetearPassword() {
  try {
    const hash = await bcrypt.hash('lucas123', 10)
    const { count } = await prisma.usuario.updateMany({ data: { password: hash } })
    if (count > 0) console.log(`🔑 Contraseña reseteada a "lucas123" para ${count} usuario(s)`)
  } catch { /* silencioso si falla */ }
}

resetearPassword().then(() => app.listen(puerto, () => {
  console.log(`\n✅ Backend ONG corriendo en http://localhost:${puerto}`)
  console.log(`📋 Ambiente: ${process.env.NODE_ENV}`)
  console.log(`🏥 Health: http://localhost:${puerto}/api/salud\n`)
}))

export default app

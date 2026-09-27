import { Router, Request, Response } from 'express'
import multer from 'multer'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max
})

// GET /api/lotes/:id/archivos — lista metadatos (sin contenido)
router.get('/:loteId/archivos', async (req: Request, res: Response) => {
  try {
    const archivos = await prisma.archivoLote.findMany({
      where: { loteId: req.params.loteId },
      orderBy: { creadoEn: 'desc' },
      select: { id: true, nombre: true, tipo: true, tamanio: true, creadoEn: true },
    })
    res.json(archivos)
  } catch {
    res.status(500).json({ error: 'Error al obtener archivos' })
  }
})

// POST /api/lotes/:id/archivos — subir archivo
router.post('/:loteId/archivos', upload.single('archivo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

    const lote = await prisma.lote.findUnique({ where: { id: req.params.loteId } })
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' })

    const archivo = await prisma.archivoLote.create({
      data: {
        loteId:    req.params.loteId,
        nombre:    req.file.originalname,
        tipo:      req.file.mimetype,
        tamanio:   req.file.size,
        contenido: req.file.buffer,
      },
      select: { id: true, nombre: true, tipo: true, tamanio: true, creadoEn: true },
    })
    res.status(201).json(archivo)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al subir archivo'
    res.status(500).json({ error: msg })
  }
})

// GET /api/archivos-lotes/:id — descargar/visualizar archivo
router.get('/archivos/:archivoId', async (req: Request, res: Response) => {
  try {
    const archivo = await prisma.archivoLote.findUnique({
      where: { id: req.params.archivoId },
    })
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' })

    res.setHeader('Content-Type', archivo.tipo)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(archivo.nombre)}"`)
    res.setHeader('Content-Length', archivo.tamanio)
    res.send(archivo.contenido)
  } catch {
    res.status(500).json({ error: 'Error al obtener archivo' })
  }
})

// DELETE /api/archivos-lotes/:id — eliminar archivo
router.delete('/archivos/:archivoId', async (req: Request, res: Response) => {
  try {
    const archivo = await prisma.archivoLote.findUnique({
      where: { id: req.params.archivoId },
      select: { id: true },
    })
    if (!archivo) return res.status(404).json({ error: 'Archivo no encontrado' })

    await prisma.archivoLote.delete({ where: { id: req.params.archivoId } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Error al eliminar archivo' })
  }
})

export default router

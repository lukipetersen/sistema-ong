import { Router } from 'express'
import { autenticar } from '../middleware/auth'
import {
  listar, buscar, alertas, obtener, crear, actualizar, eliminar,
  listarSeguimientos, crearSeguimiento, actualizarSeguimiento, eliminarSeguimiento,
  listarPagos, crearPago, eliminarPago,
  listarCuotas, upsertCuota, eliminarCuota,
} from '../controllers/asociados.controller'

const router = Router()
router.use(autenticar)

// Asociados
router.get('/',        listar)
router.get('/buscar',  buscar)
router.get('/alertas', alertas)
router.get('/:id',     obtener)
router.post('/',       crear)
router.put('/:id',     actualizar)
router.delete('/:id',  eliminar)

// Seguimientos
router.get('/:id/seguimientos',          listarSeguimientos)
router.post('/:id/seguimientos',         crearSeguimiento)
router.put('/:id/seguimientos/:sid',     actualizarSeguimiento)
router.delete('/:id/seguimientos/:sid',  eliminarSeguimiento)

// Pagos
router.get('/:id/pagos',         listarPagos)
router.post('/:id/pagos',        crearPago)
router.delete('/:id/pagos/:pid', eliminarPago)

// Cuotas por mes
router.get('/:id/cuotas',          listarCuotas)
router.post('/:id/cuotas',         upsertCuota)
router.delete('/:id/cuotas/:mes',  eliminarCuota)

export default router

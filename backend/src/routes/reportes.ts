import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { autenticar } from '../middleware/auth'

const router = Router()
router.use(autenticar)

// ─── Utilidades ──────────────────────────────────────────────────────────────

const num = (v: unknown): number => Number(v ?? 0)

function mesBounds(anio: number, mes: number) {
  return { inicio: new Date(anio, mes, 1), fin: new Date(anio, mes + 1, 1) }
}

function ultimos12Meses() {
  const hoy = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1)
    const { inicio, fin } = mesBounds(d.getFullYear(), d.getMonth())
    return {
      label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      inicio,
      fin,
    }
  })
}

// ─── Dashboard ejecutivo ──────────────────────────────────────────────────────

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const hoy = new Date()
    const { inicio: ini, fin }         = mesBounds(hoy.getFullYear(), hoy.getMonth())
    const { inicio: iniAnt, fin: finAnt } = mesBounds(hoy.getFullYear(), hoy.getMonth() - 1)

    const [
      ingMes, gasMes, ingAnt, gasAnt,
      activos, pendientes, inactivos, altasMes, cuotasVen,
      geneticas, lotesAct, lotesFin,
      plantasAct, plantasSel, plantasDescMes,
      sinSeguimiento,
    ] = await Promise.all([
      prisma.ingreso.aggregate({ where: { fecha: { gte: ini, lt: fin } }, _sum: { monto: true } }),
      prisma.gasto.aggregate({ where: { fecha: { gte: ini, lt: fin } }, _sum: { monto: true } }),
      prisma.ingreso.aggregate({ where: { fecha: { gte: iniAnt, lt: finAnt } }, _sum: { monto: true } }),
      prisma.gasto.aggregate({ where: { fecha: { gte: iniAnt, lt: finAnt } }, _sum: { monto: true } }),
      prisma.asociado.count({ where: { estado: 'ACTIVO' } }),
      prisma.asociado.count({ where: { estado: 'PENDIENTE' } }),
      prisma.asociado.count({ where: { estado: 'INACTIVO' } }),
      prisma.asociado.count({ where: { fechaAlta: { gte: ini, lt: fin } } }),
      prisma.asociado.count({ where: { estadoCuota: 'VENCIDA' } }),
      prisma.genetica.count(),
      prisma.lote.count({ where: { estado: { in: ['PRODUCCION', 'ACTIVO'] } } }),
      prisma.lote.count({ where: { estado: 'FINALIZADO' } }),
      prisma.planta.count({ where: { estado: 'ACTIVA' } }),
      prisma.planta.count({ where: { estado: 'SELECCIONADA' } }),
      prisma.planta.count({ where: { estado: 'DESCARTADA', actualizadoEn: { gte: ini } } }),
      // Asociados activos sin seguimiento en los últimos 90 días
      prisma.asociado.count({
        where: {
          estado: 'ACTIVO',
          seguimientos: { none: { fecha: { gte: new Date(hoy.getTime() - 90 * 86400 * 1000) } } },
        },
      }),
    ])

    const ingresosMes = num(ingMes._sum.monto)
    const gastosMes   = num(gasMes._sum.monto)
    const ingresosAnt = num(ingAnt._sum.monto)
    const gastosAnt   = num(gasAnt._sum.monto)

    res.json({
      financiero: {
        ingresosMes, gastosMes, netoMes: ingresosMes - gastosMes,
        ingresosAnt, gastosAnt, netoAnt: ingresosAnt - gastosAnt,
      },
      asociados: { activos, pendientes, inactivos, altasMes, cuotasVencidas: cuotasVen, sinSeguimientoReciente: sinSeguimiento },
      productivo: { geneticas, lotesActivos: lotesAct, lotesFinalizados: lotesFin, plantasActivas: plantasAct, plantasSeleccionadas: plantasSel, plantasDescartadasMes: plantasDescMes },
    })
  } catch (e) {
    console.error('[reportes/dashboard]', e)
    res.status(500).json({ error: 'Error al obtener dashboard' })
  }
})

// ─── Reporte financiero ───────────────────────────────────────────────────────

router.get('/financiero', async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query as Record<string, string>
    const hoy = new Date()

    const parseMes = (s: string) => { const [y, m] = s.split('-').map(Number); return new Date(y, m - 1, 1) }
    const inicio = desde ? parseMes(desde) : new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1)
    const finPer: Date = hasta
      ? (() => { const d = parseMes(hasta); return new Date(d.getFullYear(), d.getMonth() + 1, 1) })()
      : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)

    const hace12 = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)

    const [ingresos, gastos, evoIng, evoGas, cuotasPend] = await Promise.all([
      prisma.ingreso.findMany({
        where: { fecha: { gte: inicio, lt: finPer } },
        select: { fecha: true, monto: true, tipo: true, categoria: true, descripcion: true, estado: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.gasto.findMany({
        where: { fecha: { gte: inicio, lt: finPer } },
        select: { fecha: true, monto: true, categoria: true, subcategoria: true, descripcion: true, estado: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.ingreso.findMany({ where: { fecha: { gte: hace12 } }, select: { fecha: true, monto: true } }),
      prisma.gasto.findMany({ where: { fecha: { gte: hace12 } }, select: { fecha: true, monto: true } }),
      prisma.asociado.findMany({
        where: { estadoCuota: { in: ['PENDIENTE', 'VENCIDA'] } },
        select: { nombre: true, apellido: true, dni: true, telefono: true, cuotaMensual: true, estadoCuota: true },
        orderBy: { apellido: 'asc' },
      }),
    ])

    const totalIng = ingresos.reduce((s, i) => s + num(i.monto), 0)
    const totalGas = gastos.reduce((s, g) => s + num(g.monto), 0)

    const porTipoIngreso = ['VENTA', 'CUOTA', 'DONACION'].map(tipo => ({
      tipo,
      total:    ingresos.filter(i => i.tipo === tipo).reduce((s, i) => s + num(i.monto), 0),
      cantidad: ingresos.filter(i => i.tipo === tipo).length,
    }))

    const porCategoriaGasto = ['FIJOS', 'VARIABLES', 'ADMINISTRACION', 'INVERSION'].map(cat => ({
      categoria: cat,
      total:    gastos.filter(g => g.categoria === cat).reduce((s, g) => s + num(g.monto), 0),
      cantidad: gastos.filter(g => g.categoria === cat).length,
    })).filter(c => c.total > 0)

    const porSubcategoria = ['ALQUILER', 'INSUMOS', 'SUELDOS', 'SERVICIOS', 'MANTENIMIENTO', 'OTROS'].map(sub => ({
      subcategoria: sub,
      total:    gastos.filter(g => g.subcategoria === sub).reduce((s, g) => s + num(g.monto), 0),
      cantidad: gastos.filter(g => g.subcategoria === sub).length,
    })).filter(s => s.total > 0).sort((a, b) => b.total - a.total)

    const evolucion = ultimos12Meses().map(({ label, inicio: mIni, fin: mFin }) => {
      const ing = evoIng.filter(i => i.fecha >= mIni && i.fecha < mFin).reduce((s, i) => s + num(i.monto), 0)
      const gas = evoGas.filter(g => g.fecha >= mIni && g.fecha < mFin).reduce((s, g) => s + num(g.monto), 0)
      return { mes: label, ingresos: ing, gastos: gas, neto: ing - gas }
    })

    res.json({
      periodo: { desde: inicio.toISOString().slice(0, 7), hasta: finPer.toISOString().slice(0, 7) },
      resumen: { totalIngresos: totalIng, totalGastos: totalGas, neto: totalIng - totalGas, porcentajeGastos: totalIng > 0 ? (totalGas / totalIng) * 100 : 0 },
      porTipoIngreso, porCategoriaGasto, porSubcategoria, evolucion,
      cuotasPendientes: cuotasPend,
    })
  } catch (e) {
    console.error('[reportes/financiero]', e)
    res.status(500).json({ error: 'Error al obtener reporte financiero' })
  }
})

// ─── Reporte de asociados ─────────────────────────────────────────────────────

router.get('/asociados', async (_req: Request, res: Response) => {
  try {
    const hoy    = new Date()
    const hace90 = new Date(hoy.getTime() - 90 * 86400 * 1000)
    const meses  = ultimos12Meses()

    const [todosAsociados, seguimientosRecientes] = await Promise.all([
      prisma.asociado.findMany({
        select: {
          id: true, nombre: true, apellido: true, dni: true, telefono: true,
          estado: true, patologia: true, estadoCuota: true, fechaAlta: true, cuotaMensual: true,
        },
        orderBy: { apellido: 'asc' },
      }),
      prisma.seguimientoTerapeutico.findMany({
        where: { fecha: { gte: hace90 } },
        select: { asociadoId: true },
      }),
    ])

    const idConSeg = new Set(seguimientosRecientes.map(s => s.asociadoId))

    const porEstado = {
      ACTIVO:    todosAsociados.filter(a => a.estado === 'ACTIVO').length,
      PENDIENTE: todosAsociados.filter(a => a.estado === 'PENDIENTE').length,
      INACTIVO:  todosAsociados.filter(a => a.estado === 'INACTIVO').length,
    }

    const porPatologia = ['ANSIEDAD','INSOMNIO','DOLOR','EPILEPSIA','ESTRES','DEPRESION','MIGRANA','ARTRITIS','FIBROMIALGIA','PARKINSON','TEA','APETITO','NAUSEAS','INFLAMACION','OTRA']
      .map(p => ({ patologia: p, cantidad: todosAsociados.filter(a => a.patologia === p).length }))
      .filter(p => p.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad)

    const altasPorMes = meses.map(({ label, inicio, fin }) => ({
      mes: label,
      cantidad: todosAsociados.filter(a => a.fechaAlta >= inicio && a.fechaAlta < fin).length,
    }))

    const sinSeguimiento = todosAsociados
      .filter(a => a.estado === 'ACTIVO' && !idConSeg.has(a.id))

    res.json({ porEstado, porPatologia, altasPorMes, sinSeguimientoReciente: sinSeguimiento, listado: todosAsociados })
  } catch (e) {
    console.error('[reportes/asociados]', e)
    res.status(500).json({ error: 'Error al obtener reporte de asociados' })
  }
})

// ─── Reporte productivo ───────────────────────────────────────────────────────

router.get('/productivo', async (_req: Request, res: Response) => {
  try {
    const [geneticas, lotes, plantasAll] = await Promise.all([
      prisma.genetica.findMany({
        orderBy: { nombre: 'asc' },
        include: {
          _count: { select: { lotes: true } },
          lotes: { select: { sala: true, estado: true, plantas: { select: { estado: true } } } },
        },
      }),
      prisma.lote.findMany({
        select: {
          id: true, codigo: true, sala: true, estado: true,
          fechaInicio: true, fechaFinalizacion: true, creadoEn: true,
          genetica: { select: { nombre: true } },
          _count: { select: { plantas: true } },
        },
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.planta.findMany({ select: { estado: true } }),
    ])

    const estadosLote  = ['PRODUCCION','ACTIVO','FINALIZADO','DESCARTADO','ARCHIVADO']
    const estadosPlanta = ['ACTIVA','SELECCIONADA','CLONADA','DESCARTADA','ARCHIVADA']

    const porEstadoLote   = Object.fromEntries(estadosLote.map(e => [e, lotes.filter(l => l.estado === e).length]))
    const porSalaLote     = { SALA_1: lotes.filter(l => l.sala === 'SALA_1').length, SALA_2: lotes.filter(l => l.sala === 'SALA_2').length }
    const porEstadoPlanta = Object.fromEntries(estadosPlanta.map(e => [e, plantasAll.filter(p => p.estado === e).length]))

    const resumenGeneticas = geneticas.map(g => {
      const todasPlant = g.lotes.flatMap(l => l.plantas)
      return {
        id: g.id, nombre: g.nombre,
        totalLotes: g._count.lotes,
        lotesActivos: g.lotes.filter(l => ['PRODUCCION','ACTIVO'].includes(l.estado)).length,
        totalPlantas: todasPlant.length,
        plantasActivas: todasPlant.filter(p => p.estado === 'ACTIVA').length,
        lotesSala1: g.lotes.filter(l => l.sala === 'SALA_1').length,
        lotesSala2: g.lotes.filter(l => l.sala === 'SALA_2').length,
      }
    })

    res.json({ geneticas: resumenGeneticas, lotes, porEstadoLote, porSalaLote, porEstadoPlanta, totalPlantas: plantasAll.length })
  } catch (e) {
    console.error('[reportes/productivo]', e)
    res.status(500).json({ error: 'Error al obtener reporte productivo' })
  }
})

export default router

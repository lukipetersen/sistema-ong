import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  BarChart3, TrendingUp, TrendingDown, Users, Leaf, Download,
  ChevronDown, AlertCircle, X, RefreshCw,
} from 'lucide-react'
import {
  exportarCSV, exportarExcel, exportarPDF, exportarWord,
  formatPeso, formatFecha, type SeccionExport,
} from '../utils/exportes'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  verde:   '#16a34a',
  rojo:    '#dc2626',
  azul:    '#2563eb',
  ambar:   '#d97706',
  violeta: '#7c3aed',
  cyan:    '#0891b2',
  rosa:    '#db2777',
  lima:    '#65a30d',
}

const COLORES_PIE = [C.verde, C.azul, C.ambar, C.violeta, C.cyan, C.rojo, C.rosa, C.lima,
  '#0d9488', '#ea580c', '#4f46e5', '#be185d', '#854d0e']

// ─── Labels ───────────────────────────────────────────────────────────────────

const TIPO_ING:    Record<string, string> = { VENTA: 'Venta', CUOTA: 'Cuota', DONACION: 'Donación' }
const CAT_GAS:     Record<string, string> = { FIJOS: 'Fijos', VARIABLES: 'Variables', ADMINISTRACION: 'Administración', INVERSION: 'Inversión' }
const SUBCAT_GAS:  Record<string, string> = { ALQUILER: 'Alquiler', INSUMOS: 'Insumos', SUELDOS: 'Sueldos', SERVICIOS: 'Servicios', MANTENIMIENTO: 'Mantenimiento', OTROS: 'Otros' }
const ESTADO_ASO:  Record<string, string> = { ACTIVO: 'Activo', PENDIENTE: 'Pendiente', INACTIVO: 'Inactivo' }
const PATO_LABEL:  Record<string, string> = { ANSIEDAD: 'Ansiedad', INSOMNIO: 'Insomnio', DOLOR: 'Dolor', EPILEPSIA: 'Epilepsia', ESTRES: 'Estrés', DEPRESION: 'Depresión', MIGRANA: 'Migraña', ARTRITIS: 'Artritis', FIBROMIALGIA: 'Fibromialgia', PARKINSON: 'Parkinson', TEA: 'TEA', APETITO: 'Apetito', NAUSEAS: 'Náuseas', INFLAMACION: 'Inflamación', OTRA: 'Otra' }
const ESTADO_LOT:  Record<string, string> = { PRODUCCION: 'Producción', ACTIVO: 'Activo', FINALIZADO: 'Finalizado', DESCARTADO: 'Descartado', ARCHIVADO: 'Archivado' }
const ESTADO_PLA:  Record<string, string> = { ACTIVA: 'Activa', SELECCIONADA: 'Seleccionada', CLONADA: 'Clonada', DESCARTADA: 'Descartada', ARCHIVADA: 'Archivada' }
const SALA_LABEL:  Record<string, string> = { SALA_1: 'Sala 1', SALA_2: 'Sala 2' }

const fmtMes = (s: string) => {
  const [y, m] = s.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(m) - 1]} ${y}`
}

// ─── Componentes pequeños ──────────────────────────────────────────────────────

function TarjetaKPI({ titulo, valor, sub, icono: Icono, color = 'green', variacion }: {
  titulo: string; valor: string | number; sub?: string
  icono: React.ElementType; color?: 'green' | 'red' | 'blue' | 'amber' | 'violet'
  variacion?: { valor: number; label?: string }
}) {
  const colores = {
    green:  'bg-green-50 text-green-700 border-green-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  const varColor = variacion && variacion.valor >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className={`rounded-xl border p-4 ${colores[color]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{titulo}</p>
        <Icono className="h-4 w-4 opacity-60" />
      </div>
      <p className="mt-2 text-2xl font-bold">{valor}</p>
      {sub && <p className="mt-0.5 text-xs opacity-70">{sub}</p>}
      {variacion && (
        <p className={`mt-1 text-xs font-medium ${varColor}`}>
          {variacion.valor >= 0 ? '↑' : '↓'} {Math.abs(variacion.valor).toFixed(1)}% {variacion.label ?? 'vs mes anterior'}
        </p>
      )}
    </div>
  )
}

function ExportMenu({ onCSV, onExcel, onPDF, onWord }: { onCSV: () => void; onExcel: () => void; onPDF: () => void; onWord: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const item = (label: string, fn: () => void, ext: string) => (
    <button
      onClick={() => { fn(); setOpen(false) }}
      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
    >
      <span className="w-12 rounded bg-gray-100 px-1 text-center font-mono text-xs">{ext}</span>
      {label}
    </button>
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        <Download className="h-4 w-4" /> Exportar <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {item('PDF', onPDF, 'PDF')}
          {item('Excel', onExcel, 'XLSX')}
          {item('CSV', onCSV, 'CSV')}
          {item('Word', onWord, 'DOC')}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-16 text-gray-400"><RefreshCw className="h-6 w-6 animate-spin" /></div>
}

function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" /> {msg}
      <button onClick={onClose} className="ml-auto"><X className="h-4 w-4" /></button>
    </div>
  )
}

// ─── Tipos de API ─────────────────────────────────────────────────────────────

interface Dashboard {
  financiero: { ingresosMes: number; gastosMes: number; netoMes: number; ingresosAnt: number; gastosAnt: number; netoAnt: number }
  asociados:  { activos: number; pendientes: number; inactivos: number; altasMes: number; cuotasVencidas: number; sinSeguimientoReciente: number }
  productivo: { geneticas: number; lotesActivos: number; lotesFinalizados: number; plantasActivas: number; plantasSeleccionadas: number; plantasDescartadasMes: number }
}

interface DatoFinanciero {
  periodo: { desde: string; hasta: string }
  resumen: { totalIngresos: number; totalGastos: number; neto: number; porcentajeGastos: number }
  porTipoIngreso:   { tipo: string; total: number; cantidad: number }[]
  porCategoriaGasto: { categoria: string; total: number; cantidad: number }[]
  porSubcategoria:  { subcategoria: string; total: number; cantidad: number }[]
  evolucion:        { mes: string; ingresos: number; gastos: number; neto: number }[]
  cuotasPendientes: { nombre: string; apellido: string; dni: string; telefono: string | null; cuotaMensual: unknown; estadoCuota: string }[]
}

interface DatoAsociados {
  porEstado:              Record<string, number>
  porPatologia:           { patologia: string; cantidad: number }[]
  altasPorMes:            { mes: string; cantidad: number }[]
  sinSeguimientoReciente: { nombre: string; apellido: string; dni: string; telefono: string | null; estadoCuota: string }[]
  listado:                { nombre: string; apellido: string; dni: string; estado: string; patologia: string | null; estadoCuota: string }[]
}

interface DatoProductivo {
  geneticas:       { id: string; nombre: string; totalLotes: number; lotesActivos: number; totalPlantas: number; plantasActivas: number; lotesSala1: number; lotesSala2: number }[]
  lotes:           { id: string; codigo: string; sala: string; estado: string; fechaInicio: string; fechaFinalizacion: string | null; genetica: { nombre: string }; _count: { plantas: number } }[]
  porEstadoLote:   Record<string, number>
  porSalaLote:     Record<string, number>
  porEstadoPlanta: Record<string, number>
  totalPlantas:    number
}

// ─── Sección: Dashboard ejecutivo ─────────────────────────────────────────────

function SeccionDashboard() {
  const [data, setData]       = useState<Dashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const r = await fetch(`${API}/api/reportes/dashboard`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch { setError('Error al cargar el dashboard') }
    finally  { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) return <Spinner />
  if (!data)    return <ErrorBanner msg={error} onClose={() => setError('')} />

  const { financiero: fin, asociados: aso, productivo: prod } = data

  const pctVariacion = (actual: number, anterior: number) =>
    anterior > 0 ? ((actual - anterior) / anterior) * 100 : 0

  const estadoAsoData = [
    { name: ESTADO_ASO.ACTIVO,    value: aso.activos },
    { name: ESTADO_ASO.PENDIENTE, value: aso.pendientes },
    { name: ESTADO_ASO.INACTIVO,  value: aso.inactivos },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Financiero */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Financiero — este mes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaKPI titulo="Ingresos" valor={formatPeso(fin.ingresosMes)} icono={TrendingUp} color="green"
            variacion={{ valor: pctVariacion(fin.ingresosMes, fin.ingresosAnt) }} />
          <TarjetaKPI titulo="Gastos" valor={formatPeso(fin.gastosMes)} icono={TrendingDown} color="red"
            variacion={{ valor: pctVariacion(fin.gastosMes, fin.gastosAnt) }} />
          <TarjetaKPI titulo="Resultado neto" valor={formatPeso(fin.netoMes)} icono={BarChart3}
            color={fin.netoMes >= 0 ? 'green' : 'red'}
            variacion={{ valor: pctVariacion(fin.netoMes, fin.netoAnt) }} />
          <TarjetaKPI titulo="% de gastos" valor={fin.ingresosMes > 0 ? `${((fin.gastosMes / fin.ingresosMes) * 100).toFixed(1)}%` : '—'}
            sub={`Mes anterior: ${fin.ingresosAnt > 0 ? ((fin.gastosAnt / fin.ingresosAnt) * 100).toFixed(1) : 0}%`}
            icono={BarChart3} color="amber" />
        </div>
      </div>

      {/* Asociados */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Asociados</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaKPI titulo="Activos" valor={aso.activos} icono={Users} color="green" />
          <TarjetaKPI titulo="Pendientes" valor={aso.pendientes} icono={Users} color="amber" />
          <TarjetaKPI titulo="Inactivos" valor={aso.inactivos} icono={Users} color="violet" />
          <TarjetaKPI titulo="Altas este mes" valor={aso.altasMes} icono={Users} color="blue" />
        </div>
      </div>

      {/* Productivo */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Productivo</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TarjetaKPI titulo="Genéticas" valor={prod.geneticas} icono={Leaf} color="green" />
          <TarjetaKPI titulo="Lotes activos" valor={prod.lotesActivos} sub={`${prod.lotesFinalizados} finalizados`} icono={Leaf} color="blue" />
          <TarjetaKPI titulo="Plantas activas" valor={prod.plantasActivas} sub={`${prod.plantasSeleccionadas} seleccionadas`} icono={Leaf} color="green" />
          <TarjetaKPI titulo="Desc. este mes" valor={prod.plantasDescartadasMes} icono={Leaf} color="red" />
        </div>
      </div>

      {/* Alertas */}
      {(aso.cuotasVencidas > 0 || aso.sinSeguimientoReciente > 0) && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Alertas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {aso.cuotasVencidas > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold text-red-800">{aso.cuotasVencidas} cuota{aso.cuotasVencidas !== 1 ? 's' : ''} vencida{aso.cuotasVencidas !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-red-600">Asociados con cuota en estado VENCIDA</p>
                </div>
              </div>
            )}
            {aso.sinSeguimientoReciente > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-800">{aso.sinSeguimientoReciente} asociado{aso.sinSeguimientoReciente !== 1 ? 's' : ''} sin seguimiento</p>
                  <p className="text-xs text-amber-600">Sin seguimiento en los últimos 90 días</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mini chart: estado asociados */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Distribución de asociados</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={estadoAsoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {estadoAsoData.map((_, i) => <Cell key={i} fill={[C.verde, C.ambar, C.violeta][i] ?? COLORES_PIE[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Plantas por estado</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: 'Activas',      value: prod.plantasActivas },
              { name: 'Seleccionadas', value: prod.plantasSeleccionadas },
            ]} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Plantas" radius={[4, 4, 0, 0]}>
                {[C.verde, C.violeta].map((c, i) => <Cell key={i} fill={c} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Sección: Financiero ──────────────────────────────────────────────────────

function SeccionFinanciero() {
  const hoy  = new Date()
  const [desde, setDesde]   = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() - 4 < 0 ? hoy.getMonth() - 4 + 12 : hoy.getMonth() - 4 + 1).padStart(2,'0')}`)
  const [hasta, setHasta]   = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2,'0')}`)
  const [data, setData]     = useState<DatoFinanciero | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]   = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const r = await fetch(`${API}/api/reportes/financiero?desde=${desde}&hasta=${hasta}`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch { setError('Error al cargar reporte financiero') }
    finally  { setCargando(false) }
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  if (!data && cargando) return <Spinner />

  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf' | 'word') => {
    if (!data) return
    const filename = `balance_${desde}_${hasta}`
    const periodo  = `${fmtMes(desde)} — ${fmtMes(hasta)}`

    const seccionEvo: SeccionExport = {
      subtitulo: 'Evolución mensual (últimos 12 meses)',
      columnas: ['Mes', 'Ingresos', 'Gastos', 'Neto'],
      filas: data.evolucion.map(e => [fmtMes(e.mes), formatPeso(e.ingresos), formatPeso(e.gastos), formatPeso(e.neto)]),
    }
    const seccionIng: SeccionExport = {
      subtitulo: 'Ingresos por tipo',
      columnas: ['Tipo', 'Cantidad', 'Total'],
      filas: data.porTipoIngreso.map(t => [TIPO_ING[t.tipo] ?? t.tipo, t.cantidad, formatPeso(t.total)]),
    }
    const seccionGas: SeccionExport = {
      subtitulo: 'Gastos por subcategoría',
      columnas: ['Subcategoría', 'Cantidad', 'Total'],
      filas: data.porSubcategoria.map(s => [SUBCAT_GAS[s.subcategoria] ?? s.subcategoria, s.cantidad, formatPeso(s.total)]),
    }
    const seccionPend: SeccionExport = {
      subtitulo: 'Asociados con cuotas pendientes/vencidas',
      columnas: ['Apellido', 'Nombre', 'DNI', 'Teléfono', 'Cuota', 'Estado'],
      filas: data.cuotasPendientes.map(c => [c.apellido, c.nombre, c.dni, c.telefono ?? '—', formatPeso(Number(c.cuotaMensual ?? 0)), c.estadoCuota]),
    }
    const secciones = [seccionEvo, seccionIng, seccionGas, seccionPend]

    if (fmt === 'csv')   exportarCSV(seccionEvo.columnas, seccionEvo.filas, filename)
    if (fmt === 'excel') exportarExcel(secciones, filename)
    if (fmt === 'pdf')   await exportarPDF(`Balance Financiero`, secciones, filename, { periodo })
    if (fmt === 'word')  exportarWord(`Balance Financiero`, secciones, filename)
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Desde</label>
          <input type="month" value={desde} onChange={e => setDesde(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Hasta</label>
          <input type="month" value={hasta} onChange={e => setHasta(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
        </div>
        <button onClick={cargar} className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
        <div className="ml-auto">
          <ExportMenu
            onPDF={() => handleExport('pdf')} onExcel={() => handleExport('excel')}
            onCSV={() => handleExport('csv')}  onWord={() => handleExport('word')}
          />
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
      {cargando && <Spinner />}

      {data && (
        <>
          {/* Resumen */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKPI titulo="Total ingresos" valor={formatPeso(data.resumen.totalIngresos)} icono={TrendingUp} color="green" />
            <TarjetaKPI titulo="Total gastos"   valor={formatPeso(data.resumen.totalGastos)}   icono={TrendingDown} color="red" />
            <TarjetaKPI titulo="Resultado neto" valor={formatPeso(data.resumen.neto)} icono={BarChart3} color={data.resumen.neto >= 0 ? 'green' : 'red'} />
            <TarjetaKPI titulo="% gastos/ingresos" valor={`${data.resumen.porcentajeGastos.toFixed(1)}%`} icono={BarChart3} color="amber" />
          </div>

          {/* Evolución */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Evolución mensual — últimos 12 meses</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.evolucion} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.verde} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.verde} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.rojo} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.rojo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={n => `$${(n / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatPeso(Number(v))} labelFormatter={(l) => fmtMes(String(l))} />
                <Legend />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={C.verde} fill="url(#gIng)" strokeWidth={2} />
                <Area type="monotone" dataKey="gastos"   name="Gastos"   stroke={C.rojo}  fill="url(#gGas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ingresos por tipo */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Ingresos por tipo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.porTipoIngreso.filter(t => t.total > 0).map(t => ({ name: TIPO_ING[t.tipo], value: t.total }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {data.porTipoIngreso.map((_, i) => <Cell key={i} fill={COLORES_PIE[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatPeso(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gastos por subcategoría */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Gastos por subcategoría</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.porSubcategoria.map(s => ({ name: SUBCAT_GAS[s.subcategoria] ?? s.subcategoria, total: s.total }))}
                  layout="vertical" barSize={16} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={n => `$${(n/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v) => formatPeso(Number(v))} />
                  <Bar dataKey="total" name="Total" fill={C.rojo} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cuotas pendientes */}
          {data.cuotasPendientes.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-700">Asociados con cuotas pendientes / vencidas ({data.cuotasPendientes.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Apellido y nombre</th>
                      <th className="px-4 py-3 text-left">DNI</th>
                      <th className="px-4 py-3 text-left">Teléfono</th>
                      <th className="px-4 py-3 text-right">Cuota mensual</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.cuotasPendientes.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{c.apellido}, {c.nombre}</td>
                        <td className="px-4 py-3 text-gray-500">{c.dni}</td>
                        <td className="px-4 py-3 text-gray-500">{c.telefono ?? '—'}</td>
                        <td className="px-4 py-3 text-right">{formatPeso(Number(c.cuotaMensual ?? 0))}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.estadoCuota === 'VENCIDA' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.estadoCuota}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sección: Asociados ───────────────────────────────────────────────────────

function SeccionAsociados() {
  const [data, setData]       = useState<DatoAsociados | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const r = await fetch(`${API}/api/reportes/asociados`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch { setError('Error al cargar reporte de asociados') }
    finally  { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (cargando && !data) return <Spinner />

  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf' | 'word') => {
    if (!data) return
    const filename = `reporte_asociados_${new Date().toISOString().slice(0,10)}`
    const seccionEstado: SeccionExport = {
      subtitulo: 'Estado de asociados',
      columnas: ['Estado', 'Cantidad'],
      filas: Object.entries(data.porEstado).map(([e, n]) => [ESTADO_ASO[e] ?? e, n]),
    }
    const seccionPato: SeccionExport = {
      subtitulo: 'Distribución por patología',
      columnas: ['Patología', 'Cantidad'],
      filas: data.porPatologia.map(p => [PATO_LABEL[p.patologia] ?? p.patologia, p.cantidad]),
    }
    const seccionSinSeg: SeccionExport = {
      subtitulo: 'Asociados sin seguimiento reciente (90 días)',
      columnas: ['Apellido', 'Nombre', 'DNI', 'Teléfono', 'Cuota'],
      filas: data.sinSeguimientoReciente.map(a => [a.apellido, a.nombre, a.dni, a.telefono ?? '—', a.estadoCuota]),
    }
    const seccionList: SeccionExport = {
      subtitulo: 'Listado general de asociados',
      columnas: ['Apellido', 'Nombre', 'DNI', 'Estado', 'Patología', 'Estado cuota'],
      filas: data.listado.map(a => [a.apellido, a.nombre, a.dni, ESTADO_ASO[a.estado] ?? a.estado, PATO_LABEL[a.patologia ?? ''] ?? a.patologia ?? '—', a.estadoCuota]),
    }
    const secciones = [seccionEstado, seccionPato, seccionSinSeg, seccionList]
    if (fmt === 'csv')   exportarCSV(seccionList.columnas, seccionList.filas, filename)
    if (fmt === 'excel') exportarExcel(secciones, filename)
    if (fmt === 'pdf')   await exportarPDF('Reporte de Asociados', secciones, filename)
    if (fmt === 'word')  exportarWord('Reporte de Asociados', secciones, filename)
  }

  const listadoFiltrado = (data?.listado ?? []).filter(a => {
    if (filtroEstado && a.estado !== filtroEstado) return false
    if (busqueda) {
      const t = busqueda.toLowerCase()
      return a.apellido.toLowerCase().includes(t) || a.nombre.toLowerCase().includes(t) || a.dni.includes(t)
    }
    return true
  })

  const estadoData = data
    ? Object.entries(data.porEstado).filter(([, v]) => v > 0).map(([e, v]) => ({ name: ESTADO_ASO[e] ?? e, value: v }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportMenu onPDF={() => handleExport('pdf')} onExcel={() => handleExport('excel')} onCSV={() => handleExport('csv')} onWord={() => handleExport('word')} />
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKPI titulo="Activos"   valor={data.porEstado.ACTIVO ?? 0}    icono={Users} color="green" />
            <TarjetaKPI titulo="Pendientes" valor={data.porEstado.PENDIENTE ?? 0} icono={Users} color="amber" />
            <TarjetaKPI titulo="Inactivos"  valor={data.porEstado.INACTIVO ?? 0}  icono={Users} color="violet" />
            <TarjetaKPI titulo="Sin seguimiento" valor={data.sinSeguimientoReciente.length} sub="últimos 90 días" icono={AlertCircle} color="red" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Estado pie */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Estado de asociados</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={estadoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {estadoData.map((_, i) => <Cell key={i} fill={[C.verde, C.ambar, C.violeta][i] ?? COLORES_PIE[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Patologías */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Distribución por patología</h3>
              {data.porPatologia.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Sin datos de patología registrados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.porPatologia.slice(0, 10).map(p => ({ name: PATO_LABEL[p.patologia] ?? p.patologia, cantidad: p.cantidad }))}
                    layout="vertical" barSize={14} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="cantidad" name="Asociados" fill={C.verde} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Altas por mes */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Altas por mes (últimos 12 meses)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.altasPorMes.map(m => ({ mes: fmtMes(m.mes), cantidad: m.cantidad }))} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="cantidad" name="Altas" fill={C.azul} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Listado filtrable */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700">Listado de asociados</h3>
              <div className="ml-auto flex gap-2">
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-green-500 focus:outline-none">
                  <option value="">Todos los estados</option>
                  {Object.entries(ESTADO_ASO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-green-500 focus:outline-none w-36" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Apellido y nombre</th>
                    <th className="px-4 py-3 text-left">DNI</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Patología</th>
                    <th className="px-4 py-3 text-left">Cuota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listadoFiltrado.slice(0, 50).map((a, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">{a.apellido}, {a.nombre}</td>
                      <td className="px-4 py-2.5 text-gray-500">{a.dni}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : a.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {ESTADO_ASO[a.estado] ?? a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{PATO_LABEL[a.patologia ?? ''] ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs ${a.estadoCuota === 'VENCIDA' ? 'font-semibold text-red-600' : a.estadoCuota === 'AL_DIA' ? 'text-green-600' : 'text-gray-500'}`}>
                          {a.estadoCuota}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listadoFiltrado.length > 50 && (
                <p className="border-t px-5 py-3 text-xs text-gray-400">Mostrando 50 de {listadoFiltrado.length}. Usá la exportación para ver todos.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sección: Productivo ──────────────────────────────────────────────────────

function SeccionProductivo() {
  const [data, setData]       = useState<DatoProductivo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      const r = await fetch(`${API}/api/reportes/productivo`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch { setError('Error al cargar reporte productivo') }
    finally  { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  if (cargando && !data) return <Spinner />

  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf' | 'word') => {
    if (!data) return
    const filename = `reporte_productivo_${new Date().toISOString().slice(0,10)}`
    const seccionGen: SeccionExport = {
      subtitulo: 'Genéticas',
      columnas: ['Nombre', 'Total lotes', 'Lotes activos', 'Total plantas', 'Plantas activas', 'Sala 1', 'Sala 2'],
      filas: data.geneticas.map(g => [g.nombre, g.totalLotes, g.lotesActivos, g.totalPlantas, g.plantasActivas, g.lotesSala1, g.lotesSala2]),
    }
    const seccionLotes: SeccionExport = {
      subtitulo: 'Lotes',
      columnas: ['Código', 'Genética', 'Sala', 'Estado', 'Inicio', 'Plantas'],
      filas: data.lotes.map(l => [l.codigo, l.genetica.nombre, SALA_LABEL[l.sala] ?? l.sala, ESTADO_LOT[l.estado] ?? l.estado, formatFecha(l.fechaInicio), l._count.plantas]),
    }
    const seccionEP: SeccionExport = {
      subtitulo: 'Plantas por estado',
      columnas: ['Estado', 'Cantidad'],
      filas: Object.entries(data.porEstadoPlanta).map(([e, n]) => [ESTADO_PLA[e] ?? e, n]),
    }
    const secciones = [seccionGen, seccionLotes, seccionEP]
    if (fmt === 'csv')   exportarCSV(seccionGen.columnas, seccionGen.filas, filename)
    if (fmt === 'excel') exportarExcel(secciones, filename)
    if (fmt === 'pdf')   await exportarPDF('Reporte Productivo', secciones, filename)
    if (fmt === 'word')  exportarWord('Reporte Productivo', secciones, filename)
  }

  if (!data) return null

  const datosEstadoLote   = Object.entries(data.porEstadoLote).filter(([, v]) => v > 0).map(([e, v]) => ({ name: ESTADO_LOT[e] ?? e, value: v }))
  const datosEstadoPlanta = Object.entries(data.porEstadoPlanta).filter(([, v]) => v > 0).map(([e, v]) => ({ name: ESTADO_PLA[e] ?? e, value: v }))

  return (
    <div className="space-y-6">
      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
      <div className="flex justify-end">
        <ExportMenu onPDF={() => handleExport('pdf')} onExcel={() => handleExport('excel')} onCSV={() => handleExport('csv')} onWord={() => handleExport('word')} />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaKPI titulo="Genéticas" valor={data.geneticas.length} icono={Leaf} color="green" />
        <TarjetaKPI titulo="Lotes activos" valor={(data.porEstadoLote.PRODUCCION ?? 0) + (data.porEstadoLote.ACTIVO ?? 0)} sub={`${data.lotes.length} total`} icono={Leaf} color="blue" />
        <TarjetaKPI titulo="Plantas activas" valor={data.porEstadoPlanta.ACTIVA ?? 0} sub={`${data.totalPlantas} total`} icono={Leaf} color="green" />
        <TarjetaKPI titulo="Seleccionadas" valor={data.porEstadoPlanta.SELECCIONADA ?? 0} icono={Leaf} color="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lotes por sala */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Lotes por sala</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={Object.entries(data.porSalaLote).filter(([, v]) => v > 0).map(([s, v]) => ({ name: SALA_LABEL[s] ?? s, value: v }))}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {Object.keys(data.porSalaLote).map((_, i) => <Cell key={i} fill={[C.verde, C.azul][i] ?? COLORES_PIE[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lotes por estado */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Lotes por estado</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datosEstadoLote} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" name="Lotes" radius={[4, 4, 0, 0]}>
                {datosEstadoLote.map((_, i) => <Cell key={i} fill={COLORES_PIE[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plantas por estado */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Plantas por estado</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={datosEstadoPlanta} barSize={36}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" name="Plantas" radius={[4, 4, 0, 0]}>
              {datosEstadoPlanta.map((_, i) => <Cell key={i} fill={COLORES_PIE[i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla genéticas */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-700">Resumen por genética</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Genética</th>
                <th className="px-4 py-3 text-right">Total lotes</th>
                <th className="px-4 py-3 text-right">Lotes activos</th>
                <th className="px-4 py-3 text-right">Total plantas</th>
                <th className="px-4 py-3 text-right">Plantas activas</th>
                <th className="px-4 py-3 text-right">Sala 1</th>
                <th className="px-4 py-3 text-right">Sala 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.geneticas.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{g.nombre}</td>
                  <td className="px-4 py-3 text-right">{g.totalLotes}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{g.lotesActivos}</td>
                  <td className="px-4 py-3 text-right">{g.totalPlantas}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{g.plantasActivas}</td>
                  <td className="px-4 py-3 text-right">{g.lotesSala1}</td>
                  <td className="px-4 py-3 text-right">{g.lotesSala2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Sección: Constructor de reportes ─────────────────────────────────────────

const MODULOS = [
  { id: 'ingresos',  label: 'Ingresos',   url: '/api/ingresos?limit=500',  key: 'ingresos',  cols: ['fecha','tipo','categoria','descripcion','monto','estado'] },
  { id: 'gastos',    label: 'Gastos',     url: '/api/gastos?limit=500',    key: 'gastos',    cols: ['fecha','categoria','subcategoria','descripcion','monto','estado'] },
  { id: 'asociados', label: 'Asociados',  url: '/api/asociados?limit=500', key: 'asociados', cols: ['apellido','nombre','dni','estado','patologia','estadoCuota'] },
  { id: 'lotes',     label: 'Lotes',      url: '/api/lotes?limit=500',     key: 'lotes',     cols: ['codigo','sala','estado','fechaInicio','observaciones'] },
  { id: 'plantas',   label: 'Plantas',    url: '/api/plantas?limit=500',   key: 'plantas',   cols: ['codigo','alias','estado','observaciones'] },
] as const

type ModuloId = typeof MODULOS[number]['id']

function SeccionPersonalizado() {
  const [modulo, setModulo]   = useState<ModuloId>('ingresos')
  const [datos, setDatos]     = useState<Record<string, unknown>[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError]     = useState('')
  const [generado, setGenerado] = useState(false)

  const mod = MODULOS.find(m => m.id === modulo)!

  const generar = async () => {
    setCargando(true); setError(''); setGenerado(false)
    try {
      const r = await fetch(`${API}${mod.url}`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      const d = await r.json()
      const arr = Array.isArray(d) ? d : d[mod.key] ?? []
      setDatos(arr)
      setGenerado(true)
    } catch { setError('Error al obtener datos') }
    finally  { setCargando(false) }
  }

  const getVal = (row: Record<string, unknown>, col: string): string => {
    const v = row[col]
    if (v == null) return '—'
    if (typeof v === 'object' && 'nombre' in (v as object)) return (v as { nombre: string }).nombre
    if (col === 'fecha' || col === 'fechaInicio') return new Date(String(v)).toLocaleDateString('es-AR')
    if (col === 'monto') return formatPeso(Number(v))
    return String(v)
  }

  const filas = datos.map(row => mod.cols.map(c => getVal(row as Record<string, unknown>, c)))

  const handleExport = async (fmt: 'csv' | 'excel' | 'pdf' | 'word') => {
    const filename = `${mod.id}_${new Date().toISOString().slice(0,10)}`
    const columnas = mod.cols.map(c => c.charAt(0).toUpperCase() + c.slice(1))
    const seccion: SeccionExport = { subtitulo: mod.label, columnas, filas }
    if (fmt === 'csv')   exportarCSV(columnas, filas, filename)
    if (fmt === 'excel') exportarExcel([seccion], filename)
    if (fmt === 'pdf')   await exportarPDF(`Reporte: ${mod.label}`, [seccion], filename)
    if (fmt === 'word')  exportarWord(`Reporte: ${mod.label}`, [seccion], filename)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Constructor de reportes personalizados</h2>
        <p className="mb-6 text-sm text-gray-500">Seleccioná el módulo que querés exportar, generá la vista previa y descargá en el formato deseado.</p>

        <div className="mb-6 flex flex-wrap gap-3">
          {MODULOS.map(m => (
            <button
              key={m.id}
              onClick={() => { setModulo(m.id); setGenerado(false); setDatos([]) }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${modulo === m.id ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generar}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {cargando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {cargando ? 'Cargando...' : 'Generar vista previa'}
          </button>
          {generado && datos.length > 0 && (
            <ExportMenu onPDF={() => handleExport('pdf')} onExcel={() => handleExport('excel')} onCSV={() => handleExport('csv')} onWord={() => handleExport('word')} />
          )}
        </div>
      </div>

      {error && <ErrorBanner msg={error} onClose={() => setError('')} />}

      {generado && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{mod.label} — {datos.length} registros</h3>
            <span className="text-xs text-gray-400">Vista previa: primeros 50 registros</span>
          </div>
          {datos.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No hay datos para este módulo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>{mod.cols.map(c => <th key={c} className="px-4 py-3 text-left">{c.charAt(0).toUpperCase() + c.slice(1)}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {mod.cols.map(c => <td key={c} className="px-4 py-2.5 text-gray-700">{getVal(row as Record<string, unknown>, c)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = 'dashboard' | 'financiero' | 'asociados' | 'productivo' | 'personalizado'

const TABS: { id: Tab; label: string; icono: React.ElementType }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icono: BarChart3   },
  { id: 'financiero',   label: 'Financiero',   icono: TrendingUp  },
  { id: 'asociados',    label: 'Asociados',    icono: Users       },
  { id: 'productivo',   label: 'Productivo',   icono: Leaf        },
  { id: 'personalizado', label: 'Personalizado', icono: Download  },
]

export default function Reportes() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Analítica</h1>
          <p className="text-sm text-gray-500">Centro de análisis consolidado del sistema</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {TABS.map(({ id, label, icono: Icono }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icono className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {tab === 'dashboard'    && <SeccionDashboard />}
        {tab === 'financiero'   && <SeccionFinanciero />}
        {tab === 'asociados'    && <SeccionAsociados />}
        {tab === 'productivo'   && <SeccionProductivo />}
        {tab === 'personalizado' && <SeccionPersonalizado />}
      </div>
    </div>
  )
}

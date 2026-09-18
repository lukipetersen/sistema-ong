import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, TrendingUp, TrendingDown, Package,
  Trash2, X, AlertCircle, ChevronDown, Loader2,
  RefreshCw, Settings, CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { autoImportarMovimientos, ResultadoImportStock } from '@/utils/stock-import'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Genetica {
  id: string
  nombre: string
  stockGramos: number
  ultimoMov: { fecha: string; tipo: 'INGRESO' | 'EGRESO' } | null
  lotes?: { loteId: string; loteCodigo: string; stockGramos: number }[]
}

interface Movimiento {
  id: string
  tipo: 'INGRESO' | 'EGRESO'
  cantidadGramos: number
  fecha: string
  observaciones: string | null
  genetica: { id: string; nombre: string }
  usuario: { id: string; nombre: string; apellido: string } | null
}

interface GeneticaOption {
  id: string
  nombre: string
}

interface LoteOption {
  id: string
  codigo: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtStock(gramos: number): string {
  const abs  = Math.abs(gramos)
  const sign = gramos < 0 ? '-' : ''
  if (abs === 0) return '0 g'
  if (abs >= 1000) {
    const kg = abs / 1000
    const s  = (kg % 1 === 0 ? `${kg}` : kg.toFixed(abs >= 100000 ? 1 : 2).replace(/\.?0+$/, ''))
    return `${sign}${s} kg`
  }
  return `${sign}${abs} g`
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function mesActual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Modal: configurar Sheets URL ────────────────────────────────────────────

function ModalConfigSheets({ urlActual, onGuardar, onCerrar }: {
  urlActual: string
  onGuardar: (url: string) => void
  onCerrar: () => void
}) {
  const [url, setUrl]         = useState(urlActual)
  const [guardando, setGuard] = useState(false)
  const [error, setError]     = useState('')

  async function guardar() {
    const u = url.trim()
    if (!u) { onGuardar(''); return }
    if (!u.includes('spreadsheets/d/')) { setError('Pegá la URL de Google Sheets'); return }
    setGuard(true)
    try {
      await api.put('/configuracion/stock_sheets_url', { valor: u })
      onGuardar(u)
      onCerrar()
    } catch {
      setError('No se pudo guardar la configuración')
    } finally {
      setGuard(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Sincronización con Google Sheets</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">
            Pegá la URL de tu Google Sheets de movimientos de stock.
            El sistema importará los datos automáticamente al entrar a esta página.
          </p>
          <p className="text-xs text-slate-400 bg-[#f7f5ef] rounded-lg px-3 py-2">
            La hoja debe tener columnas: <strong>ID, Genética, Tipo, Cantidad, Fecha, Observaciones</strong>.<br />
            "Tipo" acepta: Ingreso / Egreso (o In / Out).
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">URL del Sheet</label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError('') }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="campo w-full text-sm"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-2.5 text-sm rounded-xl bg-[#4a7030] text-white font-medium hover:bg-[#3d5e28] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: crear movimiento ──────────────────────────────────────────────────

function ModalMovimiento({
  geneticas,
  geneticaPreseleccionada,
  onGuardar,
  onCerrar,
}: {
  geneticas: GeneticaOption[]
  geneticaPreseleccionada?: string
  onGuardar: () => void
  onCerrar: () => void
}) {
  const [geneticaId, setGeneticaId]   = useState(geneticaPreseleccionada ?? '')
  const [loteId, setLoteId]           = useState('')
  const [lotesDisponibles, setLotes]  = useState<LoteOption[]>([])
  const [cargandoLotes, setCargLotes] = useState(false)
  const [tipo, setTipo]               = useState<'INGRESO' | 'EGRESO'>('INGRESO')
  const [cantidad, setCantidad]       = useState('')
  const [unidad, setUnidad]           = useState<'g' | 'kg'>('g')
  const [fecha, setFecha]             = useState(() => new Date().toISOString().slice(0, 10))
  const [observaciones, setObs]       = useState('')
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [alertaNegativo, setAlerta]   = useState<{ stockActual: number; genetica: string } | null>(null)

  // Cargar lotes cuando cambia la genética seleccionada
  useEffect(() => {
    if (!geneticaId) { setLotes([]); setLoteId(''); return }
    setCargLotes(true)
    const token = sessionStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/lotes?geneticaId=${geneticaId}&limit=100`, { headers })
      .then(r => r.json())
      .then(d => {
        const lista = Array.isArray(d.lotes)
          ? d.lotes.map((l: { id: string; codigo: string }) => ({ id: l.id, codigo: l.codigo }))
          : []
        setLotes(lista)
        setLoteId('')
      })
      .catch(() => setLotes([]))
      .finally(() => setCargLotes(false))
  }, [geneticaId])

  async function guardar() {
    if (!geneticaId || !cantidad || !fecha) { setError('Completá los campos obligatorios'); return }
    const cantNum = parseFloat(cantidad)
    if (isNaN(cantNum) || cantNum <= 0) { setError('La cantidad debe ser un número positivo'); return }
    const cantidadGramos = unidad === 'kg' ? Math.round(cantNum * 1000) : Math.round(cantNum)

    setGuardando(true)
    setError('')
    try {
      const { data } = await api.post('/movimientos-stock', {
        geneticaId, loteId: loteId || null,
        tipo, cantidadGramos, fecha, observaciones: observaciones || null,
      })
      if (data.stockNegativo) {
        const g = geneticas.find(g => g.id === geneticaId)
        setAlerta({ stockActual: data.stockActual, genetica: g?.nombre ?? '' })
      }
      onGuardar()
      if (!data.stockNegativo) onCerrar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al guardar el movimiento')
    } finally {
      setGuardando(false)
    }
  }

  if (alertaNegativo) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-900 text-sm">Movimiento registrado con stock negativo</p>
              <p className="text-sm text-slate-500 mt-1">
                El stock de <strong>{alertaNegativo.genetica}</strong> quedó en{' '}
                <strong className="text-red-600">{fmtStock(alertaNegativo.stockActual)}</strong>.
                Verificá los movimientos de esa genética.
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-full py-2.5 text-sm rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600"
          >
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Registrar movimiento</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['INGRESO', 'EGRESO'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    tipo === t
                      ? t === 'INGRESO'
                        ? 'border-[#4a7030] bg-[#edf5e0] text-[#4a7030]'
                        : 'border-red-500 bg-red-50 text-red-600'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'INGRESO' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {t === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Genética */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Genética *</label>
            <div className="relative">
              <select
                value={geneticaId}
                onChange={e => setGeneticaId(e.target.value)}
                className="campo w-full appearance-none pr-8"
              >
                <option value="">Seleccioná una genética...</option>
                {geneticas.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Lote (opcional) */}
          {geneticaId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Lote <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <select
                  value={loteId}
                  onChange={e => setLoteId(e.target.value)}
                  disabled={cargandoLotes}
                  className="campo w-full appearance-none pr-8 disabled:opacity-60"
                >
                  <option value="">Sin lote específico</option>
                  {lotesDisponibles.map(l => (
                    <option key={l.id} value={l.id}>{l.codigo}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {cargandoLotes && <p className="text-xs text-slate-400 mt-1">Cargando lotes...</p>}
              {!cargandoLotes && lotesDisponibles.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">Esta genética no tiene lotes asignados</p>
              )}
            </div>
          )}

          {/* Cantidad + unidad */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cantidad *</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                placeholder="0"
                className="campo flex-1"
              />
              <div className="flex border border-[#e0d8c8] rounded-xl overflow-hidden text-sm">
                {(['g', 'kg'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setUnidad(u)}
                    className={`px-4 py-2 font-medium transition-colors ${
                      unidad === u ? 'bg-[#4a7030] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {cantidad && !isNaN(parseFloat(cantidad)) && (
              <p className="text-xs text-slate-400 mt-1">
                = {fmtStock(unidad === 'kg' ? parseFloat(cantidad) * 1000 : parseFloat(cantidad))}
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="campo w-full"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Motivo, proveedor, etc."
              className="campo w-full resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-2.5 text-sm rounded-xl bg-[#4a7030] text-white font-medium hover:bg-[#3d5e28] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Tab = 'movimientos' | 'por-genetica'

type SyncEstado = 'idle' | 'syncing' | 'ok' | 'error'

export default function Stock() {
  const [tab, setTab]                 = useState<Tab>('movimientos')
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [totalMov, setTotalMov]       = useState(0)
  const [resumen, setResumen]         = useState<Genetica[]>([])
  const [geneticas, setGeneticas]     = useState<GeneticaOption[]>([])
  const [cargando, setCargando]       = useState(true)
  const [modal, setModal]             = useState<{ abierto: boolean; geneticaId?: string }>({ abierto: false })
  const [confirmarElim, setConfirmarElim] = useState<Movimiento | null>(null)
  const [eliminando, setEliminando]   = useState(false)
  const [errorElim, setErrorElim]     = useState('')
  const [alertaElimNegativo, setAlertaElimNegativo] = useState<number | null>(null)

  // Sheets sync
  const [sheetsUrl, setSheetsUrl]     = useState('')
  const [syncEstado, setSyncEstado]   = useState<SyncEstado>('idle')
  const [syncResultado, setSyncResult] = useState<ResultadoImportStock | null>(null)
  const [modalConfig, setModalConfig] = useState(false)
  const sincronizadoRef               = useRef(false)

  // Filtros
  const [filtroGenetica, setFiltroGenetica] = useState('')
  const [filtroTipo, setFiltroTipo]         = useState('')
  const [filtroMes, setFiltroMes]           = useState(mesActual())
  const [page, setPage]                     = useState(1)
  const limit = 30

  const cargarResumen = useCallback(async () => {
    const { data } = await api.get('/movimientos-stock/resumen')
    setResumen(data)
  }, [])

  const cargarMovimientos = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filtroGenetica) params.set('geneticaId', filtroGenetica)
      if (filtroTipo)     params.set('tipo', filtroTipo)
      if (filtroMes)      params.set('mes', filtroMes)
      const { data } = await api.get(`/movimientos-stock?${params}`)
      setMovimientos(data.movimientos)
      setTotalMov(data.total)
    } finally {
      setCargando(false)
    }
  }, [filtroGenetica, filtroTipo, filtroMes, page])

  const cargarGeneticas = useCallback(async () => {
    const { data } = await api.get('/geneticas')
    const lista = data.map((g: { id: string; nombre: string }) => ({ id: g.id, nombre: g.nombre })) as GeneticaOption[]
    setGeneticas(lista)
    return lista
  }, [])

  // Auto-sync al montar (una sola vez por sesión)
  const sincronizar = useCallback(async (lista?: GeneticaOption[]) => {
    setSyncEstado('syncing')
    try {
      const gList = lista ?? geneticas
      const mapa = new Map(gList.map(g => [g.nombre, g.id]))
      const res = await autoImportarMovimientos(mapa)
      setSyncResult(res)
      setSyncEstado(res === null ? 'idle' : 'ok')
      if (res && (res.importados > 0 || res.actualizados > 0)) {
        await Promise.all([cargarMovimientos(), cargarResumen()])
      }
    } catch {
      setSyncEstado('error')
    }
  }, [geneticas, cargarMovimientos, cargarResumen])

  useEffect(() => {
    let cancelado = false
    async function init() {
      const lista = await cargarGeneticas()
      if (cancelado) return
      await Promise.all([cargarMovimientos(), cargarResumen()])

      // Cargar URL configurada
      try {
        const { data: cfg } = await api.get('/configuracion/stock_sheets_url')
        const url = cfg.valor as string | null
        if (!cancelado) setSheetsUrl(url ?? '')

        // Auto-sync solo la primera vez por sesión
        if (url && !sincronizadoRef.current) {
          sincronizadoRef.current = true
          setSyncEstado('syncing')
          try {
            const mapa = new Map(lista.map(g => [g.nombre, g.id]))
            const res = await autoImportarMovimientos(mapa)
            if (!cancelado) {
              setSyncResult(res)
              setSyncEstado(res === null ? 'idle' : 'ok')
              if (res && (res.importados > 0 || res.actualizados > 0)) {
                await Promise.all([cargarMovimientos(), cargarResumen()])
              }
            }
          } catch {
            if (!cancelado) setSyncEstado('error')
          }
        }
      } catch {
        // No hay URL configurada o endpoint no existe aún
      }
    }
    init()
    return () => { cancelado = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setPage(1) }, [filtroGenetica, filtroTipo, filtroMes])
  useEffect(() => { cargarMovimientos() }, [cargarMovimientos])

  async function eliminar() {
    if (!confirmarElim) return
    setEliminando(true)
    setErrorElim('')
    try {
      const { data } = await api.delete(`/movimientos-stock/${confirmarElim.id}`)
      setConfirmarElim(null)
      await Promise.all([cargarMovimientos(), cargarResumen()])
      if (data.stockNegativo) setAlertaElimNegativo(data.stockActual)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorElim(msg ?? 'Error al eliminar')
    } finally {
      setEliminando(false)
    }
  }

  // Estadísticas rápidas del mes
  const ingresosMes = movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.cantidadGramos, 0)
  const egresosMes  = movimientos.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + m.cantidadGramos, 0)
  const stockTotal  = resumen.reduce((s, g) => s + g.stockGramos, 0)

  return (
    <div className="space-y-5">

      {/* ─── Tarjetas de resumen ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[#ede8dc] p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Package className="w-3.5 h-3.5" /> STOCK TOTAL
          </div>
          <p className={`text-2xl font-bold ${stockTotal < 0 ? 'text-red-600' : 'text-[#1a1814]'}`}>
            {fmtStock(stockTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{resumen.length} genética{resumen.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#ede8dc] p-4">
          <div className="flex items-center gap-2 text-[#4a7030] text-xs font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5" /> INGRESOS ({filtroMes})
          </div>
          <p className="text-2xl font-bold text-[#1a1814]">{fmtStock(ingresosMes)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{movimientos.filter(m => m.tipo === 'INGRESO').length} mov.</p>
        </div>
        <div className="bg-white rounded-xl border border-[#ede8dc] p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs font-medium mb-1">
            <TrendingDown className="w-3.5 h-3.5" /> EGRESOS ({filtroMes})
          </div>
          <p className="text-2xl font-bold text-[#1a1814]">{fmtStock(egresosMes)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{movimientos.filter(m => m.tipo === 'EGRESO').length} mov.</p>
        </div>
      </div>

      {/* ─── Banner de sync ─── */}
      {syncEstado === 'syncing' && (
        <div className="flex items-center gap-2 text-sm text-[#7a6840] bg-[#faf8f3] border border-[#ede8dc] rounded-xl px-4 py-2.5">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Sincronizando movimientos con Google Sheets...
        </div>
      )}
      {syncEstado === 'ok' && syncResultado && (syncResultado.importados > 0 || syncResultado.actualizados > 0) && (
        <div className="flex items-center gap-2 text-sm text-[#4a7030] bg-[#edf5e0] border border-[#c8e0a0] rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Sheets sincronizado: {syncResultado.importados} nuevo{syncResultado.importados !== 1 ? 's' : ''}
          {syncResultado.actualizados > 0 && `, ${syncResultado.actualizados} actualizado${syncResultado.actualizados !== 1 ? 's' : ''}`}
          {syncResultado.omitidos > 0 && `, ${syncResultado.omitidos} sin cambios`}
        </div>
      )}
      {syncEstado === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No se pudo sincronizar con Google Sheets. Verificá la URL en configuración.
        </div>
      )}

      {/* ─── Tabs + botones ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-[#f0ebe0] rounded-xl">
          {([['movimientos', 'Movimientos'], ['por-genetica', 'Por Genética']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-white text-[#1a1814] shadow-sm' : 'text-[#7a6840] hover:text-[#3a3220]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalConfig(true)}
            title="Configurar Google Sheets"
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
              sheetsUrl ? 'border-[#4a7030] text-[#4a7030] bg-[#edf5e0] hover:bg-[#dff0c0]' : 'border-[#ede8dc] text-slate-400 hover:bg-[#f0ebe0]'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          {sheetsUrl && (
            <button
              onClick={() => sincronizar()}
              disabled={syncEstado === 'syncing'}
              title="Sincronizar ahora"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#ede8dc] text-slate-400 hover:bg-[#f0ebe0] disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncEstado === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setModal({ abierto: true })}
            className="flex items-center gap-2 px-4 py-2 bg-[#4a7030] text-white rounded-xl text-sm font-medium hover:bg-[#3d5e28] transition-colors"
          >
            <Plus className="w-4 h-4" /> Registrar
          </button>
        </div>
      </div>

      {/* ─── Tab: Movimientos ─── */}
      {tab === 'movimientos' && (
        <div className="bg-white rounded-xl border border-[#ede8dc] overflow-hidden">
          {/* Filtros */}
          <div className="px-4 py-3 border-b border-[#ede8dc] flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <select
                value={filtroGenetica}
                onChange={e => setFiltroGenetica(e.target.value)}
                className="campo w-full text-sm appearance-none pr-8"
              >
                <option value="">Todas las genéticas</option>
                {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filtroTipo}
                onChange={e => setFiltroTipo(e.target.value)}
                className="campo text-sm appearance-none pr-8 w-full sm:w-auto"
              >
                <option value="">Todos los tipos</option>
                <option value="INGRESO">Ingresos</option>
                <option value="EGRESO">Egresos</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <input
              type="month"
              value={filtroMes}
              onChange={e => setFiltroMes(e.target.value)}
              className="campo text-sm w-full sm:w-auto"
            />
          </div>

          {/* Tabla */}
          {cargando ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No hay movimientos para los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#ede8dc] text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Genética</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-right">Cantidad</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Observaciones</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f2ec]">
                  {movimientos.map(m => (
                    <tr key={m.id} className="hover:bg-[#faf8f3] group">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtFecha(m.fecha)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 hidden sm:table-cell">{m.genetica.nombre}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.tipo === 'INGRESO'
                            ? 'bg-[#edf5e0] text-[#4a7030]'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {m.tipo === 'INGRESO'
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />}
                          {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                        m.tipo === 'INGRESO' ? 'text-[#4a7030]' : 'text-red-600'
                      }`}>
                        {m.tipo === 'EGRESO' ? '-' : '+'}{fmtStock(m.cantidadGramos)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate hidden md:table-cell">
                        {m.observaciones ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setConfirmarElim(m); setErrorElim('') }}
                          className="sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {totalMov > limit && (
            <div className="px-4 py-3 border-t border-[#ede8dc] flex items-center justify-between text-sm text-slate-500">
              <span>{totalMov} movimientos</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg border border-[#ede8dc] hover:bg-[#f7f5ef] disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  disabled={page * limit >= totalMov}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-[#ede8dc] hover:bg-[#f7f5ef] disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Por Genética ─── */}
      {tab === 'por-genetica' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resumen.map(g => (
            <div
              key={g.id}
              className="bg-white rounded-xl border border-[#ede8dc] p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">{g.nombre}</h3>
                <button
                  onClick={() => {
                    setFiltroGenetica(g.id)
                    setTab('movimientos')
                  }}
                  className="text-xs text-[#7a6840] hover:text-[#4a7030] whitespace-nowrap"
                >
                  Ver movimientos →
                </button>
              </div>
              <p className={`text-3xl font-bold mb-1 ${
                g.stockGramos < 0 ? 'text-red-600' : g.stockGramos === 0 ? 'text-slate-400' : 'text-[#4a7030]'
              }`}>
                {fmtStock(g.stockGramos)}
              </p>
              {g.ultimoMov ? (
                <p className="text-xs text-slate-400">
                  Último mov.: {fmtFecha(g.ultimoMov.fecha)} — {g.ultimoMov.tipo === 'INGRESO' ? 'ingreso' : 'egreso'}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Sin movimientos registrados</p>
              )}
              {g.lotes && g.lotes.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {g.lotes.map(l => (
                    <div key={l.loteId} className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{l.loteCodigo}</span>
                      <span className={l.stockGramos < 0 ? 'text-red-500' : l.stockGramos === 0 ? 'text-slate-400' : 'text-amber-600'}>
                        {fmtStock(l.stockGramos)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setModal({ abierto: true, geneticaId: g.id })}
                className="mt-3 w-full text-xs py-1.5 rounded-lg border border-[#ede8dc] text-slate-600 hover:bg-[#f7f5ef] transition-colors"
              >
                + Registrar movimiento
              </button>
            </div>
          ))}
          {resumen.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              No hay genéticas con stock registrado
            </div>
          )}
        </div>
      )}

      {/* ─── Modal configurar Sheets ─── */}
      {modalConfig && (
        <ModalConfigSheets
          urlActual={sheetsUrl}
          onGuardar={url => { setSheetsUrl(url); setSyncEstado('idle'); setSyncResult(null) }}
          onCerrar={() => setModalConfig(false)}
        />
      )}

      {/* ─── Modal nuevo movimiento ─── */}
      {modal.abierto && (
        <ModalMovimiento
          geneticas={geneticas}
          geneticaPreseleccionada={modal.geneticaId}
          onGuardar={() => { cargarMovimientos(); cargarResumen() }}
          onCerrar={() => setModal({ abierto: false })}
        />
      )}

      {/* ─── Confirmar eliminación ─── */}
      {confirmarElim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 text-sm">¿Eliminar este movimiento?</p>
                <p className="text-sm text-slate-500 mt-1">
                  {confirmarElim.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} de{' '}
                  <strong>{fmtStock(confirmarElim.cantidadGramos)}</strong> de{' '}
                  <strong>{confirmarElim.genetica.nombre}</strong> el {fmtFecha(confirmarElim.fecha)}.
                  El stock de la genética se actualizará automáticamente.
                </p>
                {errorElim && (
                  <p className="text-sm text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-2">{errorElim}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarElim(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminar}
                disabled={eliminando}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {eliminando ? <><Loader2 className="w-4 h-4 animate-spin" />Eliminando...</> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Alerta stock negativo post-eliminación ─── */}
      {alertaElimNegativo !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 text-sm">Stock negativo tras la eliminación</p>
                <p className="text-sm text-slate-500 mt-1">
                  El movimiento fue eliminado, pero el stock de la genética quedó en{' '}
                  <strong className="text-red-600">{fmtStock(alertaElimNegativo)}</strong>.
                  Revisá los movimientos de esa genética.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAlertaElimNegativo(null)}
              className="w-full py-2.5 text-sm rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

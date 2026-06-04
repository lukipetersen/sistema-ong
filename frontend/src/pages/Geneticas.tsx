import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, ChevronRight, ChevronLeft, Leaf,
  Layers, FlaskConical, Pencil, Trash2, AlertCircle, X,
} from 'lucide-react'
import type {
  Genetica, GeneticaDetalle, Lote, LoteDetalle, Planta,
} from '../types/geneticas'
import {
  ESTADO_LOTE_LABELS, ESTADO_PLANTA_LABELS, SALA_LABELS,
  ESTADO_LOTE_COLOR, ESTADO_PLANTA_COLOR,
} from '../types/geneticas'
import ModalGenetica from '../components/geneticas/ModalGenetica'
import ModalLote from '../components/geneticas/ModalLote'
import ModalPlanta from '../components/geneticas/ModalPlanta'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

type SalaFiltro = '' | 'SALA_1' | 'SALA_2'

// ─── Badges ─────────────────────────────────────────────────────────────────

function BadgeLote({ estado }: { estado: Lote['estado'] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_LOTE_COLOR[estado]}`}>
      {ESTADO_LOTE_LABELS[estado]}
    </span>
  )
}

function BadgePlanta({ estado }: { estado: Planta['estado'] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_PLANTA_COLOR[estado]}`}>
      {ESTADO_PLANTA_LABELS[estado]}
    </span>
  )
}

// ─── Selector de sala ────────────────────────────────────────────────────────

function SalaSelector({
  valor, onChange,
}: {
  valor: SalaFiltro
  onChange: (v: SalaFiltro) => void
}) {
  return (
    <div className="mb-6 flex gap-2">
      {(['', 'SALA_1', 'SALA_2'] as SalaFiltro[]).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            valor === s
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {s === '' ? 'Todas las salas' : SALA_LABELS[s]}
        </button>
      ))}
    </div>
  )
}

// ─── Modal de confirmación ───────────────────────────────────────────────────

function ModalConfirm({
  mensaje, onConfirmar, onCancelar, cargando,
}: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void; cargando?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-gray-700">{mensaje}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {cargando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vista: inventario por sala ──────────────────────────────────────────────

function VistaLotesPorSala({
  sala, onVerLote, onVerGenetica,
}: {
  sala: 'SALA_1' | 'SALA_2'
  onVerLote: (l: Lote) => void
  onVerGenetica: (id: string, nombre: string) => void
}) {
  const [lotes, setLotes]       = useState<Lote[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [error, setError]       = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API}/api/lotes?sala=${sala}&limit=500`, { headers: authHeaders() })
      const d = await r.json()
      setLotes(Array.isArray(d.lotes) ? d.lotes : [])
    } catch { setError('Error al cargar lotes') }
    finally  { setCargando(false) }
  }, [sala])

  useEffect(() => { cargar() }, [cargar])

  const lotesFiltrados = lotes.filter(l => {
    if (filtroEstado && l.estado !== filtroEstado) return false
    if (busqueda) {
      const t = busqueda.toLowerCase()
      return (
        l.codigo.toLowerCase().includes(t) ||
        l.genetica.nombre.toLowerCase().includes(t) ||
        (l.observaciones ?? '').toLowerCase().includes(t)
      )
    }
    return true
  })

  const totalPlantas   = lotes.reduce((s, l) => s + l.totalPlantas, 0)
  const plantasActivas = lotes.reduce((s, l) => s + l.plantasActivas, 0)
  const lotesActivos   = lotes.filter(l => ['PRODUCCION', 'ACTIVO'].includes(l.estado)).length

  const lotesCount = Object.fromEntries(
    Object.keys(ESTADO_LOTE_LABELS).map(e => [e, lotes.filter(l => l.estado === e).length]),
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{SALA_LABELS[sala]}</h1>
        <p className="text-sm text-gray-500">{lotes.length} lote{lotes.length !== 1 ? 's' : ''} en esta sala</p>
      </div>

      {/* Resumen */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{lotesActivos}</p>
          <p className="text-xs text-gray-500">Lotes activos</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{totalPlantas}</p>
          <p className="text-xs text-gray-500">Total plantas</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700">{plantasActivas}</p>
          <p className="text-xs text-gray-500">Plantas activas</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filtros por estado */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!filtroEstado ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Todos ({lotes.length})
        </button>
        {Object.entries(ESTADO_LOTE_LABELS).map(([e, l]) => lotesCount[e] > 0 && (
          <button
            key={e}
            onClick={() => setFiltroEstado(filtroEstado === e ? '' : e)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filtroEstado === e ? ESTADO_LOTE_COLOR[e as Lote['estado']] + ' ring-2 ring-offset-1 ring-green-400' : ESTADO_LOTE_COLOR[e as Lote['estado']] + ' opacity-80 hover:opacity-100'
            }`}
          >
            {l} ({lotesCount[e]})
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código o genética..."
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
      ) : lotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Layers className="h-12 w-12 opacity-30" />
          <p>{lotes.length === 0 ? 'No hay lotes en esta sala.' : 'Sin resultados.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Lote</th>
                <th className="px-4 py-3 text-left">Genética</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Plantas</th>
                <th className="px-4 py-3 text-right">Activas</th>
                <th className="px-4 py-3 text-right">Selec.</th>
                <th className="px-4 py-3 text-left">Inicio</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lotesFiltrados.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerLote(l)}
                      className="font-mono text-sm font-semibold text-green-700 hover:underline"
                    >
                      {l.codigo}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerGenetica(l.genetica.id, l.genetica.nombre)}
                      className="text-gray-700 hover:text-green-700 hover:underline"
                    >
                      {l.genetica.nombre}
                    </button>
                  </td>
                  <td className="px-4 py-3"><BadgeLote estado={l.estado} /></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{l.totalPlantas}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{l.plantasActivas}</td>
                  <td className="px-4 py-3 text-right text-purple-700 font-medium">{l.plantasSeleccionadas}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(l.fechaInicio).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onVerLote(l)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-700"
                    >
                      Ver plantas <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Vista: lista de genéticas ───────────────────────────────────────────────

function VistaLista({
  onVerGenetica,
}: {
  onVerGenetica: (g: Genetica) => void
}) {
  const [geneticas, setGeneticas]     = useState<Genetica[]>([])
  const [cargando, setCargando]       = useState(true)
  const [busqueda, setBusqueda]       = useState('')
  const [modalGenetica, setModalGenetica] = useState<{ abierto: boolean; genetica?: Genetica | null }>({ abierto: false })
  const [confirmarElim, setConfirmarElim] = useState<Genetica | null>(null)
  const [guardando, setGuardando]     = useState(false)
  const [eliminando, setEliminando]   = useState(false)
  const [error, setError]             = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API}/api/geneticas`, { headers: authHeaders() })
      const d = await r.json()
      setGeneticas(Array.isArray(d) ? d : [])
    } catch { setError('Error al cargar genéticas') }
    finally  { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtradas = geneticas.filter(g =>
    g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (g.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  )

  async function guardarGenetica(data: { nombre: string; descripcion?: string; observaciones?: string }) {
    setGuardando(true)
    try {
      const url    = modalGenetica.genetica ? `${API}/api/geneticas/${modalGenetica.genetica.id}` : `${API}/api/geneticas`
      const method = modalGenetica.genetica ? 'PUT' : 'POST'
      const r      = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalGenetica({ abierto: false })
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setGuardando(false) }
  }

  async function eliminarGenetica() {
    if (!confirmarElim) return
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/geneticas/${confirmarElim.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfirmarElim(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally { setEliminando(false) }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Genéticas</h1>
          <p className="text-sm text-gray-500">{geneticas.length} variedad{geneticas.length !== 1 ? 'es' : ''} registradas</p>
        </div>
        <button
          onClick={() => setModalGenetica({ abierto: true, genetica: null })}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nueva genética
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar genética..."
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Leaf className="h-12 w-12 opacity-30" />
          <p>{busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay genéticas registradas aún.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map(g => (
            <div
              key={g.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <button
                  onClick={() => onVerGenetica(g)}
                  className="flex-1 text-left"
                >
                  <h3 className="font-semibold text-gray-900 hover:text-green-700">{g.nombre}</h3>
                  {g.descripcion && (
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{g.descripcion}</p>
                  )}
                </button>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setModalGenetica({ abierto: true, genetica: g })}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmarElim(g)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-gray-50 p-2 text-center">
                  <p className="text-xl font-bold text-gray-900">{g.totalLotes}</p>
                  <p className="text-xs text-gray-500">Lotes</p>
                </div>
                <div className="rounded-lg bg-green-50 p-2 text-center">
                  <p className="text-xl font-bold text-green-700">{g.plantasActivas}</p>
                  <p className="text-xs text-green-600">Plantas activas</p>
                </div>
              </div>

              <button
                onClick={() => onVerGenetica(g)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Ver lotes <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalGenetica.abierto && (
        <ModalGenetica
          genetica={modalGenetica.genetica}
          onGuardar={guardarGenetica}
          onCerrar={() => setModalGenetica({ abierto: false })}
          cargando={guardando}
        />
      )}

      {confirmarElim && (
        <ModalConfirm
          mensaje={`¿Eliminar la genética "${confirmarElim.nombre}"? Esta acción no se puede deshacer.`}
          onConfirmar={eliminarGenetica}
          onCancelar={() => setConfirmarElim(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Vista: detalle de genética + sus lotes ──────────────────────────────────

function VistaGenetica({
  geneticaId, salaFiltro, onVolver, onVerLote,
}: {
  geneticaId: string
  salaFiltro: SalaFiltro
  onVolver: () => void
  onVerLote: (l: Lote) => void
}) {
  const [data, setData]             = useState<GeneticaDetalle | null>(null)
  const [cargando, setCargando]     = useState(true)
  const [modalLote, setModalLote]   = useState<{ abierto: boolean; lote?: Lote | null }>({ abierto: false })
  const [confirmarElim, setConfirmarElim] = useState<Lote | null>(null)
  const [guardando, setGuardando]   = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError]           = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API}/api/geneticas/${geneticaId}`, { headers: authHeaders() })
      const d = await r.json()
      setData(d)
    } catch { setError('Error al cargar') }
    finally  { setCargando(false) }
  }, [geneticaId])

  useEffect(() => { cargar() }, [cargar])

  async function guardarLote(formData: Record<string, unknown>) {
    setGuardando(true)
    try {
      const url    = modalLote.lote ? `${API}/api/lotes/${modalLote.lote.id}` : `${API}/api/lotes`
      const method = modalLote.lote ? 'PUT' : 'POST'
      const body   = modalLote.lote ? formData : { ...formData, geneticaId }
      const r      = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalLote({ abierto: false })
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setGuardando(false) }
  }

  async function eliminarLote() {
    if (!confirmarElim) return
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${confirmarElim.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfirmarElim(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally { setEliminando(false) }
  }

  if (cargando) return <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
  if (!data)    return <div className="py-16 text-center text-red-500">{error || 'No encontrado'}</div>

  const lotesMostrados = salaFiltro
    ? data.lotes.filter(l => l.sala === salaFiltro)
    : data.lotes

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <button onClick={onVolver} className="flex items-center gap-1 hover:text-green-700">
          <ChevronLeft className="h-4 w-4" />
          {salaFiltro ? SALA_LABELS[salaFiltro] : 'Genéticas'}
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-gray-900">{data.nombre}</span>
        {salaFiltro && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {SALA_LABELS[salaFiltro]}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.nombre}</h1>
          {data.descripcion && <p className="mt-1 text-sm text-gray-500">{data.descripcion}</p>}
          {salaFiltro && (
            <p className="mt-1 text-sm text-gray-400">
              {lotesMostrados.length} de {data.lotes.length} lotes en {SALA_LABELS[salaFiltro]}
            </p>
          )}
        </div>
        <button
          onClick={() => setModalLote({ abierto: true, lote: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nuevo lote
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Lotes */}
      {lotesMostrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Layers className="h-12 w-12 opacity-30" />
          <p>
            {data.lotes.length === 0
              ? 'No hay lotes para esta genética.'
              : `No hay lotes de esta genética en ${SALA_LABELS[salaFiltro as 'SALA_1' | 'SALA_2']}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotesMostrados.map(l => (
            <div key={l.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{l.codigo}</span>
                  <BadgeLote estado={l.estado} />
                  <span className="text-xs text-gray-500">{SALA_LABELS[l.sala]}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setModalLote({ abierto: true, lote: l as Lote })}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmarElim(l as Lote)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>Inicio: {new Date(l.fechaInicio).toLocaleDateString('es-AR')}</span>
                {l.fechaFinalizacion && (
                  <span>Fin: {new Date(l.fechaFinalizacion).toLocaleDateString('es-AR')}</span>
                )}
                <span className="font-medium">{l.totalPlantas} plantas</span>
                {l.plantasActivas > 0 && (
                  <span className="text-green-600">{l.plantasActivas} activas</span>
                )}
                {l.plantasSeleccionadas > 0 && (
                  <span className="text-purple-600">{l.plantasSeleccionadas} seleccionadas</span>
                )}
              </div>

              {l.observaciones && (
                <p className="mt-1 text-xs text-gray-400">{l.observaciones}</p>
              )}

              <button
                onClick={() => onVerLote(l as Lote)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Ver plantas <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalLote.abierto && (
        <ModalLote
          lote={modalLote.lote}
          geneticaNombre={data.nombre}
          onGuardar={guardarLote as (data: Record<string, unknown>) => Promise<void>}
          onCerrar={() => setModalLote({ abierto: false })}
          cargando={guardando}
        />
      )}

      {confirmarElim && (
        <ModalConfirm
          mensaje={`¿Eliminar el lote "${confirmarElim.codigo}"? Esta acción no se puede deshacer.`}
          onConfirmar={eliminarLote}
          onCancelar={() => setConfirmarElim(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Vista: detalle de lote + plantas ────────────────────────────────────────

function VistaLote({
  loteId, salaFiltro, onVolver, onVolverGenetica, onVolverSala,
}: {
  loteId: string
  salaFiltro: SalaFiltro
  onVolver: () => void
  onVolverGenetica: () => void
  onVolverSala: () => void
}) {
  const [data, setData]               = useState<LoteDetalle | null>(null)
  const [cargando, setCargando]       = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda]       = useState('')
  const [modalPlanta, setModalPlanta] = useState<{ abierto: boolean; planta?: Planta | null }>({ abierto: false })
  const [confirmarElim, setConfirmarElim] = useState<Planta | null>(null)
  const [guardando, setGuardando]     = useState(false)
  const [eliminando, setEliminando]   = useState(false)
  const [error, setError]             = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${loteId}`, { headers: authHeaders() })
      const d = await r.json()
      setData(d)
    } catch { setError('Error al cargar') }
    finally  { setCargando(false) }
  }, [loteId])

  useEffect(() => { cargar() }, [cargar])

  async function guardarPlanta(formData: Record<string, unknown>) {
    setGuardando(true)
    try {
      const url    = modalPlanta.planta ? `${API}/api/plantas/${modalPlanta.planta.id}` : `${API}/api/plantas`
      const method = modalPlanta.planta ? 'PUT' : 'POST'
      const body   = modalPlanta.planta ? formData : { ...formData, loteId }
      const r      = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalPlanta({ abierto: false })
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setGuardando(false) }
  }

  async function eliminarPlanta() {
    if (!confirmarElim) return
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/plantas/${confirmarElim.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfirmarElim(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally { setEliminando(false) }
  }

  if (cargando) return <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
  if (!data)    return <div className="py-16 text-center text-red-500">{error || 'No encontrado'}</div>

  const plantasFiltradas = data.plantas.filter(p => {
    if (filtroEstado && p.estado !== filtroEstado) return false
    if (busqueda) {
      const t = busqueda.toLowerCase()
      return p.codigo.toLowerCase().includes(t) || (p.alias ?? '').toLowerCase().includes(t)
    }
    return true
  })

  const conteos = Object.fromEntries(
    Object.keys(ESTADO_PLANTA_LABELS).map(e => [
      e, data.plantas.filter(p => p.estado === e).length,
    ]),
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        {salaFiltro ? (
          <>
            <button onClick={onVolverSala} className="hover:text-green-700">{SALA_LABELS[salaFiltro]}</button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={onVolver} className="flex items-center gap-1 hover:text-green-700">
              <ChevronLeft className="h-3 w-3" /> {data.genetica.nombre}
            </button>
          </>
        ) : (
          <>
            <button onClick={onVolverGenetica} className="hover:text-green-700">Genéticas</button>
            <ChevronRight className="h-4 w-4" />
            <button onClick={onVolver} className="flex items-center gap-1 hover:text-green-700">
              <ChevronLeft className="h-3 w-3" /> {data.genetica.nombre}
            </button>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="font-mono font-medium text-gray-900">{data.codigo}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{data.codigo}</h1>
            <BadgeLote estado={data.estado} />
            <span className="text-sm text-gray-500">{SALA_LABELS[data.sala]}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{data.genetica.nombre}</p>
        </div>
        <button
          onClick={() => setModalPlanta({ abierto: true, planta: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nueva planta
        </button>
      </div>

      {/* Resumen por estado */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado('')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !filtroEstado ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas ({data.plantas.length})
        </button>
        {Object.entries(ESTADO_PLANTA_LABELS).map(([e, l]) => conteos[e] > 0 && (
          <button
            key={e}
            onClick={() => setFiltroEstado(filtroEstado === e ? '' : e)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filtroEstado === e
                ? ESTADO_PLANTA_COLOR[e as Planta['estado']].replace('bg-', 'ring-2 ring-').split(' ')[0] + ` ${ESTADO_PLANTA_COLOR[e as Planta['estado']]}`
                : ESTADO_PLANTA_COLOR[e as Planta['estado']] + ' opacity-70 hover:opacity-100'
            }`}
          >
            {l} ({conteos[e]})
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por código o alias..."
          className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Tabla de plantas */}
      {plantasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <FlaskConical className="h-12 w-12 opacity-30" />
          <p>{data.plantas.length === 0 ? 'No hay plantas en este lote.' : 'Sin resultados.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Alias</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Observaciones</th>
                <th className="px-4 py-3 text-left">Creada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plantasFiltradas.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{p.codigo}</td>
                  <td className="px-4 py-3 text-gray-600">{p.alias ?? '—'}</td>
                  <td className="px-4 py-3"><BadgePlanta estado={p.estado} /></td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{p.observaciones ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.creadoEn).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModalPlanta({ abierto: true, planta: p })}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmarElim(p)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Historial */}
      {data.historial.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Historial</h3>
          <div className="space-y-1">
            {data.historial.map(h => (
              <div key={h.id} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <span className="font-medium">{h.accion}</span>
                {h.detalles && <span className="text-gray-400">{h.detalles}</span>}
                <span className="ml-auto text-gray-400">
                  {new Date(h.creadoEn).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalPlanta.abierto && (
        <ModalPlanta
          planta={modalPlanta.planta}
          loteCodigo={data.codigo}
          onGuardar={guardarPlanta as (data: Record<string, unknown>) => Promise<void>}
          onCerrar={() => setModalPlanta({ abierto: false })}
          cargando={guardando}
        />
      )}

      {confirmarElim && (
        <ModalConfirm
          mensaje={`¿Eliminar la planta "${confirmarElim.codigo}"? Esta acción no se puede deshacer.`}
          onConfirmar={eliminarPlanta}
          onCancelar={() => setConfirmarElim(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Componente raíz ─────────────────────────────────────────────────────────

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'genetica'; id: string; nombre: string }
  | { tipo: 'lote'; id: string; geneticaId: string; geneticaNombre: string }

export default function Geneticas() {
  const [vista, setVista]           = useState<Vista>({ tipo: 'lista' })
  const [salaFiltro, setSalaFiltro] = useState<SalaFiltro>('')

  function cambiarSala(sala: SalaFiltro) {
    setSalaFiltro(sala)
    setVista({ tipo: 'lista' })
  }

  function irALote(l: Lote) {
    setVista({ tipo: 'lote', id: l.id, geneticaId: l.genetica?.id ?? '', geneticaNombre: l.genetica?.nombre ?? '' })
  }

  function irAGenetica(id: string, nombre: string) {
    setVista({ tipo: 'genetica', id, nombre })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SalaSelector valor={salaFiltro} onChange={cambiarSala} />

        {vista.tipo === 'lista' && !salaFiltro && (
          <VistaLista
            onVerGenetica={g => setVista({ tipo: 'genetica', id: g.id, nombre: g.nombre })}
          />
        )}

        {vista.tipo === 'lista' && salaFiltro && (
          <VistaLotesPorSala
            sala={salaFiltro}
            onVerLote={irALote}
            onVerGenetica={irAGenetica}
          />
        )}

        {vista.tipo === 'genetica' && (
          <VistaGenetica
            geneticaId={vista.id}
            salaFiltro={salaFiltro}
            onVolver={() => setVista({ tipo: 'lista' })}
            onVerLote={irALote}
          />
        )}

        {vista.tipo === 'lote' && (
          <VistaLote
            loteId={vista.id}
            salaFiltro={salaFiltro}
            onVolver={() =>
              setVista({ tipo: 'genetica', id: (vista as Extract<Vista, { tipo: 'lote' }>).geneticaId, nombre: (vista as Extract<Vista, { tipo: 'lote' }>).geneticaNombre })
            }
            onVolverGenetica={() => setVista({ tipo: 'lista' })}
            onVolverSala={() => setVista({ tipo: 'lista' })}
          />
        )}
      </div>
    </div>
  )
}

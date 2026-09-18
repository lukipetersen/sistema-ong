import { useState, useEffect, useCallback } from 'react'
import {
  Plus, ChevronLeft, Leaf, Layers, FlaskConical,
  Pencil, Trash2, AlertCircle, X, ChevronDown,
} from 'lucide-react'
import type { Genetica, LoteGenetica, Lote, LoteDetalle, Planta } from '../types/geneticas'
import {
  ESTADO_LOTE_LABELS, ESTADO_PLANTA_LABELS, SALA_LABELS,
  ESTADO_LOTE_COLOR, ESTADO_PLANTA_COLOR,
} from '../types/geneticas'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

type SalaFiltro = '' | 'SALA_1' | 'SALA_2'
type TabPrincipal = 'lotes' | 'geneticas'

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

// ─── Modal confirmación ──────────────────────────────────────────────────────

function ModalConfirm({ mensaje, onConfirmar, onCancelar, cargando }: {
  mensaje: string; onConfirmar: () => void; onCancelar: () => void; cargando?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
          <p className="text-sm text-gray-700">{mensaje}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={cargando}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {cargando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Lote ──────────────────────────────────────────────────────────────

function ModalNuevoLote({
  geneticasDisponibles, onGuardar, onCerrar, cargando,
}: {
  geneticasDisponibles: Genetica[]
  onGuardar: (data: { sala: string; fechaInicio: string; observaciones: string; geneticaIds: string[]; cantidadPlantas: number }) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [sala, setSala]             = useState('SALA_1')
  const [fechaInicio, setFecha]     = useState(new Date().toISOString().slice(0, 10))
  const [observaciones, setObs]     = useState('')
  const [geneticaIds, setGIds]      = useState<string[]>([])
  const [cantPlantas, setCant]      = useState(0)
  const [error, setError]           = useState('')

  async function submit() {
    if (!sala || !fechaInicio) { setError('Sala y fecha inicio son obligatorios'); return }
    await onGuardar({ sala, fechaInicio, observaciones, geneticaIds, cantidadPlantas: cantPlantas })
  }

  function toggleGenetica(id: string) {
    setGIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo lote</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sala *</label>
              <select value={sala} onChange={e => setSala(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
                {Object.entries(SALA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha inicio *</label>
              <input type="date" value={fechaInicio} onChange={e => setFecha(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Genéticas del lote
            </label>
            <p className="text-xs text-gray-500 mb-2">Seleccioná las variedades que habrá en este lote</p>
            {geneticasDisponibles.length === 0 ? (
              <p className="text-sm text-gray-400">No hay genéticas registradas. Creá una primero.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {geneticasDisponibles.map(g => (
                  <label key={g.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={geneticaIds.includes(g.id)} onChange={() => toggleGenetica(g.id)}
                      className="rounded border-gray-300 text-green-600" />
                    <span className="text-sm text-gray-700">{g.nombre}</span>
                    {g.stockGramos > 0 && <span className="ml-auto text-xs text-amber-600">{g.stockGramos}g stock</span>}
                  </label>
                ))}
              </div>
            )}
            {geneticaIds.length === 0 && <p className="mt-1 text-xs text-amber-600">Recomendado: elegí al menos una genética</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Plantas iniciales por genética (opcional)</label>
            <input type="number" min={0} max={500} value={cantPlantas} onChange={e => setCant(Number(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
            <p className="mt-1 text-xs text-gray-500">
              {geneticaIds.length > 1
                ? `Se distribuirán equitativamente entre ${geneticaIds.length} genéticas`
                : 'Se crearán con códigos automáticos. Podés dejar 0 y agregar plantas después.'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Notas sobre este lote..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={submit} disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Creando...' : 'Crear lote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal editar lote ───────────────────────────────────────────────────────

function ModalEditarLote({ lote, onGuardar, onCerrar, cargando }: {
  lote: Lote
  onGuardar: (data: Record<string, unknown>) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [sala, setSala]           = useState(lote.sala)
  const [fechaInicio, setFecha]   = useState(lote.fechaInicio.slice(0, 10))
  const [fechaFin, setFechaFin]   = useState(lote.fechaFinalizacion?.slice(0, 10) ?? '')
  const [estado, setEstado]       = useState(lote.estado)
  const [obs, setObs]             = useState(lote.observaciones ?? '')

  async function submit() {
    await onGuardar({ sala, fechaInicio, fechaFinalizacion: fechaFin || null, estado, observaciones: obs || null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar lote {lote.codigo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sala</label>
              <select value={sala} onChange={e => setSala(e.target.value as Lote['sala'])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
                {Object.entries(SALA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value as Lote['estado'])}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
                {Object.entries(ESTADO_LOTE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFecha(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha fin</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Genética ──────────────────────────────────────────────────────────

function ModalGenetica({ genetica, onGuardar, onCerrar, cargando }: {
  genetica?: Genetica | null
  onGuardar: (d: { nombre: string; descripcion: string; observaciones: string }) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [nombre, setNombre] = useState(genetica?.nombre ?? '')
  const [desc, setDesc]     = useState(genetica?.descripcion ?? '')
  const [obs, setObs]       = useState(genetica?.observaciones ?? '')
  const [error, setError]   = useState('')

  async function submit() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    await onGuardar({ nombre: nombre.trim(), descripcion: desc, observaciones: obs })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{genetica ? `Editar ${genetica.nombre}` : 'Nueva genética'}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
            <input value={nombre} onChange={e => { setNombre(e.target.value); setError('') }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Ej: OG Kush, Amnesia..." />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Descripción breve..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Notas internas..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Guardando...' : genetica ? 'Guardar cambios' : 'Crear genética'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal agregar genética al lote ─────────────────────────────────────────

function ModalAgregarGenetica({ loteCodigo, geneticasDisponibles, onGuardar, onCerrar, cargando }: {
  loteCodigo: string
  geneticasDisponibles: Genetica[]
  onGuardar: (geneticaId: string) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [geneticaId, setGId] = useState('')
  const [error, setError]    = useState('')

  async function submit() {
    if (!geneticaId) { setError('Seleccioná una genética'); return }
    await onGuardar(geneticaId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Agregar genética a {loteCodigo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Genética</label>
            <div className="relative">
              <select value={geneticaId} onChange={e => { setGId(e.target.value); setError('') }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm appearance-none focus:border-green-500 focus:outline-none">
                <option value="">Seleccioná...</option>
                {geneticasDisponibles.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          {geneticasDisponibles.length === 0 && (
            <p className="text-sm text-gray-500">Todas las genéticas ya están en este lote.</p>
          )}
          <div className="flex gap-3">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={cargando || geneticasDisponibles.length === 0}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal agregar plantas ───────────────────────────────────────────────────

function ModalAgregarPlantas({ loteId, loteCodigo, loteGeneticas, onGuardar, onCerrar, cargando }: {
  loteId: string
  loteCodigo: string
  loteGeneticas: LoteGenetica[]
  onGuardar: (data: { geneticaId: string; cantidad: number }) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [geneticaId, setGId] = useState(loteGeneticas[0]?.geneticaId ?? '')
  const [cantidad, setCant]  = useState(1)
  const [error, setError]    = useState('')

  async function submit() {
    if (!geneticaId) { setError('Seleccioná una genética'); return }
    if (cantidad < 1) { setError('La cantidad debe ser mayor a 0'); return }
    await onGuardar({ geneticaId, cantidad })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Agregar plantas — {loteCodigo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Genética *</label>
            <div className="relative">
              <select value={geneticaId} onChange={e => { setGId(e.target.value); setError('') }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm appearance-none focus:border-green-500 focus:outline-none">
                <option value="">Seleccioná...</option>
                {loteGeneticas.map(lg => (
                  <option key={lg.geneticaId} value={lg.geneticaId}>{lg.genetica.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad *</label>
            <input type="number" min={1} max={500} value={cantidad} onChange={e => setCant(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
            <p className="mt-1 text-xs text-gray-500">Los códigos se generan automáticamente para el lote {loteCodigo}</p>
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={submit} disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Creando...' : 'Agregar plantas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal editar planta ─────────────────────────────────────────────────────

function ModalEditarPlanta({ planta, onGuardar, onCerrar, cargando }: {
  planta: Planta
  onGuardar: (d: { alias: string | null; estado: string }) => Promise<void>
  onCerrar: () => void
  cargando: boolean
}) {
  const [alias, setAlias]   = useState(planta.alias ?? '')
  const [estado, setEstado] = useState(planta.estado)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Editar {planta.codigo}</h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Alias</label>
            <input value={alias} onChange={e => setAlias(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              placeholder="Madre 1, Seleccionada A..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as Planta['estado'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
              {Object.entries(ESTADO_PLANTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={onCerrar} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onGuardar({ alias: alias.trim() || null, estado })} disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Vista: Detalle de Lote ──────────────────────────────────────────────────

function VistaLoteDetalle({
  loteId, todasGeneticas, onVolver,
}: {
  loteId: string
  todasGeneticas: Genetica[]
  onVolver: () => void
}) {
  const [data, setData]                 = useState<LoteDetalle | null>(null)
  const [cargando, setCargando]         = useState(true)
  const [filtroGenetica, setFiltroGen]  = useState('')
  const [error, setError]               = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [eliminando, setEliminando]     = useState(false)

  const [modalAgregarGen, setModalAG]   = useState(false)
  const [modalAgregarPl, setModalAP]    = useState(false)
  const [modalEditarPl, setModalEP]     = useState<Planta | null>(null)
  const [confirmarElimPl, setConfPl]    = useState<Planta | null>(null)
  const [confirmarElimGen, setConfGen]  = useState<LoteGenetica | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${loteId}`, { headers: authHeaders() })
      const d = await r.json()
      setData(d)
    } catch { setError('Error al cargar el lote') }
    finally  { setCargando(false) }
  }, [loteId])

  useEffect(() => { cargar() }, [cargar])

  if (cargando) return <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
  if (!data)    return <div className="py-16 text-center text-red-500">{error || 'Lote no encontrado'}</div>

  const geneticasEnLote    = new Set(data.loteGeneticas.map(lg => lg.geneticaId))
  const geneticasNoEnLote  = todasGeneticas.filter(g => !geneticasEnLote.has(g.id))
  const plantasFiltradas   = filtroGenetica
    ? data.plantas.filter(p => p.geneticaId === filtroGenetica)
    : data.plantas

  async function agregarGenetica(geneticaId: string) {
    setGuardando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${loteId}/geneticas`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ geneticaId }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalAG(false)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setGuardando(false) }
  }

  async function quitarGenetica(gen: LoteGenetica) {
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${loteId}/geneticas/${gen.geneticaId}`, {
        method: 'DELETE', headers: authHeaders(),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfGen(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setEliminando(false) }
  }

  async function agregarPlantas({ geneticaId, cantidad }: { geneticaId: string; cantidad: number }) {
    setGuardando(true)
    try {
      const promesas = Array.from({ length: cantidad }, () =>
        fetch(`${API}/api/plantas`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ loteId, geneticaId }),
        })
      )
      await Promise.all(promesas)
      setModalAP(false)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear plantas')
    } finally { setGuardando(false) }
  }

  async function editarPlanta(planta: Planta, datos: { alias: string | null; estado: string }) {
    setGuardando(true)
    try {
      const r = await fetch(`${API}/api/plantas/${planta.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(datos),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalEP(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setGuardando(false) }
  }

  async function eliminarPlanta(planta: Planta) {
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/plantas/${planta.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfPl(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setEliminando(false) }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5">
        <button onClick={onVolver} className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-700 mb-3">
          <ChevronLeft className="h-4 w-4" /> Volver a lotes
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 font-mono">{data.codigo}</h2>
          <BadgeLote estado={data.estado} />
          <span className="text-sm text-gray-500">{SALA_LABELS[data.sala]}</span>
          <span className="text-sm text-gray-400">·</span>
          <span className="text-sm text-gray-500">{new Date(data.fechaInicio).toLocaleDateString('es-AR')}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Sección: Genéticas en este lote */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Genéticas en este lote</h3>
          <button
            onClick={() => setModalAG(true)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </button>
        </div>
        {data.loteGeneticas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay genéticas en este lote.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.loteGeneticas.map(lg => (
              <div key={lg.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{lg.genetica.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {lg.totalPlantas ?? 0} plantas
                    {lg.stockGramos > 0 && ` · ${lg.stockGramos}g`}
                  </p>
                </div>
                <button
                  onClick={() => setConfGen(lg)}
                  title="Quitar genética"
                  className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección: Plantas */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Plantas ({data.plantas.length})</h3>
          <div className="flex items-center gap-2">
            {/* Filtro por genética */}
            {data.loteGeneticas.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFiltroGen('')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${!filtroGenetica ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Todas ({data.plantas.length})
                </button>
                {data.loteGeneticas.map(lg => (
                  <button
                    key={lg.geneticaId}
                    onClick={() => setFiltroGen(filtroGenetica === lg.geneticaId ? '' : lg.geneticaId)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${filtroGenetica === lg.geneticaId ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                  >
                    {lg.genetica.nombre} ({data.plantas.filter(p => p.geneticaId === lg.geneticaId).length})
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setModalAP(true)}
              disabled={data.loteGeneticas.length === 0}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar plantas
            </button>
          </div>
        </div>

        {plantasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <FlaskConical className="h-10 w-10 opacity-30" />
            <p className="text-sm">{data.plantas.length === 0 ? 'No hay plantas en este lote.' : 'Sin plantas con ese filtro.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Genética</th>
                  <th className="px-4 py-3 text-left">Alias</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Creada</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plantasFiltradas.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 text-xs">{p.codigo}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        {p.genetica.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.alias ?? '—'}</td>
                    <td className="px-4 py-3"><BadgePlanta estado={p.estado} /></td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {new Date(p.creadoEn).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModalEP(p)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfPl(p)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
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
                  <span className="ml-auto text-gray-400">{new Date(h.creadoEn).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      {modalAgregarGen && (
        <ModalAgregarGenetica
          loteCodigo={data.codigo}
          geneticasDisponibles={geneticasNoEnLote}
          onGuardar={agregarGenetica}
          onCerrar={() => setModalAG(false)}
          cargando={guardando}
        />
      )}

      {modalAgregarPl && (
        <ModalAgregarPlantas
          loteId={loteId}
          loteCodigo={data.codigo}
          loteGeneticas={data.loteGeneticas}
          onGuardar={agregarPlantas}
          onCerrar={() => setModalAP(false)}
          cargando={guardando}
        />
      )}

      {modalEditarPl && (
        <ModalEditarPlanta
          planta={modalEditarPl}
          onGuardar={(d) => editarPlanta(modalEditarPl, d)}
          onCerrar={() => setModalEP(null)}
          cargando={guardando}
        />
      )}

      {confirmarElimPl && (
        <ModalConfirm
          mensaje={`¿Eliminar la planta "${confirmarElimPl.codigo}"?`}
          onConfirmar={() => eliminarPlanta(confirmarElimPl)}
          onCancelar={() => setConfPl(null)}
          cargando={eliminando}
        />
      )}

      {confirmarElimGen && (
        <ModalConfirm
          mensaje={`¿Quitar "${confirmarElimGen.genetica.nombre}" de este lote? Solo es posible si no tiene plantas.`}
          onConfirmar={() => quitarGenetica(confirmarElimGen)}
          onCancelar={() => setConfGen(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Tab: Lotes ──────────────────────────────────────────────────────────────

function TabLotes({ todasGeneticas }: { todasGeneticas: Genetica[] }) {
  const [lotes, setLotes]           = useState<Lote[]>([])
  const [cargando, setCargando]     = useState(true)
  const [salaFiltro, setSala]       = useState<SalaFiltro>('')
  const [error, setError]           = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [editarLote, setEditar]     = useState<Lote | null>(null)
  const [confirmarElim, setConfirm] = useState<Lote | null>(null)
  const [verDetalle, setVerDetalle] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const qs = salaFiltro ? `?sala=${salaFiltro}&limit=500` : '?limit=500'
      const r = await fetch(`${API}/api/lotes${qs}`, { headers: authHeaders() })
      const d = await r.json()
      setLotes(Array.isArray(d.lotes) ? d.lotes : [])
    } catch { setError('Error al cargar lotes') }
    finally  { setCargando(false) }
  }, [salaFiltro])

  useEffect(() => { cargar() }, [cargar])

  if (verDetalle) {
    return (
      <VistaLoteDetalle
        loteId={verDetalle}
        todasGeneticas={todasGeneticas}
        onVolver={() => { setVerDetalle(null); cargar() }}
      />
    )
  }

  async function crearLote(data: { sala: string; fechaInicio: string; observaciones: string; geneticaIds: string[]; cantidadPlantas: number }) {
    setGuardando(true)
    try {
      const r = await fetch(`${API}/api/lotes`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalNuevo(false)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear lote')
    } finally { setGuardando(false) }
  }

  async function actualizarLote(datos: Record<string, unknown>) {
    if (!editarLote) return
    setGuardando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${editarLote.id}`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify(datos),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setEditar(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar lote')
    } finally { setGuardando(false) }
  }

  async function eliminarLote() {
    if (!confirmarElim) return
    setEliminando(true)
    try {
      const r = await fetch(`${API}/api/lotes/${confirmarElim.id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setConfirm(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar lote')
    } finally { setEliminando(false) }
  }

  const lotesActivos = lotes.filter(l => ['PRODUCCION', 'ACTIVO'].includes(l.estado)).length
  const totalPlantas = lotes.reduce((s, l) => s + l.totalPlantas, 0)

  return (
    <div>
      {/* Filtros sala */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {(['', 'SALA_1', 'SALA_2'] as SalaFiltro[]).map(s => (
          <button
            key={s}
            onClick={() => setSala(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              salaFiltro === s
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Todas las salas' : SALA_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Stats rápidas */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-gray-900">{lotes.length}</p>
          <p className="text-xs text-gray-500">Lotes</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-green-700">{lotesActivos}</p>
          <p className="text-xs text-gray-500">Activos</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-gray-900">{totalPlantas}</p>
          <p className="text-xs text-gray-500">Plantas</p>
        </div>
      </div>

      {/* Header + botón */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          {lotes.length} lote{lotes.length !== 1 ? 's' : ''}
          {salaFiltro ? ` en ${SALA_LABELS[salaFiltro]}` : ''}
        </h2>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nuevo lote
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
      ) : lotes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Layers className="h-12 w-12 opacity-30" />
          <p>No hay lotes{salaFiltro ? ` en ${SALA_LABELS[salaFiltro]}` : ''}.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lotes.map(l => (
            <div key={l.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-gray-900">{l.codigo}</span>
                  <BadgeLote estado={l.estado} />
                  <span className="text-xs text-gray-400">{SALA_LABELS[l.sala]}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditar(l)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirm(l)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Chips de genéticas */}
              {l.loteGeneticas.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1">
                  {l.loteGeneticas.map(lg => {
                    const plantasDeGen = l.plantas?.filter((p: { geneticaId: string }) => p.geneticaId === lg.geneticaId)?.length ?? 0
                    return (
                      <span key={lg.id} className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                        {lg.genetica?.nombre ?? ''}
                        {l.totalPlantas > 0 && <span className="ml-1 text-green-600">· {plantasDeGen} pl.</span>}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="mb-3 text-xs text-gray-400 italic">Sin genéticas asignadas</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{l.totalPlantas}</span> plantas
                  {l.plantasActivas > 0 && <span className="ml-1.5 text-green-600">({l.plantasActivas} activas)</span>}
                </div>
                <button
                  onClick={() => setVerDetalle(l.id)}
                  className="flex items-center gap-1 text-xs text-green-700 hover:underline font-medium"
                >
                  Ver detalle →
                </button>
              </div>

              {l.observaciones && (
                <p className="mt-2 text-xs text-gray-400 line-clamp-1">{l.observaciones}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalNuevo && (
        <ModalNuevoLote
          geneticasDisponibles={todasGeneticas}
          onGuardar={crearLote}
          onCerrar={() => setModalNuevo(false)}
          cargando={guardando}
        />
      )}

      {editarLote && (
        <ModalEditarLote
          lote={editarLote}
          onGuardar={actualizarLote}
          onCerrar={() => setEditar(null)}
          cargando={guardando}
        />
      )}

      {confirmarElim && (
        <ModalConfirm
          mensaje={`¿Eliminar el lote "${confirmarElim.codigo}"? Solo es posible si no tiene plantas.`}
          onConfirmar={eliminarLote}
          onCancelar={() => setConfirm(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Tab: Genéticas ──────────────────────────────────────────────────────────

function TabGeneticas() {
  const [geneticas, setGeneticas]       = useState<Genetica[]>([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [modalGenetica, setModalGen]    = useState<{ abierto: boolean; genetica?: Genetica | null }>({ abierto: false })
  const [confirmarElim, setConfirmar]   = useState<Genetica | null>(null)
  const [guardando, setGuardando]       = useState(false)
  const [eliminando, setEliminando]     = useState(false)
  const [error, setError]               = useState('')

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

  async function guardarGenetica(data: { nombre: string; descripcion: string; observaciones: string }) {
    setGuardando(true)
    try {
      const url    = modalGenetica.genetica ? `${API}/api/geneticas/${modalGenetica.genetica.id}` : `${API}/api/geneticas`
      const method = modalGenetica.genetica ? 'PUT' : 'POST'
      const r      = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      setModalGen({ abierto: false })
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
      setConfirmar(null)
      cargar()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally { setEliminando(false) }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {geneticas.length} variedad{geneticas.length !== 1 ? 'es' : ''} registradas
          </h2>
        </div>
        <button
          onClick={() => setModalGen({ abierto: true, genetica: null })}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" /> Nueva genética
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar genética..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-gray-400">Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Leaf className="h-12 w-12 opacity-30" />
          <p>{busqueda ? 'Sin resultados.' : 'No hay genéticas registradas aún.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-right">Lotes activos</th>
                <th className="px-4 py-3 text-right">Plantas activas</th>
                <th className="px-4 py-3 text-right">Stock total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{g.nombre}</p>
                    {g.descripcion && <p className="text-xs text-gray-400">{g.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{g.lotesActivos}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{g.plantasActivas}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    g.stockGramos < 0 ? 'text-red-600' : g.stockGramos === 0 ? 'text-gray-400' : 'text-amber-700'
                  }`}>
                    {g.stockGramos >= 1000
                      ? `${(g.stockGramos / 1000).toFixed(1).replace(/\.0$/, '')} kg`
                      : `${g.stockGramos} g`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setModalGen({ abierto: true, genetica: g })}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmar(g)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
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

      {modalGenetica.abierto && (
        <ModalGenetica
          genetica={modalGenetica.genetica}
          onGuardar={guardarGenetica}
          onCerrar={() => setModalGen({ abierto: false })}
          cargando={guardando}
        />
      )}

      {confirmarElim && (
        <ModalConfirm
          mensaje={`¿Eliminar la genética "${confirmarElim.nombre}"? Solo es posible si no tiene lotes ni plantas.`}
          onConfirmar={eliminarGenetica}
          onCancelar={() => setConfirmar(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}

// ─── Componente raíz ─────────────────────────────────────────────────────────

export default function Trazabilidad() {
  const [tab, setTab]                 = useState<TabPrincipal>('lotes')
  const [todasGeneticas, setGeneticas] = useState<Genetica[]>([])

  // Cargar genéticas globales para uso en subcomponentes
  const cargarGeneticas = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/geneticas`, { headers: authHeaders() })
      const d = await r.json()
      if (Array.isArray(d)) setGeneticas(d)
    } catch {
      // silencio
    }
  }, [])

  useEffect(() => { cargarGeneticas() }, [cargarGeneticas])

  return (
    <div>
      {/* Tabs principales */}
      <div className="mb-6 flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {([['lotes', 'Lotes'], ['geneticas', 'Genéticas']] as [TabPrincipal, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'geneticas') cargarGeneticas() }}
            className={`px-5 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lotes'     && <TabLotes todasGeneticas={todasGeneticas} />}
      {tab === 'geneticas' && <TabGeneticas />}
    </div>
  )
}

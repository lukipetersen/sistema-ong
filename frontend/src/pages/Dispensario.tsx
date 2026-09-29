import { useState, useEffect, useCallback } from 'react'
import { Plus, X, AlertCircle, Loader2, Pencil, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Genetica { id: string; nombre: string; stockGramos: number }
interface Asociado { id: string; nombre: string; apellido: string }
interface Lote     { id: string; codigo: string; nombre: string }

interface Movimiento {
  id: string
  tipo: 'INGRESO' | 'EGRESO'
  cantidadGramos: number
  fecha: string
  observaciones: string | null
  genetica: { id: string; nombre: string }
  lote: { id: string; codigo: string; nombre: string } | null
  asociado: { id: string; nombre: string; apellido: string } | null
  usuario: { id: string; nombre: string; apellido: string } | null
}

// ─── Modal Movimiento ─────────────────────────────────────────────────────────

function ModalMovimiento({
  editar,
  geneticas,
  puedeIngreso,
  onGuardar,
  onCerrar,
}: {
  editar?: Movimiento
  geneticas: Genetica[]
  puedeIngreso: boolean
  onGuardar: () => void
  onCerrar: () => void
}) {
  const [geneticaId,  setGeneticaId]  = useState(editar?.genetica.id ?? '')
  const [tipo,        setTipo]        = useState<'INGRESO' | 'EGRESO'>(editar?.tipo ?? 'EGRESO')
  const [cantidad,    setCantidad]    = useState(editar ? String(editar.cantidadGramos) : '')
  const [unidad,      setUnidad]      = useState<'g' | 'kg'>('g')
  const [fecha,       setFecha]       = useState(editar ? editar.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [obs,         setObs]         = useState(editar?.observaciones ?? '')
  const [asociadoId,  setAsociadoId]  = useState(editar?.asociado?.id ?? '')
  const [loteId,      setLoteId]      = useState(editar?.lote?.id ?? '')
  const [lotes,       setLotes]       = useState<Lote[]>([])
  const [asociados,   setAsociados]   = useState<Asociado[]>([])
  const [guardando,   setGuardando]   = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    api.get<Asociado[]>('/asociados?limit=500').then(r => {
      const arr = Array.isArray(r.data) ? r.data : (r.data as { asociados?: Asociado[] }).asociados ?? []
      setAsociados(arr)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!geneticaId) { setLotes([]); return }
    api.get<{ lotes: Lote[] }>(`/lotes?geneticaId=${geneticaId}`).then(r => setLotes(r.data.lotes ?? [])).catch(() => {})
  }, [geneticaId])

  async function guardar() {
    if (!geneticaId) { setError('Seleccioná una genética'); return }
    if (!cantidad || Number(cantidad) <= 0) { setError('La cantidad debe ser mayor a 0'); return }
    if (!fecha) { setError('Ingresá la fecha'); return }

    const gramos = unidad === 'kg' ? Math.round(Number(cantidad) * 1000) : Math.round(Number(cantidad))
    setGuardando(true); setError('')
    try {
      const body = { geneticaId, tipo, cantidadGramos: gramos, fecha, observaciones: obs || null, asociadoId: asociadoId || null, loteId: loteId || null }
      if (editar) {
        await api.put(`/dispensario/${editar.id}`, body)
      } else {
        await api.post('/dispensario', body)
      }
      onGuardar()
      onCerrar()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const stockGenetica = geneticas.find(g => g.id === geneticaId)?.stockGramos ?? null

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E0]">
          <h2 className="font-semibold text-slate-900">{editar ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tipo */}
          {!editar && (
            <div className="flex gap-3">
              {(['EGRESO', ...(puedeIngreso ? ['INGRESO'] : [])] as ('INGRESO' | 'EGRESO')[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    tipo === t
                      ? t === 'EGRESO' ? 'border-red-500 bg-red-50 text-red-700' : 'border-[#4a7030] bg-[#edf5e0] text-[#4a7030]'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          )}
          {editar && (
            <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${editar.tipo === 'INGRESO' ? 'bg-[#edf5e0] text-[#4a7030]' : 'bg-red-50 text-red-700'}`}>
              {editar.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
            </div>
          )}

          {/* Genética */}
          {!editar && (
            <div>
              <label className="etiqueta">Genética *</label>
              <select value={geneticaId} onChange={e => { setGeneticaId(e.target.value); setLoteId('') }} className="campo">
                <option value="">Seleccioná una genética</option>
                {geneticas.map(g => (
                  <option key={g.id} value={g.id}>{g.nombre} ({g.stockGramos >= 1000 ? `${(g.stockGramos / 1000).toFixed(2)} kg` : `${g.stockGramos} g`})</option>
                ))}
              </select>
            </div>
          )}
          {editar && (
            <div>
              <label className="etiqueta">Genética</label>
              <p className="text-sm text-slate-700 font-medium">{editar.genetica.nombre}</p>
            </div>
          )}

          {stockGenetica !== null && (
            <p className="text-xs text-slate-500">
              Stock actual: <span className={`font-semibold ${stockGenetica <= 0 ? 'text-red-600' : 'text-[#4a7030]'}`}>
                {stockGenetica >= 1000 ? `${(stockGenetica / 1000).toFixed(2)} kg` : `${stockGenetica} g`}
              </span>
            </p>
          )}

          {/* Cantidad */}
          <div>
            <label className="etiqueta">Cantidad *</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="campo flex-1"
                placeholder="0"
              />
              <div className="flex rounded-lg border border-[#E0DEDA] overflow-hidden text-sm">
                {(['g', 'kg'] as ('g' | 'kg')[]).map(u => (
                  <button key={u} onClick={() => setUnidad(u)} className={`px-3 py-2 font-medium transition-colors ${unidad === u ? 'bg-[#1a1814] text-[#FEF8DC]' : 'text-slate-500 hover:bg-slate-50'}`}>{u}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="etiqueta">Fecha *</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="campo" />
          </div>

          {/* Asociado */}
          <div>
            <label className="etiqueta">Asociado</label>
            <select value={asociadoId} onChange={e => setAsociadoId(e.target.value)} className="campo">
              <option value="">Sin asociado</option>
              {asociados.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
            </select>
          </div>

          {/* Lote */}
          {lotes.length > 0 && (
            <div>
              <label className="etiqueta">Lote</label>
              <select value={loteId} onChange={e => setLoteId(e.target.value)} className="campo">
                <option value="">Sin lote</option>
                {lotes.map(l => <option key={l.id} value={l.id}>{l.codigo} {l.nombre ? `— ${l.nombre}` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="etiqueta">Observaciones</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} className="campo resize-none" rows={2} placeholder="Opcional..." />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cancelar</button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-2.5 text-sm rounded-xl bg-[#1a1814] text-[#FEF8DC] font-medium hover:bg-[#26221a] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Detalle ────────────────────────────────────────────────────────────

function ModalDetalle({ mov, onCerrar }: { mov: Movimiento; onCerrar: () => void }) {
  const gramos = mov.cantidadGramos
  const display = gramos >= 1000 ? `${(gramos / 1000).toFixed(3)} kg` : `${gramos} g`

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E0]">
          <h2 className="font-semibold text-slate-900">Detalle</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className={`font-semibold ${mov.tipo === 'INGRESO' ? 'text-[#4a7030]' : 'text-red-600'}`}>{mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Genética</span><span className="font-medium text-slate-800">{mov.genetica.nombre}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Cantidad</span><span className="font-semibold text-slate-800">{display}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Fecha</span><span className="text-slate-700">{new Date(mov.fecha).toLocaleDateString('es-AR')}</span></div>
          {mov.asociado && <div className="flex justify-between"><span className="text-slate-500">Asociado</span><span className="text-slate-700">{mov.asociado.nombre} {mov.asociado.apellido}</span></div>}
          {mov.lote && <div className="flex justify-between"><span className="text-slate-500">Lote</span><span className="text-slate-700">{mov.lote.codigo}</span></div>}
          {mov.usuario && <div className="flex justify-between"><span className="text-slate-500">Registrado por</span><span className="text-slate-700">{mov.usuario.nombre} {mov.usuario.apellido}</span></div>}
          {mov.observaciones && <div><p className="text-slate-500 mb-0.5">Observaciones</p><p className="text-slate-700 bg-slate-50 rounded-lg p-2.5">{mov.observaciones}</p></div>}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onCerrar} className="w-full py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const LIMIT = 30

export default function Dispensario() {
  const { usuario } = useAuth()
  const esAdmin       = usuario?.rol === 'ADMINISTRADOR'
  const puedeIngreso  = esAdmin || (usuario?.modulosPermitidos ?? []).includes('/dispensario:ingresos')

  const [movimientos,   setMovimientos]   = useState<Movimiento[]>([])
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(1)
  const [geneticas,     setGeneticas]     = useState<Genetica[]>([])
  const [filtroGen,     setFiltroGen]     = useState('')
  const [filtroTipo,    setFiltroTipo]    = useState('')
  const [filtroMes,     setFiltroMes]     = useState('')
  const [cargando,      setCargando]      = useState(true)

  const [modal, setModal] = useState<
    | { tipo: 'nuevo' }
    | { tipo: 'editar'; mov: Movimiento }
    | { tipo: 'detalle'; mov: Movimiento }
    | { tipo: 'borrar'; mov: Movimiento }
    | null
  >(null)
  const [borrando, setBorrando] = useState(false)

  useEffect(() => {
    api.get<Genetica[]>('/geneticas').then(r => setGeneticas(r.data ?? [])).catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (filtroGen)  params.set('geneticaId', filtroGen)
      if (filtroTipo) params.set('tipo', filtroTipo)
      if (filtroMes)  params.set('mes', filtroMes)
      const { data } = await api.get<{ movimientos: Movimiento[]; total: number }>(`/dispensario?${params}`)
      setMovimientos(data.movimientos ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setCargando(false)
    }
  }, [page, filtroGen, filtroTipo, filtroMes])

  useEffect(() => { cargar() }, [cargar])

  // Estadísticas del mes actual
  const mesActual = new Date().toISOString().slice(0, 7)
  const [statsIngreso, setStatsIngreso] = useState(0)
  const [statsEgreso,  setStatsEgreso]  = useState(0)

  useEffect(() => {
    api.get<{ movimientos: Movimiento[] }>(`/dispensario?mes=${mesActual}&limit=500`).then(({ data }) => {
      const movs = data.movimientos ?? []
      setStatsIngreso(movs.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.cantidadGramos, 0))
      setStatsEgreso(movs.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + m.cantidadGramos, 0))
    }).catch(() => {})
  }, [mesActual])

  const totalPages = Math.ceil(total / LIMIT)

  function resetFiltros() { setFiltroGen(''); setFiltroTipo(''); setFiltroMes(''); setPage(1) }

  async function borrar(mov: Movimiento) {
    setBorrando(true)
    try {
      await api.delete(`/dispensario/${mov.id}`)
      setModal(null)
      cargar()
    } finally {
      setBorrando(false)
    }
  }

  function fmt(g: number) { return g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g} g` }

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1814]">Dispensario</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {puedeIngreso ? 'Registrá ingresos y egresos' : 'Registrá egresos de stock'}
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'nuevo' })}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1814] text-[#FEF8DC] rounded-xl text-sm font-medium hover:bg-[#26221a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {puedeIngreso ? 'Nuevo movimiento' : 'Registrar egreso'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total en stock', valor: geneticas.reduce((s, g) => s + g.stockGramos, 0), color: 'text-[#1a1814]' },
          { label: 'Ingresos del mes', valor: statsIngreso, color: 'text-[#4a7030]' },
          { label: 'Egresos del mes', valor: statsEgreso, color: 'text-red-600' },
        ].map(({ label, valor, color }) => (
          <div key={label} className="tarjeta p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{fmt(valor)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroGen} onChange={e => { setFiltroGen(e.target.value); setPage(1) }} className="campo max-w-[180px] text-sm">
          <option value="">Todas las genéticas</option>
          {geneticas.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1) }} className="campo w-36 text-sm">
          <option value="">Todos los tipos</option>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
        </select>
        <input type="month" value={filtroMes} onChange={e => { setFiltroMes(e.target.value); setPage(1) }} className="campo w-40 text-sm" />
        {(filtroGen || filtroTipo || filtroMes) && (
          <button onClick={resetFiltros} className="text-sm text-slate-500 hover:text-[#1a1814] px-2">Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="tarjeta overflow-hidden">
        {cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No hay movimientos</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E6E0] bg-[#F5F4F2]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Genética</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cantidad</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Asociado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Fecha</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EEEA]">
                  {movimientos.map(mov => (
                    <tr key={mov.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          mov.tipo === 'INGRESO' ? 'bg-[#edf5e0] text-[#4a7030]' : 'bg-red-50 text-red-700'
                        }`}>
                          {mov.tipo === 'INGRESO' ? '↑ Ingreso' : '↓ Egreso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{mov.genetica.nombre}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{fmt(mov.cantidadGramos)}</td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                        {mov.asociado ? `${mov.asociado.nombre} ${mov.asociado.apellido}` : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {new Date(mov.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal({ tipo: 'detalle', mov })} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#4a7030] hover:bg-[#f0f7e8] transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {esAdmin && (
                            <>
                              <button onClick={() => setModal({ tipo: 'editar', mov })} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setModal({ tipo: 'borrar', mov })} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E6E0]">
                <span className="text-xs text-slate-500">{total} movimientos</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E0DEDA] text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-slate-600">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E0DEDA] text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {modal?.tipo === 'nuevo' && (
        <ModalMovimiento geneticas={geneticas} puedeIngreso={puedeIngreso} onGuardar={cargar} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && (
        <ModalMovimiento editar={modal.mov} geneticas={geneticas} puedeIngreso={puedeIngreso} onGuardar={cargar} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === 'detalle' && (
        <ModalDetalle mov={modal.mov} onCerrar={() => setModal(null)} />
      )}

      {/* Confirm borrar */}
      {modal?.tipo === 'borrar' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="font-medium text-slate-900 text-sm mb-2">¿Eliminar movimiento?</p>
            <p className="text-sm text-slate-500 mb-5">
              {modal.mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} de {fmt(modal.mov.cantidadGramos)} de {modal.mov.genetica.nombre}.
              Esta acción revierte el stock y no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cancelar</button>
              <button
                onClick={() => borrar(modal.mov)}
                disabled={borrando}
                className="flex-1 py-2.5 text-sm rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {borrando ? <><Loader2 className="w-4 h-4 animate-spin" />Eliminando...</> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

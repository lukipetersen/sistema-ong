import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { api } from '@/lib/api'
import { Asociado, PATOLOGIAS, LABEL_ESTADO, LABEL_CUOTA, LABEL_PATOLOGIA } from '@/types/asociados'

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'UTC' })

export default function ListaAsociados() {
  const navigate = useNavigate()
  const [asociados, setAsociados] = useState<Asociado[]>([])
  const [total, setTotal]         = useState(0)
  const [cargando, setCargando]   = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [q, setQ]                 = useState('')
  const [estado, setEstado]       = useState('')
  const [patologia, setPatologia] = useState('')
  const [estadoCuota, setEstadoCuota] = useState('')
  const [page, setPage]           = useState(1)
  const LIMIT = 20

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT }
      if (q)           params.q           = q
      if (estado)      params.estado      = estado
      if (patologia)   params.patologia   = patologia
      if (estadoCuota) params.estadoCuota = estadoCuota
      const { data } = await api.get('/asociados', { params })
      setAsociados(data.asociados)
      setTotal(data.total)
    } finally {
      setCargando(false)
    }
  }, [q, estado, patologia, estadoCuota, page])

  useEffect(() => { cargar() }, [cargar])

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    setQ(busqueda)
    setPage(1)
  }

  function limpiarFiltros() {
    setBusqueda(''); setQ(''); setEstado(''); setPatologia(''); setEstadoCuota(''); setPage(1)
  }

  const totalPags = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">

      {/* Barra superior */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div className="space-y-3 flex-1 min-w-0">
          {/* Búsqueda */}
          <form onSubmit={buscar} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre, apellido, DNI, teléfono..."
                className="campo pl-9 w-full"
              />
            </div>
            <button type="submit" className="btn-primario px-4 py-2">Buscar</button>
          </form>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select value={estado} onChange={e => { setEstado(e.target.value); setPage(1) }} className="campo py-1.5 text-sm">
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
            <select value={patologia} onChange={e => { setPatologia(e.target.value); setPage(1) }} className="campo py-1.5 text-sm">
              <option value="">Todas las patologías</option>
              {PATOLOGIAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={estadoCuota} onChange={e => { setEstadoCuota(e.target.value); setPage(1) }} className="campo py-1.5 text-sm">
              <option value="">Todas las cuotas</option>
              <option value="AL_DIA">Al día</option>
              <option value="VENCIDA">Vencida</option>
              <option value="PENDIENTE">Pendiente</option>
            </select>
            {(q || estado || patologia || estadoCuota) && (
              <button onClick={limpiarFiltros} className="text-sm text-slate-500 hover:text-slate-700 underline">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <button onClick={() => navigate('/asociados/nuevo')} className="btn-primario flex items-center gap-2 px-4 py-2 shrink-0">
          <Plus className="w-4 h-4" /> Nuevo asociado
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando...</div>
        ) : asociados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
            <User className="w-8 h-8 opacity-40" />
            <p className="text-sm">{q ? 'No se encontraron resultados.' : 'No hay asociados registrados.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asociado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">DNI</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Patología</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Alta</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {asociados.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/asociados/${a.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <span className="text-slate-600 text-xs font-semibold">
                            {a.nombre[0]}{a.apellido[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{a.apellido}, {a.nombre}</p>
                          {a._count && a._count.seguimientos > 0 && (
                            <p className="text-xs text-slate-400">{a._count.seguimientos} seguimiento{a._count.seguimientos > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.dni}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{a.telefono ?? '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.patologia ? <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">{LABEL_PATOLOGIA[a.patologia]}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{fecha(a.fechaAlta)}</td>
                    <td className="px-4 py-3"><BadgeEstado e={a.estado} /></td>
                    <td className="px-4 py-3"><BadgeCuota c={a.estadoCuota} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= totalPags} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-right">{total} asociado{total !== 1 ? 's' : ''} en total</p>
    </div>
  )
}

export function BadgeEstado({ e }: { e: string }) {
  const estilos: Record<string, string> = {
    ACTIVO:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDIENTE:'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVO: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estilos[e] ?? ''}`}>{LABEL_ESTADO[e as keyof typeof LABEL_ESTADO]}</span>
}

export function BadgeCuota({ c }: { c: string }) {
  const estilos: Record<string, string> = {
    AL_DIA:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARCIAL:  'bg-blue-50 text-blue-700 border-blue-200',
    VENCIDA:  'bg-red-50 text-red-700 border-red-200',
    PENDIENTE:'bg-amber-50 text-amber-700 border-amber-200',
  }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estilos[c] ?? ''}`}>{LABEL_CUOTA[c as keyof typeof LABEL_CUOTA]}</span>
}

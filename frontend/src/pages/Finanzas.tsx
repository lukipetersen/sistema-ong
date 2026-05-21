import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import {
  Gasto, ResumenGastos, CATEGORIAS, SUBCATEGORIAS, MEDIOS_PAGO,
  CategoriaGasto, SubcategoriaGasto, MedioPago, EstadoGasto,
} from '@/types/gastos'
import ModalGasto from '@/components/gastos/ModalGasto'

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const mesActual = () => {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const LABEL_CAT: Record<string, string> = {
  FIJOS: 'Fijos', VARIABLES: 'Variables', ADMINISTRACION: 'Administración', INVERSION: 'Inversión',
}
const LABEL_SUB: Record<string, string> = {
  ALQUILER: 'Alquiler', INSUMOS: 'Insumos', SUELDOS: 'Sueldos',
  SERVICIOS: 'Servicios', MANTENIMIENTO: 'Mantenimiento', OTROS: 'Otros',
}
const LABEL_MEDIO: Record<string, string> = {
  EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia',
  TARJETA_DEBITO: 'Déb.', TARJETA_CREDITO: 'Cred.', CHEQUE: 'Cheque',
}

export default function Finanzas() {
  const [gastos, setGastos]     = useState<Gasto[]>([])
  const [resumen, setResumen]   = useState<ResumenGastos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mes, setMes]           = useState(mesActual())
  const [filtrocat, setFiltrocat] = useState('')
  const [filtroest, setFiltroest] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [gastoEditar, setGastoEditar]   = useState<Gasto | null>(null)
  const [confirmElim, setConfirmElim]   = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params: Record<string, string> = { mes, limit: '200' }
      if (filtrocat) params.categoria = filtrocat
      if (filtroest) params.estado    = filtroest
      const [gRes, rRes] = await Promise.all([
        api.get('/gastos', { params }),
        api.get('/gastos/resumen', { params: { mes } }),
      ])
      setGastos(gRes.data.gastos)
      setResumen(rRes.data)
    } finally {
      setCargando(false)
    }
  }, [mes, filtrocat, filtroest])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(id: string) {
    await api.delete(`/gastos/${id}`)
    setConfirmElim(null)
    cargar()
  }

  function abrirEditar(g: Gasto) { setGastoEditar(g); setModalAbierto(true) }
  function abrirNuevo()           { setGastoEditar(null); setModalAbierto(true) }
  function cerrarModal()          { setModalAbierto(false); setGastoEditar(null) }

  const mesesDisp = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, i, 1)
    return {
      value: `2026-${String(i + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }
  })

  return (
    <div className="space-y-6">

      {/* ── Resumen ── */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tarjeta titulo="Total del mes"  valor={ars(resumen.total)}     color="slate" />
          <Tarjeta titulo="Gastos fijos"   valor={ars(resumen.totalFijos)} color="blue"  />
          <Tarjeta titulo="Gastos variables" valor={ars(resumen.totalVar)} color="violet"/>
          <Tarjeta
            titulo="Pendientes de pago"
            valor={ars(resumen.pendientes)}
            color="amber"
            sub={resumen.cantPend > 0 ? `${resumen.cantPend} gasto${resumen.cantPend > 1 ? 's' : ''}` : undefined}
          />
        </div>
      )}

      {/* ── Filtros + botón ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Selector value={mes} onChange={setMes}>
            {mesesDisp.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Selector>
          <Selector value={filtrocat} onChange={setFiltrocat}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Selector>
          <Selector value={filtroest} onChange={setFiltroest}>
            <option value="">Todos los estados</option>
            <option value="PAGADO">Pagado</option>
            <option value="PENDIENTE">Pendiente</option>
          </Selector>
        </div>
        <button onClick={abrirNuevo} className="btn-primario flex items-center gap-2 px-4 py-2">
          <Plus className="w-4 h-4" /> Nuevo gasto
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando...</div>
        ) : gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p className="text-sm">No hay gastos registrados para este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subcategoría</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medio</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(g.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeCat cat={g.categoria} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{LABEL_SUB[g.subcategoria]}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">{g.descripcion}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{g.medioPago ? LABEL_MEDIO[g.medioPago] : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {ars(Number(g.monto))}
                    </td>
                    <td className="px-4 py-3">
                      {g.estado === 'PENDIENTE'
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3"/>Pendiente</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/>Pagado</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => abrirEditar(g)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmElim(g.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {ars(gastos.reduce((s, g) => s + Number(g.monto), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal confirmación eliminar ── */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">¿Eliminar gasto?</h3>
            <p className="text-slate-500 text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmElim(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmElim)} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal gasto ── */}
      {modalAbierto && (
        <ModalGasto
          gasto={gastoEditar}
          onGuardado={() => { cerrarModal(); cargar() }}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, color, sub }: { titulo: string; valor: string; color: string; sub?: string }) {
  const colores: Record<string, string> = {
    slate:  'bg-slate-900 text-white',
    blue:   'bg-blue-50 text-blue-900',
    violet: 'bg-violet-50 text-violet-900',
    amber:  'bg-amber-50 text-amber-900',
  }
  const subColor: Record<string, string> = {
    slate: 'text-slate-400', blue: 'text-blue-400', violet: 'text-violet-400', amber: 'text-amber-600',
  }
  return (
    <div className={`rounded-xl p-4 ${colores[color]}`}>
      <p className={`text-xs font-medium mb-1 ${color === 'slate' ? 'text-slate-400' : 'opacity-60'}`}>{titulo}</p>
      <p className="text-xl font-bold leading-tight">{valor}</p>
      {sub && <p className={`text-xs mt-1 ${subColor[color]}`}>{sub}</p>}
    </div>
  )
}

function BadgeCat({ cat }: { cat: string }) {
  const estilos: Record<string, string> = {
    FIJOS:          'bg-blue-50 text-blue-700 border-blue-200',
    VARIABLES:      'bg-violet-50 text-violet-700 border-violet-200',
    ADMINISTRACION: 'bg-slate-100 text-slate-600 border-slate-200',
    INVERSION:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estilos[cat] ?? ''}`}>
      {LABEL_CAT[cat]}
    </span>
  )
}

function Selector({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-acento-500/30 focus:border-acento-500 cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  )
}

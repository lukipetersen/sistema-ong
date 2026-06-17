import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Upload, Users } from 'lucide-react'
import { api } from '@/lib/api'
import {
  Gasto, ResumenGastos, CATEGORIAS, SUBCATEGORIAS, MEDIOS_PAGO,
} from '@/types/gastos'
import {
  Ingreso, ResumenIngresos, TIPOS_INGRESO, CATEGORIAS_INGRESO,
} from '@/types/ingresos'
import ModalGasto from '@/components/gastos/ModalGasto'
import ModalIngreso from '@/components/ingresos/ModalIngreso'
import ModalImportarGastos from '@/components/gastos/ModalImportarGastos'
import ModalImportarIngresos from '@/components/ingresos/ModalImportarIngresos'

// ─── Utilidades ──────────────────────────────────────────────────────────────

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const mesActual = () => {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const mesesDisponibles = () =>
  Array.from({ length: 12 }, (_, i) => {
    const anio = new Date().getFullYear()
    const d = new Date(anio, i, 1)
    return {
      value: `${anio}-${String(i + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    }
  })

// ─── Labels ──────────────────────────────────────────────────────────────────

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
const LABEL_TIPO: Record<string, string> = {
  VENTA: 'Venta', CUOTA: 'Cuota', DONACION: 'Donación',
}
const LABEL_CAT_ING: Record<string, string> = {
  FIJO: 'Fijo', VARIABLE: 'Variable',
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function Tarjeta({ titulo, valor, color, sub }: { titulo: string; valor: string; color: string; sub?: string }) {
  const colores: Record<string, string> = {
    slate:   'bg-slate-900 text-white',
    blue:    'bg-blue-50 text-blue-900',
    violet:  'bg-violet-50 text-violet-900',
    amber:   'bg-[#fdf6e0] text-[#5a4010]',
    emerald: 'bg-[#edf5e0] text-[#2a4a10]',
    teal:    'bg-teal-50 text-teal-900',
    sky:     'bg-sky-50 text-sky-900',
  }
  const subColor: Record<string, string> = {
    slate: 'text-slate-400', blue: 'text-blue-400', violet: 'text-violet-400',
    amber: 'text-[#9a7020]', emerald: 'text-[#5a7a30]', teal: 'text-teal-500', sky: 'text-sky-500',
  }
  return (
    <div className={`rounded-xl p-4 ${colores[color]}`}>
      <p className={`text-xs font-medium mb-1 ${color === 'slate' ? 'text-slate-400' : 'opacity-60'}`}>{titulo}</p>
      <p className="text-xl font-bold leading-tight">{valor}</p>
      {sub && <p className={`text-xs mt-1 ${subColor[color]}`}>{sub}</p>}
    </div>
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

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'gastos' | 'ingresos' | 'cuotas'

export default function Finanzas() {
  const [tab, setTab] = useState<Tab>('gastos')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <TabBtn active={tab === 'gastos'} onClick={() => setTab('gastos')} icon={<TrendingDown className="w-4 h-4" />}>
          Gastos
        </TabBtn>
        <TabBtn active={tab === 'ingresos'} onClick={() => setTab('ingresos')} icon={<TrendingUp className="w-4 h-4" />}>
          Ingresos
        </TabBtn>
        <TabBtn active={tab === 'cuotas'} onClick={() => setTab('cuotas')} icon={<Users className="w-4 h-4" />}>
          Cuotas
        </TabBtn>
      </div>

      {tab === 'gastos'   && <SeccionGastos />}
      {tab === 'ingresos' && <SeccionIngresos />}
      {tab === 'cuotas'   && <SeccionCuotas />}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Sección Gastos ───────────────────────────────────────────────────────────

function SeccionGastos() {
  const [gastos, setGastos]     = useState<Gasto[]>([])
  const [resumen, setResumen]   = useState<ResumenGastos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [mes, setMes]           = useState(mesActual())
  const [filtrocat, setFiltrocat] = useState('')
  const [filtroest, setFiltroest] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [gastoEditar, setGastoEditar]   = useState<Gasto | null>(null)
  const [confirmElim, setConfirmElim]   = useState<string | null>(null)
  const [modalImportar, setModalImportar] = useState(false)

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

  return (
    <>
      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tarjeta titulo="Total del mes"    valor={ars(resumen.total)}      color="slate" />
          <Tarjeta titulo="Gastos fijos"     valor={ars(resumen.totalFijos)} color="blue"  />
          <Tarjeta titulo="Gastos variables" valor={ars(resumen.totalVar)}   color="violet"/>
          <Tarjeta
            titulo="Pendientes de pago"
            valor={ars(resumen.pendientes)}
            color="amber"
            sub={resumen.cantPend > 0 ? `${resumen.cantPend} gasto${resumen.cantPend > 1 ? 's' : ''}` : undefined}
          />
        </div>
      )}

      {/* Filtros + botón */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Selector value={mes} onChange={setMes}>
            {mesesDisponibles().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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
        <div className="flex gap-2">
          <button onClick={() => setModalImportar(true)} className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Upload className="w-4 h-4" /> Importar Excel
          </button>
          <button onClick={abrirNuevo} className="btn-primario flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> Nuevo gasto
          </button>
        </div>
      </div>

      {/* Tabla */}
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
                    <td className="px-4 py-3"><BadgeCatGasto cat={g.categoria} /></td>
                    <td className="px-4 py-3 text-slate-600">{LABEL_SUB[g.subcategoria]}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">{g.descripcion}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{g.medioPago ? LABEL_MEDIO[g.medioPago] : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {ars(Number(g.monto))}
                    </td>
                    <td className="px-4 py-3">
                      {g.estado === 'PENDIENTE'
                        ? <BadgePendiente label="Pendiente" />
                        : <BadgeCobrado label="Pagado" />
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

      {/* Modal confirmación eliminar */}
      {confirmElim && (
        <ModalConfirmElim
          titulo="¿Eliminar gasto?"
          onCancelar={() => setConfirmElim(null)}
          onConfirmar={() => eliminar(confirmElim)}
        />
      )}

      {/* Modal gasto */}
      {modalAbierto && (
        <ModalGasto
          gasto={gastoEditar}
          onGuardado={() => { cerrarModal(); cargar() }}
          onCerrar={cerrarModal}
        />
      )}

      {/* Modal importar Excel */}
      {modalImportar && (
        <ModalImportarGastos
          onImportado={cargar}
          onCerrar={() => setModalImportar(false)}
        />
      )}
    </>
  )
}

// ─── Sección Ingresos ─────────────────────────────────────────────────────────

function SeccionIngresos() {
  const [ingresos, setIngresos]   = useState<Ingreso[]>([])
  const [resumen, setResumen]     = useState<ResumenIngresos | null>(null)
  const [cargando, setCargando]   = useState(true)
  const [mes, setMes]             = useState(mesActual())
  const [filtrotipo, setFiltrotipo] = useState('')
  const [filtrocat, setFiltrocat]   = useState('')
  const [filtroest, setFiltroest]   = useState('')
  const [modalAbierto, setModalAbierto]   = useState(false)
  const [ingresoEditar, setIngresoEditar] = useState<Ingreso | null>(null)
  const [confirmElim, setConfirmElim]     = useState<string | null>(null)
  const [modalImportar, setModalImportar] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params: Record<string, string> = { mes, limit: '200' }
      if (filtrotipo) params.tipo      = filtrotipo
      if (filtrocat)  params.categoria = filtrocat
      if (filtroest)  params.estado    = filtroest
      const [iRes, rRes] = await Promise.all([
        api.get('/ingresos', { params }),
        api.get('/ingresos/resumen', { params: { mes } }),
      ])
      setIngresos(iRes.data.ingresos)
      setResumen(rRes.data)
    } finally {
      setCargando(false)
    }
  }, [mes, filtrotipo, filtrocat, filtroest])

  useEffect(() => { cargar() }, [cargar])

  async function eliminar(id: string) {
    await api.delete(`/ingresos/${id}`)
    setConfirmElim(null)
    cargar()
  }

  function abrirEditar(i: Ingreso) { setIngresoEditar(i); setModalAbierto(true) }
  function abrirNuevo()             { setIngresoEditar(null); setModalAbierto(true) }
  function cerrarModal()            { setModalAbierto(false); setIngresoEditar(null) }

  return (
    <>
      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Tarjeta titulo="Total del mes"   valor={ars(resumen.total)}    color="slate"   />
          <Tarjeta titulo="Ingresos fijos"  valor={ars(resumen.totalFijo)} color="emerald" />
          <Tarjeta titulo="Ingresos variables" valor={ars(resumen.totalVar)} color="teal" />
          <Tarjeta
            titulo="Pendientes de cobro"
            valor={ars(resumen.pendientes)}
            color="amber"
            sub={resumen.cantPend > 0 ? `${resumen.cantPend} ingreso${resumen.cantPend > 1 ? 's' : ''}` : undefined}
          />
        </div>
      )}

      {/* Distribución por tipo */}
      {resumen && resumen.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {resumen.porTipo.map(({ tipo, total }) => (
            <div key={tipo} className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-1">
                <BadgeTipo tipo={tipo} />
                <span className="text-xs text-slate-400">
                  {resumen.total > 0 ? `${Math.round((total / resumen.total) * 100)}%` : '0%'}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-1">{ars(total)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros + botón */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Selector value={mes} onChange={setMes}>
            {mesesDisponibles().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Selector>
          <Selector value={filtrotipo} onChange={setFiltrotipo}>
            <option value="">Todos los tipos</option>
            {TIPOS_INGRESO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Selector>
          <Selector value={filtrocat} onChange={setFiltrocat}>
            <option value="">Todas las categorías</option>
            {CATEGORIAS_INGRESO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Selector>
          <Selector value={filtroest} onChange={setFiltroest}>
            <option value="">Todos los estados</option>
            <option value="COBRADO">Cobrado</option>
            <option value="PENDIENTE">Pendiente</option>
          </Selector>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalImportar(true)} className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <Upload className="w-4 h-4" /> Importar Excel
          </button>
          <button onClick={abrirNuevo} className="btn-primario flex items-center gap-2 px-4 py-2">
            <Plus className="w-4 h-4" /> Nuevo ingreso
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando...</div>
        ) : ingresos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <p className="text-sm">No hay ingresos registrados para este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ingresos.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(i.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-3"><BadgeTipo tipo={i.tipo} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                        i.categoria === 'FIJO'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-violet-50 text-violet-700 border-violet-200'
                      }`}>
                        {LABEL_CAT_ING[i.categoria]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate">{i.descripcion}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {ars(Number(i.monto))}
                    </td>
                    <td className="px-4 py-3">
                      {i.estado === 'PENDIENTE'
                        ? <BadgePendiente label="Pendiente" />
                        : <BadgeCobrado label="Cobrado" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => abrirEditar(i)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmElim(i.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {ars(ingresos.reduce((s, i) => s + Number(i.monto), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal confirmación eliminar */}
      {confirmElim && (
        <ModalConfirmElim
          titulo="¿Eliminar ingreso?"
          onCancelar={() => setConfirmElim(null)}
          onConfirmar={() => eliminar(confirmElim)}
        />
      )}

      {/* Modal ingreso */}
      {modalAbierto && (
        <ModalIngreso
          ingreso={ingresoEditar}
          onGuardado={() => { cerrarModal(); cargar() }}
          onCerrar={cerrarModal}
        />
      )}

      {/* Modal importar Excel */}
      {modalImportar && (
        <ModalImportarIngresos
          onImportado={cargar}
          onCerrar={() => setModalImportar(false)}
        />
      )}
    </>
  )
}

// ─── Sección Cuotas globales ──────────────────────────────────────────────────

interface CuotaGlobal {
  id: string; mes: string; monto: string; totalAsociados: number; creadoEn: string
}

const labelMes = (ym: string) => {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

const opcionesMeses = () => {
  const hoy = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 3 + i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: val, label: labelMes(val) }
  })
}

function SeccionCuotas() {
  const [cuotas, setCuotas]       = useState<CuotaGlobal[]>([])
  const [cargando, setCargando]   = useState(true)
  const [mes, setMes]             = useState(mesActual())
  const [monto, setMonto]         = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<{ mes: string; actualizados: number } | null>(null)
  const [confirmElim, setConfirmElim] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get('/asociados/cuotas/global')
      setCuotas(data)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function aplicar() {
    if (!monto || Number(monto) <= 0) return
    setGuardando(true)
    setResultado(null)
    try {
      const { data } = await api.post('/asociados/cuotas/global', { mes, monto: Number(monto) })
      setResultado({ mes, actualizados: data.actualizados })
      setMonto('')
      cargar()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(mes: string) {
    await api.delete(`/asociados/cuotas/global/${mes}`)
    setConfirmElim(null)
    setResultado(null)
    cargar()
  }

  return (
    <div className="space-y-6">
      {/* Panel definir cuota global */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Definir cuota para todos los asociados</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Elegí un mes y un monto. Se va a aplicar a todos los asociados activos y pendientes al mismo tiempo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="etiqueta">Mes</label>
            <select className="campo" value={mes} onChange={e => setMes(e.target.value)}>
              {opcionesMeses().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta">Monto (ARS)</label>
            <input
              type="number" step="0.01" min="0" placeholder="Ej: 6000"
              className="campo"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
          </div>
          <button
            onClick={aplicar}
            disabled={guardando || !monto}
            className="btn-primario px-5 py-2.5 flex items-center justify-center gap-2"
          >
            {guardando
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Aplicando...</>
              : <><Users className="w-4 h-4" />Aplicar a todos</>
            }
          </button>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="flex items-center gap-2 rounded-lg bg-[#edf5e0] border border-[#c0d8a0] px-4 py-3 text-sm text-[#4a7030]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Cuota de {ars(Number(monto || cuotas.find(c => c.mes === resultado.mes)?.monto || 0))} aplicada a <strong>{resultado.actualizados} asociados</strong> para {labelMes(resultado.mes)}.
          </div>
        )}
      </div>

      {/* Historial de cuotas globales */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Historial de cuotas globales</h3>
          <p className="text-xs text-slate-400 mt-0.5">Cuotas aplicadas a todos los asociados por mes</p>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Cargando...</div>
        ) : cuotas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-sm">No hay cuotas globales definidas todavía.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mes</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asociados</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cuotas.map(c => {
                const esActual = c.mes === mesActual()
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 capitalize">{labelMes(c.mes)}</span>
                        {esActual && (
                          <span className="text-xs font-medium text-acento-600 bg-acento-50 border border-acento-200 px-2 py-0.5 rounded-full">Actual</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">{ars(Number(c.monto))}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" />{c.totalAsociados} asociados
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                          onClick={() => { setMes(c.mes); setMonto(String(Number(c.monto))) }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmElim(c.mes)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {confirmElim && (
        <ModalConfirmElim
          titulo="¿Eliminar cuota global?"
          onCancelar={() => setConfirmElim(null)}
          onConfirmar={() => eliminar(confirmElim)}
        />
      )}
    </div>
  )
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function BadgeCatGasto({ cat }: { cat: string }) {
  const estilos: Record<string, string> = {
    FIJOS:          'bg-blue-50 text-blue-700 border-blue-200',
    VARIABLES:      'bg-violet-50 text-violet-700 border-violet-200',
    ADMINISTRACION: 'bg-slate-100 text-slate-600 border-slate-200',
    INVERSION:      'bg-[#edf5e0] text-[#4a7030] border-[#c0d8a0]',
  }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estilos[cat] ?? ''}`}>
      {LABEL_CAT[cat]}
    </span>
  )
}

function BadgeTipo({ tipo }: { tipo: string }) {
  const estilos: Record<string, string> = {
    VENTA:    'bg-sky-50 text-sky-700 border-sky-200',
    CUOTA:    'bg-violet-50 text-violet-700 border-violet-200',
    DONACION: 'bg-[#edf5e0] text-[#4a7030] border-[#c0d8a0]',
  }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estilos[tipo] ?? ''}`}>
      {LABEL_TIPO[tipo]}
    </span>
  )
}

function BadgePendiente({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8a6820] bg-[#fdf6e0] border border-[#e8d880] px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" />{label}
    </span>
  )
}

function BadgeCobrado({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4a7030] bg-[#edf5e0] border border-[#c0d8a0] px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />{label}
    </span>
  )
}

// ─── Modal confirmación ───────────────────────────────────────────────────────

function ModalConfirmElim({ titulo, onCancelar, onConfirmar }: { titulo: string; onCancelar: () => void; onConfirmar: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-semibold text-slate-900 mb-2">{titulo}</h3>
        <p className="text-slate-500 text-sm mb-5">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancelar} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar} className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

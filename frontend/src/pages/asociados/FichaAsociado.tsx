import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { Asociado, SeguimientoTerapeutico, PagoAsociado, LABEL_PATOLOGIA, LABEL_ESTADO, LABEL_CUOTA } from '@/types/asociados'
import { BadgeEstado, BadgeCuota } from './ListaAsociados'
import ModalSeguimiento from '@/components/asociados/ModalSeguimiento'
import ModalPago from '@/components/asociados/ModalPago'

const ars = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const fechaLarga = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' })
const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'UTC' })

type Tab = 'datos' | 'terapeutico' | 'financiero' | 'seguimientos'

export default function FichaAsociado() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [asociado, setAsociado]   = useState<Asociado & { seguimientos: SeguimientoTerapeutico[]; pagos: PagoAsociado[] } | null>(null)
  const [tab, setTab]             = useState<Tab>('datos')
  const [cargando, setCargando]   = useState(true)
  const [modalSeg, setModalSeg]   = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [segEditar, setSegEditar] = useState<SeguimientoTerapeutico | null>(null)
  const [confirmElim, setConfirmElim] = useState<{ tipo: 'seg' | 'pago'; id: string } | null>(null)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get(`/asociados/${id}`)
      setAsociado(data)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [id])

  async function eliminarSeg(sid: string) {
    await api.delete(`/asociados/${id}/seguimientos/${sid}`)
    setConfirmElim(null)
    cargar()
  }

  async function eliminarPago(pid: string) {
    await api.delete(`/asociados/${id}/pagos/${pid}`)
    setConfirmElim(null)
    cargar()
  }

  if (cargando) return <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Cargando...</div>
  if (!asociado) return <div className="text-center py-20 text-slate-400">Asociado no encontrado.</div>

  const totalPagado = asociado.pagos.reduce((s, p) => s + Number(p.monto), 0)
  const ultimoPago  = asociado.pagos[0] ?? null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'datos',        label: 'Datos personales' },
    { key: 'terapeutico',  label: 'Terapéutico' },
    { key: 'financiero',   label: 'Financiero' },
    { key: 'seguimientos', label: `Seguimientos (${asociado.seguimientos.length})` },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/asociados')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{asociado.apellido}, {asociado.nombre}</h1>
              <BadgeEstado e={asociado.estado} />
              <BadgeCuota c={asociado.estadoCuota} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">DNI {asociado.dni} · Alta {fechaLarga(asociado.fechaAlta)}</p>
          </div>
        </div>
        <button onClick={() => navigate(`/asociados/${id}/editar`)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 shrink-0">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? 'border-acento-500 text-acento-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">

        {/* ── Datos personales ── */}
        {tab === 'datos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <Fila label="Nombre completo" valor={`${asociado.nombre} ${asociado.apellido}`} />
            <Fila label="DNI" valor={asociado.dni} />
            <Fila label="Fecha de nacimiento" valor={asociado.fechaNacimiento ? fechaLarga(asociado.fechaNacimiento) : undefined} />
            <Fila label="Teléfono" valor={asociado.telefono} />
            <Fila label="Email" valor={asociado.email} />
            <Fila label="Dirección" valor={asociado.direccion} />
            <Fila label="Fecha de alta" valor={fechaLarga(asociado.fechaAlta)} />
          </div>
        )}

        {/* ── Terapéutico ── */}
        {tab === 'terapeutico' && (
          <div className="space-y-5">
            <Fila label="Patología principal" valor={
              asociado.patologia
                ? asociado.patologia === 'OTRA' && asociado.patologiaOtra
                  ? asociado.patologiaOtra
                  : LABEL_PATOLOGIA[asociado.patologia]
                : undefined
            } />
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Observaciones generales</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{asociado.observaciones || <span className="text-slate-400 italic">Sin observaciones</span>}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{asociado.notasInternas || <span className="text-slate-400 italic">Sin notas</span>}</p>
            </div>
          </div>
        )}

        {/* ── Financiero ── */}
        {tab === 'financiero' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Total pagado</p>
                <p className="text-lg font-bold text-slate-900">{ars(totalPagado)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Estado cuota</p>
                <div className="flex justify-center mt-1"><BadgeCuota c={asociado.estadoCuota} /></div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Último pago</p>
                <p className="text-sm font-semibold text-slate-900">{ultimoPago ? fechaCorta(ultimoPago.fecha) : '—'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Historial de pagos</h3>
              <button onClick={() => setModalPago(true)} className="flex items-center gap-1.5 text-sm text-acento-600 hover:text-acento-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Registrar pago
              </button>
            </div>

            {asociado.pagos.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Sin pagos registrados.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {asociado.pagos.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 group">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.concepto || 'Pago'}</p>
                      <p className="text-xs text-slate-400">{fechaLarga(p.fecha)}{p.medioPago ? ` · ${p.medioPago}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900">{ars(Number(p.monto))}</p>
                      <button onClick={() => setConfirmElim({ tipo: 'pago', id: p.id })}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Seguimientos ── */}
        {tab === 'seguimientos' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setSegEditar(null); setModalSeg(true) }}
                className="flex items-center gap-2 btn-primario px-4 py-2 text-sm">
                <Plus className="w-4 h-4" /> Nuevo seguimiento
              </button>
            </div>

            {asociado.seguimientos.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                <Clock className="w-8 h-8 opacity-40" />
                <p className="text-sm">Sin seguimientos registrados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {asociado.seguimientos.map(s => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-4 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-500">{fechaLarga(s.fecha)}</span>
                          {s.continuidad
                            ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3"/>Continúa</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3"/>Discontinuado</span>
                          }
                        </div>
                        <p className="text-sm text-slate-800 font-medium">{s.resultado}</p>
                        {s.observaciones && <p className="text-sm text-slate-500 mt-1">{s.observaciones}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setSegEditar(s); setModalSeg(true) }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmElim({ tipo: 'seg', id: s.id })}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal seguimiento */}
      {modalSeg && (
        <ModalSeguimiento
          asociadoId={id!}
          seguimiento={segEditar}
          onGuardado={() => { setModalSeg(false); setSegEditar(null); cargar() }}
          onCerrar={() => { setModalSeg(false); setSegEditar(null) }}
        />
      )}

      {/* Modal pago */}
      {modalPago && (
        <ModalPago
          asociadoId={id!}
          asociado={asociado}
          onGuardado={() => { setModalPago(false); cargar() }}
          onCerrar={() => setModalPago(false)}
        />
      )}

      {/* Confirmar eliminación */}
      {confirmElim && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">¿Eliminar?</h3>
            <p className="text-slate-500 text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmElim(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={() => confirmElim.tipo === 'seg' ? eliminarSeg(confirmElim.id) : eliminarPago(confirmElim.id)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{valor ?? <span className="text-slate-400 italic">—</span>}</p>
    </div>
  )
}

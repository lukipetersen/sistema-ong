import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { MEDIOS_PAGO } from '@/types/gastos'
import { Asociado, PagoAsociado } from '@/types/asociados'

const ars = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const mesActual = () => {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const esquema = z.object({
  monto:     z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha:     z.string().min(1, 'La fecha es obligatoria'),
  mesCuota:  z.string().min(1, 'Seleccioná el mes que cancela'),
  concepto:  z.string().optional(),
  medioPago: z.string().optional(),
})
type FormData = z.infer<typeof esquema>

interface Props {
  asociadoId: string
  asociado?: Asociado & { pagos: PagoAsociado[] }
  onGuardado: () => void
  onCerrar: () => void
}

export default function ModalPago({ asociadoId, asociado, onGuardado, onCerrar }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const [saldoMes, setSaldoMes] = useState<{ pagado: number; falta: number } | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(esquema),
    defaultValues: { fecha: hoy, mesCuota: mesActual(), concepto: '' },
  })

  const mesSeleccionado = watch('mesCuota')
  const cuota = asociado?.cuotaMensual ? Number(asociado.cuotaMensual) : null

  // Calcular saldo del mes seleccionado
  useEffect(() => {
    if (!cuota || !mesSeleccionado || !asociado?.pagos) { setSaldoMes(null); return }
    const pagado = asociado.pagos
      .filter(p => p.mesCuota === mesSeleccionado)
      .reduce((s, p) => s + Number(p.monto), 0)
    setSaldoMes({ pagado, falta: Math.max(0, cuota - pagado) })
  }, [mesSeleccionado, cuota, asociado?.pagos])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCerrar])

  // Generar opciones de meses (6 meses atrás + mes actual + 1 adelante)
  const meses = Array.from({ length: 8 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 6 + i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: val, label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) }
  })

  async function onSubmit(datos: FormData) {
    await api.post(`/asociados/${asociadoId}/pagos`, {
      ...datos,
      concepto:  datos.concepto  || null,
      medioPago: datos.medioPago || null,
    })
    reset()
    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Registrar pago</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Mes que cancela */}
          <div>
            <label className="etiqueta">Mes que cancela</label>
            <select className={`campo ${errors.mesCuota ? 'campo-error' : ''}`} {...register('mesCuota')}>
              {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            {errors.mesCuota && <p className="msg-error mt-1"><AlertCircle className="w-3 h-3" />{errors.mesCuota.message}</p>}
          </div>

          {/* Saldo del mes si hay cuota definida */}
          {cuota && saldoMes !== null && (
            <div className={`rounded-lg px-4 py-3 text-sm ${saldoMes.falta === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {saldoMes.falta === 0
                ? `✓ Cuota ${ars(cuota)} ya cubierta para este mes`
                : <>Cuota: <strong>{ars(cuota)}</strong> · Pagado: <strong>{ars(saldoMes.pagado)}</strong> · Falta: <strong>{ars(saldoMes.falta)}</strong></>
              }
            </div>
          )}

          {cuota && (
            <p className="text-xs text-slate-400">Cuota mensual del asociado: {ars(cuota)}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="etiqueta">Monto (ARS)</label>
              <input type="number" step="0.01" min="0" placeholder="0"
                className={`campo ${errors.monto ? 'campo-error' : ''}`} {...register('monto')} />
              {errors.monto && <p className="msg-error mt-1"><AlertCircle className="w-3 h-3" />{errors.monto.message}</p>}
            </div>
            <div>
              <label className="etiqueta">Fecha de pago</label>
              <input type="date" className={`campo ${errors.fecha ? 'campo-error' : ''}`} {...register('fecha')} />
            </div>
          </div>

          <div>
            <label className="etiqueta">Concepto <span className="text-slate-400 font-normal">(opcional)</span></label>
            <input className="campo" placeholder="Ej: Cuota mayo 2026" {...register('concepto')} />
          </div>

          <div>
            <label className="etiqueta">Medio de pago <span className="text-slate-400 font-normal">(opcional)</span></label>
            <select className="campo" {...register('medioPago')}>
              <option value="">Sin especificar</option>
              {MEDIOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primario px-5 py-2 flex items-center gap-2">
              {isSubmitting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</> : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

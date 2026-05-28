import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { SeguimientoTerapeutico } from '@/types/asociados'

const esquema = z.object({
  fecha:         z.string().min(1, 'La fecha es obligatoria'),
  resultado:     z.string().min(1, 'El resultado es obligatorio'),
  observaciones: z.string().optional(),
  continuidad:   z.boolean(),
})
type FormData = z.infer<typeof esquema>

interface Props {
  asociadoId: string
  seguimiento: SeguimientoTerapeutico | null
  onGuardado: () => void
  onCerrar: () => void
}

export default function ModalSeguimiento({ asociadoId, seguimiento, onGuardado, onCerrar }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(esquema),
    defaultValues: {
      fecha:         seguimiento?.fecha.split('T')[0] ?? hoy,
      resultado:     seguimiento?.resultado     ?? '',
      observaciones: seguimiento?.observaciones ?? '',
      continuidad:   seguimiento?.continuidad   ?? true,
    },
  })

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCerrar])

  async function onSubmit(datos: FormData) {
    if (seguimiento) {
      await api.put(`/asociados/${asociadoId}/seguimientos/${seguimiento.id}`, datos)
    } else {
      await api.post(`/asociados/${asociadoId}/seguimientos`, datos)
    }
    reset()
    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{seguimiento ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="etiqueta">Fecha</label>
            <input type="date" className={`campo ${errors.fecha ? 'campo-error' : ''}`} {...register('fecha')} />
            {errors.fecha && <p className="msg-error mt-1"><AlertCircle className="w-3 h-3" />{errors.fecha.message}</p>}
          </div>

          <div>
            <label className="etiqueta">Resultado / Evolución</label>
            <textarea rows={3} className={`campo resize-none ${errors.resultado ? 'campo-error' : ''}`}
              placeholder="Describí la evolución del paciente en esta sesión..."
              {...register('resultado')} />
            {errors.resultado && <p className="msg-error mt-1"><AlertCircle className="w-3 h-3" />{errors.resultado.message}</p>}
          </div>

          <div>
            <label className="etiqueta">Observaciones <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea rows={2} className="campo resize-none" placeholder="Notas adicionales..." {...register('observaciones')} />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="continuidad" className="w-4 h-4 rounded accent-acento-500" {...register('continuidad')} />
            <label htmlFor="continuidad" className="text-sm text-slate-700 cursor-pointer">Continúa el tratamiento</label>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primario px-5 py-2 flex items-center gap-2">
              {isSubmitting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

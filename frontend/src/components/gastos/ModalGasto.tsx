import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Gasto, CATEGORIAS, SUBCATEGORIAS, MEDIOS_PAGO } from '@/types/gastos'

const esquema = z.object({
  fecha:        z.string().min(1, 'La fecha es obligatoria'),
  categoria:    z.string().min(1, 'La categoría es obligatoria'),
  subcategoria: z.string().min(1, 'La subcategoría es obligatoria'),
  descripcion:  z.string().min(1, 'La descripción es obligatoria'),
  monto:        z.coerce.number({ invalid_type_error: 'Ingresá un monto válido' }).positive('El monto debe ser mayor a 0'),
  medioPago:    z.string().optional(),
  estado:       z.enum(['PAGADO', 'PENDIENTE']),
  notas:        z.string().optional(),
})
type FormData = z.infer<typeof esquema>

interface Props {
  gasto: Gasto | null
  onGuardado: () => void
  onCerrar: () => void
}

export default function ModalGasto({ gasto, onGuardado, onCerrar }: Props) {
  const hoy = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(esquema),
    defaultValues: {
      fecha:        gasto ? gasto.fecha.split('T')[0] : hoy,
      categoria:    gasto?.categoria    ?? '',
      subcategoria: gasto?.subcategoria ?? '',
      descripcion:  gasto?.descripcion  ?? '',
      monto:        gasto ? Number(gasto.monto) : undefined,
      medioPago:    gasto?.medioPago    ?? '',
      estado:       gasto?.estado       ?? 'PAGADO',
      notas:        gasto?.notas        ?? '',
    },
  })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCerrar])

  async function onSubmit(datos: FormData) {
    const payload = {
      ...datos,
      medioPago: datos.medioPago || null,
      notas:     datos.notas     || null,
    }
    if (gasto) {
      await api.put(`/gastos/${gasto.id}`, payload)
    } else {
      await api.post('/gastos', payload)
    }
    reset()
    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{gasto ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="etiqueta">Fecha</label>
              <input type="date" className={`campo ${errors.fecha ? 'campo-error' : ''}`} {...register('fecha')} />
              {errors.fecha && <Err msg={errors.fecha.message} />}
            </div>
            <div>
              <label className="etiqueta">Estado</label>
              <select className="campo" {...register('estado')}>
                <option value="PAGADO">Pagado</option>
                <option value="PENDIENTE">Pendiente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="etiqueta">Categoría</label>
              <select className={`campo ${errors.categoria ? 'campo-error' : ''}`} {...register('categoria')}>
                <option value="">Seleccioná...</option>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {errors.categoria && <Err msg={errors.categoria.message} />}
            </div>
            <div>
              <label className="etiqueta">Subcategoría</label>
              <select className={`campo ${errors.subcategoria ? 'campo-error' : ''}`} {...register('subcategoria')}>
                <option value="">Seleccioná...</option>
                {SUBCATEGORIAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {errors.subcategoria && <Err msg={errors.subcategoria.message} />}
            </div>
          </div>

          <div>
            <label className="etiqueta">Descripción</label>
            <input type="text" placeholder="Ej: Alquiler mayo, Gas, Sustrato..." className={`campo ${errors.descripcion ? 'campo-error' : ''}`} {...register('descripcion')} />
            {errors.descripcion && <Err msg={errors.descripcion.message} />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="etiqueta">Monto (ARS)</label>
              <input type="number" step="0.01" min="0" placeholder="0" className={`campo ${errors.monto ? 'campo-error' : ''}`} {...register('monto')} />
              {errors.monto && <Err msg={errors.monto.message} />}
            </div>
            <div>
              <label className="etiqueta">Medio de pago <span className="text-slate-400 font-normal">(opcional)</span></label>
              <select className="campo" {...register('medioPago')}>
                <option value="">Sin especificar</option>
                {MEDIOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="etiqueta">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea rows={2} placeholder="Aclaraciones adicionales..." className="campo resize-none" {...register('notas')} />
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
            Cancelar
          </button>
          <button
            form="form-gasto"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="btn-primario px-5 py-2 flex items-center gap-2"
          >
            {isSubmitting
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
              : gasto ? 'Guardar cambios' : 'Crear gasto'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function Err({ msg }: { msg?: string }) {
  return (
    <p className="msg-error mt-1">
      <AlertCircle className="w-3 h-3" />{msg}
    </p>
  )
}

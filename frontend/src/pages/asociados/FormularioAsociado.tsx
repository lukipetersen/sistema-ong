import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

const esquema = z.object({
  nombre:        z.string().min(1, 'Obligatorio'),
  apellido:      z.string().min(1, 'Obligatorio'),
  dni:           z.string().min(7, 'Mínimo 7 dígitos').max(8, 'Máximo 8 dígitos'),
  direccion:     z.string().optional(),
  estado:        z.enum(['ACTIVO', 'PENDIENTE', 'INACTIVO']),
  fechaAlta:     z.string().optional(),
  observaciones: z.string().optional(),
})
type FormData = z.infer<typeof esquema>

interface Props { modo: 'crear' | 'editar' }

export default function FormularioAsociado({ modo }: Props) {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = modo === 'editar'

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(esquema),
    defaultValues: { estado: 'PENDIENTE' },
  })

  useEffect(() => {
    if (!esEdicion || !id) return
    api.get(`/asociados/${id}`).then(({ data }) => {
      reset({
        nombre:        data.nombre,
        apellido:      data.apellido,
        dni:           data.dni,
        direccion:     data.direccion     ?? '',
        estado:        data.estado,
        fechaAlta:     data.fechaAlta?.split('T')[0] ?? '',
        observaciones: data.observaciones ?? '',
      })
    })
  }, [esEdicion, id, reset])

  async function onSubmit(datos: FormData) {
    try {
      const payload = {
        ...datos,
        direccion:     datos.direccion     || null,
        observaciones: datos.observaciones || null,
        fechaAlta:     datos.fechaAlta     || null,
      }
      if (esEdicion) {
        await api.put(`/asociados/${id}`, payload)
      } else {
        await api.post('/asociados', payload)
      }
      navigate('/asociados')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      const msg = e.response?.data?.error ?? 'Error al guardar'
      if (msg.includes('DNI')) setError('dni', { message: msg })
      else setError('root', { message: msg })
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button onClick={() => navigate('/asociados')} className="flex items-center gap-2 text-sm text-[#7a6840] hover:text-[#1a1814] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      <div className="tarjeta overflow-hidden">
        <div className="px-6 py-4 border-b border-[#ede8dc]">
          <h2 className="font-semibold text-[#1a1814]">{esEdicion ? 'Editar asociado' : 'Nuevo asociado'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombre" error={errors.nombre?.message}>
              <input className={`campo ${errors.nombre ? 'campo-error' : ''}`} {...register('nombre')} />
            </Campo>
            <Campo label="Apellido" error={errors.apellido?.message}>
              <input className={`campo ${errors.apellido ? 'campo-error' : ''}`} {...register('apellido')} />
            </Campo>
          </div>

          {/* DNI y fecha de asociación */}
          <div className="grid grid-cols-2 gap-4">
            <Campo label="DNI" error={errors.dni?.message}>
              <input className={`campo ${errors.dni ? 'campo-error' : ''}`} placeholder="12345678" {...register('dni')} />
            </Campo>
            <Campo label="Fecha de asociación">
              <input type="date" className="campo" {...register('fechaAlta')} />
            </Campo>
          </div>

          {/* Domicilio */}
          <Campo label="Domicilio">
            <input className="campo" placeholder="Calle 123, localidad" {...register('direccion')} />
          </Campo>

          {/* Estado */}
          <Campo label="Estado">
            <select className="campo" {...register('estado')}>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </Campo>

          {/* Observaciones */}
          <Campo label="Observaciones">
            <textarea rows={3} className="campo resize-none" placeholder="Observaciones sobre el asociado..." {...register('observaciones')} />
          </Campo>

          {/* Error general */}
          {errors.root && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{errors.root.message}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-2 border-t border-[#ede8dc]">
            <button type="button" onClick={() => navigate('/asociados')} className="btn-secundario">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primario">
              {isSubmitting
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                : esEdicion ? 'Guardar cambios' : 'Crear asociado'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="etiqueta">{label}</label>
      {children}
      {error && <p className="msg-error"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

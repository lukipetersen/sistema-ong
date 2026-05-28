import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { PATOLOGIAS } from '@/types/asociados'

const esquema = z.object({
  nombre:          z.string().min(1, 'Obligatorio'),
  apellido:        z.string().min(1, 'Obligatorio'),
  dni:             z.string().min(7, 'Mínimo 7 caracteres').max(8, 'Máximo 8 caracteres'),
  fechaNacimiento: z.string().optional(),
  telefono:        z.string().optional(),
  email:           z.string().email('Email inválido').optional().or(z.literal('')),
  direccion:       z.string().optional(),
  estado:          z.enum(['ACTIVO', 'PENDIENTE', 'INACTIVO']),
  estadoCuota:     z.enum(['AL_DIA', 'VENCIDA', 'PENDIENTE']),
  patologia:       z.string().optional(),
  patologiaOtra:   z.string().optional(),
  observaciones:   z.string().optional(),
  notasInternas:   z.string().optional(),
})
type FormData = z.infer<typeof esquema>

interface Props { modo: 'crear' | 'editar' }

export default function FormularioAsociado({ modo }: Props) {
  const navigate  = useNavigate()
  const { id }    = useParams()
  const esEdicion = modo === 'editar'

  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(esquema),
    defaultValues: { estado: 'PENDIENTE', estadoCuota: 'PENDIENTE' },
  })

  const patologiaSeleccionada = watch('patologia')

  useEffect(() => {
    if (!esEdicion || !id) return
    api.get(`/asociados/${id}`).then(({ data }) => {
      reset({
        nombre:          data.nombre,
        apellido:        data.apellido,
        dni:             data.dni,
        fechaNacimiento: data.fechaNacimiento?.split('T')[0] ?? '',
        telefono:        data.telefono  ?? '',
        email:           data.email     ?? '',
        direccion:       data.direccion ?? '',
        estado:          data.estado,
        estadoCuota:     data.estadoCuota,
        patologia:       data.patologia  ?? '',
        patologiaOtra:   data.patologiaOtra ?? '',
        observaciones:   data.observaciones ?? '',
        notasInternas:   data.notasInternas ?? '',
      })
    })
  }, [esEdicion, id, reset])

  async function onSubmit(datos: FormData) {
    try {
      const payload = {
        ...datos,
        email:           datos.email           || null,
        telefono:        datos.telefono         || null,
        fechaNacimiento: datos.fechaNacimiento  || null,
        direccion:       datos.direccion        || null,
        patologia:       datos.patologia        || null,
        patologiaOtra:   datos.patologiaOtra    || null,
        observaciones:   datos.observaciones    || null,
        notasInternas:   datos.notasInternas    || null,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/asociados')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </button>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{esEdicion ? 'Editar asociado' : 'Nuevo asociado'}</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">

          {/* Datos personales */}
          <Seccion titulo="Datos personales">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Nombre" error={errors.nombre?.message}>
                <input className={`campo ${errors.nombre ? 'campo-error' : ''}`} {...register('nombre')} />
              </Campo>
              <Campo label="Apellido" error={errors.apellido?.message}>
                <input className={`campo ${errors.apellido ? 'campo-error' : ''}`} {...register('apellido')} />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="DNI" error={errors.dni?.message}>
                <input className={`campo ${errors.dni ? 'campo-error' : ''}`} placeholder="12345678" {...register('dni')} />
              </Campo>
              <Campo label="Fecha de nacimiento">
                <input type="date" className="campo" {...register('fechaNacimiento')} />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Teléfono">
                <input className="campo" placeholder="11 1234-5678" {...register('telefono')} />
              </Campo>
              <Campo label="Email" error={errors.email?.message}>
                <input type="email" className={`campo ${errors.email ? 'campo-error' : ''}`} placeholder="correo@email.com" {...register('email')} />
              </Campo>
            </div>
            <Campo label="Dirección">
              <input className="campo" placeholder="Calle 123, localidad" {...register('direccion')} />
            </Campo>
          </Seccion>

          {/* Estado */}
          <Seccion titulo="Estado">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Estado del asociado">
                <select className="campo" {...register('estado')}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </Campo>
              <Campo label="Estado de cuota">
                <select className="campo" {...register('estadoCuota')}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="AL_DIA">Al día</option>
                  <option value="VENCIDA">Vencida</option>
                </select>
              </Campo>
            </div>
          </Seccion>

          {/* Información terapéutica */}
          <Seccion titulo="Información terapéutica">
            <Campo label="Patología principal">
              <select className="campo" {...register('patologia')}>
                <option value="">Sin especificar</option>
                {PATOLOGIAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Campo>
            {patologiaSeleccionada === 'OTRA' && (
              <Campo label="Especificar patología">
                <input className="campo" placeholder="Describirla brevemente..." {...register('patologiaOtra')} />
              </Campo>
            )}
            <Campo label="Observaciones generales">
              <textarea rows={3} className="campo resize-none" placeholder="Observaciones clínicas, antecedentes..." {...register('observaciones')} />
            </Campo>
            <Campo label="Notas internas">
              <textarea rows={2} className="campo resize-none" placeholder="Notas privadas del equipo..." {...register('notasInternas')} />
            </Campo>
          </Seccion>

          {/* Error general */}
          {errors.root && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{errors.root.message}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={() => navigate('/asociados')} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primario px-5 py-2 flex items-center gap-2">
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

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{titulo}</h3>
      {children}
    </div>
  )
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="etiqueta">{label}</label>
      {children}
      {error && <p className="msg-error mt-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

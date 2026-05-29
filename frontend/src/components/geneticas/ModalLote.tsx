import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { Lote } from '../../types/geneticas'
import { SALA_LABELS, ESTADO_LOTE_LABELS } from '../../types/geneticas'

const schemaCrear = z.object({
  sala:             z.enum(['SALA_1', 'SALA_2']),
  fechaInicio:      z.string().min(1, 'La fecha de inicio es obligatoria'),
  observaciones:    z.string().max(1000).optional(),
  cantidadPlantas:  z.coerce.number().int().min(0).max(500).default(0),
})

const schemaEditar = z.object({
  sala:               z.enum(['SALA_1', 'SALA_2']),
  fechaInicio:        z.string().min(1, 'La fecha de inicio es obligatoria'),
  fechaFinalizacion:  z.string().optional(),
  estado:             z.enum(['PRODUCCION', 'ACTIVO', 'FINALIZADO', 'DESCARTADO', 'ARCHIVADO']),
  observaciones:      z.string().max(1000).optional(),
})

type FormCrear  = z.infer<typeof schemaCrear>
type FormEditar = z.infer<typeof schemaEditar>
type FormData   = FormCrear | FormEditar

interface Props {
  lote?: Lote | null
  geneticaNombre?: string
  onGuardar: (data: FormData) => Promise<void>
  onCerrar: () => void
  cargando?: boolean
}

export default function ModalLote({ lote, geneticaNombre, onGuardar, onCerrar, cargando }: Props) {
  const esEdicion = !!lote

  const schema = esEdicion ? schemaEditar : schemaCrear

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: esEdicion
      ? {
          sala:              lote.sala,
          fechaInicio:       lote.fechaInicio.slice(0, 10),
          fechaFinalizacion: lote.fechaFinalizacion?.slice(0, 10) ?? '',
          estado:            lote.estado,
          observaciones:     lote.observaciones ?? '',
        }
      : {
          sala:            'SALA_1',
          fechaInicio:     new Date().toISOString().slice(0, 10),
          cantidadPlantas: 0,
          observaciones:   '',
        },
  })

  useEffect(() => {
    if (esEdicion && lote) {
      reset({
        sala:              lote.sala,
        fechaInicio:       lote.fechaInicio.slice(0, 10),
        fechaFinalizacion: lote.fechaFinalizacion?.slice(0, 10) ?? '',
        estado:            lote.estado,
        observaciones:     lote.observaciones ?? '',
      })
    }
  }, [lote, esEdicion, reset])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {esEdicion ? `Editar lote ${lote.codigo}` : 'Nuevo lote'}
            </h2>
            {geneticaNombre && (
              <p className="text-sm text-gray-500">{geneticaNombre}</p>
            )}
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onGuardar)} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sala <span className="text-red-500">*</span>
              </label>
              <select
                {...register('sala')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {Object.entries(SALA_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fechaInicio')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {(errors as Record<string, { message?: string }>).fechaInicio && (
                <p className="mt-1 text-xs text-red-600">{(errors as Record<string, { message?: string }>).fechaInicio?.message}</p>
              )}
            </div>
          </div>

          {esEdicion && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha fin</label>
                <input
                  type="date"
                  {...register('fechaFinalizacion' as keyof FormData)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
                <select
                  {...register('estado' as keyof FormData)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {Object.entries(ESTADO_LOTE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!esEdicion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Plantas a generar automáticamente
              </label>
              <input
                type="number"
                min={0}
                max={500}
                {...register('cantidadPlantas' as keyof FormData)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se crearán con códigos automáticos. Podés dejar 0 y agregar plantas después.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              {...register('observaciones')}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Notas sobre este lote..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

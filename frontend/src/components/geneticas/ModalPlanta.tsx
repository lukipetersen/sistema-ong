import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { Planta } from '../../types/geneticas'
import { ESTADO_PLANTA_LABELS } from '../../types/geneticas'

const schema = z.object({
  alias:         z.string().max(100).optional(),
  estado:        z.enum(['ACTIVA', 'SELECCIONADA', 'CLONADA', 'DESCARTADA', 'ARCHIVADA']).optional(),
  observaciones: z.string().max(1000).optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  planta?: Planta | null
  loteCodigo?: string
  onGuardar: (data: FormData) => Promise<void>
  onCerrar: () => void
  cargando?: boolean
}

export default function ModalPlanta({ planta, loteCodigo, onGuardar, onCerrar, cargando }: Props) {
  const esEdicion = !!planta

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      alias:         planta?.alias         ?? '',
      estado:        planta?.estado        ?? 'ACTIVA',
      observaciones: planta?.observaciones ?? '',
    },
  })

  useEffect(() => {
    reset({
      alias:         planta?.alias         ?? '',
      estado:        planta?.estado        ?? 'ACTIVA',
      observaciones: planta?.observaciones ?? '',
    })
  }, [planta, reset])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {esEdicion ? `Editar ${planta.codigo}` : 'Nueva planta'}
            </h2>
            {loteCodigo && <p className="text-sm text-gray-500">Lote: {loteCodigo}</p>}
          </div>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onGuardar)} className="space-y-4 p-6">
          {!esEdicion && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              El código de la planta se generará automáticamente.
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Alias / nombre interno</label>
            <input
              {...register('alias')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Ej: Madre 1, Seleccionada A..."
            />
            {errors.alias && <p className="mt-1 text-xs text-red-600">{errors.alias.message}</p>}
          </div>

          {esEdicion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select
                {...register('estado')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {Object.entries(ESTADO_PLANTA_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              {...register('observaciones')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Notas sobre esta planta..."
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
              {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Agregar planta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

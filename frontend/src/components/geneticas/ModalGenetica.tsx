import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { Genetica } from '../../types/geneticas'

const schema = z.object({
  nombre:        z.string().min(1, 'El nombre es obligatorio').max(100),
  descripcion:   z.string().max(500).optional(),
  observaciones: z.string().max(1000).optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  genetica?: Genetica | null
  onGuardar: (data: FormData) => Promise<void>
  onCerrar: () => void
  cargando?: boolean
}

export default function ModalGenetica({ genetica, onGuardar, onCerrar, cargando }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:        genetica?.nombre        ?? '',
      descripcion:   genetica?.descripcion   ?? '',
      observaciones: genetica?.observaciones ?? '',
    },
  })

  useEffect(() => {
    reset({
      nombre:        genetica?.nombre        ?? '',
      descripcion:   genetica?.descripcion   ?? '',
      observaciones: genetica?.observaciones ?? '',
    })
  }, [genetica, reset])

  const esEdicion = !!genetica

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar genética' : 'Nueva genética'}
          </h2>
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onGuardar)} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              {...register('nombre')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Ej: Oreo Cookies"
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              {...register('descripcion')}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Características, efectos, etc."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              {...register('observaciones')}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Notas internas..."
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
              {cargando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear genética'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

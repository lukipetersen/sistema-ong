import { useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'

const NOMBRES: Record<string, string> = {
  '/beneficiarios': 'Beneficiarios',
  '/voluntarios':   'Voluntarios',
  '/donaciones':    'Donaciones',
  '/proyectos':     'Proyectos',
  '/inventario':    'Inventario',
  '/eventos':       'Eventos y actividades',
  '/finanzas':      'Finanzas',
  '/socios':        'Socios',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
}

export default function Proximamente() {
  const { pathname } = useLocation()
  const nombre = NOMBRES[pathname] ?? 'Este módulo'

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh]">
      <div className="tarjeta p-10 text-center max-w-sm w-full">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Hammer className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">{nombre}</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Este módulo está en desarrollo y estará disponible pronto.
        </p>
        <div className="mt-6 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-acento-400 rounded-full" />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">En construcción</p>
      </div>
    </div>
  )
}

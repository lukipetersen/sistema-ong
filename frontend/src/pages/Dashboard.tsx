import { Users, Heart, Banknote, FolderKanban, ArrowUpRight, Activity } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface KPI {
  label: string
  valor: string
  sub: string
  icono: React.ElementType
  color: string
  fondo: string
}

const kpis: KPI[] = [
  { label: 'Beneficiarios activos', valor: '—', sub: 'en el padrón',         icono: Users,        color: 'text-blue-600',    fondo: 'bg-blue-50' },
  { label: 'Voluntarios activos',   valor: '—', sub: 'con disponibilidad',    icono: Heart,        color: 'text-pink-600',    fondo: 'bg-pink-50' },
  { label: 'Donaciones del mes',    valor: '—', sub: 'en pesos argentinos',   icono: Banknote,    color: 'text-acento-600',  fondo: 'bg-acento-50' },
  { label: 'Proyectos en curso',    valor: '—', sub: 'estado activo',         icono: FolderKanban, color: 'text-violet-600',  fondo: 'bg-violet-50' },
]

function saludoSegunHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaHoy(): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

export default function Dashboard() {
  const { usuario } = useAuth()

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {saludoSegunHora()}, {usuario?.nombre} 👋
          </h2>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">{fechaHoy()}</p>
        </div>
        <span className="badge-verde">
          <span className="w-1.5 h-1.5 rounded-full bg-acento-500 animate-pulse" />
          Sistema activo
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="tarjeta p-5 group hover:shadow-elevada transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-9 h-9 rounded-xl ${k.fondo} flex items-center justify-center`}>
                <k.icono className={`w-4 h-4 ${k.color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{k.valor}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{k.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Actividad reciente */}
        <div className="tarjeta p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Actividad reciente</h3>
            </div>
            <button className="text-xs text-acento-600 hover:text-acento-700 font-medium">Ver todo</button>
          </div>

          <div className="space-y-3">
            {/* Estado vacío con diseño */}
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <Activity className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Sin actividad reciente</p>
              <p className="text-xs text-slate-400 mt-1">Los últimos movimientos aparecerán acá</p>
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="tarjeta p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Accesos rápidos</h3>
          <div className="space-y-2">
            {[
              { label: 'Nuevo beneficiario', ruta: '/beneficiarios/nuevo', icono: Users },
              { label: 'Registrar donación', ruta: '/donaciones/nueva',    icono: Banknote },
              { label: 'Cargar voluntario',  ruta: '/voluntarios/nuevo',   icono: Heart },
              { label: 'Nuevo proyecto',     ruta: '/proyectos/nuevo',     icono: FolderKanban },
            ].map((a) => (
              <button
                key={a.label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left group"
              >
                <a.icono className="w-4 h-4 text-slate-400 group-hover:text-acento-500 transition-colors shrink-0" />
                {a.label}
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

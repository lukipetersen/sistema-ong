import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Heart, Banknote, FolderKanban,
  Package, Calendar, Landmark, UserCheck, BarChart3,
  Settings, LogOut, Leaf,
} from 'lucide-react'
import { useAuth, type Rol } from '@/contexts/AuthContext'

const nav = [
  { label: 'Inicio',        icono: LayoutDashboard, ruta: '/',             exact: true },
  { label: 'Beneficiarios', icono: Users,            ruta: '/beneficiarios' },
  { label: 'Voluntarios',   icono: Heart,            ruta: '/voluntarios'  },
  { label: 'Donaciones',    icono: Banknote,         ruta: '/donaciones'   },
  { label: 'Proyectos',     icono: FolderKanban,     ruta: '/proyectos'    },
  { label: 'Inventario',    icono: Package,          ruta: '/inventario'   },
  { label: 'Eventos',       icono: Calendar,         ruta: '/eventos'      },
  { label: 'Finanzas',      icono: Landmark,         ruta: '/finanzas'     },
  { label: 'Socios',        icono: UserCheck,        ruta: '/socios'       },
  { label: 'Reportes',      icono: BarChart3,        ruta: '/reportes'     },
]

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR:   'Coordinador',
  OPERADOR:      'Operador',
  SOLO_LECTURA:  'Solo lectura',
}

export default function Sidebar() {
  const { usuario, logout } = useAuth()

  return (
    <aside className="flex flex-col w-[220px] shrink-0 bg-slate-950 border-r border-white/5">

      {/* Logo */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-white/5">
        <img
          src="/logo.png"
          alt="Flor Vida"
          className="w-7 h-7 rounded-lg object-contain bg-black"
          onError={(e) => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            el.nextElementSibling?.classList.remove('hidden')
          }}
        />
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 items-center justify-center ring-1 ring-amber-500/20 hidden">
          <Leaf className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-white text-sm font-black tracking-widest uppercase">Flor Vida</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, icono: Icono, ruta, exact }) => (
          <NavLink
            key={ruta}
            to={ruta}
            end={exact}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icono className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-acento-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3 space-y-0.5">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={`w-4 h-4 shrink-0 ${isActive ? 'text-acento-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              Configuración
            </>
          )}
        </NavLink>

        {/* Usuario */}
        {usuario && (
          <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
            {/* Avatar inicial */}
            <div className="w-7 h-7 rounded-full bg-amber-500/20 ring-1 ring-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-amber-400 text-xs font-semibold">
                {usuario.nombre[0]}{usuario.apellido[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">
                {usuario.nombre} {usuario.apellido}
              </p>
              <p className="text-slate-500 text-[11px] truncate">{ETIQUETA_ROL[usuario.rol]}</p>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Heart, Banknote, FolderKanban,
  Package, Calendar, Landmark, UserCheck, BarChart3,
  Settings, LogOut, Leaf, X,
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
  { label: 'Genéticas',     icono: Leaf,             ruta: '/geneticas'    },
  { label: 'Asociados',     icono: UserCheck,        ruta: '/asociados'    },
  { label: 'Reportes',      icono: BarChart3,        ruta: '/reportes'     },
]

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR:   'Coordinador',
  OPERADOR:      'Operador',
  SOLO_LECTURA:  'Solo lectura',
}

interface SidebarProps {
  abierto: boolean
  onCerrar: () => void
}

export default function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const { usuario, logout } = useAuth()

  return (
    <>
      {/* Overlay mobile */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onCerrar}
        />
      )}

      {/* Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col w-[220px] shrink-0 bg-[#0e0d0a] border-r border-[rgba(200,185,140,0.08)]
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${abierto ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[rgba(200,185,140,0.07)]">
          <img
            src="/logo.jpg"
            alt="Flor Vida"
            className="w-7 h-7 rounded-lg object-cover"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              el.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <div className="w-7 h-7 rounded-lg bg-[#1c1a14] items-center justify-center ring-1 ring-[rgba(200,185,140,0.2)] hidden">
            <Leaf className="w-3.5 h-3.5 text-[#c9b97a]" />
          </div>
          <span className="text-[#e8d9b0] text-sm font-black tracking-widest uppercase flex-1">Flor Vida</span>
          <button onClick={onCerrar} className="lg:hidden text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ label, icono: Icono, ruta, exact }) => (
            <NavLink
              key={ruta}
              to={ruta}
              end={exact}
              onClick={onCerrar}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 border-l-2 ${
                  isActive
                    ? 'border-[#c9b97a] bg-[rgba(200,180,130,0.09)] text-[#e8d9b0]'
                    : 'border-transparent text-[rgba(200,180,130,0.38)] hover:bg-[rgba(200,180,130,0.05)] hover:text-[rgba(230,215,175,0.75)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icono className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-acento-400' : 'text-[rgba(200,180,130,0.4)] group-hover:text-[rgba(200,180,130,0.7)]'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-[rgba(200,185,140,0.07)] pt-3 space-y-0.5">
          <NavLink
            to="/configuracion"
            onClick={onCerrar}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border-l-2 ${
                isActive ? 'border-[#c9b97a] bg-[rgba(200,180,130,0.09)] text-[#e8d9b0]' : 'border-transparent text-[rgba(200,180,130,0.38)] hover:bg-[rgba(200,180,130,0.05)] hover:text-[rgba(230,215,175,0.75)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings className={`w-4 h-4 shrink-0 ${isActive ? 'text-acento-400' : 'text-[rgba(200,180,130,0.4)] group-hover:text-[rgba(200,180,130,0.7)]'}`} />
                Configuración
              </>
            )}
          </NavLink>

          {usuario && (
            <div className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[rgba(200,180,130,0.06)] transition-colors group">
              <div className="w-7 h-7 rounded-full bg-[rgba(200,180,130,0.12)] ring-1 ring-[rgba(200,180,130,0.2)] flex items-center justify-center shrink-0">
                <span className="text-[#c9b97a] text-xs font-semibold">
                  {usuario.nombre[0]}{usuario.apellido[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#e8d9b0] text-xs font-medium truncate leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-[rgba(200,180,130,0.38)] text-[11px] truncate">{ETIQUETA_ROL[usuario.rol]}</p>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="text-[rgba(200,180,130,0.3)] hover:text-[rgba(200,180,130,0.7)] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

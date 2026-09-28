import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Landmark, UserCheck, BarChart3,
  Settings, LogOut, Leaf, X, ClipboardList, Package,
} from 'lucide-react'
import { useAuth, type Rol } from '@/contexts/AuthContext'

const NAV_COMPLETO = [
  { label: 'Inicio',       icono: LayoutDashboard, ruta: '/',             exact: true, roles: null },
  { label: 'Finanzas',     icono: Landmark,         ruta: '/finanzas',                 roles: null },
  { label: 'Trazabilidad', icono: Leaf,             ruta: '/trazabilidad',             roles: null },
  { label: 'Stock',        icono: Package,          ruta: '/stock',                    roles: null },
  { label: 'Asociados',    icono: UserCheck,        ruta: '/asociados',                roles: null },
  { label: 'Forms',        icono: ClipboardList,    ruta: '/forms',                    roles: null },
  { label: 'Reportes',     icono: BarChart3,        ruta: '/reportes',                 roles: null },
]

// Fallback por rol cuando no hay modulosPermitidos explícitos
const NAV_POR_ROL: Partial<Record<Rol, string[]>> = {
  SOLO_STOCK: ['/stock'],
}

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR:   'Coordinador',
  OPERADOR:      'Operador',
  SOLO_LECTURA:  'Solo lectura',
  SOLO_STOCK:    'Stock',
}

interface SidebarProps {
  abierto: boolean
  onCerrar: () => void
}

export default function Sidebar({ abierto, onCerrar }: SidebarProps) {
  const { usuario, logout } = useAuth()

  const nav = NAV_COMPLETO.filter(item => {
    if (!usuario) return false
    if (usuario.rol === 'ADMINISTRADOR') return true
    const mods = usuario.modulosPermitidos
    if (mods.length > 0) return mods.includes(item.ruta)
    const fallback = NAV_POR_ROL[usuario.rol] ?? null
    return fallback === null || fallback.includes(item.ruta)
  })
  const puedeVerConfig = usuario && usuario.rol === 'ADMINISTRADOR'

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
        fixed inset-y-0 left-0 z-30 flex flex-col w-[260px] shrink-0 bg-[#0d1a0d] border-r border-[rgba(80,200,60,0.08)]
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:w-[220px]
        ${abierto ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-[rgba(80,200,60,0.07)]">
          <img
            src="/logo.png"
            alt="Flor Vida"
            className="w-8 h-8 rounded-lg object-contain bg-[#FEF8DC] p-0.5"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              el.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <div className="w-8 h-8 rounded-lg bg-[#162414] items-center justify-center ring-1 ring-[rgba(80,200,60,0.2)] hidden">
            <Leaf className="w-4 h-4 text-[#54be48]" />
          </div>
          <span className="text-[#d8f0cc] text-sm font-black tracking-widest uppercase flex-1">Flor Vida</span>
          <button onClick={onCerrar} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
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
                `group flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-[14px] lg:text-[13px] font-medium transition-all duration-100 border-l-2 ${
                  isActive
                    ? 'border-[#54be48] bg-[rgba(80,200,60,0.09)] text-[#d8f0cc]'
                    : 'border-transparent text-[rgba(100,200,80,0.45)] hover:bg-[rgba(80,200,60,0.05)] hover:text-[rgba(180,240,160,0.8)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icono className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-acento-400' : 'text-[rgba(100,200,80,0.45)] group-hover:text-[rgba(140,220,110,0.8)]'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-[rgba(80,200,60,0.07)] pt-3 space-y-0.5">
          {puedeVerConfig && (
            <NavLink
              to="/configuracion"
              onClick={onCerrar}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all border-l-2 ${
                  isActive ? 'border-[#54be48] bg-[rgba(80,200,60,0.09)] text-[#d8f0cc]' : 'border-transparent text-[rgba(100,200,80,0.45)] hover:bg-[rgba(80,200,60,0.05)] hover:text-[rgba(180,240,160,0.8)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Settings className={`w-4 h-4 shrink-0 ${isActive ? 'text-acento-400' : 'text-[rgba(100,200,80,0.45)] group-hover:text-[rgba(140,220,110,0.8)]'}`} />
                  Configuración
                </>
              )}
            </NavLink>
          )}

          {usuario && (
            <div className="mt-2 flex items-center gap-2.5 px-3 py-3 rounded-lg bg-[rgba(80,200,60,0.04)]">
              <div className="w-8 h-8 rounded-full bg-[rgba(80,200,60,0.14)] ring-1 ring-[rgba(80,200,60,0.25)] flex items-center justify-center shrink-0">
                <span className="text-[#54be48] text-xs font-semibold">
                  {usuario.nombre[0]}{usuario.apellido[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#d8f0cc] text-xs font-medium truncate leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-[rgba(100,200,80,0.45)] text-[11px] truncate">{ETIQUETA_ROL[usuario.rol]}</p>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(100,200,80,0.5)] hover:text-[rgba(140,230,110,0.9)] hover:bg-[rgba(80,200,60,0.08)] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

import { useState } from 'react'
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom'
import { Menu, LayoutDashboard, Landmark, Leaf, UserCheck, BarChart3 } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'

const TITULOS: Record<string, string> = {
  '/':              'Inicio',
  '/finanzas':      'Finanzas',
  '/asociados':     'Asociados',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
  '/geneticas':     'Genéticas',
}

const navItems = [
  { label: 'Inicio',    icono: LayoutDashboard, ruta: '/',          exact: true  },
  { label: 'Finanzas',  icono: Landmark,         ruta: '/finanzas',  exact: false },
  { label: 'Genéticas', icono: Leaf,             ruta: '/geneticas', exact: false },
  { label: 'Asociados', icono: UserCheck,        ruta: '/asociados', exact: false },
  { label: 'Reportes',  icono: BarChart3,        ruta: '/reportes',  exact: false },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  const titulo = Object.entries(TITULOS)
    .find(([ruta]) => ruta === '/' ? pathname === '/' : pathname.startsWith(ruta))
    ?.[1] ?? 'Sistema ONG'

  if (!usuario) { navigate('/login', { replace: true }); return null }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#f7f5ef]">

        {/* Topbar */}
        <header
          className="shrink-0 bg-[#faf8f3] border-b border-[#ede8dc] flex items-center justify-between px-4 lg:px-6"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(3.5rem + env(safe-area-inset-top))',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Botón menú mobile — abre drawer para Configuración y logout */}
            <button
              onClick={() => setSidebarAbierto(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-[#7a6840] hover:bg-[#f0ebe0] active:bg-[#e8e0d0] transition-colors -ml-1"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-[15px] font-semibold text-[#1a1814] tracking-tight">{titulo}</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[rgba(200,180,130,0.12)] ring-1 ring-[rgba(200,180,130,0.2)] flex items-center justify-center">
                <span className="text-[#c9b97a] text-xs font-semibold">
                  {usuario.nombre[0]}{usuario.apellido[0]}
                </span>
              </div>
              <span className="text-sm text-[#3a3220] font-medium hidden sm:block">
                {usuario.nombre}
              </span>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto">
          <div
            className="p-4 lg:p-6 max-w-7xl mx-auto"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            <div className="lg:[padding-bottom:1.5rem]">
              <Outlet />
            </div>
          </div>
        </main>

        {/* ── Barra de navegación inferior (solo mobile) ── */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-[#0e0d0a] border-t border-[rgba(200,185,140,0.10)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex h-14">
            {navItems.map(({ label, icono: Icono, ruta, exact }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={exact}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-[3px] transition-colors active:opacity-70 ${
                    isActive ? 'text-[#c9b97a]' : 'text-[rgba(200,180,130,0.38)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono className={`w-[22px] h-[22px] ${isActive ? 'text-[#c9b97a]' : ''}`} />
                    <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-[#c9b97a]' : ''}`}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}

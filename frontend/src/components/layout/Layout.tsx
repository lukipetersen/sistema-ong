import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'

const TITULOS: Record<string, string> = {
  '/':              'Inicio',
  '/finanzas':      'Finanzas',
  '/asociados':     'Asociados',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
  '/geneticas':     'Genéticas',
  '/stock':         'Stock',
  '/forms':         'Forms',
}

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

      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto bg-[#f7f5ef]">

        {/* Topbar */}
        <header
          className="sticky top-0 z-20 shrink-0 bg-[#faf8f3] border-b border-[#ede8dc] flex items-center justify-between px-4 lg:px-6"
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
        <main className="flex-1">
          <div
            className="p-4 lg:p-6 max-w-7xl mx-auto"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}

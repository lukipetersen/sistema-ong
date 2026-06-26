import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'

const TITULOS: Record<string, string> = {
  '/':              'Inicio',
  '/finanzas':      'Finanzas',
  '/asociados':     'Asociados',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
}

export default function Layout() {
  const { pathname } = useLocation()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const titulo = TITULOS[pathname] ?? 'Sistema ONG'
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  if (!usuario) { navigate('/login', { replace: true }); return null }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar abierto={sidebarAbierto} onCerrar={() => setSidebarAbierto(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#f7f5ef]">
        {/* Topbar */}
        <header className="h-14 shrink-0 bg-[#faf8f3] border-b border-[#ede8dc] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburguesa mobile */}
            <button
              onClick={() => setSidebarAbierto(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#b0a080] hover:bg-[#f0ebe0] hover:text-[#3a3220] transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-[15px] font-semibold text-[#1a1814] tracking-tight">{titulo}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#b0a080] hover:bg-[#f0ebe0] hover:text-[#3a3220] transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-[#e0d8c8]" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[rgba(200,180,130,0.12)] ring-1 ring-[rgba(200,180,130,0.2)] flex items-center justify-center">
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

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

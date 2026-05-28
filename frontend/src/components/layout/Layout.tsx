import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'

const TITULOS: Record<string, string> = {
  '/':              'Inicio',
  '/beneficiarios': 'Beneficiarios',
  '/voluntarios':   'Voluntarios',
  '/donaciones':    'Donaciones',
  '/proyectos':     'Proyectos',
  '/inventario':    'Inventario',
  '/eventos':       'Eventos y actividades',
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

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-slate-50">
        {/* Topbar */}
        <header className="h-14 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Hamburguesa mobile */}
            <button
              onClick={() => setSidebarAbierto(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">{titulo}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 ring-1 ring-amber-500/20 flex items-center justify-center">
                <span className="text-amber-600 text-xs font-semibold">
                  {usuario.nombre[0]}{usuario.apellido[0]}
                </span>
              </div>
              <span className="text-sm text-slate-700 font-medium hidden sm:block">
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

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AuthProvider, useAuth, type Rol, type UsuarioAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import Finanzas from '@/pages/Finanzas'
import ListaAsociados from '@/pages/asociados/ListaAsociados'
import FichaAsociado from '@/pages/asociados/FichaAsociado'
import FormularioAsociado from '@/pages/asociados/FormularioAsociado'
import Proximamente from '@/pages/Proximamente'
import Trazabilidad from '@/pages/Trazabilidad'
import Reportes from '@/pages/Reportes'
import Forms from '@/pages/Forms'
import Stock from '@/pages/Stock'
import Configuracion from '@/pages/Configuracion'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(_err: Error, info: ErrorInfo) { console.error('ErrorBoundary:', _err, info) }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl bg-white border border-red-200 p-6 shadow-sm text-center">
            <p className="text-red-600 font-semibold mb-2">Ocurrió un error inesperado</p>
            <p className="text-sm text-gray-500 mb-4">{(this.state.error as Error).message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
              className="rounded-lg bg-[#4a7030] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5e28]"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Todos los roles pueden intentar acceder a rutas generales;
// la visibilidad real la controla modulosPermitidos o el fallback SOLO_STOCK
const todosLosRoles: Rol[] = ['ADMINISTRADOR', 'COORDINADOR', 'OPERADOR', 'SOLO_LECTURA', 'SOLO_STOCK']

function primeraRutaPermitida(usuario: UsuarioAuth): string {
  if (usuario.modulosPermitidos.length > 0) return usuario.modulosPermitidos[0]
  if (usuario.rol === 'SOLO_STOCK') return '/stock'
  return '/'
}

function Cargando() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-acento-400 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Guard: verifica rol Y acceso por módulo (modulosPermitidos)
function RutaConRol({ roles, ruta, children }: { roles: Rol[]; ruta?: string; children: React.ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />

  if (!roles.includes(usuario.rol)) {
    return <Navigate to={primeraRutaPermitida(usuario)} replace />
  }

  if (ruta && usuario.rol !== 'ADMINISTRADOR') {
    const mods = usuario.modulosPermitidos
    if (mods.length > 0) {
      if (!mods.includes(ruta)) return <Navigate to={primeraRutaPermitida(usuario)} replace />
    } else if (usuario.rol === 'SOLO_STOCK' && ruta !== '/stock') {
      return <Navigate to="/stock" replace />
    }
  }

  return <>{children}</>
}

// Redirect al entrar: respeta modulosPermitidos o el fallback SOLO_STOCK
function EntradaInicial() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!usuario) return <Navigate to="/login" replace />

  const mods = usuario.modulosPermitidos
  if (mods.length > 0 && !mods.includes('/')) {
    return <Navigate to={mods[0]} replace />
  }
  if (usuario.rol === 'SOLO_STOCK' && mods.length === 0) {
    return <Navigate to="/stock" replace />
  }
  return <Dashboard />
}

function Rutas() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index element={<EntradaInicial />} />

        <Route path="asociados"            element={<RutaConRol roles={todosLosRoles} ruta="/asociados"><ListaAsociados /></RutaConRol>} />
        <Route path="asociados/nuevo"      element={<RutaConRol roles={todosLosRoles} ruta="/asociados"><FormularioAsociado modo="crear" /></RutaConRol>} />
        <Route path="asociados/:id"        element={<RutaConRol roles={todosLosRoles} ruta="/asociados"><FichaAsociado /></RutaConRol>} />
        <Route path="asociados/:id/editar" element={<RutaConRol roles={todosLosRoles} ruta="/asociados"><FormularioAsociado modo="editar" /></RutaConRol>} />
        <Route path="finanzas"       element={<RutaConRol roles={todosLosRoles} ruta="/finanzas"><Finanzas /></RutaConRol>} />
        <Route path="trazabilidad"   element={<RutaConRol roles={todosLosRoles} ruta="/trazabilidad"><Trazabilidad /></RutaConRol>} />
        <Route path="socios"         element={<RutaConRol roles={todosLosRoles}><Proximamente /></RutaConRol>} />
        <Route path="reportes"       element={<RutaConRol roles={todosLosRoles} ruta="/reportes"><Reportes /></RutaConRol>} />
        <Route path="forms"          element={<RutaConRol roles={todosLosRoles} ruta="/forms"><Forms /></RutaConRol>} />
        <Route path="stock"          element={<RutaConRol roles={todosLosRoles} ruta="/stock"><Stock /></RutaConRol>} />

        {/* Configuración: solo administradores */}
        <Route path="configuracion" element={<RutaConRol roles={['ADMINISTRADOR']} ruta="/configuracion"><Configuracion /></RutaConRol>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <BrowserRouter>
            <Rutas />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/auth/Login'
import Dashboard from '@/pages/Dashboard'
import Proximamente from '@/pages/Proximamente'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

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

function Rutas() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RutaProtegida><Layout /></RutaProtegida>}>
        <Route index                element={<Dashboard />} />
        <Route path="beneficiarios" element={<Proximamente />} />
        <Route path="voluntarios"   element={<Proximamente />} />
        <Route path="donaciones"    element={<Proximamente />} />
        <Route path="proyectos"     element={<Proximamente />} />
        <Route path="inventario"    element={<Proximamente />} />
        <Route path="eventos"       element={<Proximamente />} />
        <Route path="finanzas"      element={<Proximamente />} />
        <Route path="socios"        element={<Proximamente />} />
        <Route path="reportes"      element={<Proximamente />} />
        <Route path="configuracion" element={<Proximamente />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

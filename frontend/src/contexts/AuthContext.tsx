import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '@/lib/api'

export type Rol = 'ADMINISTRADOR' | 'COORDINADOR' | 'OPERADOR' | 'SOLO_LECTURA'

export interface UsuarioAuth {
  id: string
  cuil: string
  nombre: string
  apellido: string
  email: string
  rol: Rol
  sede?: { id: string; nombre: string } | null
}

interface ContextoAuth {
  usuario: UsuarioAuth | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthCtx = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setCargando(false); return }
    api.get<UsuarioAuth>('/auth/yo')
      .then(({ data }) => setUsuario(data))
      .catch(() => localStorage.clear())
      .finally(() => setCargando(false))
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    setUsuario(data.usuario)
  }

  async function logout() {
    const rt = localStorage.getItem('refreshToken')
    try { if (rt) await api.post('/auth/logout', { refreshToken: rt }) } finally {
      localStorage.clear()
      setUsuario(null)
    }
  }

  return <AuthCtx.Provider value={{ usuario, cargando, login, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

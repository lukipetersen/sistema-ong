import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, KeyRound, X, AlertCircle, Loader2,
  UserCheck, UserX, ChevronDown, Eye, EyeOff,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth, type Rol } from '@/contexts/AuthContext'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  cuil: string
  rol: Rol
  modulosPermitidos: string[]
  activo: boolean
  creadoEn: string
}

const MODULOS_DISPONIBLES = [
  { ruta: '/',             label: 'Dashboard' },
  { ruta: '/finanzas',     label: 'Finanzas' },
  { ruta: '/trazabilidad', label: 'Trazabilidad' },
  { ruta: '/stock',        label: 'Stock' },
  { ruta: '/asociados',    label: 'Asociados' },
  { ruta: '/forms',        label: 'Forms' },
  { ruta: '/reportes',     label: 'Reportes' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDINADOR:   'Coordinador',
  OPERADOR:      'Operador',
  SOLO_LECTURA:  'Solo lectura',
  SOLO_STOCK:    'Solo Stock',
}

const COLOR_ROL: Record<Rol, string> = {
  ADMINISTRADOR: 'bg-purple-50 text-purple-700',
  COORDINADOR:   'bg-blue-50 text-blue-700',
  OPERADOR:      'bg-[#edf5e0] text-[#4a7030]',
  SOLO_LECTURA:  'bg-slate-100 text-slate-600',
  SOLO_STOCK:    'bg-amber-50 text-amber-700',
}

// ─── Modal crear / editar usuario ─────────────────────────────────────────────

function ModalUsuario({
  usuario,
  onGuardar,
  onCerrar,
}: {
  usuario?: Usuario
  onGuardar: () => void
  onCerrar: () => void
}) {
  const modoEdicion = !!usuario
  const [nombre,   setNombre]   = useState(usuario?.nombre   ?? '')
  const [apellido, setApellido] = useState(usuario?.apellido ?? '')
  const [email,    setEmail]    = useState(usuario?.email    ?? '')
  const [cuil,     setCuil]     = useState(usuario?.cuil     ?? '')
  const [rol,               setRol]    = useState<Rol>(usuario?.rol ?? 'OPERADOR')
  const [modulosPermitidos, setMods]   = useState<string[]>(usuario?.modulosPermitidos ?? [])
  const [modulosEspecificos, setEspec] = useState((usuario?.modulosPermitidos ?? []).length > 0)
  const [password, setPassword] = useState('')
  const [verPass,  setVerPass]  = useState(false)
  const [guardando, setGuard]   = useState(false)
  const [error,    setError]    = useState('')

  async function guardar() {
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !cuil.trim()) {
      setError('Completá todos los campos obligatorios'); return
    }
    if (!modoEdicion && (!password || password.length < 6)) {
      setError('La contraseña debe tener al menos 6 caracteres'); return
    }
    if (rol !== 'ADMINISTRADOR' && modulosEspecificos && modulosPermitidos.length === 0) {
      setError('Seleccioná al menos un módulo'); return
    }
    setGuard(true); setError('')
    try {
      const mods = modulosEspecificos ? modulosPermitidos : []
      if (modoEdicion) {
        await api.put(`/usuarios/${usuario!.id}`, { nombre, apellido, email, cuil, rol, modulosPermitidos: mods })
      } else {
        await api.post('/usuarios', { nombre, apellido, email, cuil, rol, password, modulosPermitidos: mods })
      }
      onGuardar()
      onCerrar()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al guardar')
    } finally {
      setGuard(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="campo w-full" placeholder="Juan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input value={apellido} onChange={e => setApellido(e.target.value)} className="campo w-full" placeholder="García" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="campo w-full" placeholder="juan@ejemplo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CUIL *</label>
            <input value={cuil} onChange={e => setCuil(e.target.value)} className="campo w-full" placeholder="20-12345678-9" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
            <div className="relative">
              <select value={rol} onChange={e => setRol(e.target.value as Rol)} className="campo w-full appearance-none pr-8">
                {(Object.keys(ETIQUETA_ROL) as Rol[]).map(r => (
                  <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Selector de módulos (cualquier rol salvo ADMINISTRADOR) */}
          {rol !== 'ADMINISTRADOR' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Acceso a módulos</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    checked={!modulosEspecificos}
                    onChange={() => { setEspec(false); setMods([]) }}
                    className="accent-[#4a7030]"
                  />
                  Todos los módulos
                </label>
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    checked={modulosEspecificos}
                    onChange={() => { setEspec(true); if (modulosPermitidos.length === 0) setMods(['/stock']) }}
                    className="accent-[#4a7030]"
                  />
                  Módulos específicos
                </label>
              </div>
              {modulosEspecificos && (
                <div className="border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-1.5">
                  {MODULOS_DISPONIBLES.map(m => (
                    <label key={m.ruta} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={modulosPermitidos.includes(m.ruta)}
                        onChange={e => {
                          setMods(prev =>
                            e.target.checked ? [...prev, m.ruta] : prev.filter(r => r !== m.ruta)
                          )
                        }}
                        className="rounded accent-[#4a7030]"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              )}
              {modulosEspecificos && modulosPermitidos.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Seleccioná al menos un módulo.</p>
              )}
            </div>
          )}
          {!modoEdicion && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña *</label>
              <div className="relative">
                <input
                  type={verPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="campo w-full pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setVerPass(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 py-2.5 text-sm rounded-xl bg-[#4a7030] text-white font-medium hover:bg-[#3d5e28] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : modoEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal cambiar contraseña ─────────────────────────────────────────────────

function ModalPassword({ usuario, onCerrar }: { usuario: Usuario; onCerrar: () => void }) {
  const [password, setPassword] = useState('')
  const [ver, setVer]           = useState(false)
  const [guardando, setGuard]   = useState(false)
  const [error, setError]       = useState('')
  const [exito, setExito]       = useState(false)

  async function guardar() {
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setGuard(true); setError('')
    try {
      await api.put(`/usuarios/${usuario.id}/password`, { password })
      setExito(true)
      setTimeout(onCerrar, 1200)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al cambiar contraseña')
    } finally {
      setGuard(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Cambiar contraseña</h2>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">
            Cambiando contraseña de <strong>{usuario.nombre} {usuario.apellido}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={ver ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="campo w-full pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setVer(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {exito && (
            <div className="text-sm text-[#4a7030] bg-[#edf5e0] border border-[#c8e0a0] rounded-lg px-3 py-2">
              ¡Contraseña actualizada!
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || exito}
            className="flex-1 py-2.5 text-sm rounded-xl bg-[#4a7030] text-white font-medium hover:bg-[#3d5e28] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Cambiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Configuracion() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [cargando, setCargando]   = useState(true)
  const [modal, setModal]         = useState<{ tipo: 'crear' | 'editar' | 'pass'; usuario?: Usuario } | null>(null)
  const [confirmToggle, setConfirmToggle] = useState<Usuario | null>(null)
  const [toggling, setToggling]   = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await api.get<Usuario[]>('/usuarios')
      setUsuarios(data)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function toggleActivo() {
    if (!confirmToggle) return
    setToggling(true)
    try {
      await api.put(`/usuarios/${confirmToggle.id}`, { activo: !confirmToggle.activo })
      setConfirmToggle(null)
      cargar()
    } finally {
      setToggling(false)
    }
  }

  const activos   = usuarios.filter(u => u.activo)
  const inactivos = usuarios.filter(u => !u.activo)

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1814]">Gestión de usuarios</h2>
          <p className="text-sm text-slate-500 mt-0.5">{activos.length} usuario{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'crear' })}
          className="flex items-center gap-2 px-4 py-2 bg-[#4a7030] text-white rounded-xl text-sm font-medium hover:bg-[#3d5e28] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* Lista */}
      {cargando ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-[#ede8dc] divide-y divide-[#f5f2ec]">
          {[...activos, ...inactivos].map(u => (
            <div key={u.id} className={`flex items-center gap-3 px-5 py-4 ${!u.activo ? 'opacity-50' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-[rgba(200,180,130,0.12)] ring-1 ring-[rgba(200,180,130,0.2)] flex items-center justify-center shrink-0">
                <span className="text-[#c9b97a] text-sm font-semibold">
                  {u.nombre[0]}{u.apellido[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-800 text-sm">{u.nombre} {u.apellido}</p>
                  {!u.activo && <span className="text-xs text-slate-400">(inactivo)</span>}
                  {u.id === yo?.id && <span className="text-xs text-[#7a6840] bg-[#f7f5ef] px-2 py-0.5 rounded-full">Vos</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
              </div>
              <span className={`hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${COLOR_ROL[u.rol]}`}>
                {ETIQUETA_ROL[u.rol]}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setModal({ tipo: 'editar', usuario: u })}
                  title="Editar"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#4a7030] hover:bg-[#f0f7e8] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setModal({ tipo: 'pass', usuario: u })}
                  title="Cambiar contraseña"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                {u.id !== yo?.id && (
                  <button
                    onClick={() => setConfirmToggle(u)}
                    title={u.activo ? 'Desactivar' : 'Activar'}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                      u.activo
                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-slate-400 hover:text-[#4a7030] hover:bg-[#f0f7e8]'
                    }`}
                  >
                    {u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {usuarios.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">No hay usuarios</div>
          )}
        </div>
      )}

      {/* Modales */}
      {modal?.tipo === 'crear' && (
        <ModalUsuario onGuardar={cargar} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && modal.usuario && (
        <ModalUsuario usuario={modal.usuario} onGuardar={cargar} onCerrar={() => setModal(null)} />
      )}
      {modal?.tipo === 'pass' && modal.usuario && (
        <ModalPassword usuario={modal.usuario} onCerrar={() => setModal(null)} />
      )}

      {/* Confirmar toggle activo */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="font-medium text-slate-900 text-sm mb-2">
              {confirmToggle.activo ? '¿Desactivar' : '¿Activar'} a {confirmToggle.nombre} {confirmToggle.apellido}?
            </p>
            <p className="text-sm text-slate-500 mb-5">
              {confirmToggle.activo
                ? 'El usuario no podrá iniciar sesión mientras esté inactivo.'
                : 'El usuario podrá volver a iniciar sesión.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggle(null)} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">
                Cancelar
              </button>
              <button
                onClick={toggleActivo}
                disabled={toggling}
                className={`flex-1 py-2.5 text-sm rounded-xl text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2 ${
                  confirmToggle.activo ? 'bg-red-600 hover:bg-red-700' : 'bg-[#4a7030] hover:bg-[#3d5e28]'
                }`}
              >
                {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmToggle.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

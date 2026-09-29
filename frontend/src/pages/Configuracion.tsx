import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, KeyRound, X, AlertCircle, Loader2,
  UserCheck, UserX, ChevronDown, Eye, EyeOff, Save,
  Users, Leaf, Package, Settings2,
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

// Módulos que se pueden asignar a usuarios no-admin
// (no incluye /stock que es solo admin)
const MODULOS_DISPONIBLES = [
  { ruta: '/',             label: 'Dashboard' },
  { ruta: '/finanzas',     label: 'Finanzas' },
  { ruta: '/trazabilidad', label: 'Trazabilidad' },
  { ruta: '/dispensario',  label: 'Dispensario' },
  { ruta: '/asociados',    label: 'Asociados' },
  { ruta: '/forms',        label: 'Forms' },
  { ruta: '/reportes',     label: 'Reportes' },
]

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
  const [modulosEspecificos, setEspec] = useState((usuario?.modulosPermitidos ?? []).filter(m => !m.includes(':')).length > 0)
  const [password, setPassword] = useState('')
  const [verPass,  setVerPass]  = useState(false)
  const [guardando, setGuard]   = useState(false)
  const [error,    setError]    = useState('')

  // Sub-permisos del dispensario
  const tieneDispensario    = modulosPermitidos.includes('/dispensario')
  const tieneDispIngresos   = modulosPermitidos.includes('/dispensario:ingresos')

  function toggleMod(ruta: string, checked: boolean) {
    setMods(prev => {
      if (checked) return [...prev, ruta]
      // Al quitar dispensario, también quitamos el sub-permiso
      if (ruta === '/dispensario') return prev.filter(r => r !== '/dispensario' && r !== '/dispensario:ingresos')
      return prev.filter(r => r !== ruta)
    })
  }

  function toggleSubpermiso(sub: string, checked: boolean) {
    setMods(prev => checked ? [...prev, sub] : prev.filter(r => r !== sub))
  }

  async function guardar() {
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !cuil.trim()) {
      setError('Completá todos los campos obligatorios'); return
    }
    if (!modoEdicion && (!password || password.length < 6)) {
      setError('La contraseña debe tener al menos 6 caracteres'); return
    }
    const baseModulos = modulosPermitidos.filter(m => !m.includes(':'))
    if (rol !== 'ADMINISTRADOR' && modulosEspecificos && baseModulos.length === 0) {
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
              <select value={rol} onChange={e => { setRol(e.target.value as Rol); setMods([]); setEspec(false) }} className="campo w-full appearance-none pr-8">
                {(Object.keys(ETIQUETA_ROL) as Rol[]).map(r => (
                  <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Módulos (no admins) */}
          {rol !== 'ADMINISTRADOR' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Acceso a módulos</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input type="radio" checked={!modulosEspecificos} onChange={() => { setEspec(false); setMods([]) }} className="accent-[#4a7030]" />
                  Todos los módulos
                </label>
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input type="radio" checked={modulosEspecificos} onChange={() => { setEspec(true); if (modulosPermitidos.filter(m => !m.includes(':')).length === 0) setMods(['/dispensario']) }} className="accent-[#4a7030]" />
                  Módulos específicos
                </label>
              </div>
              {modulosEspecificos && (
                <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                  {MODULOS_DISPONIBLES.map(m => (
                    <div key={m.ruta}>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={modulosPermitidos.includes(m.ruta)}
                          onChange={e => toggleMod(m.ruta, e.target.checked)}
                          className="rounded accent-[#4a7030]"
                        />
                        {m.label}
                      </label>
                      {/* Sub-permiso Dispensario: puede registrar ingresos */}
                      {m.ruta === '/dispensario' && tieneDispensario && (
                        <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none ml-5 mt-1">
                          <input
                            type="checkbox"
                            checked={tieneDispIngresos}
                            onChange={e => toggleSubpermiso('/dispensario:ingresos', e.target.checked)}
                            className="rounded accent-[#4a7030]"
                          />
                          Puede registrar ingresos en dispensario
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {modulosEspecificos && modulosPermitidos.filter(m => !m.includes(':')).length === 0 && (
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
                <button type="button" onClick={() => setVerPass(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="flex-1 py-2.5 text-sm rounded-xl bg-[#1a1814] text-[#FEF8DC] font-medium hover:bg-[#26221a] disabled:opacity-50 flex items-center justify-center gap-2">
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
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-500">Cambiando contraseña de <strong>{usuario.nombre} {usuario.apellido}</strong>.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input type={ver ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="campo w-full pr-10" placeholder="Mínimo 6 caracteres" />
              <button type="button" onClick={() => setVer(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
          {exito && <div className="text-sm text-[#4a7030] bg-[#edf5e0] border border-[#c8e0a0] rounded-lg px-3 py-2">¡Contraseña actualizada!</div>}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cancelar</button>
          <button onClick={guardar} disabled={guardando || exito} className="flex-1 py-2.5 text-sm rounded-xl bg-[#1a1814] text-[#FEF8DC] font-medium hover:bg-[#26221a] disabled:opacity-50 flex items-center justify-center gap-2">
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Cambiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sección con header colapsable ───────────────────────────────────────────

function SeccionConfig({ icono: Icono, titulo, descripcion, children }: {
  icono: React.ElementType
  titulo: string
  descripcion: string
  children: React.ReactNode
}) {
  const [abierta, setAbierta] = useState(true)
  return (
    <div className="bg-white rounded-xl border border-[#E8E6E0] overflow-hidden">
      <button
        onClick={() => setAbierta(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#FAFAF8] transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-[#F5F4F2] flex items-center justify-center shrink-0">
          <Icono className="w-4 h-4 text-[#7a6840]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && <div className="px-5 pb-5 pt-1 border-t border-[#F0EEEA]">{children}</div>}
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

  // Salas (Trazabilidad)
  const [sala1, setSala1]                   = useState('Sala 1')
  const [sala2, setSala2]                   = useState('Sala 2')
  const [guardandoSalas, setGuardandoSalas] = useState(false)
  const [exitoSalas, setExitoSalas]         = useState(false)

  // Sheets URL (Stock Total)
  const [sheetsUrl, setSheetsUrl]               = useState('')
  const [guardandoSheets, setGuardandoSheets]   = useState(false)
  const [exitoSheets, setExitoSheets]           = useState(false)

  useEffect(() => {
    async function cargarConfig() {
      const [r1, r2, rs] = await Promise.all([
        api.get<{ valor: string }>('/configuracion/sala_SALA_1').catch(() => null),
        api.get<{ valor: string }>('/configuracion/sala_SALA_2').catch(() => null),
        api.get<{ valor: string }>('/configuracion/stock_sheets_url').catch(() => null),
      ])
      if (r1?.data?.valor) setSala1(r1.data.valor)
      if (r2?.data?.valor) setSala2(r2.data.valor)
      if (rs?.data?.valor) setSheetsUrl(rs.data.valor)
    }
    cargarConfig()
  }, [])

  async function guardarSalas() {
    setGuardandoSalas(true)
    try {
      await Promise.all([
        api.put('/configuracion/sala_SALA_1', { valor: sala1 || 'Sala 1' }),
        api.put('/configuracion/sala_SALA_2', { valor: sala2 || 'Sala 2' }),
      ])
      setExitoSalas(true)
      setTimeout(() => setExitoSalas(false), 2000)
    } finally {
      setGuardandoSalas(false)
    }
  }

  async function guardarSheets() {
    setGuardandoSheets(true)
    try {
      await api.put('/configuracion/stock_sheets_url', { valor: sheetsUrl || '' })
      setExitoSheets(true)
      setTimeout(() => setExitoSheets(false), 2000)
    } finally {
      setGuardandoSheets(false)
    }
  }

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
    <div className="space-y-4 max-w-3xl">

      {/* ── Usuarios ── */}
      <SeccionConfig icono={Users} titulo="Usuarios" descripcion={`${activos.length} usuario${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}`}>
        <div className="flex justify-end mb-4 mt-2">
          <button
            onClick={() => setModal({ tipo: 'crear' })}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1814] text-[#FEF8DC] rounded-xl text-sm font-medium hover:bg-[#26221a] transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo usuario
          </button>
        </div>

        {cargando ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="rounded-xl border border-[#E8E6E0] divide-y divide-[#F0EEEA] overflow-hidden">
            {[...activos, ...inactivos].map(u => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3.5 ${!u.activo ? 'opacity-50' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-[rgba(200,180,130,0.12)] ring-1 ring-[rgba(200,180,130,0.2)] flex items-center justify-center shrink-0">
                  <span className="text-[#c9b97a] text-sm font-semibold">{u.nombre[0]}{u.apellido[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 text-sm">{u.nombre} {u.apellido}</p>
                    {!u.activo && <span className="text-xs text-slate-400">(inactivo)</span>}
                    {u.id === yo?.id && <span className="text-xs text-[#7a6840] bg-[#F5F4F2] px-2 py-0.5 rounded-full">Vos</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                  {u.modulosPermitidos.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {u.modulosPermitidos.filter(m => !m.includes(':')).map(m => MODULOS_DISPONIBLES.find(x => x.ruta === m)?.label ?? m).join(', ')}
                      {u.modulosPermitidos.includes('/dispensario:ingresos') && ' · +ingresos disp.'}
                    </p>
                  )}
                </div>
                <span className={`hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${COLOR_ROL[u.rol]}`}>
                  {ETIQUETA_ROL[u.rol]}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setModal({ tipo: 'editar', usuario: u })} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#4a7030] hover:bg-[#f0f7e8] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setModal({ tipo: 'pass', usuario: u })} title="Cambiar contraseña" className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  {u.id !== yo?.id && (
                    <button onClick={() => setConfirmToggle(u)} title={u.activo ? 'Desactivar' : 'Activar'} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${u.activo ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-[#4a7030] hover:bg-[#f0f7e8]'}`}>
                      {u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {usuarios.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No hay usuarios</div>}
          </div>
        )}
      </SeccionConfig>

      {/* ── Trazabilidad ── */}
      <SeccionConfig icono={Leaf} titulo="Trazabilidad" descripcion="Nombres de salas y configuración de cultivo">
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sala 1</label>
              <input value={sala1} onChange={e => setSala1(e.target.value)} placeholder="Sala 1" className="campo w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sala 2</label>
              <input value={sala2} onChange={e => setSala2(e.target.value)} placeholder="Sala 2" className="campo w-full" />
            </div>
          </div>
          {exitoSalas && <p className="text-sm text-[#4a7030] bg-[#edf5e0] border border-[#c8e0a0] rounded-lg px-3 py-2">Nombres guardados.</p>}
          <button onClick={guardarSalas} disabled={guardandoSalas} className="flex items-center gap-2 px-4 py-2 bg-[#1a1814] text-[#FEF8DC] rounded-xl text-sm font-medium hover:bg-[#26221a] disabled:opacity-50">
            {guardandoSalas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardandoSalas ? 'Guardando...' : 'Guardar nombres'}
          </button>
        </div>
      </SeccionConfig>

      {/* ── Stock Total ── */}
      <SeccionConfig icono={Package} titulo="Stock Total" descripcion="Sincronización automática desde Google Sheets">
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL de Google Sheets</label>
            <p className="text-xs text-slate-400 mb-2">La hoja debe estar publicada como CSV. Se sincroniza automáticamente al abrir Stock Total.</p>
            <input
              value={sheetsUrl}
              onChange={e => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="campo w-full text-sm"
            />
          </div>
          {exitoSheets && <p className="text-sm text-[#4a7030] bg-[#edf5e0] border border-[#c8e0a0] rounded-lg px-3 py-2">URL guardada.</p>}
          <button onClick={guardarSheets} disabled={guardandoSheets} className="flex items-center gap-2 px-4 py-2 bg-[#1a1814] text-[#FEF8DC] rounded-xl text-sm font-medium hover:bg-[#26221a] disabled:opacity-50">
            {guardandoSheets ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardandoSheets ? 'Guardando...' : 'Guardar URL'}
          </button>
        </div>
      </SeccionConfig>

      {/* ── Dispensario ── */}
      <SeccionConfig icono={Settings2} titulo="Dispensario" descripcion="Control de acceso por usuario">
        <div className="space-y-3 mt-2">
          <p className="text-sm text-slate-500">
            Asigná el módulo <strong>Dispensario</strong> en el perfil de cada usuario para darle acceso.
            Por defecto solo pueden registrar egresos. Activá <em>«Puede registrar ingresos»</em> en el modal de edición para habilitarlo.
          </p>
          <div className="rounded-xl border border-[#E8E6E0] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F5F4F2] border-b border-[#E8E6E0]">
              <div className="grid grid-cols-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>Usuario</span>
                <span>Acceso</span>
                <span>Ingresos</span>
              </div>
            </div>
            {activos.filter(u => u.rol !== 'ADMINISTRADOR').length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No hay usuarios no-administradores</p>
            ) : (
              activos.filter(u => u.rol !== 'ADMINISTRADOR').map(u => {
                const tieneAcceso    = u.modulosPermitidos.length === 0 || u.modulosPermitidos.includes('/dispensario')
                const tieneIngresos  = u.modulosPermitidos.includes('/dispensario:ingresos')
                return (
                  <div key={u.id} className="px-4 py-3 border-b border-[#F0EEEA] last:border-0">
                    <div className="grid grid-cols-3 items-center text-sm">
                      <span className="font-medium text-slate-700">{u.nombre} {u.apellido}</span>
                      <span className={tieneAcceso ? 'text-[#4a7030] font-medium' : 'text-slate-400'}>
                        {tieneAcceso ? '✓ Sí' : '✗ No'}
                      </span>
                      <span className={tieneIngresos ? 'text-[#4a7030] font-medium' : 'text-slate-400'}>
                        {tieneIngresos ? '✓ Sí' : '✗ No'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <p className="text-xs text-slate-400">Los administradores siempre tienen acceso completo al dispensario.</p>
        </div>
      </SeccionConfig>

      {/* Modales */}
      {modal?.tipo === 'crear' && <ModalUsuario onGuardar={cargar} onCerrar={() => setModal(null)} />}
      {modal?.tipo === 'editar' && modal.usuario && <ModalUsuario usuario={modal.usuario} onGuardar={cargar} onCerrar={() => setModal(null)} />}
      {modal?.tipo === 'pass' && modal.usuario && <ModalPassword usuario={modal.usuario} onCerrar={() => setModal(null)} />}

      {/* Confirmar toggle activo */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="font-medium text-slate-900 text-sm mb-2">
              {confirmToggle.activo ? '¿Desactivar' : '¿Activar'} a {confirmToggle.nombre} {confirmToggle.apellido}?
            </p>
            <p className="text-sm text-slate-500 mb-5">
              {confirmToggle.activo ? 'El usuario no podrá iniciar sesión mientras esté inactivo.' : 'El usuario podrá volver a iniciar sesión.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmToggle(null)} className="flex-1 py-2.5 text-sm rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700">Cancelar</button>
              <button onClick={toggleActivo} disabled={toggling} className={`flex-1 py-2.5 text-sm rounded-xl text-white font-medium disabled:opacity-60 flex items-center justify-center gap-2 ${confirmToggle.activo ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a1814] hover:bg-[#26221a]'}`}>
                {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmToggle.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const esquema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})
type FormData = z.infer<typeof esquema>

export default function Login() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const [verPass, setVerPass] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(esquema) })

  if (usuario) return <Navigate to="/" replace />

  async function onSubmit(datos: FormData) {
    setErrorGeneral('')
    try {
      await login(datos.email, datos.password)
      navigate('/')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setErrorGeneral(e.response?.data?.error ?? 'No se pudo conectar al servidor.')
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">

      {/* ── Panel izquierdo (marca) ── */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-black flex-col justify-between p-14 overflow-hidden">

        {/* Patrón de puntos */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #f0deb0 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Glow ambar sutil */}
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-amber-400/5 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Flor Vida Club"
            className="w-10 h-10 rounded-xl object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="text-amber-100/80 font-medium text-sm tracking-widest uppercase">
            Flor Vida Club
          </span>
        </div>

        {/* Texto central */}
        <div className="relative space-y-6">
          <img src="/logo.jpg" alt="Flor Vida" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
          <h1 className="text-6xl font-black text-amber-100 leading-none tracking-tight">
            FLOR<br />VIDA
          </h1>
          <div className="w-12 h-1 bg-amber-400/60 rounded-full" />

          <div className="flex gap-8 pt-2">
            {[
              { valor: 'Socios',       desc: 'padrón completo'    },
              { valor: 'Finanzas',     desc: 'rendición de cuentas' },
              { valor: 'Reportes',     desc: 'exportables PDF/Excel' },
            ].map((s) => (
              <div key={s.valor} className="space-y-0.5">
                <p className="text-amber-400/80 text-xs font-bold uppercase tracking-widest">{s.valor}</p>
                <p className="text-amber-100/30 text-xs">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-amber-100/20 text-xs tracking-wider uppercase">
            Acceso exclusivo · equipo interno
          </p>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-white overflow-y-auto">

        {/* Header mobile */}
        <div className="lg:hidden relative bg-black px-8 pt-12 pb-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle, #f0deb0 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <img
              src="/logo.jpg"
              alt="Flor Vida"
              className="w-14 h-14 rounded-2xl object-cover shadow-lg"
            />
            <div>
              <p className="text-amber-100/50 text-xs tracking-widest uppercase mb-0.5">Acceso interno</p>
              <h1 className="text-2xl font-black text-amber-100 tracking-tight leading-none">FLOR VIDA</h1>
            </div>
          </div>
          <div className="relative w-8 h-0.5 bg-amber-400/50 rounded-full mt-5" />
        </div>

        <div className="w-full max-w-sm p-8 lg:p-0 mx-auto">
          <div className="mb-8 mt-2 lg:mt-0">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenido/a</h2>
            <p className="text-slate-500 text-sm mt-1">Ingresá con tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="etiqueta">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                className={`campo ${errors.email ? 'campo-error' : ''}`}
                {...register('email')}
              />
              {errors.email && (
                <p className="msg-error"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="etiqueta">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={verPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`campo pr-10 ${errors.password ? 'campo-error' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setVerPass(!verPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="msg-error"><AlertCircle className="w-3 h-3" />{errors.password.message}</p>
              )}
            </div>

            {errorGeneral && (
              <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{errorGeneral}</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primario w-full py-2.5 mt-2">
              {isSubmitting
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Ingresando...</>
                : 'Ingresar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            ¿Problemas para ingresar? Contactá al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}

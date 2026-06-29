import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Users, AlertCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

function formatPeso(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function saludoSegunHora(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaHoy(): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

const fmtMes = (s: string) => {
  const [y, m] = s.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(m) - 1]} ${y}`
}

interface DashboardData {
  financiero: { ingresosMes: number; gastosMes: number; netoMes: number; ingresosAnt: number; gastosAnt: number }
  asociados:  { activos: number; pendientes: number; inactivos: number; altasMes: number; cuotasVencidas: number }
}

interface PuntoEvolucion {
  mes: string; ingresos: number; gastos: number; neto: number
}

function SkeletonCard() {
  return <div className="tarjeta p-5 h-[104px] animate-pulse bg-[#f0ebe0]" />
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [data, setData]           = useState<DashboardData | null>(null)
  const [evolucion, setEvolucion] = useState<PuntoEvolucion[]>([])
  const [cargando, setCargando]   = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [rDash, rFin] = await Promise.all([
        fetch(`${API}/api/reportes/dashboard`, { headers: authHeaders() }),
        fetch(`${API}/api/reportes/financiero`, { headers: authHeaders() }),
      ])
      if (rDash.ok) setData(await rDash.json())
      if (rFin.ok)  setEvolucion((await rFin.json()).evolucion ?? [])
    } catch { /* silencioso */ }
    finally  { setCargando(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const variacion = (actual: number, anterior: number) => {
    if (!anterior) return null
    const pct = ((actual - anterior) / anterior) * 100
    return { pct: Math.abs(pct).toFixed(1), sube: pct >= 0 }
  }

  const fin = data?.financiero
  const aso = data?.asociados

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1814]">
            {saludoSegunHora()}, {usuario?.nombre}
          </h2>
          <p className="text-sm text-[#9a8f78] mt-0.5 capitalize">{fechaHoy()}</p>
        </div>
        <span className="badge-verde">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4a7030] animate-pulse" />
          Sistema activo
        </span>
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cargando || !fin ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (<>

          {/* Ingresos */}
          <div className="tarjeta p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[#7a6840] uppercase tracking-wide">Ingresos del mes</p>
              <div className="w-8 h-8 rounded-lg bg-[#edf5e0] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#4a7030]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1a1814] tabular-nums">{formatPeso(fin.ingresosMes)}</p>
            {variacion(fin.ingresosMes, fin.ingresosAnt) && (
              <p className="text-xs mt-1 text-[#9a8f78]">
                {variacion(fin.ingresosMes, fin.ingresosAnt)!.sube ? '↑' : '↓'} {variacion(fin.ingresosMes, fin.ingresosAnt)!.pct}% vs mes anterior
              </p>
            )}
          </div>

          {/* Gastos */}
          <div className="tarjeta p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[#7a6840] uppercase tracking-wide">Gastos del mes</p>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1a1814] tabular-nums">{formatPeso(fin.gastosMes)}</p>
            {variacion(fin.gastosMes, fin.gastosAnt) && (
              <p className="text-xs mt-1 text-[#9a8f78]">
                {variacion(fin.gastosMes, fin.gastosAnt)!.sube ? '↑' : '↓'} {variacion(fin.gastosMes, fin.gastosAnt)!.pct}% vs mes anterior
              </p>
            )}
          </div>

          {/* Neto */}
          <div className="tarjeta p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-[#7a6840] uppercase tracking-wide">Resultado neto</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fin.netoMes >= 0 ? 'bg-[#edf5e0]' : 'bg-red-50'}`}>
                <Wallet className={`w-4 h-4 ${fin.netoMes >= 0 ? 'text-[#4a7030]' : 'text-red-600'}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${fin.netoMes >= 0 ? 'text-[#4a7030]' : 'text-red-600'}`}>
              {formatPeso(fin.netoMes)}
            </p>
            <p className="text-xs mt-1 text-[#9a8f78]">
              {fin.ingresosMes > 0
                ? `${((fin.gastosMes / fin.ingresosMes) * 100).toFixed(1)}% de gasto sobre ingresos`
                : 'Sin ingresos este mes'}
            </p>
          </div>

        </>)}
      </div>

      {/* Segunda fila: Gráfico + Asociados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico ingresos vs gastos */}
        <div className="tarjeta p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#1a1814] mb-5">Ingresos vs Gastos — últimos 6 meses</h3>
          {cargando ? (
            <div className="h-52 animate-pulse bg-[#f0ebe0] rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={evolucion} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4a7030" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4a7030" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede8dc" vertical={false} />
                <XAxis dataKey="mes" tickFormatter={fmtMes} tick={{ fontSize: 11, fill: '#9a8f78' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9a8f78' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip
                  formatter={(v: number) => formatPeso(v)}
                  labelFormatter={fmtMes}
                  contentStyle={{ borderRadius: 8, border: '1px solid #ede8dc', fontSize: 12, color: '#1a1814' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#7a6840' }} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4a7030" strokeWidth={2} fill="url(#gIng)" dot={false} />
                <Area type="monotone" dataKey="gastos"   name="Gastos"   stroke="#dc2626" strokeWidth={2} fill="url(#gGas)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Asociados */}
        <div className="tarjeta p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#9a8f78]" />
            <h3 className="text-sm font-semibold text-[#1a1814]">Asociados</h3>
          </div>

          {cargando || !aso ? (
            <div className="space-y-3">
              {[0,1,2,3].map(i => <div key={i} className="h-9 animate-pulse bg-[#f0ebe0] rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {[
                { label: 'Activos',         valor: aso.activos,    color: 'text-[#4a7030]' },
                { label: 'Pendientes',       valor: aso.pendientes, color: 'text-[#8a6820]' },
                { label: 'Inactivos',        valor: aso.inactivos,  color: 'text-[#7a6840]' },
                { label: 'Altas este mes',   valor: aso.altasMes,   color: 'text-[#1a1814]' },
              ].map(({ label, valor, color }) => (
                <div key={label} className="flex items-center justify-between px-1 py-2.5 border-b border-[#f0ebe0] last:border-0">
                  <span className="text-sm text-[#3a3220]">{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${color}`}>{valor}</span>
                </div>
              ))}

              {aso.cuotasVencidas > 0 && (
                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 font-medium">
                    {aso.cuotasVencidas} cuota{aso.cuotasVencidas !== 1 ? 's' : ''} vencida{aso.cuotasVencidas !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

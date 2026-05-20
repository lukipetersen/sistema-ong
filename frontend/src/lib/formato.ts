const TZ = 'America/Argentina/Buenos_Aires'

export function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
  }).format(valor)
}

export function formatearFecha(fecha: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ,
  }).format(new Date(fecha))
}

export function formatearFechaHora(fecha: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(new Date(fecha))
}

export function formatearCuil(cuil: string): string {
  const n = cuil.replace(/\D/g, '')
  if (n.length !== 11) return cuil
  return `${n.slice(0, 2)}-${n.slice(2, 10)}-${n[10]}`
}

export function validarCuil(cuil: string): boolean {
  const n = cuil.replace(/\D/g, '')
  if (n.length !== 11 || !/^\d{11}$/.test(n)) return false
  const mul = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = mul.reduce((acc, m, i) => acc + parseInt(n[i]) * m, 0)
  const resto = suma % 11
  const v = parseInt(n[10])
  if (resto === 0) return v === 0
  if (resto === 1) return false
  return v === 11 - resto
}

export const PROVINCIAS = [
  'Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza',
  'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
  'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego',
  'Tucumán', 'Ciudad Autónoma de Buenos Aires',
] as const

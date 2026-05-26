export type TipoIngreso = 'VENTA' | 'CUOTA' | 'DONACION'
export type CategoriaIngreso = 'FIJO' | 'VARIABLE'
export type EstadoIngreso = 'COBRADO' | 'PENDIENTE'

export interface Ingreso {
  id: string
  fecha: string
  tipo: TipoIngreso
  categoria: CategoriaIngreso
  descripcion: string
  monto: string
  estado: EstadoIngreso
  observaciones: string | null
  creadoEn: string
}

export interface ResumenIngresos {
  total: number
  totalFijo: number
  totalVar: number
  pendientes: number
  cantPend: number
  porTipo: { tipo: string; total: number }[]
}

export const TIPOS_INGRESO: { value: TipoIngreso; label: string }[] = [
  { value: 'VENTA',    label: 'Venta'    },
  { value: 'CUOTA',    label: 'Cuota'    },
  { value: 'DONACION', label: 'Donación' },
]

export const CATEGORIAS_INGRESO: { value: CategoriaIngreso; label: string }[] = [
  { value: 'FIJO',     label: 'Fijo'     },
  { value: 'VARIABLE', label: 'Variable' },
]

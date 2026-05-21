export type CategoriaGasto = 'FIJOS' | 'VARIABLES' | 'ADMINISTRACION' | 'INVERSION'
export type SubcategoriaGasto = 'ALQUILER' | 'INSUMOS' | 'SUELDOS' | 'SERVICIOS' | 'MANTENIMIENTO' | 'OTROS'
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'CHEQUE'
export type EstadoGasto = 'PAGADO' | 'PENDIENTE'

export interface Gasto {
  id: string
  fecha: string
  categoria: CategoriaGasto
  subcategoria: SubcategoriaGasto
  descripcion: string
  monto: string
  medioPago: MedioPago | null
  estado: EstadoGasto
  notas: string | null
  creadoEn: string
}

export interface ResumenGastos {
  total: number
  totalFijos: number
  totalVar: number
  pendientes: number
  cantPend: number
  porCategoria: { categoria: string; total: number }[]
}

export const CATEGORIAS: { value: CategoriaGasto; label: string }[] = [
  { value: 'FIJOS',          label: 'Fijos'          },
  { value: 'VARIABLES',      label: 'Variables'      },
  { value: 'ADMINISTRACION', label: 'Administración' },
  { value: 'INVERSION',      label: 'Inversión'      },
]

export const SUBCATEGORIAS: { value: SubcategoriaGasto; label: string }[] = [
  { value: 'ALQUILER',      label: 'Alquiler'      },
  { value: 'INSUMOS',       label: 'Insumos'       },
  { value: 'SUELDOS',       label: 'Sueldos'       },
  { value: 'SERVICIOS',     label: 'Servicios'     },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'OTROS',         label: 'Otros'         },
]

export const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'EFECTIVO',        label: 'Efectivo'          },
  { value: 'TRANSFERENCIA',   label: 'Transferencia'     },
  { value: 'TARJETA_DEBITO',  label: 'Tarjeta de débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta de crédito'},
  { value: 'CHEQUE',          label: 'Cheque'            },
]

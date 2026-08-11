export type EstadoAsociado = 'ACTIVO' | 'PENDIENTE' | 'INACTIVO'
export type EstadoCuota   = 'AL_DIA' | 'PARCIAL' | 'VENCIDA' | 'PENDIENTE'
export type Patologia = 'ANSIEDAD'|'INSOMNIO'|'DOLOR'|'EPILEPSIA'|'ESTRES'|'DEPRESION'|
                        'MIGRANA'|'ARTRITIS'|'FIBROMIALGIA'|'PARKINSON'|'TEA'|'APETITO'|
                        'NAUSEAS'|'INFLAMACION'|'OTRA'

export interface Asociado {
  id: string
  nombre: string
  apellido: string
  dni: string
  fechaNacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  sede: string | null
  fechaAlta: string
  estado: EstadoAsociado
  patologia: Patologia | null
  patologiaOtra: string | null
  observaciones: string | null
  notasInternas: string | null
  estadoCuota: EstadoCuota
  cuotaMensual: string | null
  creadoEn: string
  _count?: { seguimientos: number }
}

export interface SeguimientoTerapeutico {
  id: string
  asociadoId: string
  fecha: string
  resultado: string
  observaciones: string | null
  continuidad: boolean
  creadoEn: string
}

export interface CuotaMes {
  id: string
  asociadoId: string
  mes: string   // YYYY-MM
  monto: string
  creadoEn: string
}

export interface PagoAsociado {
  id: string
  asociadoId: string
  monto: string
  fecha: string
  mesCuota: string | null
  concepto: string | null
  medioPago: string | null
  creadoEn: string
}

export const PATOLOGIAS: { value: Patologia; label: string }[] = [
  { value: 'ANSIEDAD',     label: 'Ansiedad'      },
  { value: 'INSOMNIO',     label: 'Insomnio'      },
  { value: 'DOLOR',        label: 'Dolor'         },
  { value: 'EPILEPSIA',    label: 'Epilepsia'     },
  { value: 'ESTRES',       label: 'Estrés'        },
  { value: 'DEPRESION',    label: 'Depresión'     },
  { value: 'MIGRANA',      label: 'Migraña'       },
  { value: 'ARTRITIS',     label: 'Artritis'      },
  { value: 'FIBROMIALGIA', label: 'Fibromialgia'  },
  { value: 'PARKINSON',    label: 'Parkinson'     },
  { value: 'TEA',          label: 'TEA'           },
  { value: 'APETITO',      label: 'Apetito'       },
  { value: 'NAUSEAS',      label: 'Náuseas'       },
  { value: 'INFLAMACION',  label: 'Inflamación'   },
  { value: 'OTRA',         label: 'Otra'          },
]

export const LABEL_ESTADO: Record<EstadoAsociado, string> = {
  ACTIVO:   'Activo',
  PENDIENTE:'Pendiente',
  INACTIVO: 'Inactivo',
}

export const LABEL_CUOTA: Record<EstadoCuota, string> = {
  AL_DIA:   'Al día',
  PARCIAL:  'Parcial',
  VENCIDA:  'Vencida',
  PENDIENTE:'Pendiente',
}

export const LABEL_PATOLOGIA: Record<Patologia, string> = {
  ANSIEDAD:'Ansiedad', INSOMNIO:'Insomnio', DOLOR:'Dolor', EPILEPSIA:'Epilepsia',
  ESTRES:'Estrés', DEPRESION:'Depresión', MIGRANA:'Migraña', ARTRITIS:'Artritis',
  FIBROMIALGIA:'Fibromialgia', PARKINSON:'Parkinson', TEA:'TEA', APETITO:'Apetito',
  NAUSEAS:'Náuseas', INFLAMACION:'Inflamación', OTRA:'Otra',
}

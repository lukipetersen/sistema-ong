export type EstadoLote  = 'PRODUCCION' | 'ACTIVO' | 'FINALIZADO' | 'DESCARTADO' | 'ARCHIVADO'
export type EstadoPlanta = 'ACTIVA' | 'SELECCIONADA' | 'CLONADA' | 'DESCARTADA' | 'ARCHIVADA'
export type Sala         = 'SALA_1' | 'SALA_2'

export interface Genetica {
  id: string
  nombre: string
  descripcion: string | null
  observaciones: string | null
  creadoEn: string
  totalLotes: number
  lotesActivos: number
  totalPlantas: number
  plantasActivas: number
}

export interface GeneticaDetalle extends Omit<Genetica, 'totalLotes' | 'lotesActivos' | 'totalPlantas' | 'plantasActivas'> {
  actualizadoEn: string
  lotes: LoteResumen[]
}

export interface LoteResumen {
  id: string
  codigo: string
  sala: Sala
  estado: EstadoLote
  fechaInicio: string
  fechaFinalizacion: string | null
  observaciones: string | null
  creadoEn: string
  totalPlantas: number
  plantasActivas: number
  plantasSeleccionadas: number
}

export interface Lote extends LoteResumen {
  geneticaId: string
  actualizadoEn: string
  genetica: { id: string; nombre: string }
}

export interface LoteDetalle extends Lote {
  plantas: Planta[]
  historial: HistorialLote[]
}

export interface Planta {
  id: string
  codigo: string
  loteId: string
  alias: string | null
  estado: EstadoPlanta
  observaciones: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface HistorialLote {
  id: string
  loteId: string
  accion: string
  detalles: string | null
  creadoEn: string
}

// ─── Labels ─────────────────────────────────────────────────────────────────

export const ESTADO_LOTE_LABELS: Record<EstadoLote, string> = {
  PRODUCCION: 'Producción',
  ACTIVO:     'Activo',
  FINALIZADO: 'Finalizado',
  DESCARTADO: 'Descartado',
  ARCHIVADO:  'Archivado',
}

export const ESTADO_PLANTA_LABELS: Record<EstadoPlanta, string> = {
  ACTIVA:        'Activa',
  SELECCIONADA:  'Seleccionada',
  CLONADA:       'Clonada',
  DESCARTADA:    'Descartada',
  ARCHIVADA:     'Archivada',
}

export const SALA_LABELS: Record<Sala, string> = {
  SALA_1: 'Sala 1',
  SALA_2: 'Sala 2',
}

export const ESTADO_LOTE_COLOR: Record<EstadoLote, string> = {
  PRODUCCION: 'bg-blue-100 text-blue-800',
  ACTIVO:     'bg-green-100 text-green-800',
  FINALIZADO: 'bg-gray-100 text-gray-700',
  DESCARTADO: 'bg-red-100 text-red-800',
  ARCHIVADO:  'bg-yellow-100 text-yellow-800',
}

export const ESTADO_PLANTA_COLOR: Record<EstadoPlanta, string> = {
  ACTIVA:       'bg-green-100 text-green-800',
  SELECCIONADA: 'bg-purple-100 text-purple-800',
  CLONADA:      'bg-blue-100 text-blue-800',
  DESCARTADA:   'bg-red-100 text-red-800',
  ARCHIVADA:    'bg-gray-100 text-gray-700',
}

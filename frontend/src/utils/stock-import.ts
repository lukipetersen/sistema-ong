import { api } from '@/lib/api'
import { parsearCsvTexto, parsearFecha, normHeader, urlCsvDeSheets } from './gastos-import'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FilaMovimiento {
  sheetsId: string | null
  geneticaNombre: string
  tipo: string
  cantidadGramos: number | null
  fecha: string | null
  observaciones: string | null
  errorFila: string | null
}

export interface ResultadoImportStock {
  importados: number
  actualizados: number
  omitidos: number
  errores: { fila: number; error: string }[]
}

// ─── Mapa de headers ──────────────────────────────────────────────────────────

const HEADER_MAP: Record<string, keyof FilaMovimiento> = {
  id: 'sheetsId', sheetsid: 'sheetsId', codigo: 'sheetsId', identificador: 'sheetsId', num: 'sheetsId',
  genetica: 'geneticaNombre', geneticaid: 'geneticaNombre', nombre: 'geneticaNombre', variedad: 'geneticaNombre', strain: 'geneticaNombre',
  tipo: 'tipo', type: 'tipo', movimiento: 'tipo',
  cantidad: 'cantidadGramos', cantidadgramos: 'cantidadGramos', gramos: 'cantidadGramos', peso: 'cantidadGramos', amount: 'cantidadGramos',
  fecha: 'fecha', date: 'fecha',
  observaciones: 'observaciones', notas: 'observaciones', obs: 'observaciones', notes: 'observaciones', comentarios: 'observaciones',
}

// ─── Normalizar tipo ──────────────────────────────────────────────────────────

function normalizarTipo(raw: string): string | null {
  const v = raw.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (['ingreso', 'entrada', 'in', 'compra', 'i'].includes(v)) return 'INGRESO'
  if (['egreso', 'salida', 'out', 'venta', 'e', 'consumo'].includes(v)) return 'EGRESO'
  if (v === 'ingreso' || v === 'egreso') return v.toUpperCase()
  return null
}

// ─── Parsear cantidad (convierte kg→g si la columna es "kg") ──────────────────

function parsearCantidad(raw: unknown, esKg = false): number | null {
  if (raw == null || raw === '') return null
  const s = String(raw).replace(/[^\d.,\-]/g, '').replace(',', '.')
  const n = parseFloat(s)
  if (isNaN(n) || n <= 0) return null
  return esKg ? Math.round(n * 1000) : Math.round(n)
}

// ─── Parsear filas ────────────────────────────────────────────────────────────

export function parsearFilasMovimientos(rows: Record<string, unknown>[]): FilaMovimiento[] {
  if (rows.length === 0) return []

  const rawHeaders = Object.keys(rows[0])
  const headerMap: Record<string, keyof FilaMovimiento> = {}
  const esCantidadKg: Record<string, boolean> = {}

  for (const h of rawHeaders) {
    const norm = normHeader(h)
    if (HEADER_MAP[norm]) headerMap[h] = HEADER_MAP[norm]
    // Detectar si la columna de cantidad está en kg
    if (['cantidad(kg)', 'gramos(kg)', 'kg', 'kilogramos'].includes(norm) ||
        norm.includes('kg') && !norm.includes('gramos')) {
      esCantidadKg[h] = true
    }
  }

  const get = (row: Record<string, unknown>, key: keyof FilaMovimiento): string => {
    for (const [col, field] of Object.entries(headerMap)) {
      if (field === key && row[col] != null) return String(row[col]).trim()
    }
    return ''
  }

  const getFechaRaw = (row: Record<string, unknown>): unknown => {
    for (const [col, field] of Object.entries(headerMap)) {
      if (field === 'fecha' && row[col] != null) return row[col]
    }
    return null
  }

  const getCantidad = (row: Record<string, unknown>): number | null => {
    for (const [col, field] of Object.entries(headerMap)) {
      if (field === 'cantidadGramos' && row[col] != null) {
        return parsearCantidad(row[col], !!esCantidadKg[col])
      }
    }
    return null
  }

  return rows
    .filter(r => Object.values(r).some(v => v !== '' && v != null))
    .map((row): FilaMovimiento => {
      const sheetsIdRaw = get(row, 'sheetsId')
      const sheetsId    = sheetsIdRaw !== '' ? sheetsIdRaw : null

      const geneticaNombre = get(row, 'geneticaNombre')
      const tipoRaw        = get(row, 'tipo')
      const tipo           = normalizarTipo(tipoRaw)
      const cantidadGramos = getCantidad(row)
      const fechaRaw       = getFechaRaw(row)
      const fecha          = parsearFecha(fechaRaw)
      const observaciones  = get(row, 'observaciones') || null

      let errorFila: string | null = null
      if (!geneticaNombre)                    errorFila = 'Falta el nombre de la genética'
      else if (!tipo)                         errorFila = `Tipo inválido: "${tipoRaw}"`
      else if (cantidadGramos === null)       errorFila = 'Cantidad inválida o faltante'
      else if (!fecha)                        errorFila = 'Fecha inválida o faltante'

      return { sheetsId, geneticaNombre, tipo: tipo ?? tipoRaw, cantidadGramos, fecha, observaciones, errorFila }
    })
}

// ─── Auto-importar desde Google Sheets ───────────────────────────────────────

export async function autoImportarMovimientos(
  geneticasMap: Map<string, string>
): Promise<ResultadoImportStock | null> {
  const { data: cfg } = await api.get('/configuracion/stock_sheets_url')
  const url = cfg.valor as string | null
  if (!url) return null

  const csvUrl = urlCsvDeSheets(url)
  const resp = await fetch(csvUrl)
  if (!resp.ok) throw new Error('No se pudo acceder al sheet de movimientos')

  const text  = await resp.text()
  const rows  = parsearCsvTexto(text)
  const filas = parsearFilasMovimientos(rows)
  const validas = filas.filter(f => !f.errorFila)

  if (validas.length === 0) return { importados: 0, actualizados: 0, omitidos: 0, errores: [] }

  // Resolver nombres de genética a IDs (case-insensitive)
  const normNombre = (n: string) => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const mapaLower  = new Map<string, string>()
  for (const [nombre, id] of geneticasMap) mapaLower.set(normNombre(nombre), id)

  const payload: unknown[] = []
  const erroresResolucion: { fila: number; error: string }[] = []

  validas.forEach((f, idx) => {
    const gId = mapaLower.get(normNombre(f.geneticaNombre))
    if (!gId) {
      erroresResolucion.push({ fila: idx + 2, error: `Genética no encontrada: "${f.geneticaNombre}"` })
      return
    }
    payload.push({
      sheetsId:      f.sheetsId,
      geneticaId:    gId,
      tipo:          f.tipo,
      cantidadGramos: f.cantidadGramos,
      fecha:         f.fecha,
      observaciones: f.observaciones,
    })
  })

  if (payload.length === 0) {
    return { importados: 0, actualizados: 0, omitidos: validas.length, errores: erroresResolucion }
  }

  const { data } = await api.post('/movimientos-stock/importar', { movimientos: payload })
  return {
    ...data,
    errores: [...(data.errores ?? []), ...erroresResolucion],
  } as ResultadoImportStock
}

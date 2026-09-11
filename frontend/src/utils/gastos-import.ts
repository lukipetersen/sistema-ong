import * as XLSX from 'xlsx'
import { api } from '@/lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface FilaParseada {
  sheetsId: string | null
  fecha: string
  categoria: string
  subcategoria: string
  descripcion: string
  monto: number | null
  medioPago: string
  estado: string
  notas: string
  errorFila: string | null
}

export interface ResultadoImport {
  importados: number
  omitidos: number
  errores: { fila: number; error: string }[]
}

// ─── Normalización de headers ─────────────────────────────────────────────────

export const normHeader = (h: string) =>
  h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_\-]/g, '')

export const normVal = (v: string) =>
  v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export const HEADER_MAP: Record<string, keyof FilaParseada> = {
  id: 'sheetsId', codigo: 'sheetsId', code: 'sheetsId', sheetsid: 'sheetsId', identificador: 'sheetsId', num: 'sheetsId',
  fecha: 'fecha', date: 'fecha',
  categoria: 'categoria', category: 'categoria',
  subcategoria: 'subcategoria', subcategory: 'subcategoria',
  descripcion: 'descripcion', description: 'descripcion', detalle: 'descripcion', concepto: 'descripcion',
  monto: 'monto', amount: 'monto', importe: 'monto', valor: 'monto',
  mediopago: 'medioPago', medio: 'medioPago', formadepago: 'medioPago', payment: 'medioPago',
  estado: 'estado', status: 'estado',
  notas: 'notas', notes: 'notas', observaciones: 'notas', comentarios: 'notas',
}

export const CATEGORIA_MAP: Record<string, string> = {
  fijos: 'FIJOS', fijo: 'FIJOS', fixed: 'FIJOS',
  variables: 'VARIABLES', variable: 'VARIABLES',
  administracion: 'ADMINISTRACION', admin: 'ADMINISTRACION',
  inversion: 'INVERSION', inversiones: 'INVERSION',
}

export const SUBCATEGORIA_MAP: Record<string, string> = {
  alquiler: 'ALQUILER', alquileres: 'ALQUILER',
  insumos: 'INSUMOS', insumo: 'INSUMOS', materiales: 'INSUMOS',
  sueldos: 'SUELDOS', sueldo: 'SUELDOS', salarios: 'SUELDOS', salario: 'SUELDOS',
  servicios: 'SERVICIOS', servicio: 'SERVICIOS',
  mantenimiento: 'MANTENIMIENTO', mantenimientos: 'MANTENIMIENTO',
  otros: 'OTROS', otro: 'OTROS', other: 'OTROS', varios: 'OTROS',
}

export const MEDIO_MAP: Record<string, string> = {
  efectivo: 'EFECTIVO', cash: 'EFECTIVO',
  transferencia: 'TRANSFERENCIA', transfer: 'TRANSFERENCIA', transf: 'TRANSFERENCIA',
  debito: 'TARJETA_DEBITO', tarjetadebito: 'TARJETA_DEBITO',
  credito: 'TARJETA_CREDITO', tarjetacredito: 'TARJETA_CREDITO',
  cheque: 'CHEQUE',
  '': '',
}

export const ESTADO_MAP: Record<string, string> = {
  pagado: 'PAGADO', paid: 'PAGADO', pago: 'PAGADO',
  pendiente: 'PENDIENTE', pending: 'PENDIENTE',
  '': 'PAGADO',
}

// ─── URL helper ───────────────────────────────────────────────────────────────

export function urlCsvDeSheets(url: string): string {
  if (url.includes('/pub') && url.includes('output=csv')) return url
  const match = url.match(/\/spreadsheets\/d\/([^\/\?#]+)/)
  if (!match) throw new Error('URL de Google Sheets inválida. Copiá la URL del sheet.')
  const id = match[1]
  const gidMatch = url.match(/[#&?]gid=(\d+)/)
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid}`
}

// ─── Parser CSV manual ────────────────────────────────────────────────────────

export function parsearCsvTexto(text: string): Record<string, unknown>[] {
  const splitLinea = (linea: string): string[] => {
    const campos: string[] = []
    let campo = ''
    let enComillas = false
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i]
      if (ch === '"') {
        if (enComillas && linea[i + 1] === '"') { campo += '"'; i++ }
        else enComillas = !enComillas
      } else if (ch === ',' && !enComillas) {
        campos.push(campo)
        campo = ''
      } else {
        campo += ch
      }
    }
    campos.push(campo)
    return campos
  }

  const lineas: string[] = []
  let lineaActual = ''
  let enComillas = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (enComillas && text[i + 1] === '"') { lineaActual += '"'; i++ }
      else enComillas = !enComillas
      lineaActual += ch
    } else if ((ch === '\n' || ch === '\r') && !enComillas) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      lineas.push(lineaActual)
      lineaActual = ''
    } else {
      lineaActual += ch
    }
  }
  if (lineaActual) lineas.push(lineaActual)

  if (lineas.length < 2) return []
  const headers = splitLinea(lineas[0])
  return lineas.slice(1)
    .filter(l => l.trim())
    .map(linea => {
      const vals = splitLinea(linea)
      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
}

// ─── Parseo de fecha ──────────────────────────────────────────────────────────

export function parsearFecha(valor: unknown): string | null {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`
    return null
  }

  const str = String(valor).trim()

  const mIso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`

  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) {
    const a = parseInt(m1[1]), b = parseInt(m1[2])
    if (a > 12) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
    if (b > 12) return `${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}`
    return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  }

  const m3 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (m3) {
    const anio = parseInt(m3[3]) + (parseInt(m3[3]) < 50 ? 2000 : 1900)
    return `${anio}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`
  }

  return null
}

// ─── Parseo de monto ──────────────────────────────────────────────────────────

export function parsearMonto(str: string): number | null {
  let s = str.replace(/[$\s]/g, '')
  if (!s) return null

  const tienePunto = s.includes('.')
  const tieneComa  = s.includes(',')

  if (tienePunto && tieneComa) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (tieneComa) {
    if (/,\d{3}$/.test(s) && s.indexOf(',') !== s.lastIndexOf(',') === false) {
      s = s.replace(/,/g, '')
    } else {
      s = s.replace(',', '.')
    }
  } else if (tienePunto && /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, '')
  }

  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// ─── Validación de fila ───────────────────────────────────────────────────────

export function validarFila(raw: Record<string, unknown>, headerMap: Record<string, keyof FilaParseada>): FilaParseada {
  const get = (key: keyof FilaParseada): string => {
    for (const [col, field] of Object.entries(headerMap)) {
      if (field === key && raw[col] != null) return String(raw[col]).trim()
    }
    return ''
  }

  const fechaRaw = (() => {
    for (const [col, field] of Object.entries(headerMap)) {
      if (field === 'fecha' && raw[col] != null) return raw[col]
    }
    return null
  })()

  const fechaParsed = parsearFecha(fechaRaw)
  const monto = parsearMonto(get('monto'))

  const catRaw = normVal(get('categoria'))
  const categoria = CATEGORIA_MAP[catRaw] || CATEGORIA_MAP[get('categoria')] || ''

  const subRaw = normVal(get('subcategoria'))
  const subcategoria = SUBCATEGORIA_MAP[subRaw] || SUBCATEGORIA_MAP[get('subcategoria')] || ''

  const medioRaw = normVal(get('medioPago'))
  const medioPago = MEDIO_MAP[medioRaw] ?? ''

  const estadoRaw = normVal(get('estado'))
  const estado = ESTADO_MAP[estadoRaw] ?? 'PAGADO'

  const descripcion = get('descripcion')
  const notas = get('notas')
  const sheetsIdRaw = get('sheetsId')
  const sheetsId = sheetsIdRaw !== '' ? sheetsIdRaw : null

  let errorFila: string | null = null
  if (!fechaParsed)                              errorFila = 'Fecha inválida o faltante'
  else if (!categoria)                           errorFila = `Categoría desconocida: "${get('categoria')}"`
  else if (!subcategoria)                        errorFila = `Subcategoría desconocida: "${get('subcategoria')}"`
  else if (!descripcion)                         errorFila = 'Falta la descripción'
  else if (monto === null || isNaN(monto) || monto <= 0) errorFila = 'Monto inválido'

  return { sheetsId, fecha: fechaParsed ?? '', categoria, subcategoria, descripcion, monto, medioPago, estado, notas, errorFila }
}

// ─── Procesar rows crudos ─────────────────────────────────────────────────────

export function procesarRows(rows: Record<string, unknown>[]): { filas: FilaParseada[] } {
  if (rows.length === 0) return { filas: [] }
  const headers = Object.keys(rows[0])
  const headerMap: Record<string, keyof FilaParseada> = {}
  for (const h of headers) {
    const norm = normHeader(h)
    if (HEADER_MAP[norm]) headerMap[h] = HEADER_MAP[norm]
  }
  const filas = rows
    .filter(r => Object.values(r).some(v => v !== '' && v != null))
    .map(r => validarFila(r, headerMap))
  return { filas }
}

// ─── Auto-import desde Google Sheets ─────────────────────────────────────────

export async function autoImportarGastos(): Promise<ResultadoImport | null> {
  const { data: cfg } = await api.get('/configuracion/gastos_sheets_url')
  const url = cfg.valor as string | null
  if (!url) return null

  const csvUrl = urlCsvDeSheets(url)
  const resp = await fetch(csvUrl)
  if (!resp.ok) throw new Error('No se pudo acceder al sheet')

  const text = await resp.text()
  const rows = parsearCsvTexto(text)
  const { filas } = procesarRows(rows)
  const validas = filas.filter(f => !f.errorFila)

  if (validas.length === 0) return { importados: 0, omitidos: 0, errores: [] }

  const { data } = await api.post('/gastos/importar', {
    gastos: validas.map(f => ({
      sheetsId:     f.sheetsId || null,
      fecha:        f.fecha,
      categoria:    f.categoria,
      subcategoria: f.subcategoria,
      descripcion:  f.descripcion,
      monto:        f.monto,
      medioPago:    f.medioPago || null,
      estado:       f.estado,
      notas:        f.notas || null,
    })),
  })

  return data as ResultadoImport
}

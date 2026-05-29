import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface FilaParseada {
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

interface Props {
  onImportado: () => void
  onCerrar: () => void
}

// ─── Mapeos de normalización ──────────────────────────────────────────────────

const normHeader = (h: string) =>
  h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_\-]/g, '')

const HEADER_MAP: Record<string, keyof FilaParseada> = {
  fecha: 'fecha', date: 'fecha',
  categoria: 'categoria', category: 'categoria',
  subcategoria: 'subcategoria', subcategory: 'subcategoria',
  descripcion: 'descripcion', description: 'descripcion', detalle: 'descripcion', concepto: 'descripcion',
  monto: 'monto', amount: 'monto', importe: 'monto', valor: 'monto',
  mediopago: 'medioPago', medio: 'medioPago', formadepago: 'medioPago', payment: 'medioPago',
  estado: 'estado', status: 'estado',
  notas: 'notas', notes: 'notas', observaciones: 'notas', comentarios: 'notas',
}

const normVal = (v: string) =>
  v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const CATEGORIA_MAP: Record<string, string> = {
  fijos: 'FIJOS', fijo: 'FIJOS', fixed: 'FIJOS',
  variables: 'VARIABLES', variable: 'VARIABLES',
  administracion: 'ADMINISTRACION', admin: 'ADMINISTRACION', administracion2: 'ADMINISTRACION',
  inversion: 'INVERSION', inversiones: 'INVERSION',
  // también aceptar los valores exactos del enum
  FIJOS: 'FIJOS', VARIABLES: 'VARIABLES', ADMINISTRACION: 'ADMINISTRACION', INVERSION: 'INVERSION',
}

const SUBCATEGORIA_MAP: Record<string, string> = {
  alquiler: 'ALQUILER', alquileres: 'ALQUILER',
  insumos: 'INSUMOS', insumo: 'INSUMOS', materiales: 'INSUMOS',
  sueldos: 'SUELDOS', sueldo: 'SUELDOS', salarios: 'SUELDOS', salario: 'SUELDOS',
  servicios: 'SERVICIOS', servicio: 'SERVICIOS',
  mantenimiento: 'MANTENIMIENTO', mantenimientos: 'MANTENIMIENTO',
  otros: 'OTROS', otro: 'OTROS', other: 'OTROS', varios: 'OTROS',
}

const MEDIO_MAP: Record<string, string> = {
  efectivo: 'EFECTIVO', cash: 'EFECTIVO',
  transferencia: 'TRANSFERENCIA', transfer: 'TRANSFERENCIA', transf: 'TRANSFERENCIA',
  debito: 'TARJETA_DEBITO', 'tarjeta debito': 'TARJETA_DEBITO', tarjetadebito: 'TARJETA_DEBITO',
  credito: 'TARJETA_CREDITO', 'tarjeta credito': 'TARJETA_CREDITO', tarjetacredito: 'TARJETA_CREDITO',
  cheque: 'CHEQUE',
  '': '',
}

const ESTADO_MAP: Record<string, string> = {
  pagado: 'PAGADO', paid: 'PAGADO', pago: 'PAGADO',
  pendiente: 'PENDIENTE', pending: 'PENDIENTE',
  '': 'PAGADO',
}

// ─── Parseo de fecha ──────────────────────────────────────────────────────────

function parsearFecha(valor: unknown): string | null {
  if (valor == null || valor === '') return null

  // Número serial de Excel
  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`
    return null
  }

  const str = String(valor).trim()

  // Formatos: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY
  const patrones = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,   // DD/MM/YYYY
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,   // YYYY-MM-DD
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,   // DD/MM/YY
  ]

  const m1 = str.match(patrones[0])
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`

  const m2 = str.match(patrones[1])
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`

  const m3 = str.match(patrones[2])
  if (m3) {
    const anio = parseInt(m3[3]) + (parseInt(m3[3]) < 50 ? 2000 : 1900)
    return `${anio}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`
  }

  // Intentar Date nativo
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return null
}

// ─── Validar y normalizar una fila ───────────────────────────────────────────

function validarFila(raw: Record<string, unknown>, headerMap: Record<string, keyof FilaParseada>): FilaParseada {
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
  const montoRaw = get('monto').replace(/[$.]/g, '').replace(',', '.')
  const monto = montoRaw !== '' ? parseFloat(montoRaw) : null

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

  // Determinar error
  let errorFila: string | null = null
  if (!fechaParsed)          errorFila = 'Fecha inválida o faltante'
  else if (!categoria)       errorFila = `Categoría desconocida: "${get('categoria')}"`
  else if (!subcategoria)    errorFila = `Subcategoría desconocida: "${get('subcategoria')}"`
  else if (!descripcion)     errorFila = 'Falta la descripción'
  else if (monto === null || isNaN(monto) || monto <= 0) errorFila = 'Monto inválido'

  return {
    fecha:        fechaParsed ?? '',
    categoria,
    subcategoria,
    descripcion,
    monto,
    medioPago:    MEDIO_MAP[medioRaw] ?? '',
    estado,
    notas,
    errorFila,
  }
}

// ─── Labels para preview ──────────────────────────────────────────────────────

const LABEL_CAT: Record<string, string> = {
  FIJOS: 'Fijos', VARIABLES: 'Variables', ADMINISTRACION: 'Admin.', INVERSION: 'Inversión',
}
const LABEL_SUB: Record<string, string> = {
  ALQUILER: 'Alquiler', INSUMOS: 'Insumos', SUELDOS: 'Sueldos',
  SERVICIOS: 'Servicios', MANTENIMIENTO: 'Mantenim.', OTROS: 'Otros',
}

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Descarga de plantilla ────────────────────────────────────────────────────

function descargarPlantilla() {
  const headers = ['Fecha', 'Categoría', 'Subcategoría', 'Descripción', 'Monto', 'Medio de pago', 'Estado', 'Notas']
  const ejemplos = [
    ['01/05/2026', 'Fijos',     'Alquiler',      'Alquiler mayo',         15000, 'Transferencia', 'Pagado',   ''],
    ['05/05/2026', 'Variables', 'Insumos',        'Compra de sustrato',     3200, 'Efectivo',      'Pagado',   'Vivero Sur'],
    ['10/05/2026', 'Variables', 'Servicios',      'Internet',               4500, 'Débito',        'Pendiente',''],
    ['15/05/2026', 'Administracion', 'Sueldos',   'Sueldo coordinadora',   80000, 'Transferencia', 'Pagado',   ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplos])
  ws['!cols'] = [12, 16, 16, 28, 10, 18, 12, 20].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
  XLSX.writeFile(wb, 'plantilla_gastos.xlsx')
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Paso = 'seleccion' | 'preview' | 'resultado'

export default function ModalImportarGastos({ onImportado, onCerrar }: Props) {
  const [paso, setPaso]           = useState<Paso>('seleccion')
  const [filas, setFilas]         = useState<FilaParseada[]>([])
  const [archivoNombre, setArchivoNombre] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<{ importados: number; errores: { fila: number; error: string }[] } | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const procesarArchivo = useCallback((file: File) => {
    if (!file) return
    setArchivoNombre(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' })

        if (rows.length === 0) return

        // Mapear columnas del Excel a campos internos
        const headers = Object.keys(rows[0])
        const headerMap: Record<string, keyof FilaParseada> = {}
        for (const h of headers) {
          const norm = normHeader(h)
          if (HEADER_MAP[norm]) headerMap[h] = HEADER_MAP[norm]
        }

        const parsed = rows
          .filter(r => Object.values(r).some(v => v !== '' && v != null))
          .map(r => validarFila(r, headerMap))

        setFilas(parsed)
        setPaso('preview')
      } catch {
        alert('No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx, .xls) o CSV.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesarArchivo(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }

  async function importar() {
    const validas = filas.filter(f => !f.errorFila)
    if (validas.length === 0) return
    setImportando(true)
    try {
      const { data } = await api.post('/gastos/importar', {
        gastos: validas.map(f => ({
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
      setResultado(data)
      setPaso('resultado')
    } finally {
      setImportando(false)
    }
  }

  const validas  = filas.filter(f => !f.errorFila)
  const invalidas = filas.filter(f => f.errorFila)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Importar gastos desde Excel</h2>
          </div>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paso 1: Selección de archivo */}
        {paso === 'seleccion' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Instrucciones */}
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-800 mb-2">El archivo debe tener estas columnas:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span><span className="font-medium text-slate-700">Fecha</span> — DD/MM/AAAA</span>
                <span><span className="font-medium text-slate-700">Categoría</span> — Fijos / Variables / Administración / Inversión</span>
                <span><span className="font-medium text-slate-700">Subcategoría</span> — Alquiler / Insumos / Sueldos / Servicios / Mantenimiento / Otros</span>
                <span><span className="font-medium text-slate-700">Descripción</span> — texto libre</span>
                <span><span className="font-medium text-slate-700">Monto</span> — número (sin $)</span>
                <span><span className="font-medium text-slate-700">Medio de pago</span> — opcional</span>
                <span><span className="font-medium text-slate-700">Estado</span> — Pagado / Pendiente (opcional)</span>
                <span><span className="font-medium text-slate-700">Notas</span> — opcional</span>
              </div>
            </div>

            {/* Zona de drop */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Upload className={`w-8 h-8 ${dragOver ? 'text-emerald-500' : 'text-slate-300'}`} />
              <p className="text-sm text-slate-600 font-medium">Hacé click o arrastrá tu archivo aquí</p>
              <p className="text-xs text-slate-400">Formatos aceptados: .xlsx, .xls, .csv</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileChange}
                className="hidden"
              />
            </div>

            {/* Descargar plantilla */}
            <button
              onClick={descargarPlantilla}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar plantilla de ejemplo
            </button>
          </div>
        )}

        {/* Paso 2: Preview */}
        {paso === 'preview' && (
          <>
            {/* Resumen */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex items-center gap-4 flex-wrap">
              <span className="text-sm text-slate-500">{archivoNombre}</span>
              <div className="flex gap-3 ml-auto">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {validas.length} válidos
                </span>
                {invalidas.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" /> {invalidas.length} con error
                  </span>
                )}
              </div>
            </div>

            {/* Tabla preview */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide w-6">#</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Fecha</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Cat.</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Sub.</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Descripción</th>
                    <th className="px-3 py-2.5 text-right text-slate-400 font-semibold uppercase tracking-wide">Monto</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filas.map((f, i) => (
                    <tr key={i} className={f.errorFila ? 'bg-red-50' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2 text-slate-400">{i + 2}</td>
                      {f.errorFila ? (
                        <td colSpan={6} className="px-3 py-2">
                          <span className="flex items-center gap-1.5 text-red-600 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {f.errorFila}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                            {f.fecha ? new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{LABEL_CAT[f.categoria] || f.categoria}</td>
                          <td className="px-3 py-2 text-slate-600">{LABEL_SUB[f.subcategoria] || f.subcategoria}</td>
                          <td className="px-3 py-2 text-slate-800 font-medium max-w-[180px] truncate">{f.descripcion}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                            {f.monto != null ? ars(f.monto) : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{f.estado === 'PENDIENTE' ? 'Pendiente' : 'Pagado'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-between items-center">
              <button
                onClick={() => { setPaso('seleccion'); setFilas([]) }}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Cambiar archivo
              </button>
              <div className="flex gap-3">
                <button onClick={onCerrar} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700">
                  Cancelar
                </button>
                <button
                  onClick={importar}
                  disabled={validas.length === 0 || importando}
                  className="btn-primario px-5 py-2 flex items-center gap-2 disabled:opacity-50"
                >
                  {importando
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importando...</>
                    : <><Upload className="w-3.5 h-3.5" />Importar {validas.length} gasto{validas.length !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
            </div>
          </>
        )}

        {/* Paso 3: Resultado */}
        {paso === 'resultado' && resultado && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {resultado.importados} gasto{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''}
              </p>
              {resultado.errores.length > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {resultado.errores.length} fila{resultado.errores.length !== 1 ? 's' : ''} no se pudo importar
                </p>
              )}
            </div>
            <button
              onClick={() => { onImportado(); onCerrar() }}
              className="btn-primario px-6 py-2"
            >
              Ver gastos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface FilaParseada {
  fecha: string
  tipo: string
  categoria: string
  descripcion: string
  monto: number | null
  estado: string
  observaciones: string
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
  tipo: 'tipo', tipodeingreso: 'tipo', type: 'tipo', tipodepago: 'tipo',
  categoria: 'categoria', category: 'categoria',
  descripcion: 'descripcion', description: 'descripcion', detalle: 'descripcion', concepto: 'descripcion',
  monto: 'monto', amount: 'monto', importe: 'monto', valor: 'monto',
  estado: 'estado', status: 'estado',
  observaciones: 'observaciones', observations: 'observaciones', notas: 'observaciones', notes: 'observaciones',
}

const normVal = (v: string) =>
  v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const TIPO_MAP: Record<string, string> = {
  venta: 'VENTA', ventas: 'VENTA', sale: 'VENTA', sales: 'VENTA',
  cuota: 'CUOTA', cuotas: 'CUOTA', fee: 'CUOTA', quota: 'CUOTA', membresia: 'CUOTA',
  donacion: 'DONACION', donaciones: 'DONACION', donativo: 'DONACION', donation: 'DONACION',
  VENTA: 'VENTA', CUOTA: 'CUOTA', DONACION: 'DONACION',
}

const CATEGORIA_MAP: Record<string, string> = {
  fijo: 'FIJO', fijos: 'FIJO', fixed: 'FIJO', regular: 'FIJO',
  variable: 'VARIABLE', variables: 'VARIABLE',
  FIJO: 'FIJO', VARIABLE: 'VARIABLE',
}

const ESTADO_MAP: Record<string, string> = {
  cobrado: 'COBRADO', cobrados: 'COBRADO', pagado: 'COBRADO', paid: 'COBRADO', collected: 'COBRADO',
  pendiente: 'PENDIENTE', pending: 'PENDIENTE',
  '': 'COBRADO',
}

// ─── Parseo de fecha ──────────────────────────────────────────────────────────

function parsearFecha(valor: unknown): string | null {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number') {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`
    return null
  }

  const str = String(valor).trim()

  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`

  const m2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`

  const m3 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/)
  if (m3) {
    const anio = parseInt(m3[3]) + (parseInt(m3[3]) < 50 ? 2000 : 1900)
    return `${anio}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`
  }

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

  const tipoRaw = normVal(get('tipo'))
  const tipo = TIPO_MAP[tipoRaw] || TIPO_MAP[get('tipo')] || ''

  const catRaw = normVal(get('categoria'))
  const categoria = CATEGORIA_MAP[catRaw] || CATEGORIA_MAP[get('categoria')] || ''

  const estadoRaw = normVal(get('estado'))
  const estado = ESTADO_MAP[estadoRaw] ?? 'COBRADO'

  const descripcion = get('descripcion')
  const observaciones = get('observaciones')

  let errorFila: string | null = null
  if (!fechaParsed)        errorFila = 'Fecha inválida o faltante'
  else if (!tipo)          errorFila = `Tipo desconocido: "${get('tipo')}"`
  else if (!categoria)     errorFila = `Categoría desconocida: "${get('categoria')}"`
  else if (!descripcion)   errorFila = 'Falta la descripción'
  else if (monto === null || isNaN(monto) || monto <= 0) errorFila = 'Monto inválido'

  return { fecha: fechaParsed ?? '', tipo, categoria, descripcion, monto, estado, observaciones, errorFila }
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const LABEL_TIPO: Record<string, string>     = { VENTA: 'Venta', CUOTA: 'Cuota', DONACION: 'Donación' }
const LABEL_CAT: Record<string, string>      = { FIJO: 'Fijo', VARIABLE: 'Variable' }

const ars = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Descarga de plantilla ────────────────────────────────────────────────────

function descargarPlantilla() {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Estado', 'Observaciones']
  const ejemplos = [
    ['01/05/2026', 'Cuota',    'Fijo',     'Cuota mensual socio Pérez',   5000,  'Cobrado',  ''],
    ['03/05/2026', 'Donacion', 'Variable', 'Donación anónima',            10000, 'Cobrado',  'Recibida en efectivo'],
    ['10/05/2026', 'Venta',    'Variable', 'Venta de plantines',           3200, 'Cobrado',  'Feria mayo'],
    ['15/05/2026', 'Cuota',    'Fijo',     'Cuota mensual socio García',   5000, 'Pendiente',''],
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplos])
  ws['!cols'] = [12, 12, 12, 28, 10, 12, 22].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ingresos')
  XLSX.writeFile(wb, 'plantilla_ingresos.xlsx')
}

// ─── Componente principal ─────────────────────────────────────────────────────

type Paso = 'seleccion' | 'preview' | 'resultado'

export default function ModalImportarIngresos({ onImportado, onCerrar }: Props) {
  const [paso, setPaso]             = useState<Paso>('seleccion')
  const [filas, setFilas]           = useState<FilaParseada[]>([])
  const [archivoNombre, setArchivoNombre] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado]   = useState<{ importados: number; errores: { fila: number; error: string }[] } | null>(null)
  const [dragOver, setDragOver]     = useState(false)
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
      const { data } = await api.post('/ingresos/importar', {
        ingresos: validas.map(f => ({
          fecha:         f.fecha,
          tipo:          f.tipo,
          categoria:     f.categoria,
          descripcion:   f.descripcion,
          monto:         f.monto,
          estado:        f.estado,
          observaciones: f.observaciones || null,
        })),
      })
      setResultado(data)
      setPaso('resultado')
    } finally {
      setImportando(false)
    }
  }

  const validas   = filas.filter(f => !f.errorFila)
  const invalidas = filas.filter(f => f.errorFila)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Importar ingresos desde Excel</h2>
          </div>
          <button onClick={onCerrar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paso 1: Selección */}
        {paso === 'seleccion' && (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-800 mb-2">El archivo debe tener estas columnas:</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span><span className="font-medium text-slate-700">Fecha</span> — DD/MM/AAAA</span>
                <span><span className="font-medium text-slate-700">Tipo</span> — Venta / Cuota / Donación</span>
                <span><span className="font-medium text-slate-700">Categoría</span> — Fijo / Variable</span>
                <span><span className="font-medium text-slate-700">Descripción</span> — texto libre</span>
                <span><span className="font-medium text-slate-700">Monto</span> — número (sin $)</span>
                <span><span className="font-medium text-slate-700">Estado</span> — Cobrado / Pendiente (opcional)</span>
                <span><span className="font-medium text-slate-700">Observaciones</span> — opcional</span>
              </div>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver ? 'border-[#c9b97a] bg-[#faf7ef]' : 'border-[#e0d8c8] hover:border-[#c9b97a] hover:bg-[#f7f5ef]'
              }`}
            >
              <Upload className={`w-8 h-8 ${dragOver ? 'text-[#c9b97a]' : 'text-[#d0c8b0]'}`} />
              <p className="text-sm text-slate-600 font-medium">Hacé click o arrastrá tu archivo aquí</p>
              <p className="text-xs text-slate-400">Formatos aceptados: .xlsx, .xls, .csv</p>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
            </div>

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
            <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex items-center gap-4 flex-wrap">
              <span className="text-sm text-slate-500">{archivoNombre}</span>
              <div className="flex gap-3 ml-auto">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4a7030] bg-[#edf5e0] border border-[#c0d8a0] px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {validas.length} válidos
                </span>
                {invalidas.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" /> {invalidas.length} con error
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide w-6">#</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Fecha</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Tipo</th>
                    <th className="px-3 py-2.5 text-left text-slate-400 font-semibold uppercase tracking-wide">Cat.</th>
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
                          <td className="px-3 py-2 text-slate-600">{LABEL_TIPO[f.tipo] || f.tipo}</td>
                          <td className="px-3 py-2 text-slate-600">{LABEL_CAT[f.categoria] || f.categoria}</td>
                          <td className="px-3 py-2 text-slate-800 font-medium max-w-[180px] truncate">{f.descripcion}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                            {f.monto != null ? ars(f.monto) : '—'}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{f.estado === 'PENDIENTE' ? 'Pendiente' : 'Cobrado'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                    : <><Upload className="w-3.5 h-3.5" />Importar {validas.length} ingreso{validas.length !== 1 ? 's' : ''}</>
                  }
                </button>
              </div>
            </div>
          </>
        )}

        {/* Paso 3: Resultado */}
        {paso === 'resultado' && resultado && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#edf5e0] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#4a7030]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">
                {resultado.importados} ingreso{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''}
              </p>
              {resultado.errores.length > 0 && (
                <p className="text-sm text-[#8a6820] mt-1">
                  {resultado.errores.length} fila{resultado.errores.length !== 1 ? 's' : ''} no se pudo importar
                </p>
              )}
            </div>
            <button onClick={() => { onImportado(); onCerrar() }} className="btn-primario px-6 py-2">
              Ver ingresos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

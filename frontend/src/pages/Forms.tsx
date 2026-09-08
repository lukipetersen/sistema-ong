import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link2, RefreshCw, Search, X, AlertCircle, Loader2, ClipboardList, ChevronUp, ChevronDown } from 'lucide-react'

const LS_KEY = 'forms_sheets_url'

function urlCsvDeSheets(url: string): string {
  if (url.includes('/pub') && url.includes('output=csv')) return url
  const match = url.match(/\/spreadsheets\/d\/([^\/\?#]+)/)
  if (!match) throw new Error('URL de Google Sheets inválida. Copiá la URL del sheet.')
  const id = match[1]
  const gidMatch = url.match(/[#&?]gid=(\d+)/)
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid}`
}

function parsearCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
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

  if (lineas.length < 2) return { headers: [], rows: [] }
  const headers = splitLinea(lineas[0])
  const rows = lineas
    .slice(1)
    .filter(l => l.trim())
    .map(linea => {
      const vals = splitLinea(linea)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
  return { headers, rows }
}

type OrdenDir = 'asc' | 'desc'

export default function Forms() {
  const [urlInput, setUrlInput]   = useState(() => localStorage.getItem(LS_KEY) ?? '')
  const [urlGuardada, setUrlGuardada] = useState(() => localStorage.getItem(LS_KEY) ?? '')
  const [headers, setHeaders]     = useState<string[]>([])
  const [rows, setRows]           = useState<Record<string, string>[]>([])
  const [cargando, setCargando]   = useState(false)
  const [error, setError]         = useState('')
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [busqueda, setBusqueda]   = useState('')
  const [ordenCol, setOrdenCol]   = useState('')
  const [ordenDir, setOrdenDir]   = useState<OrdenDir>('asc')
  const [filaExpandida, setFilaExpandida] = useState<number | null>(null)
  const [configurando, setConfigurando] = useState(!localStorage.getItem(LS_KEY))

  const cargar = useCallback(async (url: string) => {
    if (!url.trim()) return
    setCargando(true)
    setError('')
    try {
      const csvUrl = urlCsvDeSheets(url.trim())
      const resp = await fetch(csvUrl)
      if (!resp.ok) throw new Error('No se pudo acceder al sheet. Verificá que esté publicado o sea público.')
      const text = await resp.text()
      const { headers: h, rows: r } = parsearCsv(text)
      if (h.length === 0) throw new Error('El sheet está vacío o no tiene encabezados.')
      setHeaders(h)
      setRows(r)
      setUltimaActualizacion(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el sheet.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (urlGuardada) cargar(urlGuardada)
  }, [])

  function guardarUrl() {
    if (!urlInput.trim()) return
    localStorage.setItem(LS_KEY, urlInput.trim())
    setUrlGuardada(urlInput.trim())
    setConfigurando(false)
    cargar(urlInput.trim())
  }

  function cambiarSheet() {
    setConfigurando(true)
    setHeaders([])
    setRows([])
    setError('')
  }

  const filasFiltradas = useMemo(() => {
    let result = rows
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      result = result.filter(row =>
        headers.some(h => row[h]?.toLowerCase().includes(q))
      )
    }
    if (ordenCol) {
      result = [...result].sort((a, b) => {
        const va = a[ordenCol] ?? ''
        const vb = b[ordenCol] ?? ''
        return ordenDir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
      })
    }
    return result
  }, [rows, headers, busqueda, ordenCol, ordenDir])

  function toggleOrden(col: string) {
    if (ordenCol === col) {
      setOrdenDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenCol(col)
      setOrdenDir('asc')
    }
  }

  // ── Pantalla de configuración ──────────────────────────────────────────────
  if (configurando) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#edf5e0] flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#4a7030]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Formularios de inscripción</h1>
            <p className="text-sm text-slate-500">Conectá el Google Sheet con las respuestas</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold">Cómo obtener la URL:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Abrí el Google Sheet donde van las respuestas del form</li>
              <li>Archivo → Compartir → <strong>Publicar en la web</strong></li>
              <li>Elegí la hoja de respuestas y formato <strong>CSV</strong></li>
              <li>Hacé click en <strong>Publicar</strong> y copiá la URL</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">También funciona pegando la URL normal si el sheet es público.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">URL del Google Sheet</label>
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardarUrl()}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="campo w-full"
              autoFocus
            />
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </div>

          <button
            onClick={guardarUrl}
            disabled={!urlInput.trim() || cargando}
            className="btn-primario w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {cargando
              ? <><Loader2 className="w-4 h-4 animate-spin" />Cargando...</>
              : <><Link2 className="w-4 h-4" />Conectar sheet</>
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Vista principal ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Formularios de inscripción</h1>
          {ultimaActualizacion && (
            <p className="text-xs text-slate-400 mt-0.5">
              Actualizado {ultimaActualizacion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{rows.length} respuesta{rows.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cambiarSheet}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200"
          >
            Cambiar sheet
          </button>
          <button
            onClick={() => cargar(urlGuardada)}
            disabled={cargando}
            className="flex items-center gap-1.5 text-sm font-medium text-[#4a7030] hover:text-[#3a5820] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#edf5e0] border border-[#c0d8a0] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar en todas las respuestas..."
          className="campo w-full pl-9 pr-9"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Loading skeleton */}
      {cargando && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando respuestas...</span>
        </div>
      )}

      {/* Tabla */}
      {!cargando && headers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide w-8">#</th>
                  {headers.map(h => (
                    <th
                      key={h}
                      onClick={() => toggleOrden(h)}
                      className="px-3 py-3 text-left text-slate-600 font-semibold text-xs uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span className="max-w-[160px] truncate" title={h}>{h}</span>
                        {ordenCol === h
                          ? ordenDir === 'asc'
                            ? <ChevronUp className="w-3 h-3 text-[#4a7030] shrink-0" />
                            : <ChevronDown className="w-3 h-3 text-[#4a7030] shrink-0" />
                          : <ChevronUp className="w-3 h-3 text-slate-300 shrink-0" />
                        }
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 1} className="px-4 py-10 text-center text-slate-400 text-sm">
                      {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin respuestas'}
                    </td>
                  </tr>
                ) : (
                  filasFiltradas.map((row, i) => {
                    const expandida = filaExpandida === i
                    return (
                      <tr
                        key={i}
                        onClick={() => setFilaExpandida(expandida ? null : i)}
                        className={`cursor-pointer transition-colors ${expandida ? 'bg-[#f7f5ef]' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3 py-3 text-slate-400 text-xs">{i + 1}</td>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-3 text-slate-700">
                            {expandida ? (
                              <span className="whitespace-pre-wrap break-words max-w-[300px] block">{row[h] || '—'}</span>
                            ) : (
                              <span className="max-w-[200px] truncate block" title={row[h]}>{row[h] || '—'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {filasFiltradas.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {busqueda
                  ? `${filasFiltradas.length} de ${rows.length} respuesta${rows.length !== 1 ? 's' : ''}`
                  : `${rows.length} respuesta${rows.length !== 1 ? 's' : ''} en total`
                }
              </p>
              <p className="text-xs text-slate-400">Hacé click en una fila para ver completo</p>
            </div>
          )}
        </div>
      )}

      {/* Estado vacío inicial */}
      {!cargando && !error && headers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No se cargaron respuestas todavía.</p>
          <button onClick={() => cargar(urlGuardada)} className="text-sm text-[#4a7030] hover:underline">
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}

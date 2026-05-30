import * as XLSX from 'xlsx'

export type FilaExport = (string | number | null | undefined)[]

export interface SeccionExport {
  subtitulo?: string
  columnas: string[]
  filas: FilaExport[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatPeso = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

export const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportarCSV(columnas: string[], filas: FilaExport[], filename: string) {
  const sep    = ','
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const contenido = [
    columnas.map(escape).join(sep),
    ...filas.map(f => f.map(escape).join(sep)),
  ].join('\n')
  descargar(new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' }), filename + '.csv')
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportarExcel(secciones: SeccionExport[], filename: string) {
  const wb = XLSX.utils.book_new()
  for (const { subtitulo, columnas, filas } of secciones) {
    const data: unknown[][] = subtitulo ? [[subtitulo], [], columnas, ...filas] : [columnas, ...filas]
    const ws = XLSX.utils.aoa_to_sheet(data)
    // Column widths
    ws['!cols'] = columnas.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws, (subtitulo ?? 'Datos').slice(0, 31))
  }
  XLSX.writeFile(wb, filename + '.xlsx')
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function exportarPDF(
  titulo: string,
  secciones: SeccionExport[],
  filename: string,
  meta?: { periodo?: string },
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc  = new jsPDF({ orientation: 'landscape' })
  const hoy  = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const VERDE: [number, number, number] = [22, 101, 52]

  doc.setFontSize(18)
  doc.setTextColor(...VERDE)
  doc.text(titulo, 14, 18)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generado: ${hoy}`, 14, 25)
  if (meta?.periodo) doc.text(`Período: ${meta.periodo}`, 14, 30)

  let y = meta?.periodo ? 38 : 32

  for (const { subtitulo, columnas, filas } of secciones) {
    if (y > 175) { doc.addPage(); y = 15 }
    if (subtitulo) {
      doc.setFontSize(11)
      doc.setTextColor(...VERDE)
      doc.text(subtitulo, 14, y)
      y += 6
    }
    autoTable(doc, {
      head: [columnas],
      body: filas.map(f => f.map(v => v == null ? '—' : String(v))),
      startY: y,
      headStyles: { fillColor: VERDE, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12
  }

  doc.save(filename + '.pdf')
}

// ─── Word (HTML compatible) ───────────────────────────────────────────────────

export function exportarWord(titulo: string, secciones: SeccionExport[], filename: string) {
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  const tablas = secciones.map(({ subtitulo, columnas, filas }) => `
    ${subtitulo ? `<h2>${subtitulo}</h2>` : ''}
    <table>
      <tr>${columnas.map(c => `<th>${c}</th>`).join('')}</tr>
      ${filas.map(f => `<tr>${f.map(v => `<td>${v ?? '—'}</td>`).join('')}</tr>`).join('')}
    </table>
  `).join('<p>&nbsp;</p>')

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <style>
    body  { font-family: Calibri, sans-serif; font-size: 11pt; color: #111; margin: 2cm; }
    h1    { color: #14532d; font-size: 18pt; border-bottom: 2px solid #14532d; padding-bottom: 6pt; }
    h2    { color: #166534; font-size: 13pt; margin-top: 18pt; }
    .meta { color: #888; font-size: 9pt; margin: 0 0 18pt; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
    th    { background: #14532d; color: white; padding: 5pt 8pt; text-align: left; font-size: 9pt; }
    td    { border: 1px solid #d1fae5; padding: 4pt 8pt; font-size: 9pt; }
    tr:nth-child(even) td { background: #f0fdf4; }
  </style>
</head>
<body>
  <h1>${titulo}</h1>
  <p class="meta">Generado el ${hoy} — Sistema ONG</p>
  ${tablas}
</body>
</html>`

  descargar(new Blob(['﻿', html], { type: 'application/msword' }), filename + '.doc')
}

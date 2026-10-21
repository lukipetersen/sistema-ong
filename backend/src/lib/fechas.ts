// ─── Fechas de calendario ───
// Las fechas que vienen de un <input type="date"> son días de calendario, no instantes.
// `new Date('2025-09-14')` las interpreta como medianoche UTC, que en Argentina (UTC-3)
// es el 13/09 a las 21:00. Se guardan a las 12:00 UTC para que el día sea el mismo
// en cualquier zona horaria entre UTC-11 y UTC+11.

export function parsearFechaCalendario(valor: unknown): Date | null {
  if (valor == null || valor === '') return null
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) {
    const d = new Date(String(valor))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12))
  return isNaN(d.getTime()) ? null : d
}

// ── AVATAR COLORS ────────────────────────────────────────────────
const COLORS = [
  '#10b981','#f59e0b','#6366f1','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316',
  '#3b82f6','#84cc16',
]

export const colorFor    = (phone) => COLORS[parseInt(phone.slice(-2) || '0') % COLORS.length]
export const initialsFor = (name)  => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ── DATE FORMATTING ──────────────────────────────────────────────
const MONTH_MAP = {
  ene:0, feb:1, mar:2, abr:3, may:4, jun:5,
  jul:6, ago:7, sep:8, oct:9, nov:10, dic:11,
  jan:0, apr:3, aug:7, dec:11,
}

export function parseDate(val) {
  if (!val) return new Date(NaN)
  const s = String(val)
  // GViz Date(year,month0,day,h,m,s) — Google Sheets API gviz/tq
  const mGviz = s.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/)
  if (mGviz) return new Date(+mGviz[1], +mGviz[2], +mGviz[3], +(mGviz[4]||0), +(mGviz[5]||0), +(mGviz[6]||0))
  // DD/MMM/YYYY HH:mm — mes en texto (ej: 01/jul/2026 19:53)
  const mText = s.match(/^(\d{1,2})\/([a-zA-Z]{3})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (mText) {
    const mon = MONTH_MAP[mText[2].toLowerCase()]
    if (mon !== undefined) return new Date(+mText[3], mon, +mText[1], +mText[4], +mText[5])
  }
  // DD/MM/YYYY HH:mm — mes numérico
  const mNum = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
  if (mNum) return new Date(+mNum[3], +mNum[2] - 1, +mNum[1], +mNum[4], +mNum[5])
  return new Date(val)
}

export function fmtTime(iso) {
  if (!iso) return ''
  const d    = parseDate(iso)
  const now  = new Date()
  const diff = (now - d) / 86_400_000
  if (diff < 1) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (diff < 2) return 'Ayer'
  if (diff < 7) return d.toLocaleDateString('es-MX', { weekday: 'short' })
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export function fmtDate(iso) {
  return parseDate(iso).toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ── BUILD CONVERSATIONS ───────────────────────────────────────────
export function buildConvs(rows) {
  const map = {}
  rows.forEach(row => {
    const p = row.telefono
    if (!map[p]) map[p] = { telefono: p, nombre: row.nombre, msgs: [] }
    if (!map[p].msgs.find(m => m.id === row.id)) map[p].msgs.push(row)
  })
  return Object.values(map)
    .map(conv => {
      const sorted = [...conv.msgs].sort((a, b) => parseDate(a.timestamp) - parseDate(b.timestamp))
      const last   = sorted[sorted.length - 1]
      const unread = sorted.filter(m => m.direccion === 'ENTRANTE' && m.estado === 'recibido').length
      return { ...conv, msgs: sorted, last, unread }
    })
    .sort((a, b) => parseDate(b.last.timestamp) - parseDate(a.last.timestamp))
}

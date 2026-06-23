import { CFG } from './config.js'

// ── IND Store Sheet ───────────────────────────────────────────────
const SHEET_ID      = '1ObNIff1ypeFW7PfuAjeoiGBJCDyZU4etIsbGpyB-Nqk'

// ── Meta credentials IND (completar cuando esté aprobado el número) ──
const META_PHONE_ID = ''   // Phone Number ID de IND
const META_TOKEN    = ''   // Access Token de IND

export const isDemo = () => false

// ── Helper Google Sheets ─────────────────────────────────────────
async function fetchSheet(sheetName) {
  const url  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  const res  = await fetch(url)
  const text = await res.text()
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1])
  return json.table.rows.map(r => r.c.map(c => c?.v ?? c?.f ?? ''))
}

// ── MENSAJES ─────────────────────────────────────────────────────
function mapRow(row) {
  return {
    id:             row[0] || '',
    telefono:       String(row[1] || ''),
    nombre:         row[2] || String(row[1] || '') || 'Sin nombre',
    tipo:           row[3] || 'texto',
    mensaje:        row[4] || '',
    mediaUrl:       row[5] || '',
    timestamp:      row[6] || new Date().toISOString(),
    direccion:      row[7] || 'ENTRANTE',
    estado:         'leido',
    respuestaIA:    row[9] || '',
    imagenProducto: row[10] || '',
    contextoId:     row[11] || '',
  }
}

export async function fetchRows() {
  try {
    const rows = await fetchSheet('MENSAJES')
    return rows.filter(r => r[1]).map(mapRow)
  } catch(err) {
    console.error('[IND Inbox] fetchRows:', err)
    return []
  }
}

// ── CONTACTOS ─────────────────────────────────────────────────────
function mapContact(row) {
  return {
    telefono: String(row[0] || ''),
    nombre:   row[1] || '',
    alias:    row[2] || '',
    estado:   (row[3] || 'PENDIENTE').toLowerCase(),
    waId:     row[4] || '',
    modoIA:   (row[6] || 'IA').toUpperCase() !== 'HUMANO',
    idVenta:  String(row[7] || '').trim(),
    notas:    row[8] || '',
  }
}

export async function fetchContacts() {
  try {
    const rows = await fetchSheet('CONTACTOS')
    return rows.filter(r => r[0]).map(mapContact)
  } catch(err) {
    console.error('[IND Inbox] fetchContacts:', err)
    return []
  }
}

// ── NOTAS ────────────────────────────────────────────────────────
export async function saveNotes(telefono, nombre, notas) {
  if (!CFG.MAKE_NOTES_WEBHOOK) return { ok: false }
  try {
    const res = await fetch(CFG.MAKE_NOTES_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Telefono: telefono, Nombre: nombre, Notas: notas }),
    })
    return { ok: res.ok }
  } catch { return { ok: false } }
}

// ── RESPUESTAS RÁPIDAS ────────────────────────────────────────────
function mapReply(row) {
  return { id: String(row[0] || ''), text: row[1] || '', imageUrl: row[2] || '' }
}

export async function fetchRepliesFromSheet() {
  try {
    const rows = await fetchSheet('RESPUESTAS_RAPIDAS')
    return rows.filter(r => r[0] && r[1]).map(mapReply)
  } catch(err) {
    console.error('[IND Inbox] fetchReplies:', err)
    return []
  }
}

// ── ENVIAR TEXTO ──────────────────────────────────────────────────
export async function sendReply(telefono, nombre, mensaje) {
  try {
    const res = await fetch(CFG.MAKE_SEND_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Telefono: telefono, Nombre: nombre, Mensaje: mensaje }),
    })
    return { ok: res.ok }
  } catch { return { ok: false } }
}

// ── ENVIAR IMAGEN URL ─────────────────────────────────────────────
export async function sendImageUrl(telefono, nombre, imageUrl) {
  try {
    const res = await fetch(CFG.MAKE_SEND_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Telefono: telefono, Nombre: nombre, ImagenURL: imageUrl }),
    })
    return { ok: res.ok }
  } catch { return { ok: false } }
}

// ── BOTONES INTERACTIVOS ──────────────────────────────────────────
export async function sendInteractiveButtons(telefono, nombre, body, buttons) {
  try {
    const botonesFormateados = buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } }))
    const res = await fetch(CFG.MAKE_SEND_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Telefono: telefono, Nombre: nombre,
        TipoMensaje: 'interactive_buttons',
        Cuerpo: body,
        Botones: JSON.stringify(botonesFormateados),
      }),
    })
    return { ok: res.ok }
  } catch { return { ok: false } }
}

// ── ACTUALIZAR CONTACTO ───────────────────────────────────────────
export async function updateContact(telefono, nombre, estado, alias, forzarEstado = false, modo = null) {
  if (!CFG.MAKE_CONTACT_WEBHOOK) return
  try {
    const payload = { Telefono: telefono, Nombre: nombre, Estado: estado.toUpperCase(), Alias: alias, forzar_estado: forzarEstado }
    if (modo !== null) payload.Modo = modo
    await fetch(CFG.MAKE_CONTACT_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch(err) { console.error('[IND Inbox] updateContact:', err) }
}

// ── TOGGLE IA ─────────────────────────────────────────────────────
export async function toggleIAMode(telefono, nombre, estado, alias, modoIA) {
  return updateContact(telefono, nombre, estado, alias, false, modoIA ? 'IA' : 'HUMANO')
}

// ── ENVIAR VIDEO ──────────────────────────────────────────────────
export async function sendVideo(telefono, nombre, videoFile) {
  if (!META_PHONE_ID || !META_TOKEN) {
    console.warn('[IND Inbox] META_PHONE_ID o META_TOKEN no configurados')
    return { ok: false, error: 'Credenciales Meta IND no configuradas' }
  }
  try {
    const fd = new FormData()
    fd.append('file', videoFile, videoFile.name || 'video.mp4')
    fd.append('messaging_product', 'whatsapp')
    const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${META_PHONE_ID}/media`, {
      method: 'POST', headers: { Authorization: `Bearer ${META_TOKEN}` }, body: fd,
    })
    const uploadData = await uploadRes.json()
    if (!uploadData.id) throw new Error(uploadData.error?.message || 'Upload fallido')
    const res = await fetch(CFG.MAKE_SEND_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Telefono: telefono, Nombre: nombre, VideoMediaId: uploadData.id }),
    })
    return { ok: res.ok }
  } catch (err) {
    console.error('[IND Inbox] sendVideo:', err)
    return { ok: false, error: err.message }
  }
}

// ── RESPUESTAS RÁPIDAS CRUD ───────────────────────────────────────
export async function writeReply(accion, reply) {
  if (!CFG.MAKE_REPLIES_WRITE) return
  try {
    await fetch(CFG.MAKE_REPLIES_WRITE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion, id: reply.id, texto: reply.text, imagenUrl: reply.imageUrl }),
    })
  } catch(err) { console.error('[IND Inbox] writeReply:', err) }
}

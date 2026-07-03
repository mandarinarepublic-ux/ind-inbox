import { useState, useRef, useEffect } from 'react'
import { Avatar } from './Components.jsx'
import { fetchRepliesFromSheet, writeReply, saveNotes } from './api.js'
import { parseDate } from './utils.js'

const IMGBB_KEY = '2307574d43689522feabd27cff3443df'

const C = {
  bg:        '#0A0A0A',
  surface:   '#0D0D0D',
  surface2:  '#111111',
  border:    '#1F1F1F',
  border2:   '#2A2A2A',
  cream:     '#F4F1EC',
  creamDim:  '#A09A90',
  creamFaint:'#3A3530',
}

async function toJpeg(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(new File([blob], 'imagen.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

async function uploadToImgbb(file) {
  const converted = await toJpeg(file)
  const fd = new FormData(); fd.append('image', converted)
  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
  const data = await res.json()
  return data.success ? data.data.url : ''
}

// ── ImgSlot — componente independiente (fuera del render) ────────
function ImgSlot({ url, prev, onClear, fileRef, onFile, label, uploading }) {
  const display = prev || url || ''
  return (
    <div style={{ marginTop: 4 }}>
      {display ? (
        <div style={{ position:'relative' }}>
          <img src={display} style={{ width:'100%', height:48, objectFit:'cover', borderRadius:5, display:'block' }} alt=""
            onError={e => e.currentTarget.style.display='none'} />
          {uploading && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', borderRadius:5,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#F4F1EC' }}>
              Subiendo...
            </div>
          )}
          <button onClick={onClear} style={{ position:'absolute', top:2, right:2, background:'rgba(0,0,0,.7)',
            border:'none', color:'#f87171', borderRadius:'50%', width:16, height:16,
            cursor:'pointer', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>✕</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          style={{ width:'100%', padding:'5px', background:'transparent', border:'1px dashed #2A2A2A',
            borderRadius:6, color:'#3A3530', fontSize:10, cursor:'pointer', fontFamily:'inherit',
            transition:'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='#A09A90'; e.currentTarget.style.color='#A09A90' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='#2A2A2A'; e.currentTarget.style.color='#3A3530' }}>
          {label}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFile} />
    </div>
  )
}

export default function RightPanel({ activeConv, onQuickReply, onSendText, onSendImage, contactInfo, onUpdateContact, windowOpen }) {
  const [countdown, setCountdown] = useState('')

  useEffect(() => {
    if (!activeConv) return
    const lastIncoming = [...activeConv.msgs].reverse().find(m => m.direccion === 'ENTRANTE')
    if (!lastIncoming) return
    const tick = () => {
      const diff = parseDate(lastIncoming.timestamp).getTime() + 24 * 60 * 60 * 1000 - Date.now()
      if (diff <= 0) { setCountdown('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [activeConv])

  // ── Respuestas rápidas ────────────────────────────────────────
  const [replies,       setReplies]       = useState([])
  const [repliesLoaded, setRepliesLoaded] = useState(false)
  const [editingIdx,    setEditingIdx]    = useState(null)

  // Edit
  const [editText,     setEditText]     = useState('')
  const [editImg1Url,  setEditImg1Url]  = useState('')
  const [editImg1Prev, setEditImg1Prev] = useState('')
  const [editImg1Up,   setEditImg1Up]   = useState(false)
  const [editImg2Url,  setEditImg2Url]  = useState('')
  const [editImg2Prev, setEditImg2Prev] = useState('')
  const [editImg2Up,   setEditImg2Up]   = useState(false)
  const [editImg3Url,  setEditImg3Url]  = useState('')
  const [editImg3Prev, setEditImg3Prev] = useState('')
  const [editImg3Up,   setEditImg3Up]   = useState(false)

  // New
  const [newText,     setNewText]     = useState('')
  const [newImg1Url,  setNewImg1Url]  = useState('')
  const [newImg1Prev, setNewImg1Prev] = useState('')
  const [newImg1Up,   setNewImg1Up]   = useState(false)
  const [newImg2Url,  setNewImg2Url]  = useState('')
  const [newImg2Prev, setNewImg2Prev] = useState('')
  const [newImg2Up,   setNewImg2Up]   = useState(false)
  const [newImg3Url,  setNewImg3Url]  = useState('')
  const [newImg3Prev, setNewImg3Prev] = useState('')
  const [newImg3Up,   setNewImg3Up]   = useState(false)

  const [sending, setSending] = useState(null)

  // Contacto
  const [editAlias,  setEditAlias]  = useState(false)
  const [aliasInput, setAliasInput] = useState('')

  // IA
  const [aiText,         setAiText]         = useState('')
  const [aiSending,      setAiSending]      = useState(false)
  const [aiSent,         setAiSent]         = useState(false)
  const [lastAiMsg,      setLastAiMsg]      = useState('')
  const [aiImgUrl,       setAiImgUrl]       = useState('')
  const [aiImgPrev,      setAiImgPrev]      = useState('')
  const [aiImgUploading, setAiImgUploading] = useState(false)
  const [aiImgSending,   setAiImgSending]   = useState(false)
  const [aiImgSent,      setAiImgSent]      = useState(false)
  const [lastAiImgSrc,   setLastAiImgSrc]   = useState('')
  const [openIA,         setOpenIA]         = useState(true)

  // Notas
  const [notasInput,  setNotasInput]  = useState('')
  const [notasSaving, setNotasSaving] = useState(false)
  const [notasSaved,  setNotasSaved]  = useState(false)

  const notasLoadedRef = useRef(null)
  const aiImgFileRef   = useRef(null)
  const editRef1 = useRef(null); const editRef2 = useRef(null); const editRef3 = useRef(null)
  const newRef1  = useRef(null); const newRef2  = useRef(null); const newRef3  = useRef(null)

  useEffect(() => {
    if (repliesLoaded) return
    fetchRepliesFromSheet().then(data => { setReplies(data || []); setRepliesLoaded(true) })
  }, [repliesLoaded])

  useEffect(() => {
    if (!activeConv) return
    if (notasLoadedRef.current !== activeConv.telefono) {
      notasLoadedRef.current = activeConv.telefono
      setNotasInput(contactInfo?.notas || '')
      setNotasSaved(false)
    }
  }, [activeConv, contactInfo])

  if (!activeConv) return null

  const lastIncoming = [...activeConv.msgs].reverse().find(m => m.direccion === 'ENTRANTE')
  const aiSuggestion = lastIncoming?.respuestaIA || ''
  const aiImgShopify = lastIncoming?.imagenProducto || ''

  if (aiSuggestion && aiSuggestion !== lastAiMsg) { setLastAiMsg(aiSuggestion); setAiText(aiSuggestion); setAiSent(false) }
  if (aiImgShopify && aiImgShopify !== lastAiImgSrc) { setLastAiImgSrc(aiImgShopify); setAiImgUrl(aiImgShopify); setAiImgPrev(aiImgShopify); setAiImgSent(false) }

  // ── Helpers upload ────────────────────────────────────────────
  const handleUpload = async (file, setUrl, setPrev, setUploading) => {
    setUploading(true)
    try {
      setPrev(URL.createObjectURL(file))
      const url = await uploadToImgbb(file)
      if (url) { setUrl(url); setPrev(url) }
    } finally { setUploading(false) }
  }

  // ── CRUD ──────────────────────────────────────────────────────
  const startEdit = (idx) => {
    const r = replies[idx]
    setEditingIdx(idx); setEditText(r.text)
    setEditImg1Url(r.imageUrl||'');  setEditImg1Prev(r.imageUrl||'')
    setEditImg2Url(r.imageUrl2||''); setEditImg2Prev(r.imageUrl2||'')
    setEditImg3Url(r.imageUrl3||''); setEditImg3Prev(r.imageUrl3||'')
  }
  const clearEdit = () => {
    setEditingIdx(null); setEditText('')
    setEditImg1Url(''); setEditImg1Prev('')
    setEditImg2Url(''); setEditImg2Prev('')
    setEditImg3Url(''); setEditImg3Prev('')
    ;[editRef1,editRef2,editRef3].forEach(r => { if(r.current) r.current.value='' })
  }
  const saveEdit = async () => {
    if (!editText.trim()) return
    const updated = { ...replies[editingIdx], text: editText.trim(),
      imageUrl: editImg1Url, imageUrl2: editImg2Url, imageUrl3: editImg3Url }
    setReplies(prev => prev.map((r, i) => i === editingIdx ? updated : r))
    clearEdit()
    await writeReply('actualizar', updated)
  }
  const deleteReply = async (idx) => {
    const r = replies[idx]; setReplies(prev => prev.filter((_, i) => i !== idx))
    await writeReply('eliminar', r)
  }
  const clearNew = () => {
    setNewText('')
    setNewImg1Url(''); setNewImg1Prev('')
    setNewImg2Url(''); setNewImg2Prev('')
    setNewImg3Url(''); setNewImg3Prev('')
    ;[newRef1,newRef2,newRef3].forEach(r => { if(r.current) r.current.value='' })
  }
  const addReply = async () => {
    if (!newText.trim()) return
    const nr = { id: crypto.randomUUID(), text: newText.trim(),
      imageUrl: newImg1Url, imageUrl2: newImg2Url, imageUrl3: newImg3Url }
    setReplies(prev => [...prev, nr])
    clearNew()
    await writeReply('agregar', nr)
  }

  const handleSendQuick = async (idx) => { setSending(idx); await onQuickReply(replies[idx]); setSending(null) }
  const handleSendAI = async () => {
    if (!aiText.trim() || aiSending) return
    setAiSending(true); await onSendText(aiText.trim()); setAiSending(false); setAiSent(true)
  }
  const handleSendAIImage = async () => {
    if (!aiImgUrl || aiImgSending) return
    setAiImgSending(true)
    try { if (onSendImage) await onSendImage(aiImgUrl); setAiImgSent(true) }
    finally { setAiImgSending(false) }
  }
  const handleAiImgReplace = async (e) => {
    const f = e.target.files[0]; if (!f) return
    setAiImgPrev(URL.createObjectURL(f)); setAiImgSent(false)
    setAiImgUploading(true)
    try { const u = await uploadToImgbb(f); if(u) { setAiImgUrl(u); setAiImgPrev(u) } }
    finally { setAiImgUploading(false) }
  }
  const handleSaveNotas = async () => {
    if (notasSaving) return
    setNotasSaving(true)
    try { await saveNotes(activeConv.telefono, contactInfo?.nombre || activeConv.nombre, notasInput); setNotasSaved(true); setTimeout(() => setNotasSaved(false), 2500) }
    finally { setNotasSaving(false) }
  }

  const contactName = contactInfo?.alias || contactInfo?.nombre || activeConv.nombre
  const btnBase = { fontFamily:'inherit', cursor:'pointer', transition:'all .15s' }
  const inputBase = { background:C.bg, border:`1px solid ${C.border}`, borderRadius:7, color:C.cream, fontSize:12, padding:'6px 9px', outline:'none', fontFamily:'inherit' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.surface, overflow:'hidden' }}>

      {/* INFO CONTACTO */}
      <div style={{ flexShrink:0, padding:'14px 14px 10px', borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
          <Avatar name={contactName} phone={activeConv.telefono} size={38} />
          <div style={{ flex:1, minWidth:0 }}>
            {editAlias ? (
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <input value={aliasInput} onChange={e => setAliasInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'){ onUpdateContact?.({alias:aliasInput.trim()}); setEditAlias(false) } if(e.key==='Escape') setEditAlias(false) }}
                  autoFocus style={{ ...inputBase, flex:1, fontSize:12, padding:'3px 7px', borderColor:C.cream }} />
                <button onClick={() => { onUpdateContact?.({alias:aliasInput.trim()}); setEditAlias(false) }}
                  style={{ ...btnBase, background:`rgba(244,241,236,.1)`, border:`1px solid rgba(244,241,236,.25)`, color:C.cream, borderRadius:5, padding:'3px 7px', fontSize:10 }}>✓</button>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ fontWeight:700, color:C.cream, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{contactName}</span>
                <button onClick={() => { setAliasInput(contactInfo?.alias||''); setEditAlias(true) }}
                  style={{ background:'transparent', border:'none', color:C.creamFaint, cursor:'pointer', fontSize:10, padding:0, flexShrink:0 }}>✏️</button>
              </div>
            )}
            <div style={{ fontSize:10, color:C.creamFaint, marginTop:1 }}>+{activeConv.telefono}</div>
          </div>
        </div>
        <div style={{ marginTop:7, padding:'5px 10px', background:windowOpen?`rgba(244,241,236,.05)`:'rgba(245,158,11,.06)', border:`1px solid ${windowOpen?'rgba(244,241,236,.15)':'rgba(245,158,11,.2)'}`, borderRadius:7, fontSize:11, color:windowOpen?C.cream:'#f59e0b', fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{windowOpen ? '✅ Ventana activa' : '⚠️ Ventana cerrada'}</span>
          {countdown && windowOpen && <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:800, color: parseInt(countdown.split(':')[0])===0 && parseInt(countdown.split(':')[1])<30 ? '#f87171' : C.cream }}>⏱ {countdown}</span>}
          {!windowOpen && <span style={{ fontFamily:'monospace', fontSize:11, color:C.creamFaint }}>Expirada</span>}
        </div>
      </div>

      {/* SUGERENCIA IA — acordeón */}
      <div style={{ flexShrink:0, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={() => setOpenIA(p=>!p)} style={{ width:'100%', padding:'8px 12px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'inherit' }}>
          <span style={{ fontSize:10, color:'#6366f1', fontWeight:700, letterSpacing:'.08em', display:'flex', alignItems:'center', gap:5 }}>
            🤖 SUGERENCIA IA
            {aiSuggestion && <span style={{ fontSize:8, background:'rgba(99,102,241,.15)', color:'#818cf8', borderRadius:10, padding:'1px 6px' }}>Gemini</span>}
          </span>
          <span style={{ color:C.creamFaint, fontSize:10 }}>{openIA ? '▲' : '▼'}</span>
        </button>
        {openIA && (
          <div style={{ padding:'0 12px 10px' }}>
            {aiSuggestion ? (
              <>
                {(aiImgPrev || aiImgShopify) && (
                  <div style={{ marginBottom:7, position:'relative', borderRadius:8, overflow:'hidden', border:`1px solid ${C.border2}` }}>
                    <img src={aiImgPrev||aiImgShopify} alt="Producto" style={{ width:'100%', height:90, objectFit:'cover', display:'block' }} onError={e=>e.currentTarget.style.display='none'} />
                    {aiImgUploading && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:C.cream }}>Subiendo...</div>}
                    <div style={{ position:'absolute', bottom:4, right:4, display:'flex', gap:3 }}>
                      <button onClick={() => aiImgFileRef.current?.click()} style={{ ...btnBase, background:'rgba(0,0,0,.7)', border:`1px solid rgba(255,255,255,.2)`, color:C.cream, borderRadius:5, padding:'2px 6px', fontSize:9 }}>🔄 Cambiar</button>
                      <button onClick={() => { setAiImgUrl(''); setAiImgPrev(''); setAiImgSent(false) }} style={{ ...btnBase, background:'rgba(0,0,0,.7)', border:`1px solid rgba(255,255,255,.2)`, color:'#f87171', borderRadius:5, padding:'2px 6px', fontSize:9 }}>✕</button>
                    </div>
                    <input ref={aiImgFileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAiImgReplace} />
                  </div>
                )}
                {aiImgUrl && (
                  <button onClick={handleSendAIImage} disabled={aiImgSending||aiImgSent||!windowOpen}
                    style={{ ...btnBase, width:'100%', marginBottom:5, padding:'5px', background:aiImgSent?`rgba(244,241,236,.1)`:aiImgSending?C.bg:'rgba(99,102,241,.12)', border:`1px solid ${aiImgSent?'rgba(244,241,236,.25)':'rgba(99,102,241,.3)'}`, color:aiImgSent?C.cream:'#818cf8', borderRadius:7, fontSize:10, fontWeight:700, cursor:aiImgSent||aiImgSending?'default':'pointer' }}>
                    {aiImgSent?'✓ Foto enviada':aiImgSending?'⏳ Enviando...':'🖼 Enviar foto del producto'}
                  </button>
                )}
                <textarea value={aiText} onChange={e => { setAiText(e.target.value); setAiSent(false) }} rows={3}
                  style={{ width:'100%', background:`rgba(244,241,236,.04)`, border:`1px solid ${aiSent?'rgba(244,241,236,.25)':'rgba(99,102,241,.25)'}`, borderRadius:8, color:C.cream, fontSize:12, padding:'7px 9px', resize:'none', outline:'none', fontFamily:'inherit', lineHeight:1.5, whiteSpace:'pre-wrap' }} />
                <div style={{ display:'flex', gap:5, marginTop:5 }}>
                  <button onClick={handleSendAI} disabled={aiSending||aiSent||!aiText.trim()||!windowOpen}
                    style={{ ...btnBase, flex:2, padding:'6px', background:aiSent?`rgba(244,241,236,.1)`:aiSending?C.bg:'linear-gradient(135deg,#6366f1,#4f46e5)', border:`1px solid ${aiSent?'rgba(244,241,236,.25)':'rgba(99,102,241,.4)'}`, color:aiSent?C.cream:'#fff', borderRadius:7, fontSize:11, fontWeight:700, cursor:aiSent||aiSending?'default':'pointer' }}>
                    {aiSent?'✓ Enviado':aiSending?'⏳...':'📤 Enviar texto'}
                  </button>
                  <button onClick={() => onSendText&&onSendText(null,aiText)} style={{ ...btnBase, flex:1, padding:'6px', background:`rgba(244,241,236,.04)`, border:`1px solid ${C.border}`, color:C.creamDim, borderRadius:7, fontSize:11, cursor:'pointer' }}>✏️ Editar</button>
                </div>
              </>
            ) : (
              <div style={{ padding:'12px', textAlign:'center', color:C.creamFaint, fontSize:11, background:`rgba(244,241,236,.02)`, borderRadius:8, border:`1px dashed ${C.border2}` }}>Esperando mensaje...</div>
            )}
          </div>
        )}
      </div>

      {/* RESPUESTAS RÁPIDAS */}
      <div style={{ flex:1, overflowY:'auto', minHeight:0 }}>
        <div style={{ padding:'10px 12px 6px' }}>
          <p style={{ fontSize:10, color:C.creamFaint, fontWeight:700, letterSpacing:'.08em', display:'flex', alignItems:'center', gap:5 }}>
            ⚡ RESPUESTAS RÁPIDAS
            {!repliesLoaded && <span style={{ fontSize:9, color:C.creamFaint }}>cargando...</span>}
          </p>
        </div>

        <div style={{ padding:'0 12px', display:'flex', flexDirection:'column', gap:5 }}>
          {replies.map((reply, idx) => (
            <div key={reply.id || idx}>
              {editingIdx === idx ? (
                <div style={{ background:`rgba(244,241,236,.03)`, border:`1px solid ${C.cream}`, borderRadius:9, padding:'8px', marginBottom:2 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4} placeholder="Texto..."
                    style={{ width:'100%', ...inputBase, border:`1px solid ${C.cream}`, resize:'vertical', marginBottom:5, whiteSpace:'pre-wrap', minHeight:80 }} />
                  <ImgSlot url={editImg1Url} prev={editImg1Prev} label="📷 Foto 1"
                    fileRef={editRef1} uploading={editImg1Up}
                    onClear={() => { setEditImg1Url(''); setEditImg1Prev(''); if(editRef1.current) editRef1.current.value='' }}
                    onFile={async e => { const f=e.target.files[0]; if(!f)return; await handleUpload(f,setEditImg1Url,setEditImg1Prev,setEditImg1Up) }} />
                  <ImgSlot url={editImg2Url} prev={editImg2Prev} label="📷 Foto 2 (opcional)"
                    fileRef={editRef2} uploading={editImg2Up}
                    onClear={() => { setEditImg2Url(''); setEditImg2Prev(''); if(editRef2.current) editRef2.current.value='' }}
                    onFile={async e => { const f=e.target.files[0]; if(!f)return; await handleUpload(f,setEditImg2Url,setEditImg2Prev,setEditImg2Up) }} />
                  <ImgSlot url={editImg3Url} prev={editImg3Prev} label="📷 Foto 3 (opcional)"
                    fileRef={editRef3} uploading={editImg3Up}
                    onClear={() => { setEditImg3Url(''); setEditImg3Prev(''); if(editRef3.current) editRef3.current.value='' }}
                    onFile={async e => { const f=e.target.files[0]; if(!f)return; await handleUpload(f,setEditImg3Url,setEditImg3Prev,setEditImg3Up) }} />
                  <div style={{ display:'flex', gap:3, marginTop:7 }}>
                    <button onClick={saveEdit} disabled={editImg1Up||editImg2Up||editImg3Up}
                      style={{ ...btnBase, flex:1, padding:'5px', background:`rgba(244,241,236,.1)`, border:`1px solid rgba(244,241,236,.25)`, color:C.cream, borderRadius:6, fontSize:10 }}>✓ Guardar</button>
                    <button onClick={clearEdit}
                      style={{ ...btnBase, flex:1, padding:'5px', background:'transparent', border:`1px solid ${C.border}`, color:C.creamDim, borderRadius:6, fontSize:10 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ background:`rgba(244,241,236,.02)`, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', transition:'background .1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=`rgba(244,241,236,.04)`}
                  onMouseLeave={e=>e.currentTarget.style.background=`rgba(244,241,236,.02)`}>
                  {/* Preview fotos */}
                  {(reply.imageUrl||reply.imageUrl2||reply.imageUrl3) && (
                    <div style={{ display:'flex', gap:1, height:38 }}>
                      {[reply.imageUrl,reply.imageUrl2,reply.imageUrl3].filter(Boolean).map((u,i)=>(
                        <img key={i} src={u} style={{ flex:1, objectFit:'cover', display:'block' }} alt=""
                          onError={e=>e.currentTarget.style.display='none'} />
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'5px 7px', display:'flex', alignItems:'flex-start', gap:3 }}>
                    <span style={{ flex:1, fontSize:11, color:C.creamDim, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                      {(reply.imageUrl||reply.imageUrl2||reply.imageUrl3)&&'🖼 '}{reply.text}
                    </span>
                    <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                      <button onClick={()=>handleSendQuick(idx)} disabled={sending===idx||!windowOpen}
                        style={{ ...btnBase, background:`rgba(244,241,236,.1)`, border:`1px solid rgba(244,241,236,.2)`, color:C.cream, borderRadius:5, width:20, height:20, cursor:'pointer', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {sending===idx?'⏳':'➤'}
                      </button>
                      <button onClick={()=>startEdit(idx)} style={{ background:'transparent', border:'none', color:C.creamFaint, cursor:'pointer', fontSize:10, padding:'0 2px' }}>✏️</button>
                      <button onClick={()=>deleteReply(idx)} style={{ background:'transparent', border:'none', color:C.creamFaint, cursor:'pointer', fontSize:10, padding:'0 2px' }}>🗑️</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Nueva respuesta */}
        <div style={{ margin:'8px 12px 14px', background:`rgba(244,241,236,.02)`, border:`1px dashed ${C.border2}`, borderRadius:8, padding:'8px' }}>
          <p style={{ fontSize:9, color:C.creamFaint, fontWeight:700, letterSpacing:'.06em', marginBottom:5 }}>+ NUEVA</p>
          <textarea value={newText} onChange={e=>setNewText(e.target.value)} placeholder="Texto..." rows={2}
            style={{ width:'100%', ...inputBase, fontSize:11, padding:'5px 7px', resize:'none', marginBottom:5, whiteSpace:'pre-wrap' }}
            onFocus={e=>e.target.style.borderColor=C.cream} onBlur={e=>e.target.style.borderColor=C.border} />
          <ImgSlot url={newImg1Url} prev={newImg1Prev} label="📷 Foto 1 (opcional)"
            fileRef={newRef1} uploading={newImg1Up}
            onClear={()=>{ setNewImg1Url(''); setNewImg1Prev(''); if(newRef1.current) newRef1.current.value='' }}
            onFile={async e=>{ const f=e.target.files[0]; if(!f)return; await handleUpload(f,setNewImg1Url,setNewImg1Prev,setNewImg1Up) }} />
          <ImgSlot url={newImg2Url} prev={newImg2Prev} label="📷 Foto 2 (opcional)"
            fileRef={newRef2} uploading={newImg2Up}
            onClear={()=>{ setNewImg2Url(''); setNewImg2Prev(''); if(newRef2.current) newRef2.current.value='' }}
            onFile={async e=>{ const f=e.target.files[0]; if(!f)return; await handleUpload(f,setNewImg2Url,setNewImg2Prev,setNewImg2Up) }} />
          <ImgSlot url={newImg3Url} prev={newImg3Prev} label="📷 Foto 3 (opcional)"
            fileRef={newRef3} uploading={newImg3Up}
            onClear={()=>{ setNewImg3Url(''); setNewImg3Prev(''); if(newRef3.current) newRef3.current.value='' }}
            onFile={async e=>{ const f=e.target.files[0]; if(!f)return; await handleUpload(f,setNewImg3Url,setNewImg3Prev,setNewImg3Up) }} />
          <button onClick={addReply} disabled={!newText.trim()||newImg1Up||newImg2Up||newImg3Up}
            style={{ ...btnBase, width:'100%', marginTop:7, padding:'6px', background:newText.trim()&&!newImg1Up&&!newImg2Up&&!newImg3Up?`rgba(244,241,236,.1)`:'transparent', border:`1px solid ${newText.trim()?'rgba(244,241,236,.25)':C.border}`, color:newText.trim()?C.cream:C.creamFaint, borderRadius:7, fontSize:11, fontWeight:600, cursor:newText.trim()?'pointer':'default' }}>
            {(newImg1Up||newImg2Up||newImg3Up)?'Subiendo...':'+ Agregar'}
          </button>
        </div>
      </div>

      {/* NOTAS */}
      <div style={{ flexShrink:0, padding:'10px 12px', borderTop:`1px solid ${C.border}`, background:C.bg }}>
        <p style={{ fontSize:10, color:'#f59e0b', fontWeight:700, letterSpacing:'.08em', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
          📝 NOTAS
          {notasSaved && <span style={{ fontSize:8, background:`rgba(244,241,236,.1)`, color:C.cream, borderRadius:10, padding:'1px 6px' }}>Guardado ✓</span>}
        </p>
        <textarea value={notasInput} onChange={e=>{ setNotasInput(e.target.value); setNotasSaved(false) }} placeholder="Ej: Falta que envíe la foto del pago..." rows={2}
          style={{ width:'100%', ...inputBase, resize:'vertical', fontSize:11, minHeight:46, whiteSpace:'pre-wrap' }}
          onFocus={e=>e.target.style.borderColor='#f59e0b'} onBlur={e=>e.target.style.borderColor=C.border} />
        <button onClick={handleSaveNotas} disabled={notasSaving}
          style={{ ...btnBase, width:'100%', marginTop:5, padding:'6px', background:notasSaving?C.bg:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', color:'#f59e0b', borderRadius:7, fontSize:11, fontWeight:700, cursor:notasSaving?'default':'pointer' }}>
          {notasSaving?'⏳ Guardando...':'💾 Guardar nota'}
        </button>
      </div>
    </div>
  )
}

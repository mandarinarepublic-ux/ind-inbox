import { useState } from 'react'

// Cambia esta contraseña cuando quieras
const APP_PASSWORD = 'ind2024'

// Paleta IND
const C = {
  bg:      '#0A0A0A',
  surface: '#111111',
  border:  '#1F1F1F',
  cream:   '#F4F1EC',
  creamDim:'#A09A90',
  creamFaint:'#3A3530',
}

export default function Login({ onLogin }) {
  const [pass,    setPass]    = useState('')
  const [error,   setError]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [show,    setShow]    = useState(false)

  const handleSubmit = () => {
    if (!pass.trim()) return
    setLoading(true)
    setTimeout(() => {
      if (pass === APP_PASSWORD) {
        sessionStorage.setItem('ind_auth', '1')
        onLogin()
      } else {
        setError(true)
        setLoading(false)
        setPass('')
        setTimeout(() => setError(false), 2500)
      }
    }, 600)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: ${C.bg}; font-family: 'Outfit', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes spin   { to { transform: rotate(360deg) } }
      `}</style>
      <div style={{
        height: '100vh', background: C.bg, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        backgroundImage: `radial-gradient(ellipse at 50% 40%, rgba(244,241,236,0.04) 0%, transparent 65%)`
      }}>
        <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp .5s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 72, height: 72,
              background: C.cream,
              borderRadius: 22,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, color: C.bg,
              boxShadow: `0 8px 32px rgba(244,241,236,0.15)`,
              marginBottom: 18,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-1px',
            }}>IND</div>
            <h1 style={{ color: C.cream, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              INDLOVERS CHAT
            </h1>
            <p style={{ color: C.creamDim, fontSize: 14 }}>Ingresa la contraseña para continuar</p>
          </div>

          <div style={{
            background: C.surface,
            border: `1px solid ${error ? 'rgba(239,68,68,.4)' : C.border}`,
            borderRadius: 20, padding: 28,
            boxShadow: '0 24px 64px rgba(0,0,0,.8)',
            animation: error ? 'shake .4s ease' : 'none'
          }}>
            <label style={{ fontSize: 11, color: C.creamDim, fontWeight: 700, letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>
              CONTRASEÑA
            </label>
            <div style={{
              display: 'flex', background: C.bg,
              border: `1px solid ${error ? 'rgba(239,68,68,.3)' : C.border}`,
              borderRadius: 12, overflow: 'hidden', marginBottom: 16
            }}>
              <input
                type={show ? 'text' : 'password'}
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: C.cream, fontSize: 16, padding: '13px 14px', fontFamily: 'inherit'
                }}
              />
              <button onClick={() => setShow(!show)} style={{ background: 'transparent', border: 'none', color: C.creamDim, padding: '0 14px', cursor: 'pointer', fontSize: 16 }}>
                {show ? '🙈' : '👁️'}
              </button>
            </div>

            {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 14, textAlign: 'center' }}>✕ Contraseña incorrecta</p>}

            <button
              onClick={handleSubmit}
              disabled={!pass.trim() || loading}
              style={{
                width: '100%', padding: '13px',
                background: pass.trim() ? C.cream : C.border,
                border: 'none', borderRadius: 12,
                color: pass.trim() ? C.bg : C.creamFaint,
                fontSize: 15, fontWeight: 800,
                cursor: pass.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'all .2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {loading
                ? <><div style={{ width: 16, height: 16, border: `2px solid rgba(10,10,10,.3)`, borderTop: `2px solid ${C.bg}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Verificando...</>
                : 'Entrar →'
              }
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: C.creamFaint }}>
            INDLOVERS · Solo acceso autorizado
          </p>
        </div>
      </div>
    </>
  )
}

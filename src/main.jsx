import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'

function Root() {
  const [auth, setAuth] = useState(
    sessionStorage.getItem('ind_auth') === '1'
  )
  if (!auth) return <Login onLogin={() => setAuth(true)} />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Root />
)

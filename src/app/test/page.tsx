'use client'
import { useEffect, useState } from 'react'

export default function TestPage() {
  const [cookieStatus, setCookieStatus] = useState<any>(null)
  const [authStatus, setAuthStatus] = useState<any>(null)

  useEffect(() => {
    // Test cookie endpoint
    fetch('/api/auth/test-cookie')
      .then(res => res.json())
      .then(setCookieStatus)
      .catch(console.error)

    // Test auth endpoint
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async res => {
        setAuthStatus({
          status: res.status,
          ok: res.ok,
          data: res.ok ? await res.json() : null
        })
      })
      .catch(console.error)
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Auth Test Page</h1>
      
      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Cookie Status</h2>
        <pre>{JSON.stringify(cookieStatus, null, 2)}</pre>
      </div>

      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Auth Status</h2>
        <pre>{JSON.stringify(authStatus, null, 2)}</pre>
      </div>

      <div>
        <button 
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' })
              .then(() => window.location.reload())
          }}
          style={{ padding: '0.5rem 1rem', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </div>
  )
}
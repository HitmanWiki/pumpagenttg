// src/app/login/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if already logged in
    const token = localStorage.getItem('auth_token')
    if (token) {
      window.location.href = '/dashboard'
      return
    }

    // Get bot username from env
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot'
    console.log('[Login] Using bot username:', botUsername)

    // Load Telegram widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    
    const container = document.getElementById('telegram-login-widget')
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }

    // Define callback
    window.onTelegramAuth = async (user: any) => {
      console.log('[Login] Telegram user:', user)
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        })
        
        const data = await response.json()
        console.log('[Login] Auth response:', data)
        
        if (response.ok && data.token) {
          localStorage.setItem('auth_token', data.token)
          localStorage.setItem('auth_user', JSON.stringify(data.user))
          window.location.href = '/dashboard'
        } else {
          setError(data.error || 'Login failed')
          setLoading(false)
        }
      } catch (error) {
        console.error('[Login] Error:', error)
        setError('Network error. Please try again.')
        setLoading(false)
      }
    }

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [])

  // Don't render on server
  if (!mounted) {
    return null
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#000',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Pump Agent</h1>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Launch tokens on pump.fun directly from Telegram</p>
        
        {loading ? (
          <div>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #00C896', 
              borderTopColor: 'transparent', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p>Logging in...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : error ? (
          <div>
            <p style={{ color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                background: '#00C896',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div id="telegram-login-widget" className="flex justify-center"></div>
        )}
        
        {/* Fallback button */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ color: '#555', marginBottom: '1rem' }}>Or</p>
          <a 
            href="https://t.me/pumpagenttg_bot" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#00C896',
              color: '#000',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}
          >
            Open Bot on Telegram
          </a>
        </div>
        
        <p style={{ color: '#555', marginTop: '2rem', fontSize: '0.875rem' }}>
          By logging in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
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
  }, [])

  // src/app/login/page.tsx - Update the handleLogin function
const handleLogin = async () => {
  setLoading(true)
  setError(null)
  
  try {
    // Create a unique login ID
    const loginId = Date.now().toString()
    localStorage.setItem('pending_login', loginId)
    
    // Open Telegram bot with login command
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot'
    window.open(`https://t.me/${botUsername}?start=login_${loginId}`, '_blank')
    
    // Poll for login completion
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/check-login?id=${loginId}`)
        const data = await response.json()
        
        if (data.token) {
          localStorage.setItem('auth_token', data.token)
          localStorage.setItem('auth_user', JSON.stringify(data.user))
          localStorage.removeItem('pending_login')
          clearInterval(interval)
          window.location.href = '/dashboard'
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 2000)
    
    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(interval)
      if (localStorage.getItem('pending_login')) {
        setError('Login timed out. Please try again.')
        setLoading(false)
      }
    }, 60000)
    
  } catch (error) {
    console.error('Login error:', error)
    setError('Failed to open Telegram. Please try again.')
    setLoading(false)
  }
}

  // Create a simple login with Telegram button
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot'
  const directTelegramLink = `https://t.me/${botUsername}?start=login`

  if (!mounted) return null

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
            <p>Check Telegram to complete login...</p>
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
          <>
            <button
              onClick={handleLogin}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#00C896',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.48l-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.194 1.006.131.893.077z"/>
              </svg>
              Login with Telegram
            </button>
            
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ color: '#555', marginBottom: '1rem' }}>Or</p>
              <a 
                href={directTelegramLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '1px solid #00C896',
                  color: '#00C896',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold'
                }}
              >
                Open Bot on Telegram
              </a>
            </div>
          </>
        )}
        
        <p style={{ color: '#555', marginTop: '2rem', fontSize: '0.875rem' }}>
          By logging in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
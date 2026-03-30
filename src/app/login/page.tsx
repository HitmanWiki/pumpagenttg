// src/app/login/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      }).then(res => {
        if (res.ok) {
          router.push('/dashboard')
        } else {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      }).catch(console.error)
    }

    // Load Telegram Login Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    
    const container = document.getElementById('telegram-login-widget')
    if (container) {
      container.innerHTML = ''
      container.appendChild(script)
    }

    return () => {
      if (container && script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [router])

  useEffect(() => {
    window.onTelegramAuth = async (user: any) => {
      console.log('[Login] Telegram user:', user)
      setLoading(true)
      
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        })
        
        const data = await response.json()
        console.log('[Login] Auth response:', data)
        
        if (response.ok && data.success && data.token) {
          // Store token in localStorage
          localStorage.setItem('auth_token', data.token)
          localStorage.setItem('auth_user', JSON.stringify(data.user))
          
          // Redirect to dashboard
          router.push('/dashboard')
        } else {
          alert(data.error || 'Login failed')
          setLoading(false)
        }
      } catch (error) {
        console.error('[Login] Error:', error)
        alert('Network error. Please try again.')
        setLoading(false)
      }
    }

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [router])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#000',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '2rem' }}>Pump Agent</h1>
        {loading ? (
          <p>Logging in...</p>
        ) : (
          <div id="telegram-login-widget"></div>
        )}
      </div>
    </div>
  )
}
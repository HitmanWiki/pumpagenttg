// src/app/login/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          router.push('/dashboard')
        }
      })
      .catch(console.error)

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

  // Global callback
  useEffect(() => {
    window.onTelegramAuth = async (user: any) => {
      console.log('[Login] Telegram user:', user)
      setLoading(true)
      
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(user)
        })
        
        const data = await response.json()
        console.log('[Login] Auth response:', data)
        
        if (response.ok && data.success) {
          // Force a small delay to ensure cookie is set
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
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
// src/components/Nav.tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in via cookie
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false))
  }, [])

  const handleLogout = async () => {
    // Call logout endpoint (you may need to create this)
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include' 
    })
    router.push('/')
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <div className="logo-mark">PA</div>
        <span className="logo-text">Pump Agent</span>
      </Link>
      <div className="nav-links">
        <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
        <Link href="/tokens" className="nav-link">Tokens</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        {isLoggedIn ? (
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}>
            Logout
          </button>
        ) : (
          <Link href="/" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', borderRadius: 8 }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
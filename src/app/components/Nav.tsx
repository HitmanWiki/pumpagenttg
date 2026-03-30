// src/components/Nav.tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
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
          <Link href="/login" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', borderRadius: 8 }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
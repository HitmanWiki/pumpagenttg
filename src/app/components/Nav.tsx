// src/components/Nav.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/')
    setMenuOpen(false)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2.5rem',
        borderBottom: '1px solid rgba(0,200,150,0.07)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(6,10,8,0.88)'
      }} className="desktop-nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image 
            src="/logo.png" 
            alt="Pump Agent Logo" 
            width={36} 
            height={36}
            style={{ borderRadius: '8px' }}
          />
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#e2ece6' }}>Pump Agent TG</span>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/leaderboard" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00C896'} onMouseLeave={e => e.currentTarget.style.color = '#5a7264'}>Leaderboard</Link>
          <Link href="/tokens" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00C896'} onMouseLeave={e => e.currentTarget.style.color = '#5a7264'}>Tokens</Link>
          <Link href="/dashboard" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#00C896'} onMouseLeave={e => e.currentTarget.style.color = '#5a7264'}>Dashboard</Link>
          {isLoggedIn ? (
            <button onClick={handleLogout} style={{ background: 'transparent', color: '#00C896', border: '1px solid rgba(0,200,150,0.25)', padding: '0.5rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
              Logout
            </button>
          ) : (
            <Link href="/login" style={{ background: '#00C896', color: '#030f07', padding: '0.5rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8125rem', display: 'inline-block' }}>
              Login
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(0,200,150,0.07)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(6,10,8,0.88)',
        flexWrap: 'wrap'
      }} className="mobile-nav">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
            <Image 
              src="/logo.png" 
              alt="Pump Agent Logo" 
              width={32} 
              height={32}
              style={{ borderRadius: '8px' }}
            />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2ece6' }}>Pump Agent TG</span>
          </Link>
          
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        
        {menuOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            textAlign: 'center',
            gap: '0.75rem',
            paddingTop: '1rem',
            marginTop: '1rem',
            borderTop: '1px solid rgba(0,200,150,0.1)'
          }}>
            <Link href="/leaderboard" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, padding: '0.5rem' }} onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            <Link href="/tokens" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, padding: '0.5rem' }} onClick={() => setMenuOpen(false)}>Tokens</Link>
            <Link href="/dashboard" style={{ fontSize: '0.875rem', color: '#5a7264', textDecoration: 'none', fontWeight: 500, padding: '0.5rem' }} onClick={() => setMenuOpen(false)}>Dashboard</Link>
            {isLoggedIn ? (
              <button onClick={handleLogout} style={{ background: 'transparent', color: '#00C896', border: '1px solid rgba(0,200,150,0.25)', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', width: '100%' }}>
                Logout
              </button>
            ) : (
              <Link href="/login" style={{ background: '#00C896', color: '#030f07', padding: '0.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, display: 'block' }} onClick={() => setMenuOpen(false)}>
                Login
              </Link>
            )}
          </div>
        )}
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-nav {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
          }
        }
      `}</style>
    </>
  )
}
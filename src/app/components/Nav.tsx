'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const path = usePathname()
  const links = [
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/tokens',      label: 'Tokens' },
    { href: '/dashboard',   label: 'Dashboard' },
  ]
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <div className="logo-mark">PA</div>
        <span className="logo-text">Pump Agent</span>
      </Link>
      <div className="nav-links">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={`nav-link${path === l.href ? ' active' : ''}`}>
            {l.label}
          </Link>
        ))}
        <a
          href={`https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'YourBot'}`}
          target="_blank" rel="noopener noreferrer"
          className="btn-primary btn-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.48l-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.194 1.006.131.893.077z"/>
          </svg>
          Launch Token
        </a>
      </div>
    </nav>
  )
}
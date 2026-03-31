import Link from 'next/link'

export default function Footer() {
  const tgLink = `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot'}`

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Logo */}
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '6px',
            background: '#00C896',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#030f07'
          }}>
            PA
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} Pump Agent · Built on Solana · Non-custodial · No KYC
          </div>
        </div>
        <div className="footer-links">
          <Link href="/leaderboard" className="footer-link">Leaderboard</Link>
          <Link href="/tokens"      className="footer-link">All Tokens</Link>
          <Link href="/dashboard"   className="footer-link">Dashboard</Link>
          <a href={tgLink}
            target="_blank" rel="noopener noreferrer" className="footer-link">Telegram</a>
        </div>
      </div>
    </footer>
  )
}
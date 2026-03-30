import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-copy">
          © {new Date().getFullYear()} Pump Agent · Built on Solana · Non-custodial · No KYC
        </div>
        <div className="footer-links">
          <Link href="/leaderboard" className="footer-link">Leaderboard</Link>
          <Link href="/tokens"      className="footer-link">All Tokens</Link>
          <Link href="/dashboard"   className="footer-link">Dashboard</Link>
          <a href={`https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'YourBot'}`}
            target="_blank" rel="noopener noreferrer" className="footer-link">Telegram</a>
        </div>
      </div>
    </footer>
  )
}
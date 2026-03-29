// src/app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourBotName'

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a2e22]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00C896] flex items-center justify-center text-black font-bold text-sm">P</div>
          <span className="font-semibold text-[#e8f0ea]">Pump Agent</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-[#6b7f72] hover:text-[#00C896] transition-colors">Leaderboard</Link>
          <Link href="/tokens" className="text-sm text-[#6b7f72] hover:text-[#00C896] transition-colors">Tokens</Link>
          <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#0e1610] border border-[#1a2e22] rounded-full px-4 py-2 text-sm text-[#00C896] mb-8">
          <span className="live-dot"></span>
          Built on Solana · pump.fun
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-3xl">
          Launch Tokens<br />
          <span className="text-[#00C896]">with Telegram</span>
        </h1>

        <p className="text-[#6b7f72] text-lg md:text-xl max-w-xl mb-12">
          DM our bot with your token name and ticker to instantly deploy on Solana via pump.fun. Track your tokens and claim trading fees from your dashboard.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center gap-2 text-base px-6 py-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.48l-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.194 1.006.131.893.077z"/>
            </svg>
            Launch via Telegram
          </a>
          <Link href="/dashboard" className="btn-secondary text-base px-6 py-3">
            View Dashboard
          </Link>
        </div>

        {/* How it works */}
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl w-full mb-24">
          {[
            {
              step: '01',
              title: 'DM the Bot',
              desc: 'Send a photo + /launch Token Name $TICKER to our Telegram bot'
            },
            {
              step: '02',
              title: 'Auto Deploy',
              desc: 'Token instantly deployed on pump.fun with IPFS metadata in under 2 seconds'
            },
            {
              step: '03',
              title: 'Earn & Claim',
              desc: 'Accumulate 90% of all trading fees. Claim directly to your Solana wallet'
            }
          ].map((item) => (
            <div key={item.step} className="card p-6 text-left">
              <div className="text-[#00C896] font-mono text-sm mb-3">{item.step}</div>
              <h3 className="font-semibold text-[#e8f0ea] mb-2">{item.title}</h3>
              <p className="text-[#6b7f72] text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-8 max-w-lg w-full mb-24">
          {[
            { label: 'Platform Fee', value: '0%', sub: 'launch is free' },
            { label: 'You Earn', value: '90%', sub: 'of trading fees' },
            { label: 'Deploy Time', value: '<2s', sub: 'on Solana' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-[#00C896] mb-1">{stat.value}</div>
              <div className="text-xs text-[#6b7f72] uppercase tracking-wider">{stat.label}</div>
              <div className="text-xs text-[#4a5e51] mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Command example */}
        <div className="card max-w-lg w-full p-6 text-left">
          <div className="flex items-center gap-2 mb-4 text-xs text-[#6b7f72] uppercase tracking-wider">
            <span className="w-3 h-3 rounded-full bg-red-500/60"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/60"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/60"></span>
            <span className="ml-2">Telegram · DM</span>
          </div>
          <div className="font-mono text-sm space-y-3">
            <div className="text-[#6b7f72]">{'// Step 1 — Send a photo, then type:'}</div>
            <div>
              <span className="text-[#00C896]">/launch</span>
              <span className="text-[#e8f0ea]"> My Awesome Token </span>
              <span className="text-[#00C896]">$MAT</span>
            </div>
            <div className="text-[#6b7f72] text-xs">description: A community-first meme token</div>
            <div className="text-[#6b7f72] text-xs">website: https://mytoken.xyz</div>
            <div className="border-t border-[#1a2e22] pt-3 mt-3">
              <div className="text-[#6b7f72] text-xs mb-2">{'// Bot reply on success'}</div>
              <div className="text-[#00C896]">✅ My Awesome Token ($MAT) is LIVE on pump.fun!</div>
              <div className="text-[#6b7f72] text-xs mt-1">🔗 pump.fun/coin/...</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1a2e22] px-6 py-6 text-center text-xs text-[#4a5e51]">
        Pump Agent · Built on Solana · Non-custodial · No KYC
      </footer>
    </main>
  )
}

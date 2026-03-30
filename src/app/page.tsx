'use client'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import './globals.css'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'pumpagenttg_bot'

// Add TypeScript declaration for window.onTelegramAuth
declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * end))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ── Terminal ──────────────────────────────────────────────────────────────────
const LINES = [
  { delay: 0,    text: '$ [attach token image]',             color: '#4a5e52' },
  { delay: 700,  text: '/launch Moon Pepe $MPEPE',           color: '#00C896' },
  { delay: 1300, text: 'description: The dankest frog on Solana', color: '#6b7f72' },
  { delay: 1900, text: 'website: https://moonpepe.xyz',      color: '#6b7f72' },
  { delay: 2700, text: '⏳ Uploading to IPFS...',            color: '#c8a800' },
  { delay: 3500, text: '⛓  Deploying on pump.fun...',        color: '#c8a800' },
  { delay: 4500, text: '✅ Moon Pepe ($MPEPE) is LIVE!',     color: '#00C896' },
  { delay: 5100, text: '🔗 pump.fun/coin/7fZK58DP...',       color: '#00C896' },
  { delay: 5700, text: '💰 Earning 90% of trading fees',     color: '#00C896' },
]

function Terminal() {
  const [visible, setVisible] = useState<number[]>([])
  useEffect(() => {
    const timers = LINES.map((line, i) =>
      setTimeout(() => setVisible(v => [...v, i]), line.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div className="terminal-card">
      <div className="terminal-bar">
        <span className="t-dot r" /><span className="t-dot y" /><span className="t-dot g" />
        <span className="terminal-title">Telegram · @PumpAgentBot · DM</span>
      </div>
      <div className="terminal-body">
        {LINES.map((line, i) => (
          <div key={i} className="t-line" style={{
            color: line.color,
            opacity: visible.includes(i) ? 1 : 0,
            transform: visible.includes(i) ? 'translateY(0)' : 'translateY(6px)',
          }}>
            {line.text}
          </div>
        ))}
        <span className="t-cursor" />
      </div>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'How much does it cost to launch a token?', a: 'Launching is completely free. No upfront cost, no platform fee. The first buyer of your token covers the on-chain creation fee automatically via pump.fun.' },
  { q: 'How are trading fees collected?', a: 'Every trade on pump.fun generates fees. Each token gets a dedicated Solana wallet that accumulates these fees automatically. You claim 90% directly to your wallet anytime.' },
  { q: 'Is my wallet safe? Do you hold my keys?', a: 'We are fully non-custodial. Each token wallet keypair is encrypted at rest. Your personal wallet keys are never stored — only used to receive payouts.' },
  { q: 'What are the token name and ticker rules?', a: 'Token name: 2–32 characters. Ticker: 2–10 letters only (no numbers or symbols), with the $ prefix. You must attach an image to your Telegram message.' },
  { q: 'Can I launch multiple tokens?', a: 'Yes, unlimited. Each token gets its own dedicated wallet, fee tracking, and dashboard entry. Launch as many as you want.' },
  { q: "What happens after the bonding curve completes?", a: "When your token graduates from pump.fun's bonding curve, it moves to Raydium. Your token status updates to Graduated on your dashboard automatically." },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="faq-list">
      {FAQS.map((faq, i) => (
        <div key={i} className={`faq-item${open === i ? ' open' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
          <div className="faq-q">
            <span>{faq.q}</span>
            <span className="faq-icon">{open === i ? '−' : '+'}</span>
          </div>
          {open === i && <div className="faq-a">{faq.a}</div>}
        </div>
      ))}
    </div>
  )
}

const TgIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 14.48l-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.194 1.006.131.893.077z"/>
  </svg>
)

// ── Telegram Login Component ──────────────────────────────────────────────────
function TelegramLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if already logged in
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          router.push('/dashboard')
        }
      })
      .catch(console.error)

    // Setup Telegram login widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
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
      // Clean up the global callback
      window.onTelegramAuth = undefined
    }
  }, [router])

  // Global callback for Telegram login
  useEffect(() => {
    window.onTelegramAuth = async (user: any) => {
      console.log('[Telegram] Auth callback received:', user)
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        })
        
        const data = await response.json()
        console.log('[Telegram] Auth response:', data)
        
        if (response.ok && data.success) {
          // Wait a moment for cookie to be set
          setTimeout(() => {
            router.push('/dashboard')
          }, 500)
        } else {
          setError(data.error || 'Login failed')
          setLoading(false)
        }
      } catch (error) {
        console.error('[Telegram] Login error:', error)
        setError('Network error. Please try again.')
        setLoading(false)
      }
    }

    return () => {
      window.onTelegramAuth = undefined
    }
  }, [router])

  return (
    <div className="telegram-login-container">
      <div id="telegram-login-widget" className="flex justify-center"></div>
      {loading && <p className="mt-4 text-center text-gray-400">Logging in...</p>}
      {error && <p className="mt-4 text-center text-red-500">{error}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const tgLink = `https://t.me/${BOT_USERNAME}`

  return (
    <>
      <div className="grid-bg" />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav className="nav">
          <Link href="/" className="nav-logo">
            <div className="logo-mark">PA</div>
            <span className="logo-text">Pump Agent</span>
          </Link>
          <div className="nav-links">
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/tokens" className="nav-link">Tokens</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
            <a href={tgLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', borderRadius: 8 }}>
              <TgIcon /> Launch Token
            </a>
          </div>
        </nav>

        {/* Hero */}
        <div className="hero-grid">
          <div>
            <div className="badge fade-up-1" style={{ marginBottom: '1.75rem' }}>
              <span className="badge-dot" /> Live on Solana · pump.fun
            </div>
            <h1 className="hero-title fade-up-2">
              Launch Tokens<br />
              <span className="accent">with a Telegram</span><br />
              <span className="stroke">Message.</span>
            </h1>
            <p className="hero-sub fade-up-3">
              DM our bot, attach an image, type /launch — your token goes live on pump.fun in under 2 seconds. No code. No wallets. No complexity.
            </p>
            <div className="hero-ctas fade-up-4">
              <a href={tgLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <TgIcon /> Open Telegram Bot
              </a>
              <Link href="/leaderboard" className="btn-ghost">View Leaderboard →</Link>
            </div>
            <div className="hero-meta fade-up-4">
              <span>⚡ &lt;2s deploy</span>
              <span>🔒 Non-custodial</span>
              <span>🌍 No KYC</span>
            </div>
          </div>
          <div className="fade-up-2"><Terminal /></div>
        </div>

        {/* Stats */}
        <div className="stats-section">
          <div className="stats-grid">
            {[
              { end: 0,  suffix: '%', label: 'Launch cost',    sub: 'completely free' },
              { end: 90, suffix: '%', label: 'Fees you keep',  sub: 'per trade' },
              { end: 2,  suffix: 's', label: 'Deploy time',    sub: 'on Solana mainnet' },
              { end: 24, suffix: '/7',label: 'Availability',   sub: 'worldwide, no KYC' },
            ].map((s, i) => (
              <div key={i}>
                <div className="stat-val"><Counter end={s.end} suffix={s.suffix} /></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="section">
          <div className="section-label">// How it works</div>
          <h2 className="section-title">From idea to live token<br />in three steps</h2>
          <p className="section-sub">No smart contract knowledge. No wallet setup. Just Telegram.</p>

          <div className="steps-grid">
            {[
              { num: '01', title: 'DM the Bot', desc: 'Open Telegram, send your token image with caption: /launch Token Name $TICKER — optionally add description: and website: lines below.' },
              { num: '02', title: 'Auto Deploy', desc: 'Your image uploads to IPFS, metadata is signed on-chain, and your token is live on pump.fun with an instant liquidity pool in under 2 seconds.' },
              { num: '03', title: 'Earn & Claim', desc: '90% of every trading fee flows to your token wallet automatically. Claim anytime to any Solana address directly from your dashboard.' },
            ].map((s) => (
              <div key={s.num} className="step-card">
                <div className="step-num">{s.num}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="format-box">
            <div className="format-mono-label">// Exact command format</div>
            {[
              { key: 'Required', val: <><span className="hl">/launch</span> My Token Name <span className="hl">$MTK</span></> },
              { key: 'Optional', val: <><span className="dim">description:</span> A brief token description</> },
              { key: 'Optional', val: <><span className="dim">website:</span> https://yoursite.com</> },
            ].map((row, i) => (
              <div key={i} className="format-row">
                <span className="format-key">{row.key}</span>
                <span className="format-val">{row.val}</span>
              </div>
            ))}
            <div className="format-divider" />
            <div className="format-row">
              <span className="format-key">Rules</span>
              <span className="format-val" style={{ color: '#5a7264', fontSize: '0.8125rem' }}>
                Name: 2–32 chars · Ticker: 2–10 letters only · Must attach an image · $ prefix required
              </span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-label">// Why Pump Agent</div>
          <h2 className="section-title">Everything you need,<br />nothing you don't</h2>
          <div className="feature-grid">
            {[
              { icon: '⚡', title: 'Lightning Fast',     desc: 'Under 2 seconds from command to live token. Optimized Solana infrastructure with priority fees baked in.' },
              { icon: '🔒', title: 'Non-Custodial',      desc: 'Your wallet keys are never stored. Each token wallet is encrypted at rest, decrypted only to process claims.' },
              { icon: '💸', title: '90% Fee Share',      desc: 'Every trade generates fees. You keep 90% automatically — no lock-up periods, no vesting, claim anytime.' },
              { icon: '🌍', title: 'Global & Open',      desc: 'Available 24/7 worldwide. No geographic restrictions, no KYC, no account creation required.' },
              { icon: '📊', title: 'Live Dashboard',     desc: "Track market cap, volume, fees earned, and claim history for every token you've ever launched." },
              { icon: '🏆', title: 'Campaigns & Prizes', desc: 'Compete in market cap challenges to win prizes. First token to reach the goal takes the pot.' },
              { icon: '🤖', title: 'Bot Commands',       desc: '/tokens, /fees, /help — manage everything from Telegram without ever opening a browser.' },
              { icon: '🔗', title: 'pump.fun Native',    desc: "Built on pump.fun's proven smart contracts with 100M+ in cumulative volume. Battle-tested." },
              { icon: '∞',  title: 'Unlimited Tokens',  desc: 'Launch as many tokens as you want. Each gets its own dedicated wallet, tracking, and fee stream.' },
            ].map((f) => (
              <div key={f.title} className="feature-cell">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="fee-section">
          <div className="fee-grid">
            <div>
              <div className="section-label">// Transparent economics</div>
              <h2 className="section-title">You keep<br /><span style={{ color: '#00C896' }}>90%</span> of everything</h2>
              <p className="section-sub" style={{ marginTop: '1rem' }}>
                Every trade on pump.fun generates creator fees. We split them fairly and automatically — no claiming delays, no hidden cuts.
              </p>
              <div className="fee-bar-wrap">
                <div className="fee-bar-labels">
                  <span style={{ color: '#00C896' }}>You · 90%</span>
                  <span style={{ color: '#c8a800' }}>Platform · 10%</span>
                </div>
                <div className="fee-bar">
                  <div className="fee-bar-you" />
                  <div className="fee-bar-plat" />
                </div>
                <div className="fee-legend">
                  <span><span className="legend-dot" style={{ background: '#00C896' }} /> Goes directly to your wallet</span>
                  <span><span className="legend-dot" style={{ background: '#c8a800' }} /> Keeps platform running</span>
                </div>
              </div>
              <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: '#3a4e42', fontFamily: 'DM Mono, monospace' }}>
                Minimum claim: 0.1 SOL · Launch is free · No hidden fees
              </p>
            </div>
            <div className="fee-cards">
              {[
                { val: '0%',  label: 'Launch fee',      sub: 'Always free to deploy',   color: '#00C896' },
                { val: '90%', label: 'Your cut',         sub: 'Of every trading fee',    color: '#00C896' },
                { val: '0.1', label: 'Min claim (SOL)',  sub: 'Then claim anytime',      color: '#00C896' },
                { val: '10%', label: 'Platform fee',     sub: 'Only on claims',          color: '#c8a800' },
              ].map((c) => (
                <div key={c.label} className="fee-card">
                  <div className="fee-card-val" style={{ color: c.color }}>{c.val}</div>
                  <div className="fee-card-name">{c.label}</div>
                  <div className="fee-card-sub">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="section narrow">
          <div className="section-label">// FAQ</div>
          <h2 className="section-title">Common questions</h2>
          <FAQ />
        </div>

        {/* CTA - Login Section */}
<div className="cta-section">
  <div className="cta-glow" />
  <div style={{ position: 'relative' }}>
    <div className="badge" style={{ marginBottom: '1.5rem' }}>
      <span className="badge-dot" /> Get Started
    </div>
    <h2 className="cta-title">Sign in to access<br />your dashboard</h2>
    <p className="cta-sub">Login with Telegram to view your tokens, track earnings, and claim fees.</p>
    <div className="cta-btns" style={{ flexDirection: 'column', gap: '1.5rem' }}>
      <Link href="/login" className="btn-primary" style={{ display: 'inline-block', padding: '0.75rem 2rem' }}>
        Login with Telegram
      </Link>
      <a href={tgLink} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ marginTop: '0' }}>
        <TgIcon /> Open Telegram Bot
      </a>
    </div>
  </div>
</div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(0,200,150,0.06)' }}>
          <div className="footer-inner">
            <div className="footer-copy">
              © {new Date().getFullYear()} Pump Agent · Built on Solana · Non-custodial · No KYC
            </div>
            <div className="footer-links">
              <Link href="/leaderboard" className="footer-link">Leaderboard</Link>
              <Link href="/tokens" className="footer-link">All Tokens</Link>
              <Link href="/dashboard" className="footer-link">Dashboard</Link>
              <a href={tgLink} target="_blank" rel="noopener noreferrer" className="footer-link">Telegram</a>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
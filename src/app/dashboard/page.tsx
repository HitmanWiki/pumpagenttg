'use client'
// src/app/dashboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SOL_USD = 150 // fallback, you can fetch live price

function lamportsToSol(l: number) { return l / 1e9 }
function solToUsd(sol: number) { return (sol * SOL_USD).toFixed(2) }
function shortAddr(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}` }
function formatSol(l: number) { return lamportsToSol(l).toFixed(4) }

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [destWallet, setDestWallet] = useState('')
  const [claimMsg, setClaimMsg] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [meRes, tokRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/tokens'),
    ])
    if (meRes.ok) setUser((await meRes.json()).user)
    if (tokRes.ok) setData(await tokRes.json())
    setLoading(false)
  }

  async function handleClaim() {
    if (!destWallet) return setClaimMsg('Enter your Solana wallet address')
    setClaiming(true)
    setClaimMsg('')
    const res = await fetch('/api/fees/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationWallet: destWallet }),
    })
    const json = await res.json()
    if (res.ok) {
      setClaimMsg('✅ Fees claimed successfully!')
      fetchAll()
    } else {
      setClaimMsg(`❌ ${json.error}`)
    }
    setClaiming(false)
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-[#6b7f72]">Sign in with Telegram to view your dashboard</div>
        <Link href="/" className="btn-primary">Go Home</Link>
      </div>
    )
  }

  const stats = data?.stats || {}
  const tokens = data?.tokens || []
  const claimableSol = lamportsToSol(stats.claimableFeesLamports || 0)
  const earnedSol = lamportsToSol(stats.totalEarnedLamports || 0)
  const afterFee = claimableSol * 0.9
  const minClaim = 0.1
  const needMore = Math.max(0, minClaim - claimableSol).toFixed(4)

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a2e22]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00C896] flex items-center justify-center text-black font-bold text-xs">P</div>
          <span className="font-semibold text-sm">Pump Agent</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="text-xs text-[#6b7f72] hover:text-[#00C896] flex items-center gap-1">
            ↻ Refresh
          </button>
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-7 h-7 rounded-full bg-[#1a2e22] flex items-center justify-center text-xs font-bold text-[#00C896]">
                {(user.telegramFirstName?.[0] || user.telegramUsername?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-[#6b7f72] text-xs">@{user.telegramUsername || 'user'}</span>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🚀 Dashboard
          </h1>
          {user && (
            <p className="text-[#6b7f72] text-sm mt-1">
              Welcome back, <span className="text-[#00C896]">@{user.telegramUsername || user.telegramFirstName}</span>
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#6b7f72] uppercase tracking-wider">Total Tokens</span>
              <span className="text-[#00C896]">🚀</span>
            </div>
            <div className="text-3xl font-bold">{loading ? '—' : stats.totalTokens || 0}</div>
            <div className="text-xs text-[#6b7f72] mt-1">
              {stats.totalTokens || 0} deployed · 0 pending
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#6b7f72] uppercase tracking-wider">Total Earned</span>
              <span className="text-[#00C896]">📈</span>
            </div>
            <div className="text-3xl font-bold">{loading ? '—' : `${earnedSol.toFixed(4)} SOL`}</div>
            <div className="text-xs text-[#6b7f72] mt-1">≈ ${solToUsd(earnedSol)} USD</div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#6b7f72] uppercase tracking-wider">Available to Claim</span>
              <span className="text-[#00C896]">🔗</span>
            </div>
            <div className="text-3xl font-bold text-[#00C896]">{loading ? '—' : `${claimableSol.toFixed(4)} SOL`}</div>
            <div className="text-xs text-[#6b7f72] mt-1">You keep 90% · Platform takes 10%</div>
          </div>
        </div>

        {/* Fee Claim Center */}
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1a2e22] flex items-center justify-center text-[#00C896]">🔗</div>
              <div>
                <div className="font-semibold">Fee Claim Center</div>
                <div className="text-xs text-[#6b7f72]">Claim your earned trading fees</div>
              </div>
            </div>
            <button className="text-xs text-[#6b7f72] border border-[#1a2e22] rounded px-3 py-1.5 hover:border-[#00C896] transition-colors">
              📋 Breakdown
            </button>
          </div>

          {/* Fee split bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs text-[#6b7f72] mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00C896] inline-block"></span>
                You: <span className="text-[#e8f0ea] font-medium">90%</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                Platform: <span className="text-[#e8f0ea] font-medium">10%</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-[#1a2e22] flex">
              <div className="h-full bg-[#00C896]" style={{ width: '90%' }}></div>
              <div className="h-full bg-amber-400" style={{ width: '10%' }}></div>
            </div>
          </div>

          {/* Destination wallet input */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs text-[#6b7f72] uppercase tracking-wider mb-2 block">Destination Wallet</label>
              <input
                type="text"
                placeholder="Your Solana wallet address"
                value={destWallet}
                onChange={e => setDestWallet(e.target.value)}
                className="w-full bg-[#080c0a] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-sm text-[#e8f0ea] placeholder-[#4a5e51] focus:border-[#00C896] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7f72] uppercase tracking-wider mb-2 block">Withdraw From</label>
              <div className="w-full bg-[#080c0a] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-sm text-[#e8f0ea]">
                All deployed token wallets
              </div>
            </div>
          </div>

          {/* Claimable amount */}
          <div className="mb-6">
            <div className="text-xs text-[#6b7f72] uppercase tracking-wider mb-2">Claimable Balance</div>
            <div className="text-4xl font-bold text-[#00C896] mb-1">
              {claimableSol.toFixed(4)} <span className="text-xl text-[#6b7f72]">SOL</span>
            </div>
            <div className="text-sm text-[#6b7f72]">≈ ${solToUsd(claimableSol)} USD</div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-[#00C896]">↗ You'll receive: {afterFee.toFixed(4)} SOL <span className="text-[#6b7f72]">(after 10% fee)</span></span>
            </div>
            {claimableSol < minClaim && (
              <div className="text-xs text-amber-400 mt-2">
                ⏱ Min claim: {minClaim} SOL — need {needMore} more
              </div>
            )}
          </div>

          {claimMsg && (
            <div className={`text-sm mb-4 ${claimMsg.startsWith('✅') ? 'text-[#00C896]' : 'text-red-400'}`}>
              {claimMsg}
            </div>
          )}

          <button
            onClick={handleClaim}
            disabled={claiming || claimableSol < minClaim || !destWallet}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed w-full md:w-auto px-8"
          >
            {claiming ? 'Claiming...' : `Claim ${afterFee.toFixed(4)} SOL`}
          </button>
        </div>

        {/* Your Tokens */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              Your Tokens
              <span className="bg-[#1a2e22] text-[#00C896] text-xs rounded-full px-2 py-0.5 font-mono">
                {tokens.length}
              </span>
            </h2>
            <span className="text-xs text-[#4a5e51]">Click any token to view details</span>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="card p-5 animate-pulse">
                  <div className="h-4 bg-[#1a2e22] rounded w-1/2 mb-3"></div>
                  <div className="h-8 bg-[#1a2e22] rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-[#1a2e22] rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🚀</div>
              <div className="text-[#6b7f72] mb-4">No tokens yet. Launch your first token via Telegram!</div>
              <a
                href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'YourBot'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Open Telegram Bot
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {tokens.map((token: any) => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TokenCard({ token }: { token: any }) {
  const feeSol = lamportsToSol(Number(token.claimableFeesLamports))
  const shortMint = `${token.mintAddress.slice(0, 8)}...pump`
  const date = new Date(token.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

  return (
    <div className="card p-5 hover:border-[#00C896]/40 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#6b7f72]">{date}</span>
        <span className="live-dot text-xs text-[#00C896] flex items-center">Live</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#1a2e22] flex items-center justify-center text-[#00C896] font-bold text-sm overflow-hidden">
          {token.imageUrl
            ? <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover" />
            : token.symbol.slice(0, 2)
          }
        </div>
        <div>
          <div className="font-semibold text-sm">{token.name}</div>
          <div className="text-[#00C896] font-bold">${token.symbol}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mb-3 bg-[#080c0a] rounded-lg px-3 py-2">
        <span className="text-[#6b7f72] text-xs flex items-center gap-1">📈 Fees Earned</span>
        <span className="font-mono text-sm">{feeSol.toFixed(4)} <span className="text-[#6b7f72] text-xs">SOL</span></span>
      </div>

      <div className="flex items-center justify-between text-xs text-[#4a5e51]">
        <span>🔗 Mint: {shortMint}</span>
        <span>📅 {date.split(',')[0]}</span>
      </div>

      {token.pumpFunUrl && (
        <a
          href={token.pumpFunUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#00C896] border-t border-[#1a2e22] pt-3 hover:opacity-80 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          ↗ View on pump.fun
        </a>
      )}
    </div>
  )
}

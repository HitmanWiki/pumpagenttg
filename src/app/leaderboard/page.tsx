'use client'
// src/app/leaderboard/page.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(t)
  }, [search, page])

  async function fetchData() {
    setLoading(true)
    const res = await fetch(`/api/leaderboard?page=${page}&limit=10&search=${encodeURIComponent(search)}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  const tokens = data?.tokens || []
  const pagination = data?.pagination || {}
  const campaign = data?.campaign

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a2e22]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00C896] flex items-center justify-center text-black font-bold text-xs">P</div>
          <span className="font-semibold text-sm">Pump Agent</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tokens" className="text-sm text-[#6b7f72] hover:text-[#00C896]">Tokens</Link>
          <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#0e1610] border border-[#1a2e22] rounded-full px-4 py-1.5 text-xs text-[#00C896] mb-4">
            🏆 TOKEN LEADERBOARD
          </div>
          <h1 className="text-3xl font-bold mb-2">Top Tokens by Market Cap</h1>
          <p className="text-[#6b7f72] text-sm">Every token launched through Pump Agent, ranked live by market cap.</p>
        </div>

        {/* Active Campaign Banner */}
        {campaign && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎁</span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-amber-500/20 text-amber-400 text-xs rounded-full px-2 py-0.5">Live</span>
                  <span className="font-semibold text-sm">Active Campaign — Reach ${campaign.goal_value?.toLocaleString()} MC</span>
                </div>
                <p className="text-xs text-[#6b7f72]">
                  Be the <strong className="text-[#e8f0ea]">first</strong> token to reach{' '}
                  <strong className="text-amber-400">${campaign.goal_value?.toLocaleString()} Market Cap</strong> and claim{' '}
                  <strong className="text-[#00C896]">${campaign.prize_usd?.toLocaleString()}</strong> — winner takes all.
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-center">
              <div>
                <div className="text-xs text-[#6b7f72] mb-1">WINNER</div>
                <div className="text-sm font-mono text-[#6b7f72]">{campaign.winner_token_id ? '🏆' : '—'}</div>
                <div className="text-xs text-[#4a5e51]">unclaimed</div>
              </div>
              <div>
                <div className="text-xs text-[#6b7f72] mb-1">GOAL</div>
                <div className="text-lg font-bold">${(campaign.goal_value / 1000).toFixed(0)}K</div>
                <div className="text-xs text-[#4a5e51]">market cap</div>
              </div>
              <div>
                <div className="text-xs text-[#00C896] mb-1">PRIZE</div>
                <div className="text-lg font-bold text-[#00C896]">${campaign.prize_usd?.toLocaleString()}</div>
                <div className="text-xs text-[#4a5e51]">first to reach</div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5e51]">🔍</span>
          <input
            type="text"
            placeholder="Search by token name, ticker, or mint address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-[#0e1610] border border-[#1a2e22] rounded-xl pl-10 pr-4 py-3 text-sm text-[#e8f0ea] placeholder-[#4a5e51] focus:border-[#00C896] focus:outline-none transition-colors"
          />
        </div>

        {/* Count */}
        <div className="flex justify-between items-center text-xs text-[#6b7f72] mb-4">
          <span>Showing {tokens.length} of {pagination.total || 0} tokens</span>
          <span>Page {pagination.page || 1} / {pagination.pages || 1}</span>
        </div>

        {/* Token List */}
        <div className="space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a2e22]"></div>
                <div className="flex-1">
                  <div className="h-4 bg-[#1a2e22] rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-[#1a2e22] rounded w-1/4"></div>
                </div>
                <div className="h-5 bg-[#1a2e22] rounded w-20"></div>
              </div>
            ))
          ) : tokens.length === 0 ? (
            <div className="card p-12 text-center text-[#6b7f72]">
              No tokens found{search ? ` for "${search}"` : ''}
            </div>
          ) : (
            tokens.map((token: any, i: number) => {
              const rank = ((page - 1) * 10) + i + 1
              const pct = token.market_cap_usd && campaign
                ? Math.min(100, (token.market_cap_usd / campaign.goal_value) * 100)
                : 2
              return (
                <div key={token.id} className="card p-4 flex items-center gap-4 hover:border-[#00C896]/30 transition-colors cursor-pointer">
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {rank <= 3
                      ? <span className="text-lg">{MEDALS[rank - 1]}</span>
                      : <span className="text-[#4a5e51] text-sm font-mono">{rank}</span>
                    }
                  </div>

                  {/* Logo */}
                  <div className="w-10 h-10 rounded-full bg-[#1a2e22] flex items-center justify-center text-[#00C896] font-bold text-sm overflow-hidden flex-shrink-0">
                    {token.image_url
                      ? <img src={token.image_url} alt={token.name} className="w-full h-full object-cover" />
                      : token.symbol?.slice(0, 2)
                    }
                  </div>

                  {/* Name + creator */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate">{token.name}</span>
                      <span className="text-[#00C896] text-xs font-mono">${token.symbol}</span>
                    </div>
                    <div className="text-xs text-[#4a5e51]">
                      by @{token.users?.telegram_username || token.users?.telegram_first_name || 'unknown'}
                    </div>
                  </div>

                  {/* Progress to campaign goal */}
                  {campaign && (
                    <div className="hidden md:flex items-center gap-3 w-48">
                      <div className="flex-1 h-1.5 bg-[#1a2e22] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00C896] rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-xs text-[#6b7f72] whitespace-nowrap">{pct.toFixed(0)}% to goal</span>
                    </div>
                  )}

                  {/* Market cap */}
                  <div className="text-right">
                    <div className={`font-bold text-sm ${token.market_cap_usd > 0 ? 'text-[#00C896]' : 'text-[#4a5e51]'}`}>
                      {token.market_cap_usd > 0 ? `$${token.market_cap_usd.toLocaleString()}` : '—'}
                    </div>
                    {token.pump_fun_url && (
                      <a href={token.pump_fun_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#4a5e51] hover:text-[#00C896] transition-colors"
                        onClick={e => e.stopPropagation()}>
                        pump.fun ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-40"
            >← Prev</button>
            <span className="flex items-center px-4 text-sm text-[#6b7f72]">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="btn-secondary text-sm disabled:opacity-40"
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

type SortOption = 'marketCap' | 'volume' | 'newest'
type FilterOption = 'all' | 'live' | 'graduated'

export default function TokensPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('marketCap')
  const [filter, setFilter] = useState<FilterOption>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 12

  useEffect(() => {
    const t = setTimeout(fetchTokens, 300)
    return () => clearTimeout(t)
  }, [search, sort, filter, page])

  async function fetchTokens() {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      sort,
      filter,
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/tokens/all?${params}`)
    if (res.ok) {
      const data = await res.json()
      setTokens(data.tokens)
      setTotal(data.pagination.total)
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a2e22]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00C896] flex items-center justify-center text-black font-bold text-xs">P</div>
          <span className="font-semibold text-sm">Pump Agent</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/leaderboard" className="text-sm text-[#6b7f72] hover:text-[#00C896]">Leaderboard</Link>
          <Link href="/dashboard" className="btn-primary text-sm">Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Tokens</h1>
          <p className="text-[#6b7f72]">{total} tokens launched on Pump Agent</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name, ticker, or mint address..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 min-w-[200px] bg-[#0e1610] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-sm placeholder-[#4a5e52] focus:outline-none focus:border-[#00C896]"
          />
          <select
            value={sort}
            onChange={e => { setSort(e.target.value as SortOption); setPage(1) }}
            className="bg-[#0e1610] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#00C896]"
          >
            <option value="marketCap">Market Cap: High → Low</option>
            <option value="volume">Volume 24h: High → Low</option>
            <option value="newest">Newest First</option>
          </select>
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value as FilterOption); setPage(1) }}
            className="bg-[#0e1610] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#00C896]"
          >
            <option value="all">All tokens</option>
            <option value="live">Live only</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>

        {/* Active filter badges */}
        {(search || filter !== 'all') && (
          <div className="flex gap-2 mb-4 text-xs">
            {search && (
              <span className="flex items-center gap-1.5 bg-[#0e1610] border border-[#1a2e22] rounded-full px-3 py-1">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="text-[#6b7f72] hover:text-white">×</button>
              </span>
            )}
            {filter !== 'all' && (
              <span className="flex items-center gap-1.5 bg-[#0e1610] border border-[#1a2e22] rounded-full px-3 py-1 capitalize">
                Filter: {filter}
                <button onClick={() => setFilter('all')} className="text-[#6b7f72] hover:text-white">×</button>
              </span>
            )}
          </div>
        )}

        {/* Token grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#1a2e22]" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-[#1a2e22] rounded w-24 mb-2" />
                    <div className="h-3 bg-[#1a2e22] rounded w-16" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#1a2e22] rounded-lg p-2.5 h-12" />
                  <div className="bg-[#1a2e22] rounded-lg p-2.5 h-12" />
                </div>
              </div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-24 text-[#6b7f72]">
            <div className="text-4xl mb-4">🔍</div>
            <p>No tokens found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokens.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-sm text-[#6b7f72]">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TokenCard({ token }: { token: any }) {
  const mcap = token.marketCapUsd > 0
    ? `$${formatCompact(token.marketCapUsd)}`
    : '—'
  const vol = token.volume24hUsd > 0
    ? `$${formatCompact(token.volume24hUsd)}`
    : '$0'

  return (
    <Link href={`/token/${token.id}`} className="card p-4 hover:border-[#00C896] transition-colors block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {token.imageUrl ? (
            <img src={token.imageUrl} alt={token.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1a2e22] flex items-center justify-center text-xs font-bold text-[#00C896]">
              {token.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="font-semibold text-sm leading-tight">{token.name}</div>
            <div className="text-[#00C896] text-xs font-mono">${token.symbol}</div>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
          token.status === 'LIVE'
            ? 'border-[#1a2e22] text-[#00C896]'
            : 'border-[#2e2a1a] text-[#c8a800]'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
          {token.status === 'LIVE' ? 'Live' : token.status === 'GRADUATED' ? 'Grad' : token.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#080c0a] rounded-lg p-2.5">
          <div className="text-[10px] text-[#6b7f72] mb-0.5">MARKET CAP</div>
          <div className="text-sm font-semibold text-[#00C896]">{mcap}</div>
        </div>
        <div className="bg-[#080c0a] rounded-lg p-2.5">
          <div className="text-[10px] text-[#6b7f72] mb-0.5">VOL 24H</div>
          <div className="text-sm font-semibold">{vol}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-[#6b7f72]">
        <span>@{token.user?.telegramUsername || 'unknown'}</span>
        {token.mintAddress && (
          <span className="font-mono">{shortAddr(token.mintAddress)}</span>
        )}
      </div>
    </Link>
  )
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

function fmt(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('marketCap')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 12

  useEffect(() => {
    const t = setTimeout(fetch_, 300)
    return () => clearTimeout(t)
  }, [search, sort, filter, page])

  async function fetch_() {
    setLoading(true)
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort, filter, ...(search ? { search } : {}) })
    const res = await fetch(`/api/tokens/all?${p}`)
    if (res.ok) {
      const d = await res.json()
      setTokens(d.tokens)
      setTotal(d.pagination.total)
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <div className="grid-bg" />
      <div className="page">
        <Nav />

        <div className="page-header">
          <div className="section-label">// Token Explorer</div>
          <h1 className="section-title">All Tokens</h1>
          <p className="section-sub">{total} tokens launched on Pump Agent</p>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3a4e42', pointerEvents: 'none' }}>🔍</span>
              <input className="input" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name, ticker, or mint..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
            <select className="select" value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
              <option value="marketCap">Market Cap: High → Low</option>
              <option value="volume">Volume 24h: High → Low</option>
              <option value="newest">Newest First</option>
            </select>
            <select className="select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
              <option value="all">All tokens</option>
              <option value="live">Live only</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* Active filters */}
          {(search || filter !== 'all') && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {search && <span className="badge" style={{ cursor: 'pointer' }} onClick={() => setSearch('')}>"{search}" ×</span>}
              {filter !== 'all' && <span className="badge" style={{ cursor: 'pointer', textTransform: 'capitalize' }} onClick={() => setFilter('all')}>{filter} ×</span>}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card card-inner">
                  <div className="skeleton" style={{ height: 160 }} />
                </div>
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No tokens found</div>
              <div className="empty-sub">{search ? `No results for "${search}"` : 'No tokens launched yet'}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {tokens.map(t => <TokenCard key={t.id} token={t} />)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '2.5rem' }}>
              <button className="btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span className="mono text-muted" style={{ fontSize: '0.875rem' }}>{page} / {totalPages}</span>
              <button className="btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  )
}

function TokenCard({ token }: { token: any }) {
  // Get image URL from token
  const imageUrl = token.imageUrl || `https://img.pump.fun/icon/${token.mintAddress}`

  return (
    <Link href={`/token/${token.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card card-inner token-card" style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="token-avatar" style={{ width: '44px', height: '44px' }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={token.name}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.style.display = 'none'
                    const parent = img.parentElement
                    if (parent) {
                      parent.innerHTML = token.symbol?.slice(0, 2).toUpperCase() || '??'
                      parent.style.display = 'flex'
                      parent.style.alignItems = 'center'
                      parent.style.justifyContent = 'center'
                      parent.style.fontSize = '1rem'
                      parent.style.fontWeight = 'bold'
                      parent.style.color = '#00C896'
                    }
                  }}
                />
              ) : (
                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#00C896' }}>
                  {token.symbol?.slice(0, 2).toUpperCase() || '??'}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.2px', lineHeight: 1.2 }}>{token.name}</div>
              <div className="text-green mono" style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{'$' + token.symbol}</div>
            </div>
          </div>
          <span className="badge" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>
            <span className="badge-dot" style={{ width: 5, height: 5 }} />
            {token.status === 'LIVE' ? 'Live' : token.status === 'GRADUATED' ? 'Grad' : token.status}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'MARKET CAP', val: fmt(token.marketCapUsd), green: true },
            { label: 'VOL 24H', val: fmt(token.volume24hUsd) }
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(0,200,150,0.04)', borderRadius: 8, padding: '0.625rem 0.75rem' }}>
              <div className="mono text-dimmer" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: s.green && token.marketCapUsd > 0 ? '#00C896' : '#e2ece6' }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem' }} className="mono text-dimmer">
          <span>@{token.user?.telegramUsername || 'unknown'}</span>
          {token.mintAddress && <span>{token.mintAddress.slice(0, 6)}...pump</span>}
        </div>
      </div>
    </Link>
  )
}
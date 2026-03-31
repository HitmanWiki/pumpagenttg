'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

function sol(l: number) { return (l / 1e9).toFixed(4) }
function formatAddress(a: string, n = 10) { 
  return a ? `${a.slice(0, n)}...${a.slice(-n)}` : '' 
}
function formatMintAddress(a: string) { 
  return a ? `${a.slice(0, 8)}...${a.slice(-4)}pump` : '' 
}

export default function TokenDetailPage() {
  const { id } = useParams()
  const [token, setToken] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    fetch(`/api/tokens/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setToken(d?.token || d)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch token:', err)
        setLoading(false)
      })
  }, [id])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  if (loading) return (
    <><div className="grid-bg" /><div className="page"><Nav />
      <div className="section" style={{ textAlign: 'center', paddingTop: '8rem' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
      <Footer /></div></>
  )

  if (!token) return (
    <><div className="grid-bg" /><div className="page"><Nav />
      <div className="empty-state section">
        <div className="empty-icon">🔍</div>
        <div className="empty-title">Token not found</div>
        <Link href="/tokens" className="btn-ghost">← All Tokens</Link>
      </div>
      <Footer /></div></>
  )

  const earnedSol = sol(Number(token.totalFeesEarnedLamports))
  const claimableSol = sol(Number(token.claimableFeesLamports))
  const createdFull = new Date(token.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const createdShort = new Date(token.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  
  const imageUrl = token.imageUrl || (token.metadataUri ? `https://ipfs.io/ipfs/${token.metadataUri.split('/ipfs/')[1]?.split('/')[0]}/image.png` : null)

  // Social links array
  const socialLinks = [
    { name: 'Website', url: token.website, icon: '🌐' },
    { name: 'Twitter', url: token.twitter, icon: '🐦' },
    { name: 'Telegram', url: token.telegram, icon: '💬' },
  ].filter(link => link.url)

  const onchainRows = [
    { label: 'Mint Address', value: token.mintAddress, displayValue: formatMintAddress(token.mintAddress), solscan: `https://solscan.io/account/${token.mintAddress}` },
    { label: 'Token Wallet', value: token.tokenWalletAddress, displayValue: formatAddress(token.tokenWalletAddress, 10), solscan: `https://solscan.io/account/${token.tokenWalletAddress}` },
    { label: 'Deploy Tx', value: token.deployTx, displayValue: formatAddress(token.deployTx, 12), solscan: token.deployTx ? `https://solscan.io/tx/${token.deployTx}` : null },
    { label: 'pump.fun URL', value: token.pumpFunUrl, displayValue: token.pumpFunUrl?.slice(0, 50) + '...', link: token.pumpFunUrl },
  ].filter(r => r.value)

  return (
    <>
      <div className="grid-bg" />
      <div className="page">
        <Nav />

        {/* Back */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 2.5rem 0' }}>
          <Link href="/dashboard" className="mono text-muted" style={{ fontSize: '0.8125rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00C896')} onMouseLeave={e => (e.currentTarget.style.color = '')}>
            ← Back to Dashboard
          </Link>
        </div>

        <div className="section">

          {/* Token header card */}
          <div className="card card-inner" style={{ marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 0% 50%,rgba(0,200,150,0.04),transparent)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="token-avatar" style={{ width: 60, height: 60 }}>
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
                          parent.style.fontSize = '1.1rem'
                          parent.style.fontWeight = 'bold'
                          parent.style.color = '#00C896'
                        }
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00C896' }}>
                      {token.symbol?.slice(0, 2).toUpperCase() || '??'}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.75px' }}>{token.name}</h1>
                    <span className={`badge${token.status === 'GRADUATED' ? ' amber' : ''}`}>
                      <span className="badge-dot" />{token.status}
                    </span>
                  </div>
                  <div className="text-green" style={{ fontWeight: 800, fontSize: '1.125rem' }}>{'$' + token.symbol}</div>
                  <div className="mono text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Launched {createdFull}</div>
                </div>
              </div>
              {token.pumpFunUrl && (
                <a href={token.pumpFunUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">↗ pump.fun</a>
              )}
            </div>

            {/* Social Links Section */}
            {socialLinks.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(0,200,150,0.06)' }}>
                {socialLinks.map(link => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.8rem',
                      background: 'rgba(0,200,150,0.05)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: '#00C896',
                      textDecoration: 'none',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(0,200,150,0.1)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(0,200,150,0.05)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <span>{link.icon}</span>
                    <span>{link.name}</span>
                    <span>↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="card card-inner">
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>📈 Total Fees Earned</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00C896', letterSpacing: '-1px', lineHeight: 1 }}>{earnedSol} <span style={{ fontSize: '1rem', color: '#5a7264' }}>SOL</span></div>
              <div className="mono text-dimmer" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>≈ $0.00 USD</div>
            </div>
            <div className="card card-inner">
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>💰 Claimable Fees</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00C896', letterSpacing: '-1px', lineHeight: 1 }}>{claimableSol} <span style={{ fontSize: '1rem', color: '#5a7264' }}>SOL</span></div>
              <div className="mono text-dimmer" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Ready to claim</div>
            </div>
            <div className="card card-inner">
              <div className="section-label" style={{ marginBottom: '0.5rem' }}>📅 Created</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{new Date(token.createdAt).toLocaleDateString('en-US', { weekday: 'long' })}</div>
              <div className="mono text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>{createdShort}</div>
            </div>
          </div>

          {/* On-chain details */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,200,150,0.06)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}># On-Chain Details</div>
            </div>
            {onchainRows.map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(0,200,150,0.04)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="mono text-muted" style={{ fontSize: '0.8125rem', flexShrink: 0 }}>🔗 {row.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {row.link ? (
                    <a href={row.link} target="_blank" rel="noopener noreferrer" className="mono text-green" style={{ fontSize: '0.75rem', textDecoration: 'none', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.displayValue}
                    </a>
                  ) : (
                    <span className="mono" style={{ fontSize: '0.75rem', color: '#a0b0a6' }}>{row.displayValue}</span>
                  )}
                  <button onClick={() => copy(row.value, row.label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === row.label ? '#00C896' : '#5a7264', fontSize: '0.875rem', padding: '0.2rem', transition: 'color 0.2s' }}>
                    {copied === row.label ? '✓' : '⧉'}
                  </button>
                  {row.solscan && (
                    <a href={row.solscan} target="_blank" rel="noopener noreferrer" style={{ color: '#5a7264', fontSize: '0.8125rem', textDecoration: 'none', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#00C896')} onMouseLeave={e => (e.currentTarget.style.color = '#5a7264')}>↗</a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Claim history */}
          <div className="card">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,200,150,0.06)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>↗ Claim History</div>
            </div>
            {!token.claims || token.claims.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <div className="mono text-muted" style={{ fontSize: '0.875rem' }}>No claims yet. Claim your fees from the dashboard when you have 0.1 SOL or more.</div>
              </div>
            ) : token.claims.map((c: any) => (
              <div key={c.id} className="data-row">
                <div style={{ flex: 1 }}>
                  <span className="text-green" style={{ fontFamily: 'DM Mono,monospace', fontWeight: 600 }}>{sol(Number(c.netAmountLamports))} SOL</span>
                  <span className="mono text-dimmer" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>→ {c.destinationWallet?.slice(0, 10)}...</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 100, background: c.status === 'COMPLETED' ? 'rgba(0,200,150,0.1)' : 'rgba(255,107,107,0.1)', color: c.status === 'COMPLETED' ? '#00C896' : '#ff6b6b', fontFamily: 'DM Mono,monospace' }}>
                    {c.status}
                  </span>
                  <span className="mono text-dimmer" style={{ fontSize: '0.72rem' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
        <Footer />
      </div>
    </>
  )
}
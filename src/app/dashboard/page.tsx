'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const SOL_USD = 150
function sol(l: number) { return (l / 1e9).toFixed(4) }
function usd(s: number) { return (s * SOL_USD).toFixed(2) }
function shortAddr(a: string) { return a ? `${a.slice(0,8)}...${a.slice(-6)}` : '' }

export default function DashboardPage() {
  const [user, setUser]       = useState<any>(null)
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [destWallet, setDestWallet] = useState('')
  const [msg, setMsg]         = useState('')
  const [copied, setCopied]   = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [meRes, tokRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/tokens')])
    if (meRes.ok) setUser((await meRes.json()).user)
    if (tokRes.ok) setData(await tokRes.json())
    setLoading(false)
  }

  async function handleClaim() {
    if (!destWallet) return setMsg('Enter your Solana wallet address')
    setClaiming(true); setMsg('')
    const res = await fetch('/api/fees/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationWallet: destWallet }),
    })
    const json = await res.json()
    setMsg(res.ok ? '✅ Fees claimed successfully!' : `❌ ${json.error}`)
    if (res.ok) fetchAll()
    setClaiming(false)
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  const stats    = data?.stats || {}
  const tokens   = data?.tokens || []
  const claimSol = Number(stats.claimableFeeSol || 0)
  const earnSol  = Number(stats.totalEarnedSol || 0)
  const afterFee = claimSol * 0.9
  const needMore = Math.max(0, 0.1 - claimSol).toFixed(4)

  if (!loading && !user) return (
    <><div className="grid-bg"/><div className="page"><Nav/>
      <div className="empty-state">
        <div className="empty-icon">🔒</div>
        <div className="empty-title">Sign in required</div>
        <div className="empty-sub">Connect with Telegram to view your dashboard</div>
        <Link href="/" className="btn-primary">← Go Home</Link>
      </div>
    <Footer/></div></>
  )

  return (
    <>
      <div className="grid-bg"/>
      <div className="page">
        <Nav/>

        {/* Header */}
        <div className="page-header">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <div className="section-label">// Dashboard</div>
              <h1 className="section-title" style={{marginBottom:'0.25rem'}}>
                Welcome back{user ? `, @${user.telegramUsername || user.telegramFirstName}` : ''}
              </h1>
            </div>
            <button onClick={fetchAll} className="btn-ghost btn-sm" disabled={loading}>
              {loading ? <span className="spinner"/> : '↻'} Refresh
            </button>
          </div>
        </div>

        <div className="section" style={{paddingTop:0}}>

          {/* Stat cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem',marginBottom:'2rem'}}>
            {[
              { label:'Total Tokens',      val: loading ? '—' : stats.totalTokens || 0,         sub:`${stats.totalTokens||0} deployed`, icon:'🚀' },
              { label:'Total Earned',      val: loading ? '—' : `${sol(stats.totalEarnedLamports||0)} SOL`, sub:`≈ $${usd(earnSol)} USD`, icon:'📈' },
              { label:'Available to Claim',val: loading ? '—' : `${sol(stats.claimableFeesLamports||0)} SOL`, sub:'You keep 90% · Platform 10%', icon:'💰' },
            ].map((s) => (
              <div key={s.label} className="card card-inner" style={{position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'1rem',right:'1rem',fontSize:'1.25rem',opacity:0.4}}>{s.icon}</div>
                <div className="section-label" style={{marginBottom:'0.5rem'}}>{s.label}</div>
                <div style={{fontSize:'1.75rem',fontWeight:800,letterSpacing:'-1px',color:'#00C896'}}>{s.val}</div>
                <div className="mono text-muted" style={{fontSize:'0.75rem',marginTop:'0.25rem'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Fee Claim Center */}
          <div className="card card-inner" style={{marginBottom:'2rem'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(0,200,150,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem'}}>🔗</div>
                <div>
                  <div style={{fontWeight:700,letterSpacing:'-0.3px'}}>Fee Claim Center</div>
                  <div className="mono text-muted" style={{fontSize:'0.75rem'}}>Claim your earned trading fees</div>
                </div>
              </div>
            </div>

            {/* Fee split bar */}
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.8rem',marginBottom:'0.5rem'}}>
                <span style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><span className="live-dot"/>You: <strong className="text-green">90%</strong></span>
                <span style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><span className="live-dot amber"/>Platform: <strong className="text-amber">10%</strong></span>
              </div>
              <div className="fee-bar" style={{height:8,borderRadius:100}}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
              <div>
                <label className="section-label" style={{marginBottom:'0.5rem',display:'block'}}>Destination Wallet</label>
                <input className="input" placeholder="Your Solana wallet address (e.g. 7fZK...)" value={destWallet} onChange={e=>setDestWallet(e.target.value)}/>
              </div>
              <div>
                <label className="section-label" style={{marginBottom:'0.5rem',display:'block'}}>Withdraw From</label>
                <select className="select" style={{width:'100%'}}>
                  <option>All deployed token wallets</option>
                </select>
              </div>
            </div>

            <div style={{marginBottom:'1.5rem'}}>
              <div className="section-label" style={{marginBottom:'0.5rem'}}>Claimable Balance</div>
              <div style={{fontSize:'2.5rem',fontWeight:800,color:'#00C896',letterSpacing:'-2px',lineHeight:1}}>{sol(stats.claimableFeesLamports||0)} <span style={{fontSize:'1rem',color:'#5a7264'}}>SOL</span></div>
              <div className="mono text-muted" style={{fontSize:'0.8rem',marginTop:'0.25rem'}}>≈ ${usd(claimSol)} USD</div>
              <div style={{marginTop:'0.5rem',fontSize:'0.8rem',display:'flex',flexDirection:'column',gap:'0.25rem'}}>
                <span className="text-green mono">↗ You'll receive: {afterFee.toFixed(4)} SOL <span className="text-muted">(after 10% fee)</span></span>
                {claimSol < 0.1 && <span className="text-amber mono">⏱ Min claim: 0.1 SOL — need {needMore} more</span>}
              </div>
            </div>

            {msg && <div style={{marginBottom:'1rem',fontSize:'0.875rem',color:msg.startsWith('✅')?'#00C896':'#ff6b6b',fontFamily:'DM Mono,monospace'}}>{msg}</div>}

            <button className="btn-primary" onClick={handleClaim} disabled={claiming||claimSol<0.1||!destWallet}>
              {claiming ? <><span className="spinner"/>Claiming...</> : `Claim ${afterFee.toFixed(4)} SOL`}
            </button>
          </div>

          {/* Tokens */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                <h2 style={{fontWeight:700,fontSize:'1.125rem',letterSpacing:'-0.5px'}}>Your Tokens</h2>
                <span style={{background:'rgba(0,200,150,0.1)',color:'#00C896',fontSize:'0.75rem',fontFamily:'DM Mono,monospace',padding:'0.2rem 0.6rem',borderRadius:100}}>{tokens.length}</span>
              </div>
              <span className="mono text-dimmer" style={{fontSize:'0.75rem'}}>Click any token to view details</span>
            </div>

            {loading ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'1rem'}}>
                {[1,2].map(i=><div key={i} className="card card-inner"><div className="skeleton" style={{height:120}}/></div>)}
              </div>
            ) : tokens.length === 0 ? (
              <div className="empty-state card">
                <div className="empty-icon">🚀</div>
                <div className="empty-title">No tokens yet</div>
                <div className="empty-sub">Launch your first token via Telegram to get started</div>
                <a href={`https://t.me/${process.env.TELEGRAM_BOT_USERNAME||'YourBot'}`} target="_blank" rel="noopener noreferrer" className="btn-primary">Open Telegram Bot</a>
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'1rem'}}>
                {tokens.map((t:any) => <TokenCard key={t.id} token={t} onCopy={copy} copied={copied}/>)}
              </div>
            )}
          </div>
        </div>
        <Footer/>
      </div>
    </>
  )
}

function TokenCard({ token, onCopy, copied }: { token:any; onCopy:(t:string,k:string)=>void; copied:string }) {
  const feeSol = (Number(token.claimableFeesLamports)/1e9).toFixed(4)
  const date   = new Date(token.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  return (
    <Link href={`/token/${token.id}`} style={{textDecoration:'none',display:'block'}}>
      <div className="card card-inner" style={{cursor:'pointer'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
          <span className="mono text-dimmer" style={{fontSize:'0.75rem'}}>{date.toUpperCase()}</span>
          <span className="badge"><span className="badge-dot"/>Live</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem'}}>
          <div className="token-avatar">
            {token.imageUrl ? <img src={token.imageUrl} alt={token.name}/> : token.symbol.slice(0,2)}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:'0.9375rem',letterSpacing:'-0.3px'}}>{token.name}</div>
            <div className="text-green" style={{fontWeight:800,fontSize:'1rem'}}>{'$'+token.symbol}</div>
          </div>
        </div>
        <div style={{background:'rgba(0,200,150,0.04)',borderRadius:10,padding:'0.75rem 1rem',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
          <span className="mono text-muted" style={{fontSize:'0.75rem'}}>📈 Fees Earned</span>
          <span style={{fontFamily:'DM Mono,monospace',fontWeight:600}}>{feeSol} <span className="text-muted" style={{fontSize:'0.75rem'}}>SOL</span></span>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem'}} className="mono text-dimmer">
          <span>🔗 {shortAddr(token.mintAddress)}</span>
          {token.pumpFunUrl && (
            <a href={token.pumpFunUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.preventDefault()}
              className="text-green" style={{textDecoration:'none'}}>pump.fun ↗</a>
          )}
        </div>
      </div>
    </Link>
  )
}


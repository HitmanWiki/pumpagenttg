'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const MEDALS = ['🥇','🥈','🥉']

function formatMC(n:number){
  if(!n||n===0)return'—'
  if(n>=1_000_000)return`$${(n/1_000_000).toFixed(2)}M`
  if(n>=1_000)return`$${(n/1_000).toFixed(1)}K`
  return`$${n.toFixed(0)}`
}

export default function LeaderboardPage() {
  const [data,setData]       = useState<any>(null)
  const [loading,setLoading] = useState(true)
  const [search,setSearch]   = useState('')
  const [page,setPage]       = useState(1)

  useEffect(()=>{
    const t=setTimeout(()=>fetchData(),300)
    return()=>clearTimeout(t)
  },[search,page])

  async function fetchData(){
    setLoading(true)
    const res=await fetch(`/api/leaderboard?page=${page}&limit=10&search=${encodeURIComponent(search)}`)
    if(res.ok)setData(await res.json())
    setLoading(false)
  }

  const tokens   = data?.tokens||[]
  const pg       = data?.pagination||{}
  const campaign = data?.campaign

  return(
    <>
      <div className="grid-bg"/>
      <div className="page">
        <Nav/>

        <div className="page-header">
          <div style={{textAlign:'center',maxWidth:600,margin:'0 auto'}}>
            <div className="badge" style={{marginBottom:'1rem'}}><span className="badge-dot"/>Token Leaderboard</div>
            <h1 className="section-title">Top Tokens by Market Cap</h1>
            <p className="section-sub" style={{margin:'0 auto'}}>Every token launched through Pump Agent, ranked live by market cap.</p>
          </div>
        </div>

        <div className="section" style={{paddingTop:'1rem'}}>

          {/* Campaign banner */}
          {campaign&&(
            <div style={{border:'1px solid rgba(200,168,0,0.25)',background:'rgba(200,168,0,0.04)',borderRadius:16,padding:'1.5rem',marginBottom:'2rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                <div style={{fontSize:'1.5rem'}}>🎁</div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.4rem'}}>
                    <span className="badge amber"><span className="badge-dot"/>Live</span>
                    <span style={{fontWeight:700,fontSize:'0.9375rem'}}>Active Campaign — Reach ${campaign.goalValue?.toLocaleString()} MC</span>
                  </div>
                  <p className="mono text-muted" style={{fontSize:'0.8125rem'}}>
                    Be the <strong style={{color:'#e2ece6'}}>first</strong> token to reach{' '}
                    <strong className="text-amber">${campaign.goalValue?.toLocaleString()} Market Cap</strong> and claim{' '}
                    <strong className="text-green">${campaign.prizeUsd?.toLocaleString()}</strong> — winner takes all.
                  </p>
                </div>
              </div>
              <div style={{display:'flex',gap:'2rem',textAlign:'center'}}>
                {[
                  {label:'WINNER', val:campaign.winnerToken?'🏆':'—', sub:'unclaimed'},
                  {label:'GOAL',   val:`$${(campaign.goalValue/1000).toFixed(0)}K`, sub:'market cap'},
                  {label:'PRIZE',  val:`$${campaign.prizeUsd?.toLocaleString()}`, sub:'first to reach', green:true},
                ].map(c=>(
                  <div key={c.label}>
                    <div className="section-label" style={{marginBottom:'0.25rem'}}>{c.label}</div>
                    <div style={{fontSize:'1.25rem',fontWeight:800,color:c.green?'#00C896':'#e2ece6'}}>{c.val}</div>
                    <div className="mono text-dimmer" style={{fontSize:'0.72rem'}}>{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div style={{position:'relative',marginBottom:'1.5rem'}}>
            <span style={{position:'absolute',left:'1rem',top:'50%',transform:'translateY(-50%)',color:'#3a4e42'}}>🔍</span>
            <input className="input" style={{paddingLeft:'2.5rem'}} placeholder="Search by token name, ticker, or mint address..."
              value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'0.75rem',marginBottom:'1rem'}} className="mono text-muted">
            <span>Showing {tokens.length} of {pg.total||0} tokens</span>
            <span>Page {pg.page||1} / {pg.totalPages||1}</span>
          </div>

          {/* Token list */}
          <div className="card" style={{overflow:'hidden'}}>
            {loading ? (
              [...Array(5)].map((_,i)=>(
                <div key={i} className="data-row">
                  <div className="skeleton" style={{width:32,height:32,borderRadius:'50%',flexShrink:0}}/>
                  <div style={{flex:1}}><div className="skeleton" style={{height:14,width:'40%',marginBottom:6}}/><div className="skeleton" style={{height:11,width:'25%'}}/></div>
                  <div className="skeleton" style={{height:20,width:80}}/>
                </div>
              ))
            ) : tokens.length===0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No tokens found</div>
                <div className="empty-sub">{search?`No results for "${search}"`:'No tokens launched yet'}</div>
              </div>
            ) : tokens.map((t:any,i:number)=>{
              const rank=(page-1)*10+i+1
              const pct=campaign?Math.min(100,(t.marketCapUsd/campaign.goalValue)*100):0
              return(
                <div key={t.id} className="data-row">
                  <div style={{width:32,textAlign:'center',flexShrink:0}}>
                    {rank<=3?<span style={{fontSize:'1.1rem'}}>{MEDALS[rank-1]}</span>
                      :<span className="mono text-dimmer" style={{fontSize:'0.8125rem'}}>{rank}</span>}
                  </div>
                  <div className="token-avatar">
                    {t.imageUrl?<img src={t.imageUrl} alt={t.name}/>:t.symbol?.slice(0,2)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.15rem'}}>
                      <span style={{fontWeight:600,fontSize:'0.9rem',letterSpacing:'-0.2px'}}>{t.name}</span>
                      <span className="text-green mono" style={{fontSize:'0.75rem'}}>{'$'+t.symbol}</span>
                    </div>
                    <div className="mono text-dimmer" style={{fontSize:'0.72rem'}}>by @{t.user?.telegramUsername||'unknown'}</div>
                  </div>
                  {campaign&&(
                    <div style={{width:160,display:'flex',alignItems:'center',gap:'0.75rem'}}>
                      <div className="progress-track" style={{flex:1}}>
                        <div className="progress-fill" style={{width:`${pct}%`}}/>
                      </div>
                      <span className="mono text-muted" style={{fontSize:'0.72rem',whiteSpace:'nowrap'}}>{pct.toFixed(0)}% to goal</span>
                    </div>
                  )}
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontWeight:700,color:t.marketCapUsd>0?'#00C896':'#3a4e42',fontSize:'0.9375rem'}}>{formatMC(t.marketCapUsd)}</div>
                    {t.pumpFunUrl&&<a href={t.pumpFunUrl} target="_blank" rel="noopener noreferrer" className="mono text-dimmer" style={{fontSize:'0.72rem',textDecoration:'none',transition:'color 0.2s'}}
                      onMouseEnter={e=>(e.currentTarget.style.color='#00C896')} onMouseLeave={e=>(e.currentTarget.style.color='')}>pump.fun ↗</a>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {pg.totalPages>1&&(
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'0.75rem',marginTop:'2rem'}}>
              <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <span className="mono text-muted" style={{fontSize:'0.875rem'}}>{page} / {pg.totalPages}</span>
              <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(pg.totalPages,p+1))} disabled={page===pg.totalPages}>Next →</button>
            </div>
          )}
        </div>
        <Footer/>
      </div>
    </>
  )
}
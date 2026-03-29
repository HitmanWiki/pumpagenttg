'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

function shortAddr(addr: string) { return `${addr.slice(0, 8)}...${addr.slice(-8)}` }
function lamportsToSol(l: number) { return (l / 1e9).toFixed(4) }

export default function TokenDetailPage() {
  const { id } = useParams()
  const [token, setToken] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    fetch(`/api/tokens/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setToken(data?.token); setLoading(false) })
  }, [id])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#6b7f72]">Loading...</div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-[#6b7f72]">Token not found.</div>
        <Link href="/tokens" className="btn-primary text-sm">← All Tokens</Link>
      </div>
    )
  }

  const earnedSol = lamportsToSol(Number(token.totalFeesEarnedLamports))
  const claimableSol = lamportsToSol(Number(token.claimableFeesLamports))
  const createdDate = new Date(token.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#1a2e22]">
        <Link href="/dashboard" className="text-sm text-[#6b7f72] hover:text-[#00C896] flex items-center gap-1">
          ← Back to Dashboard
        </Link>
        {token.pumpFunUrl && (
          <a
            href={token.pumpFunUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            ↗ pump.fun
          </a>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Token header */}
        <div className="card p-6 mb-4">
          <div className="flex items-start gap-4">
            {token.imageUrl ? (
              <img src={token.imageUrl} alt={token.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#1a2e22] flex items-center justify-center text-lg font-bold text-[#00C896]">
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{token.name}</h1>
                <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1.5 ${
                  token.status === 'LIVE' ? 'border-[#1a2e22] text-[#00C896]'
                  : token.status === 'GRADUATED' ? 'border-[#2e2a1a] text-[#c8a800]'
                  : 'border-[#2e1a1a] text-[#ff6b6b]'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  {token.status}
                </span>
              </div>
              <div className="text-[#00C896] font-mono font-semibold text-lg">${token.symbol}</div>
              <div className="text-[#6b7f72] text-sm mt-1">Launched {createdDate}</div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card p-5">
            <div className="text-xs text-[#6b7f72] mb-1 flex items-center gap-1.5">
              <span>↗</span> Total Fees Earned
            </div>
            <div className="text-2xl font-bold text-[#00C896] font-mono">{earnedSol} SOL</div>
            <div className="text-xs text-[#6b7f72] mt-0.5">≈ $0.00 USD</div>
          </div>
          <div className="card p-5">
            <div className="text-xs text-[#6b7f72] mb-1 flex items-center gap-1.5">
              <span>📅</span> Created
            </div>
            <div className="text-xl font-bold">
              {new Date(token.createdAt).toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-xs text-[#6b7f72] mt-0.5">
              {new Date(token.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* On-chain details */}
        <div className="card p-6 mb-4">
          <h2 className="text-sm font-semibold text-[#6b7f72] mb-4 flex items-center gap-2">
            <span>#</span> On-Chain Details
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Mint Address', value: token.mintAddress },
              { label: 'Token Wallet', value: token.tokenWalletAddress },
              { label: 'Deploy Tx', value: token.deployTx },
              { label: 'pump.fun URL', value: token.pumpFunUrl, isUrl: true },
            ].filter(r => r.value).map(row => (
              <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[#0e1610] last:border-0">
                <span className="text-xs text-[#6b7f72] flex items-center gap-2">
                  <span>🔗</span> {row.label}
                </span>
                <div className="flex items-center gap-2">
                  {row.isUrl ? (
                    <a
                      href={row.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#00C896] hover:underline font-mono"
                    >
                      {row.value?.slice(0, 40)}...
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-[#a0b0a6]">{shortAddr(row.value)}</span>
                  )}
                  <button
                    onClick={() => copy(row.value, row.label)}
                    className="text-[#6b7f72] hover:text-[#00C896] text-xs p-1"
                    title="Copy"
                  >
                    {copied === row.label ? '✓' : '⧉'}
                  </button>
                  {(row.label === 'Mint Address' || row.label === 'Deploy Tx') && (
                    <a
                      href={`https://solscan.io/${row.label === 'Deploy Tx' ? 'tx' : 'account'}/${row.value}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6b7f72] hover:text-[#00C896] text-xs p-1"
                    >
                      ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Claim history */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-[#6b7f72] mb-4 flex items-center gap-2">
            <span>↗</span> Claim History
          </h2>
          {token.claims?.length === 0 ? (
            <p className="text-sm text-[#6b7f72]">Claims are recorded only after claiming on the dashboard.</p>
          ) : (
            <div className="space-y-2">
              {token.claims?.map((claim: any) => (
                <div key={claim.id} className="flex items-center justify-between py-2 border-b border-[#0e1610] last:border-0 text-sm">
                  <div>
                    <span className="text-[#00C896] font-mono">{lamportsToSol(Number(claim.netAmountLamports))} SOL</span>
                    <span className="text-[#6b7f72] text-xs ml-2">→ {claim.destinationWallet.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      claim.status === 'COMPLETED' ? 'bg-[#0e2218] text-[#00C896]' : 'bg-[#2e1a1a] text-[#ff6b6b]'
                    }`}>{claim.status}</span>
                    <span className="text-[#6b7f72] text-xs">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

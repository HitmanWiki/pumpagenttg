// src/app/api/tokens/sync/[mintAddress]/route.ts
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { mintAddress: string } }
) {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${params.mintAddress}`)
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        marketCapUsd: data.marketCap || data.market_cap || 0,
        volume24hUsd: data.volume24h || data.volume_24h || 0,
      })
    }
    return NextResponse.json({ marketCapUsd: 0, volume24hUsd: 0 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
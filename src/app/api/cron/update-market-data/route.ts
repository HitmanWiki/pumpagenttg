// src/app/api/cron/update-market-data/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const tokens = await prisma.token.findMany({
    where: { status: 'LIVE' },
    select: { id: true, mintAddress: true }
  })
  
  for (const token of tokens) {
    try {
      const response = await fetch(`https://frontend-api.pump.fun/coins/${token.mintAddress}`)
      if (response.ok) {
        const data = await response.json()
        await prisma.token.update({
          where: { id: token.id },
          data: {
            marketCapUsd: data.marketCap || data.market_cap || 0,
            volume24hUsd: data.volume24h || data.volume_24h || 0,
          }
        })
      }
    } catch (error) {
      console.error(`Failed to update token ${token.id}:`, error)
    }
  }
  
  return NextResponse.json({ success: true, updated: tokens.length })
}
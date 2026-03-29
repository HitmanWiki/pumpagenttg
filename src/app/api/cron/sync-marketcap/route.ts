// src/app/api/cron/sync-marketcap/route.ts
// Fetches live market cap + 24h volume for all tokens from pump.fun API
// Run every 5 minutes via Vercel Cron

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

interface PumpFunToken {
  usd_market_cap?: number
  virtual_sol_reserves?: number
  virtual_token_reserves?: number
  volume_24h?: number
  complete?: boolean // true = graduated to raydium
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await prisma.token.findMany({
    where: { status: { in: ['LIVE', 'GRADUATED'] }, mintAddress: { not: '' } },
    select: { id: true, mintAddress: true, status: true },
  })

  let updated = 0
  let graduated = 0
  let errors = 0

  const BATCH_SIZE = 5
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(batch.map(async (token) => {
      try {
        const res = await fetch(
          `https://frontend-api.pump.fun/coins/${token.mintAddress}`,
          { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
        )

        if (!res.ok) return

        const data: PumpFunToken = await res.json()

        const updateData: any = {
          marketCapUsd: data.usd_market_cap ?? 0,
          volume24hUsd: data.volume_24h ?? 0,
        }

        // Mark as graduated if it's completed on pump.fun bonding curve
        if (data.complete && token.status === 'LIVE') {
          updateData.status = 'GRADUATED'
          graduated++
        }

        await prisma.token.update({
          where: { id: token.id },
          data: updateData,
        })

        updated++
      } catch (err) {
        console.error(`[sync-marketcap] Error for ${token.mintAddress}:`, err)
        errors++
      }
    }))

    // Delay between batches
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Check campaign winners after sync
  await checkCampaignWinners()

  return NextResponse.json({
    success: true,
    total: tokens.length,
    updated,
    graduated,
    errors,
    timestamp: new Date().toISOString(),
  })
}

async function checkCampaignWinners() {
  const activeCampaign = await prisma.campaign.findFirst({
    where: { status: 'ACTIVE', winnerTokenId: null },
  })

  if (!activeCampaign) return

  // Find first token that reached the goal
  const winner = await prisma.token.findFirst({
    where: {
      status: { in: ['LIVE', 'GRADUATED'] },
      marketCapUsd: { gte: activeCampaign.goalValue },
    },
    orderBy: { marketCapUsd: 'desc' },
  })

  if (winner) {
    await prisma.campaign.update({
      where: { id: activeCampaign.id },
      data: {
        winnerTokenId: winner.id,
        status: 'COMPLETED',
      }
    })
    console.log(`[campaign] Winner found: ${winner.name} ($${winner.symbol}) with $${winner.marketCapUsd} MC`)
  }
}

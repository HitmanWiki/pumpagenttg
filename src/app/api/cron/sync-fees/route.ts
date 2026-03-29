// src/app/api/cron/sync-fees/route.ts
// Called by Vercel Cron (configure in vercel.json)
// Reads each token's wallet balance from Solana and updates DB

import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import prisma from '@/lib/prisma'

const connection = new Connection(
  process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

// Protect cron endpoint with a secret header
function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all live tokens
  const tokens = await prisma.token.findMany({
    where: { status: 'LIVE' },
    select: {
      id: true,
      tokenWalletAddress: true,
      claimableFeesLamports: true,
      totalFeesEarnedLamports: true,
    }
  })

  let updated = 0
  let errors = 0

  // Process in batches of 10 to avoid RPC rate limits
  const BATCH_SIZE = 10
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE)

    await Promise.allSettled(batch.map(async (token) => {
      try {
        const pubkey = new PublicKey(token.tokenWalletAddress)
        const balanceLamports = await connection.getBalance(pubkey)

        // Only update if balance changed
        const currentClaimable = Number(token.claimableFeesLamports)
        if (balanceLamports !== currentClaimable) {
          // If new balance is higher, add the difference to total earned
          const diff = balanceLamports - currentClaimable
          const newTotal = Number(token.totalFeesEarnedLamports) + (diff > 0 ? diff : 0)

          await prisma.token.update({
            where: { id: token.id },
            data: {
              claimableFeesLamports: BigInt(balanceLamports),
              totalFeesEarnedLamports: BigInt(Math.max(Number(token.totalFeesEarnedLamports), newTotal)),
              feesLastSyncedAt: new Date(),
            }
          })
          updated++
        }
      } catch (err) {
        console.error(`[sync-fees] Error syncing token ${token.id}:`, err)
        errors++
      }
    }))

    // Small delay between batches
    if (i + BATCH_SIZE < tokens.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return NextResponse.json({
    success: true,
    total: tokens.length,
    updated,
    errors,
    timestamp: new Date().toISOString(),
  })
}

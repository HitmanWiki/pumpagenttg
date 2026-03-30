// src/app/api/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { connection } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokens = await prisma.token.findMany({
    where: {
      userId: session.id,
      status: { not: 'FAILED' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      claims: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
      }
    }
  })

  // Fetch real-time balances for all tokens
  const tokensWithRealTimeData = await Promise.all(
    tokens.map(async (token) => {
      try {
        // Fetch current balance from Solana
        const balance = await connection.getBalance(
          new PublicKey(token.tokenWalletAddress)
        )
        
        // Update in background (don't await)
        prisma.token.update({
          where: { id: token.id },
          data: {
            claimableFeesLamports: BigInt(balance),
          }
        }).catch(console.error)
        
        // Return token with real-time data
        return {
          ...token,
          claimableFeesLamports: balance,
          claimableSol: balance / 1e9,
        }
      } catch (error) {
        console.error(`Failed to fetch balance for token ${token.id}:`, error)
        return token
      }
    })
  )

  // Calculate totals using real-time data
  // Fix: Use BigInt(0) instead of 0n
  let totalEarnedLamports = BigInt(0)
  let claimableFeesLamports = BigInt(0)
  
  for (const token of tokensWithRealTimeData) {
    totalEarnedLamports = totalEarnedLamports + (token.totalFeesEarnedLamports as bigint)
    claimableFeesLamports = claimableFeesLamports + BigInt(token.claimableFeesLamports || 0)
  }

  const totalEarnedNumber = Number(totalEarnedLamports)
  const claimableNumber = Number(claimableFeesLamports)

  return NextResponse.json({
    tokens: tokensWithRealTimeData.map(t => ({
      ...t,
      totalFeesEarnedLamports: Number(t.totalFeesEarnedLamports),
      claimableFeesLamports: Number(t.claimableFeesLamports),
    })),
    stats: {
      totalTokens: tokens.length,
      totalEarnedLamports: totalEarnedNumber,
      claimableFeesLamports: claimableNumber,
      totalEarnedSol: totalEarnedNumber / 1e9,
      claimableFeeSol: claimableNumber / 1e9,
    }
  })
}
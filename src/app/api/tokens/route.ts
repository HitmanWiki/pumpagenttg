// src/app/api/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { connection } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pump_agent_session')?.value
    
    if (!token) {
      console.log('[Tokens] No session token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const session = await verifySession(token)
    if (!session) {
      console.log('[Tokens] Invalid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user from database using session
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    })
    
    if (!user) {
      console.log('[Tokens] User not found:', session.id)
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const tokens = await prisma.token.findMany({
      where: {
        userId: user.id,
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
          const balance = await connection.getBalance(
            new PublicKey(token.tokenWalletAddress)
          )
          
          // Update in background
          prisma.token.update({
            where: { id: token.id },
            data: {
              claimableFeesLamports: BigInt(balance),
            }
          }).catch(console.error)
          
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
    
    // Calculate totals
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
  } catch (error: any) {
    console.error('[Tokens API] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
// src/app/api/tokens/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { connection } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await prisma.token.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            telegramUsername: true,
            telegramFirstName: true,
          }
        },
        claims: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        }
      }
    })

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    // Fetch real-time data
    const [balance, marketCapData] = await Promise.all([
      connection.getBalance(new PublicKey(token.tokenWalletAddress)).catch(() => 0),
      fetchMarketCapFromPumpFun(token.mintAddress)
    ])

    // Update in background (don't await)
    prisma.token.update({
      where: { id: token.id },
      data: {
        claimableFeesLamports: BigInt(balance),
        marketCapUsd: marketCapData.marketCap,
        volume24hUsd: marketCapData.volume24h,
      }
    }).catch(console.error)

    // Return token with real-time data
    return NextResponse.json({
      token: {
        ...token,
        totalFeesEarnedLamports: Number(token.totalFeesEarnedLamports),
        claimableFeesLamports: balance,
        claimableSol: balance / 1e9,
        realtime: {
          marketCap: marketCapData.marketCap,
          volume24h: marketCapData.volume24h,
          price: marketCapData.price,
        }
      }
    })
  } catch (error) {
    console.error('[Token API] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function fetchMarketCapFromPumpFun(mintAddress: string) {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${mintAddress}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    })
    if (response.ok) {
      const data = await response.json()
      return {
        marketCap: data.marketCap || data.market_cap || 0,
        volume24h: data.volume24h || data.volume_24h || 0,
        price: data.price || 0,
      }
    }
    return { marketCap: 0, volume24h: 0, price: 0 }
  } catch (error) {
    console.error('Failed to fetch market cap:', error)
    return { marketCap: 0, volume24h: 0, price: 0 }
  }
}
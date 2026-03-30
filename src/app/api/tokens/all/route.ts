// src/app/api/tokens/all/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { connection } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '12'))
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'marketCap'
  const filter = searchParams.get('filter') || 'all'

  const where: any = {
    status: { not: 'FAILED' },
  }

  if (filter === 'live') where.status = 'LIVE'
  if (filter === 'graduated') where.status = 'GRADUATED'

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { symbol: { contains: search, mode: 'insensitive' } },
      { mintAddress: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: any =
    sort === 'volume' ? { volume24hUsd: 'desc' }
    : sort === 'newest' ? { createdAt: 'desc' }
    : { marketCapUsd: 'desc' }

  const [tokens, total] = await Promise.all([
    prisma.token.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { telegramUsername: true, telegramFirstName: true } }
      },
    }),
    prisma.token.count({ where }),
  ])

  // Fetch real-time data for all tokens in parallel
  const tokensWithRealTimeData = await Promise.all(
    tokens.map(async (token) => {
      try {
        const [balance, marketCap] = await Promise.all([
          connection.getBalance(new PublicKey(token.tokenWalletAddress)),
          fetchMarketCapFromPumpFun(token.mintAddress)
        ])
        
        // Update in background
        prisma.token.update({
          where: { id: token.id },
          data: {
            claimableFeesLamports: BigInt(balance),
            marketCapUsd: marketCap,
          }
        }).catch(console.error)
        
        return {
          ...token,
          claimableFeesLamports: balance,
          claimableSol: balance / 1e9,
          marketCapUsd: marketCap,
        }
      } catch (error) {
        console.error(`Failed to fetch data for token ${token.id}:`, error)
        return token
      }
    })
  )

  return NextResponse.json({
    tokens: tokensWithRealTimeData.map(t => ({
      ...t,
      totalFeesEarnedLamports: Number(t.totalFeesEarnedLamports),
      claimableFeesLamports: Number(t.claimableFeesLamports),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  })
}

// Helper function to fetch market cap from pump.fun
async function fetchMarketCapFromPumpFun(mintAddress: string): Promise<number> {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${mintAddress}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.marketCap || data.market_cap || 0
    }
    return 0
  } catch (error) {
    console.error('Failed to fetch market cap:', error)
    return 0
  }
}
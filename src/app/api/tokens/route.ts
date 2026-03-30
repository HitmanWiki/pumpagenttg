// src/app/api/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper function to serialize BigInt
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  )
}

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

  // Calculate totals using BigInt with proper initialization
  let totalEarnedLamports = BigInt(0)
  let claimableFeesLamports = BigInt(0)
  
  for (const token of tokens) {
    totalEarnedLamports = totalEarnedLamports + (token.totalFeesEarnedLamports as bigint)
    claimableFeesLamports = claimableFeesLamports + (token.claimableFeesLamports as bigint)
  }

  const totalTokens = tokens.length
  
  // Convert to numbers (safe for SOL amounts since 1 SOL = 1e9, max ~9e18 fits in Number)
  const totalEarnedNumber = Number(totalEarnedLamports)
  const claimableNumber = Number(claimableFeesLamports)

  // Serialize tokens to convert any BigInt fields
  const serializedTokens = serializeBigInt(tokens)

  return NextResponse.json({
    tokens: serializedTokens,
    stats: {
      totalTokens: totalTokens,
      totalEarnedLamports: totalEarnedNumber,
      claimableFeesLamports: claimableNumber,
      totalEarnedSol: totalEarnedNumber / 1e9,
      claimableFeeSol: claimableNumber / 1e9,
    }
  })
}
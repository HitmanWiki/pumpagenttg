// src/app/api/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

  // Calculate totals
  const totalTokens = tokens.length
  const totalEarnedLamports = tokens.reduce(
    (sum, t) => sum + Number(t.totalFeesEarnedLamports), 0
  )
  const claimableFeesLamports = tokens.reduce(
    (sum, t) => sum + Number(t.claimableFeesLamports), 0
  )

  return NextResponse.json({
    tokens,
    stats: {
      totalTokens,
      totalEarnedLamports,
      claimableFeesLamports,
      totalEarnedSol: totalEarnedLamports / 1e9,
      claimableFeeSol: claimableFeesLamports / 1e9,
    }
  })
}

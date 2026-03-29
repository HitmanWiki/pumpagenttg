// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const search = searchParams.get('search') || ''

  const skip = (page - 1) * limit

  const where = search
    ? {
        status: { not: 'FAILED' as const },
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { symbol: { contains: search, mode: 'insensitive' as const } },
          { mintAddress: { contains: search } },
        ]
      }
    : { status: { not: 'FAILED' as const } }

  const [tokens, total] = await Promise.all([
    prisma.token.findMany({
      where,
      orderBy: { marketCapUsd: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: { telegramUsername: true, telegramFirstName: true }
        }
      }
    }),
    prisma.token.count({ where })
  ])

  // Get active campaign
  const campaign = await prisma.campaign.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({
    tokens,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    campaign,
  })
}

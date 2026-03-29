import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

  return NextResponse.json({
    tokens,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  })
}

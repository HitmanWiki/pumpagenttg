// src/app/api/campaigns/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      winnerToken: {
        select: { name: true, symbol: true, mintAddress: true }
      }
    }
  })

  return NextResponse.json({ campaigns })
}

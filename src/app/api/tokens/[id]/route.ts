import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await prisma.token.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { telegramUsername: true, telegramFirstName: true } },
      claims: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  // Don't expose private key
  const { tokenWalletPrivKey, ...safeToken } = token as any

  return NextResponse.json({ token: safeToken })
}

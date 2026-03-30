// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null, error: 'No session' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        telegramId: true,
        telegramUsername: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramPhotoUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    
    if (!user) {
      return NextResponse.json({ user: null, error: 'User not found' }, { status: 401 })
    }
    
    // Convert BigInt to string for JSON serialization
    const serializedUser = {
      ...user,
      telegramId: user.telegramId.toString(),
    }
    
    return NextResponse.json({ user: serializedUser })
  } catch (error) {
    console.error('[Auth/me] Error:', error)
    return NextResponse.json(
      { user: null, error: 'Server error' },
      { status: 500 }
    )
  }
}
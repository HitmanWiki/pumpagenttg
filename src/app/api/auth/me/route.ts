// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pump_agent_session')?.value
    
    if (!token) {
      console.log('[Auth/me] No session token found')
      return NextResponse.json({ user: null, error: 'No session' }, { status: 401 })
    }
    
    const session = await verifySession(token)
    if (!session) {
      console.log('[Auth/me] Invalid session token')
      return NextResponse.json({ user: null, error: 'Invalid session' }, { status: 401 })
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
      console.log('[Auth/me] User not found:', session.id)
      return NextResponse.json({ user: null, error: 'User not found' }, { status: 401 })
    }
    
    // Convert BigInt to string for JSON serialization
    const serializedUser = {
      ...user,
      telegramId: user.telegramId.toString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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
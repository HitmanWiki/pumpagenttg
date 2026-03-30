// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      console.log('[Auth/me] No session found')
      return NextResponse.json({ user: null }, { status: 401 })
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
      }
    })
    
    if (!user) {
      console.log('[Auth/me] User not found:', session.id)
      return NextResponse.json({ user: null }, { status: 401 })
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
        telegramLastName: user.telegramLastName,
        telegramPhotoUrl: user.telegramPhotoUrl,
      }
    })
  } catch (error) {
    console.error('[Auth/me] Error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
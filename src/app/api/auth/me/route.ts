// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
      console.log('[Auth/me] No token provided')
      return NextResponse.json({ user: null }, { status: 401 })
    }
    
    const session = await verifySession(token)
    if (!session) {
      console.log('[Auth/me] Invalid token')
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
// src/app/api/auth/telegram/route.ts
import { NextResponse } from 'next/server'
import { signSession, verifyTelegramAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Auth/telegram] Received auth request for user:', body.id)
    
    // Verify Telegram auth data
    if (!verifyTelegramAuth(body)) {
      console.error('[Auth/telegram] Invalid Telegram auth')
      return NextResponse.json(
        { error: 'Invalid Telegram authentication' },
        { status: 401 }
      )
    }
    
    // Find or create user
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(body.id) },
      update: {
        telegramUsername: body.username || null,
        telegramFirstName: body.first_name || null,
        telegramLastName: body.last_name || null,
        telegramPhotoUrl: body.photo_url || null,
      },
      create: {
        telegramId: BigInt(body.id),
        telegramUsername: body.username || null,
        telegramFirstName: body.first_name || null,
        telegramLastName: body.last_name || null,
        telegramPhotoUrl: body.photo_url || null,
      },
    })
    
    console.log('[Auth/telegram] User found/created:', user.id)
    
    // Create session token
    const sessionToken = await signSession({
      id: user.id,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
    })
    
    console.log('[Auth/telegram] Session token created')
    
    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
      }
    })
    
    // Set cookie directly on response
    response.cookies.set({
      name: 'pump_agent_session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    
    console.log('[Auth/telegram] Cookie set on response')
    
    return response
  } catch (error) {
    console.error('[Auth/telegram] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
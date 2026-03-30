// src/app/api/auth/telegram/route.ts
import { NextResponse } from 'next/server'
import { signSession, verifyTelegramAuth, setSessionCookie } from '@/lib/auth'
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
    
    // Set cookie using the helper function
    await setSessionCookie(sessionToken)
    
    console.log('[Auth/telegram] Session cookie set successfully')
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
      }
    })
  } catch (error) {
    console.error('[Auth/telegram] Error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
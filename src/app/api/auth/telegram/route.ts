// src/app/api/auth/telegram/route.ts
import { NextResponse } from 'next/server'
import { signSession, verifyTelegramAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    if (!verifyTelegramAuth(body)) {
      return NextResponse.json(
        { error: 'Invalid Telegram authentication' },
        { status: 401 }
      )
    }
    
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
    
    const sessionToken = await signSession({
      id: user.id,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
    })
    
    // Return token - NO COOKIE
    return NextResponse.json({
      success: true,
      token: sessionToken,
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
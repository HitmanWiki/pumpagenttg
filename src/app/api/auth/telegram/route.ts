// src/app/api/auth/telegram/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyTelegramAuth, signSession, COOKIE_NAME } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Verify the Telegram auth data is legitimate
    if (!verifyTelegramAuth(data)) {
      return NextResponse.json({ error: 'Invalid Telegram auth data' }, { status: 401 })
    }

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(data.id) },
      update: {
        telegramUsername: data.username || null,
        telegramFirstName: data.first_name || null,
        telegramLastName: data.last_name || null,
        telegramPhotoUrl: data.photo_url || null,
      },
      create: {
        telegramId: BigInt(data.id),
        telegramUsername: data.username || null,
        telegramFirstName: data.first_name || null,
        telegramLastName: data.last_name || null,
        telegramPhotoUrl: data.photo_url || null,
      },
    })

    // Sign JWT session
    const token = await signSession({
      id: user.id,
      telegramId: Number(user.telegramId),
      telegramUsername: user.telegramUsername,
      telegramFirstName: user.telegramFirstName,
    })

    const response = NextResponse.json({ success: true, user })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('[Auth] Error:', error)
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }
}

// Sign out
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(COOKIE_NAME)
  return response
}

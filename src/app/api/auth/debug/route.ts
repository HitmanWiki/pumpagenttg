// src/app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.split(' ')[1]
  
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 })
  }
  
  const session = await verifySession(token)
  
  return NextResponse.json({
    hasToken: true,
    tokenPreview: token.substring(0, 50) + '...',
    session: session ? {
      id: session.id,
      telegramId: session.telegramId.toString(),
      username: session.telegramUsername,
    } : null,
  })
}
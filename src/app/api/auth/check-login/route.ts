export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Temporary storage for login codes (in production, use Redis or database)
const loginSessions = new Map<string, { token: string; user: any; expires: number }>()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'No login ID' }, { status: 400 })
  }
  
  const session = loginSessions.get(id)
  
  if (session && session.expires > Date.now()) {
    // Clean up expired session
    loginSessions.delete(id)
    return NextResponse.json({
      token: session.token,
      user: session.user
    })
  }
  
  return NextResponse.json({ waiting: true })
}

// This endpoint will be called by your bot when user logs in
export async function POST(request: Request) {
  const body = await request.json()
  const { loginId, token, user } = body
  
  if (loginId && token && user) {
    loginSessions.set(loginId, {
      token,
      user,
      expires: Date.now() + 60000 // 1 minute
    })
    return NextResponse.json({ success: true })
  }
  
  return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
}
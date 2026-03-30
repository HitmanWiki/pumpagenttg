// src/app/api/auth/debug/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  return NextResponse.json({
    cookies: allCookies.map(c => ({ name: c.name, value: c.value ? 'present' : 'empty' })),
    hasSessionCookie: allCookies.some(c => c.name === 'pump_agent_session'),
    environment: process.env.NODE_ENV,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  })
}
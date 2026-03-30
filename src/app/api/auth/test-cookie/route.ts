import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('pump_agent_session')
  
  return NextResponse.json({
    hasCookie: !!token,
    cookieName: token?.name,
    cookieValue: token?.value ? `${token.value.substring(0, 50)}...` : null,
    allCookies: cookieStore.getAll().map(c => c.name),
    environment: process.env.NODE_ENV,
  })
}
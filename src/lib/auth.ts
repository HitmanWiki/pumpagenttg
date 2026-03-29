// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'pump_agent_session'

export interface SessionUser {
  id: string
  telegramId: number
  telegramUsername: string | null
  telegramFirstName: string | null
}

// Sign a JWT session token
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

// Verify a JWT session token
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

// Get current session from cookies (server component)
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

// Verify Telegram login widget data
// https://core.telegram.org/widgets/login#checking-authorization
export function verifyTelegramAuth(data: Record<string, string>): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN!
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('\n')

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  // Also check auth_date is not older than 24h
  const authDate = parseInt(rest.auth_date || '0')
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 86400) return false

  return hmac === hash
}

export { COOKIE_NAME }

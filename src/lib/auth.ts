// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'pump_agent_session'

export interface SessionUser {
  id: string
  telegramId: bigint
  telegramUsername: string | null
  telegramFirstName: string | null
}

// Sign a JWT session token
export async function signSession(user: SessionUser): Promise<string> {
  // Convert bigint to string for JWT serialization
  const serializedUser = {
    id: user.id,
    telegramId: user.telegramId.toString(),
    telegramUsername: user.telegramUsername,
    telegramFirstName: user.telegramFirstName,
  }
  
  const token = await new SignJWT({ ...serializedUser })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(JWT_SECRET)
  
  return token
}

// Verify a JWT session token
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    // Convert telegramId back to bigint
    return {
      id: payload.id as string,
      telegramId: BigInt(payload.telegramId as string),
      telegramUsername: payload.telegramUsername as string | null,
      telegramFirstName: payload.telegramFirstName as string | null,
    }
  } catch (error) {
    console.error('[Auth] verifySession error:', error)
    return null
  }
}

// Get current session from cookies (server component)
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    
    if (!token) {
      console.log('[Auth] No session token found in cookies')
      return null
    }
    
    return verifySession(token)
  } catch (error) {
    console.error('[Auth] getSession error:', error)
    return null
  }
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
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
  if (now - authDate > 86400) {
    console.log('[Auth] auth_date too old:', now - authDate, 'seconds')
    return false
  }

  const isValid = hmac === hash
  if (!isValid) {
    console.log('[Auth] HMAC verification failed')
  }
  
  return isValid
}

export { COOKIE_NAME }
// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bot from '@/lib/bot'
import { webhookCallback } from 'grammy'

// Grammy webhook handler for Next.js App Router
const handleUpdate = webhookCallback(bot, 'std/http')

export async function POST(req: NextRequest) {
  try {
    return await handleUpdate(req)
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', bot: process.env.TELEGRAM_BOT_USERNAME })
}

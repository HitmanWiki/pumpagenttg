import { NextRequest, NextResponse } from 'next/server'
import bot from '@/lib/bot'
import { webhookCallback } from 'grammy'

const handleUpdate = webhookCallback(bot, 'std/http')

export async function POST(req: NextRequest) {
  try {
    // Clone the request so we can read it in background too
    const body = await req.json()

    // Respond to Telegram immediately (must be within 10s)
    // Process the update in the background
    const bgReq = new Request(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Fire and forget — don't await
    handleUpdate(bgReq).catch(err => {
      console.error('[Webhook] Background processing error:', err)
    })

    // Immediately return 200 OK to Telegram
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // always 200
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    bot: process.env.TELEGRAM_BOT_USERNAME,
    timestamp: new Date().toISOString(),
  })
}
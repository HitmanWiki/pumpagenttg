// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bot from '@/lib/bot'

export async function POST(req: NextRequest) {
  try {
    // Get the update from Telegram
    const update = await req.json()
    
    // Log the incoming update for debugging
    console.log('[Webhook] Received update:', {
      update_id: update.update_id,
      has_message: !!update.message,
      message_text: update.message?.text,
      username: update.message?.from?.username
    })
    
    // Process the update with your bot
    await bot.handleUpdate(update)
    
    // Always return 200 OK to Telegram
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    // Still return 200 to Telegram - we don't want to retry failed updates
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    bot: process.env.TELEGRAM_BOT_USERNAME,
    webhook_set: true,
    timestamp: new Date().toISOString(),
  })
}
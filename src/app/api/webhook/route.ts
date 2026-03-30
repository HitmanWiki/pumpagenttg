// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getBot } from '@/lib/bot'

export async function POST(req: NextRequest) {
  try {
    // Get the update from Telegram
    const update = await req.json()
    
    console.log('[Webhook] Received update:', {
      update_id: update.update_id,
      has_message: !!update.message,
      message_text: update.message?.text,
      username: update.message?.from?.username
    })
    
    // Get the bot (this ensures it's initialized)
    const bot = await getBot()
    
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
    timestamp: new Date().toISOString(),
  })
}
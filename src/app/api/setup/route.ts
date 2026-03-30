// src/app/api/setup/route.ts
// Visit /api/setup?secret=YOUR_CRON_SECRET to register the Telegram webhook
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
  const webhookUrl = `${APP_URL}/api/webhook`

  const results: any = {}

  // 1. Set webhook
  const wh = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    }),
  })
  results.webhook = await wh.json()

  // 2. Set commands
  const cmd = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start',  description: 'Get started with Pump Agent' },
        { command: 'launch', description: 'Launch a new token on pump.fun' },
        { command: 'tokens', description: 'View your deployed tokens' },
        { command: 'fees',   description: 'Check your claimable trading fees' },
        { command: 'help',   description: 'Show help and command reference' },
      ],
    }),
  })
  results.commands = await cmd.json()

  // 3. Get webhook info to verify
  const info = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  results.info = await info.json()

  return NextResponse.json({
    message: results.webhook.ok ? '✅ Webhook registered!' : '❌ Webhook failed',
    webhookUrl,
    results,
  })
}
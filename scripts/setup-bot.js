#!/usr/bin/env node
// scripts/setup-bot.js
// Run this ONCE after deploying to Vercel to register your webhook

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL

if (!BOT_TOKEN || !APP_URL) {
  console.error('Missing TELEGRAM_BOT_TOKEN or NEXT_PUBLIC_APP_URL in environment')
  process.exit(1)
}

const webhookUrl = `${APP_URL}/api/webhook`

async function setup() {
  console.log(`\n🤖 Setting up Pump Agent Telegram Bot\n`)
  console.log(`Webhook URL: ${webhookUrl}\n`)

  // Set webhook
  const webhookRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    }
  )
  const webhookData = await webhookRes.json()
  console.log('Webhook:', webhookData.ok ? '✅ Registered' : `❌ Failed: ${webhookData.description}`)

  // Set bot commands
  const commandsRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Get started with Pump Agent' },
          { command: 'launch', description: 'Launch a new token on pump.fun' },
          { command: 'tokens', description: 'View your deployed tokens' },
          { command: 'fees', description: 'Check your claimable trading fees' },
          { command: 'help', description: 'Show help and command reference' },
        ],
      }),
    }
  )
  const commandsData = await commandsRes.json()
  console.log('Commands:', commandsData.ok ? '✅ Set' : `❌ Failed: ${commandsData.description}`)

  // Set bot description
  const descRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Launch meme tokens on pump.fun instantly. DM /launch with a photo to deploy your token on Solana. Earn 90% of all trading fees.',
      }),
    }
  )
  const descData = await descRes.json()
  console.log('Description:', descData.ok ? '✅ Set' : `❌ Failed`)

  // Verify webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`)
  const infoData = await infoRes.json()
  if (infoData.ok) {
    console.log('\n📋 Webhook Info:')
    console.log(`  URL: ${infoData.result.url}`)
    console.log(`  Pending updates: ${infoData.result.pending_update_count}`)
    console.log(`  Last error: ${infoData.result.last_error_message || 'None'}`)
  }

  console.log('\n✅ Bot setup complete! Test it by sending /start in Telegram.\n')
}

setup().catch(console.error)

// src/lib/bot.ts
import { Bot, Context, InputFile } from 'grammy'
import { Keypair } from '@solana/web3.js'
import { deployToken, generateTokenWallet } from './solana'
import { signSession } from './auth'
import prisma from './prisma'

// Check if bot token exists
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set')
  throw new Error('TELEGRAM_BOT_TOKEN is required')
}

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)

// Create a promise that resolves when bot is initialized
let botReadyPromise: Promise<void> | null = null

async function initializeBot() {
  if (!botReadyPromise) {
    botReadyPromise = (async () => {
      try {
        console.log('[Bot] Initializing bot...')
        await bot.init()
        console.log('[Bot] Bot initialized successfully:', bot.botInfo?.username)
      } catch (error) {
        console.error('[Bot] Failed to initialize:', error)
        throw error
      }
    })()
  }
  return botReadyPromise
}

// Start initialization immediately
initializeBot().catch(console.error)

// ============================================================
// Middleware & Error Handling
// ============================================================

// Middleware to ensure bot is initialized before processing
bot.use(async (ctx, next) => {
  // Wait for initialization to complete
  await initializeBot()
  await next()
})

// Log all updates for debugging
bot.use(async (ctx, next) => {
  console.log('[Bot] Update received:', {
    type: ctx.update.message ? 'message' : 
          ctx.update.callback_query ? 'callback' : 
          ctx.update.edited_message ? 'edited_message' : 'other',
    message_text: ctx.message?.text,
    username: ctx.from?.username,
    chat_id: ctx.chat?.id,
    update_id: ctx.update.update_id
  })
  await next()
})

// Global error handler
bot.catch((err) => {
  console.error('[Bot] Error caught:', err)
})

// ============================================================
// /start command with login support
// ============================================================
bot.command('start', async (ctx) => {
  console.log('[Bot] /start command from:', ctx.from?.username)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pumpagenttg.vercel.app'
  const text = ctx.message?.text || ''
  const args = text.split(' ')
  
  // Check if it's a login request (format: /start login_123456789)
  if (args.length > 1 && args[1].startsWith('login_')) {
    const loginId = args[1].replace('login_', '')
    console.log('[Bot] Login request with ID:', loginId)
    
    const telegramUser = ctx.from
    if (!telegramUser) {
      return ctx.reply('❌ Error: Could not identify your account.')
    }
    
    try {
      // Find or create user
      const user = await prisma.user.upsert({
        where: { telegramId: BigInt(telegramUser.id) },
        update: {
          telegramUsername: telegramUser.username || null,
          telegramFirstName: telegramUser.first_name || null,
          telegramLastName: telegramUser.last_name || null,
        },
        create: {
          telegramId: BigInt(telegramUser.id),
          telegramUsername: telegramUser.username || null,
          telegramFirstName: telegramUser.first_name || null,
          telegramLastName: telegramUser.last_name || null,
        },
      })
      
      console.log('[Bot] User found/created:', user.id)
      
      // Create session token
      const sessionToken = await signSession({
        id: user.id,
        telegramId: user.telegramId,
        telegramUsername: user.telegramUsername,
        telegramFirstName: user.telegramFirstName,
      })
      
      // Build the full URL with protocol
      const webhookUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
      const loginUrl = `${webhookUrl}/api/auth/check-login`
      
      console.log('[Bot] Sending login confirmation to:', loginUrl)
      
      // Send login confirmation to web app
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId,
          token: sessionToken,
          user: {
            id: user.id,
            telegramId: user.telegramId.toString(),
            telegramUsername: user.telegramUsername,
            telegramFirstName: user.telegramFirstName,
          }
        })
      })
      
      if (response.ok) {
        await ctx.reply(
          `✅ *Login successful!*\n\n` +
          `You have been logged into Pump Agent.\n` +
          `You can now close this chat and return to the dashboard.`,
          { parse_mode: 'Markdown' }
        )
        console.log('[Bot] Login successful for user:', telegramUser.username)
      } else {
        const errorText = await response.text()
        console.error('[Bot] Login confirmation failed:', response.status, errorText)
        await ctx.reply(
          `❌ *Login failed*\n\n` +
          `Something went wrong. Please try again from the website.`,
          { parse_mode: 'Markdown' }
        )
      }
    } catch (error) {
      console.error('[Bot] Login error:', error)
      await ctx.reply(
        `❌ *Login failed*\n\n` +
        `An error occurred. Please try again later.`,
        { parse_mode: 'Markdown' }
      )
    }
    return
  }
  
  // Regular start message (no login)
  try {
    await ctx.reply(
      `👋 *Welcome to Pump Agent!*\n\n` +
      `Launch meme tokens on pump.fun directly from Telegram — no code needed.\n\n` +
      `*How to launch a token:*\n` +
      `1️⃣ Send a photo (your token image)\n` +
      `2️⃣ Add the caption:\n\n` +
      `\`/launch Token Name $TICKER\`\n` +
      `\`description: Your token description\`\n` +
      `\`website: https://yoursite.com\`\n\n` +
      `*Commands:*\n` +
      `/launch — Deploy a new token\n` +
      `/tokens — View your tokens\n` +
      `/fees — Check claimable fees\n` +
      `/help — Show this message\n\n` +
      `📊 [View Dashboard](${appUrl}/dashboard)`,
      { 
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      }
    )
    console.log('[Bot] /start reply sent successfully')
  } catch (error) {
    console.error('[Bot] Failed to send /start reply:', error)
  }
})

// ============================================================
// /help command
// ============================================================
bot.command('help', async (ctx) => {
  console.log('[Bot] /help command from:', ctx.from?.username)
  await ctx.reply(
    `*Pump Agent — Help*\n\n` +
    `*Launch a token:*\n` +
    `Send a photo with caption:\n` +
    `\`/launch My Token $MTK\`\n` +
    `\`description: Cool meme token\`\n` +
    `\`website: https://mytoken.xyz\`\n\n` +
    `*Rules:*\n` +
    `• Token name: 2–32 characters\n` +
    `• Ticker: 2–10 letters only (no numbers/symbols)\n` +
    `• Must include \`$\` prefix\n` +
    `• Must attach an image\n\n` +
    `*Fee sharing:*\n` +
    `You earn 90% of all trading fees from your token.\n` +
    `Claim anytime from the dashboard.`,
    { parse_mode: 'Markdown' }
  )
})

// ============================================================
// /ping command (for testing)
// ============================================================
bot.command('ping', async (ctx) => {
  console.log('[Bot] /ping from:', ctx.from?.username)
  await ctx.reply('pong! 🏓')
})

// ============================================================
// /tokens command
// ============================================================
bot.command('tokens', async (ctx) => {
  console.log('[Bot] /tokens command from:', ctx.from?.username)
  const telegramId = ctx.from?.id
  if (!telegramId) return ctx.reply('Could not identify your Telegram account.')

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        tokens: {
          where: { status: { not: 'FAILED' } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }
      }
    })

    if (!user || user.tokens.length === 0) {
      return ctx.reply(
        `You haven't launched any tokens yet.\n\nSend a photo with /launch to get started!`
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pumpagenttg.vercel.app'
    let msg = `*Your Tokens (${user.tokens.length})*\n\n`

    for (const token of user.tokens) {
      const feeSol = (Number(token.claimableFeesLamports) / 1e9).toFixed(4)
      msg += `• *${token.name}* (\$${token.symbol})\n`
      msg += `  💰 Claimable: ${feeSol} SOL\n`
      msg += `  🔗 [pump.fun](${token.pumpFunUrl})\n\n`
    }

    msg += `[View full dashboard →](${appUrl}/dashboard)`

    await ctx.reply(msg, { 
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true }
    })
  } catch (error) {
    console.error('[Bot] /tokens error:', error)
    await ctx.reply('❌ Failed to fetch your tokens. Please try again later.')
  }
})

// ============================================================
// /fees command
// ============================================================
bot.command('fees', async (ctx) => {
  console.log('[Bot] /fees command from:', ctx.from?.username)
  const telegramId = ctx.from?.id
  if (!telegramId) return ctx.reply('Could not identify your Telegram account.')

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { tokens: { where: { status: 'LIVE' } } }
    })

    if (!user || user.tokens.length === 0) {
      return ctx.reply(`No active tokens found. Launch one with /launch!`)
    }

    const totalClaimable = user.tokens.reduce(
      (sum, t) => sum + Number(t.claimableFeesLamports), 0
    )
    const totalEarned = user.tokens.reduce(
      (sum, t) => sum + Number(t.totalFeesEarnedLamports), 0
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pumpagenttg.vercel.app'
    const claimableSol = (totalClaimable / 1e9).toFixed(4)
    const earnedSol = (totalEarned / 1e9).toFixed(4)

    await ctx.reply(
      `*Your Fee Summary*\n\n` +
      `📈 Total earned: *${earnedSol} SOL*\n` +
      `💰 Available to claim: *${claimableSol} SOL*\n` +
      `📊 Active tokens: ${user.tokens.length}\n\n` +
      `[Claim fees on dashboard →](${appUrl}/claim)`,
      { 
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      }
    )
  } catch (error) {
    console.error('[Bot] /fees error:', error)
    await ctx.reply('❌ Failed to fetch fees. Please try again later.')
  }
})

// ============================================================
// Photo + /launch caption handler
// ============================================================
bot.on('message:photo', async (ctx) => {
  console.log('[Bot] Photo received from:', ctx.from?.username)
  const caption = ctx.message.caption || ''

  if (!caption.toLowerCase().startsWith('/launch')) {
    console.log('[Bot] Photo without /launch, ignoring')
    return // ignore photos without /launch
  }

  console.log('[Bot] Launching token from photo with caption:', caption)
  await handleLaunch(ctx, caption)
})

// ============================================================
// /launch command (without photo)
// ============================================================
bot.command('launch', async (ctx) => {
  console.log('[Bot] /launch command from:', ctx.from?.username)
  
  // If this is a reply to a photo message, use that photo
  const replyPhoto = ctx.message?.reply_to_message?.photo
  if (replyPhoto) {
    const caption = ctx.message?.text || ''
    console.log('[Bot] Launching from replied photo')
    await handleLaunch(ctx, caption, replyPhoto)
    return
  }

  await ctx.reply(
    `To launch a token, *send a photo* with the caption:\n\n` +
    `\`/launch Token Name $TICKER\`\n` +
    `\`description: Your description\`\n` +
    `\`website: https://yoursite.com\`\n\n` +
    `The image will be your token's icon on pump.fun.`,
    { parse_mode: 'Markdown' }
  )
})

// ============================================================
// Core launch handler
// ============================================================
async function handleLaunch(ctx: Context, caption: string, photoOverride?: any) {
  const telegramUser = ctx.from
  if (!telegramUser) return ctx.reply('Could not identify your account.')

  console.log('[Launch] Starting launch process for user:', telegramUser.username)

  // Parse the caption
  const lines = caption.split('\n').map(l => l.trim())
  const firstLine = lines[0]

  // Extract name and ticker from first line: "/launch My Token $MTK"
  const launchMatch = firstLine.match(/^\/launch\s+(.+?)\s+\$([A-Za-z]+)$/i)
  if (!launchMatch) {
    return ctx.reply(
      `❌ *Invalid format.*\n\n` +
      `Use: \`/launch Token Name $TICKER\`\n\n` +
      `Example: \`/launch Moon Dog $MDOG\``,
      { parse_mode: 'Markdown' }
    )
  }

  const tokenName = launchMatch[1].trim()
  const tokenSymbol = launchMatch[2].toUpperCase()

  // Validate
  if (tokenName.length < 2 || tokenName.length > 32) {
    return ctx.reply(`❌ Token name must be 2–32 characters. Got: ${tokenName.length}`)
  }
  if (tokenSymbol.length < 2 || tokenSymbol.length > 10) {
    return ctx.reply(`❌ Ticker must be 2–10 letters. Got: $${tokenSymbol}`)
  }

  // Parse optional description and website
  let description = ''
  let website = ''
  for (const line of lines.slice(1)) {
    if (line.toLowerCase().startsWith('description:')) {
      description = line.replace(/^description:\s*/i, '').trim()
    }
    if (line.toLowerCase().startsWith('website:')) {
      website = line.replace(/^website:\s*/i, '').trim()
    }
  }

  console.log('[Launch] Token details:', { tokenName, tokenSymbol, description, website })

  // Get photo
  const photos = photoOverride || ctx.message?.photo
  if (!photos || photos.length === 0) {
    return ctx.reply(
      `❌ Please attach a photo (your token image) when using /launch.\n\n` +
      `Send the photo with the /launch command as the caption.`
    )
  }

  // Send initial "processing" message
  const statusMsg = await ctx.reply(
    `⏳ *Launching ${tokenName} ($${tokenSymbol})...*\n\nUploading to IPFS...`,
    { parse_mode: 'Markdown' }
  )

  try {
    // Download the largest photo
    const photo = photos[photos.length - 1]
    const file = await ctx.api.getFile(photo.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

    console.log('[Launch] Downloading image from:', fileUrl)
    const imageRes = await fetch(fileUrl)
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramUser.id) },
      update: {
        telegramUsername: telegramUser.username || null,
        telegramFirstName: telegramUser.first_name || null,
        telegramLastName: telegramUser.last_name || null,
      },
      create: {
        telegramId: BigInt(telegramUser.id),
        telegramUsername: telegramUser.username || null,
        telegramFirstName: telegramUser.first_name || null,
        telegramLastName: telegramUser.last_name || null,
      },
    })

    // Generate token keypair (this IS the token's mint address)
    const mintKeypair = Keypair.generate()
    // Generate a separate wallet for fee accumulation
    const feeWallet = generateTokenWallet()

    console.log('[Launch] Mint address:', mintKeypair.publicKey.toBase58())

    // Update status message
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `⏳ *Launching ${tokenName} ($${tokenSymbol})...*\n\nDeploying on pump.fun...`,
      { parse_mode: 'Markdown' }
    )

    // Deploy the token
    console.log('[Launch] Calling deployToken...')
    const deployResult = await deployToken({
      name: tokenName,
      symbol: tokenSymbol,
      description,
      website,
      telegram: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`,
      imageBuffer,
      imageFileName: `${tokenSymbol.toLowerCase()}.png`,
      mintKeypair,
      devBuySol: 0,
    })

    if (!deployResult.success) {
      console.error('[Launch] Deployment failed:', deployResult.error)
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `❌ *Launch failed*\n\n${deployResult.error || 'Unknown error. Please try again.'}`,
        { parse_mode: 'Markdown' }
      )
      return
    }

    console.log('[Launch] Deployment successful! Pump.fun URL:', deployResult.pumpFunUrl)

    // Save token to DB
    await prisma.token.create({
      data: {
        userId: user.id,
        name: tokenName,
        symbol: tokenSymbol,
        description: description || null,
        website: website || null,
        mintAddress: deployResult.mintAddress,
        tokenWalletAddress: feeWallet.publicKey,
        tokenWalletPrivKey: feeWallet.privateKey,
        deployTx: deployResult.txSignature || null,
        pumpFunUrl: deployResult.pumpFunUrl || null,
        status: 'LIVE',
        telegramChatId: BigInt(ctx.chat!.id),
        telegramMessageId: BigInt(statusMsg.message_id),
      }
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pumpagenttg.vercel.app'

    // Success message
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `✅ *${tokenName} ($${tokenSymbol}) is LIVE on pump.fun!*\n\n` +
      `🔗 [View on pump.fun](${deployResult.pumpFunUrl})\n` +
      `📋 CA: \`${deployResult.mintAddress}\`\n\n` +
      `💰 You'll earn 90% of all trading fees.\n` +
      `📊 [Track & claim fees →](${appUrl}/dashboard)`,
      { 
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      }
    )
    
    console.log('[Launch] Success message sent')

  } catch (error: any) {
    console.error('[handleLaunch] Error:', error)
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Something went wrong*\n\n${error.message || 'Please try again.'}`,
      { parse_mode: 'Markdown' }
    ).catch(() => {})
  }
}

// Export a function that returns the bot after initialization
export async function getBot() {
  await initializeBot()
  return bot
}

// For backward compatibility, also export the bot but warn
// This ensures any existing imports still work
export default bot

// Also export a helper to check if bot is ready
export async function isBotReady() {
  try {
    await initializeBot()
    return true
  } catch {
    return false
  }
}
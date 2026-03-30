// src/lib/bot.ts
import { Bot, Context, InputFile } from 'grammy'
import { Keypair } from '@solana/web3.js'
import { deployToken, generateTokenWallet } from './solana'
import prisma from './prisma'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// ============================================================
// /start command
// ============================================================
bot.command('start', async (ctx) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
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
})

bot.command('help', async (ctx) => {
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
// /tokens command
// ============================================================
bot.command('tokens', async (ctx) => {
  const telegramId = ctx.from?.id
  if (!telegramId) return ctx.reply('Could not identify your Telegram account.')

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
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
})

// ============================================================
// /fees command
// ============================================================
bot.command('fees', async (ctx) => {
  const telegramId = ctx.from?.id
  if (!telegramId) return ctx.reply('Could not identify your Telegram account.')

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
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
})

// ============================================================
// Photo + /launch caption handler
// ============================================================
bot.on('message:photo', async (ctx) => {
  const caption = ctx.message.caption || ''

  if (!caption.toLowerCase().startsWith('/launch')) {
    return // ignore photos without /launch
  }

  await handleLaunch(ctx, caption)
})

// Also handle /launch sent as a command (will prompt for image)
bot.command('launch', async (ctx) => {
  // If this is a reply to a photo message, use that photo
  const replyPhoto = ctx.message?.reply_to_message?.photo
  if (replyPhoto) {
    const caption = ctx.message?.text || ''
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

    // Update status message
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `⏳ *Launching ${tokenName} ($${tokenSymbol})...*\n\nDeploying on pump.fun...`,
      { parse_mode: 'Markdown' }
    )

    // Deploy the token
    const deployResult = await deployToken({
      name: tokenName,
      symbol: tokenSymbol,
      description,
      website,
      telegram: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`,
      imageBuffer,
      imageFileName: `${tokenSymbol.toLowerCase()}.png`,
      mintKeypair,
      devBuySol: 0, // no dev buy — creator decides
    })

    if (!deployResult.success) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `❌ *Launch failed*\n\n${deployResult.error || 'Unknown error. Please try again.'}`,
        { parse_mode: 'Markdown' }
      )
      return
    }

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const shortMint = `${deployResult.mintAddress.slice(0, 6)}...${deployResult.mintAddress.slice(-6)}`

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

export default bot
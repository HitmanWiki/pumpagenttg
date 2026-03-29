# Pump Agent TG — Setup Guide

## What This Is
A platform that lets users launch tokens on pump.fun directly from Telegram DMs.  
Users DM your bot `/launch Token Name $TICKER` with a photo → token goes live in seconds.  
They earn 90% of trading fees, claimable from the web dashboard.

## Tech Stack
- **Next.js 14** — frontend + API routes (deploy to Vercel)
- **Grammy.js** — Telegram bot framework (runs as Vercel serverless webhook)
- **Prisma + Neon** — Postgres database (serverless-friendly)
- **PumpPortal** — pump.fun deployment API
- **Solana Web3.js** — fee claiming

---

## Step 1: Create Telegram Bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, follow prompts
3. Copy the **Bot Token** → `TELEGRAM_BOT_TOKEN`
4. Copy the **Bot Username** (e.g. `pumpagentbot`) → `TELEGRAM_BOT_USERNAME`

---

## Step 2: Set Up Database (Neon)

1. Go to [neon.tech](https://neon.tech), create a free Postgres database
2. Copy the **Connection string** → `DATABASE_URL`
3. Copy the **Direct connection string** → `DIRECT_URL`

---

## Step 3: PumpPortal API Key

1. Go to [pumpportal.fun](https://pumpportal.fun)
2. Generate a Lightning API Key
3. Copy it → `PUMPPORTAL_API_KEY`

---

## Step 4: Solana Platform Wallet

This wallet receives the 10% platform fee on claims.  
Generate one with Node.js:

```bash
node -e "
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const kp = Keypair.generate();
console.log('Private key (base58):', bs58.encode(kp.secretKey));
console.log('Public key:', kp.publicKey.toString());
"
```

- Copy private key → `PLATFORM_WALLET_PRIVATE_KEY`
- Fund the public key with **0.1 SOL** (for Solana tx fees on claims)

---

## Step 5: JWT Secret

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy it → `JWT_SECRET`

---

## Step 6: Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
DATABASE_URL=
DIRECT_URL=
PUMPPORTAL_API_KEY=
PLATFORM_WALLET_PRIVATE_KEY=
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
JWT_SECRET=
MIN_CLAIM_SOL=0.1
PLATFORM_FEE_PCT=10
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Step 7: Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all env vars in the Vercel dashboard.

---

## Step 8: Push DB Schema

```bash
npm install
npx prisma db push
```

---

## Step 9: Register Telegram Webhook

After deploying, register your bot's webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/webhook"
```

You should see: `{"ok":true,"result":true}`

---

## Step 10: Add First Campaign (Optional)

Insert a campaign directly in the DB (via Prisma Studio or SQL):

```sql
INSERT INTO campaigns (title, goal_type, goal_value, prize_usd, status)
VALUES ('Reach $100K MC', 'MARKET_CAP', 100000, 1000, 'ACTIVE');
```

---

## Testing Your Bot

1. Open Telegram, DM your bot
2. Send `/start`
3. Send a photo with caption: `/launch Test Token $TEST`
4. Bot should reply with the pump.fun link in ~3 seconds

---

## How Token Launch Works

```
User sends photo + /launch caption
        ↓
Bot downloads image
        ↓
POST image + metadata to pump.fun IPFS API
        ↓ gets metadataUri
POST to PumpPortal /api/trade (action: create)
        ↓ token deployed on-chain
Bot replies with pump.fun URL + Contract Address
        ↓
Token + wallet stored in DB
        ↓
User tracks fees on dashboard
```

---

## Fee Claiming Flow

Each deployed token has its own Solana wallet (keypair stored encrypted in DB).  
Trading fees accumulate in that wallet.  
When user claims:
1. We read balance from the token wallet
2. Send 90% to user's wallet
3. Send 10% to platform wallet  
4. Record claim in DB

**Minimum claim: 0.1 SOL** (configurable via `MIN_CLAIM_SOL`)

---

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts          ← Telegram bot webhook
│   │   ├── auth/telegram/route.ts   ← Dashboard login
│   │   ├── auth/me/route.ts         ← Session check
│   │   ├── tokens/route.ts          ← User's tokens
│   │   ├── tokens/all/route.ts      ← Public token explorer
│   │   ├── tokens/[id]/route.ts     ← Single token
│   │   ├── fees/claim/route.ts      ← Fee claiming
│   │   ├── leaderboard/route.ts     ← Leaderboard
│   │   └── campaigns/route.ts       ← Campaigns
│   ├── dashboard/page.tsx           ← Dashboard UI
│   ├── leaderboard/page.tsx         ← Leaderboard UI
│   ├── tokens/page.tsx              ← Token explorer UI
│   └── token/[id]/page.tsx          ← Token detail UI
├── lib/
│   ├── bot.ts                       ← Grammy bot + commands
│   ├── solana.ts                    ← Deploy + fee claim
│   ├── auth.ts                      ← JWT + Telegram auth
│   └── prisma.ts                    ← DB client
prisma/
└── schema.prisma                    ← Database schema
```

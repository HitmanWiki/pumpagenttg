#!/usr/bin/env node
// scripts/generate-wallet.js
// Generates a Solana keypair for your platform wallet
// Run: node scripts/generate-wallet.js

const { Keypair } = require('@solana/web3.js')
const bs58 = require('bs58')
const crypto = require('crypto')

console.log('\n🔑 Pump Agent — Key Generation Utility\n')

// 1. Platform wallet (receives 10% fees)
const platformKeypair = Keypair.generate()
console.log('=== PLATFORM WALLET (receives 10% fees) ===')
console.log(`Public Key:  ${platformKeypair.publicKey.toString()}`)
console.log(`Private Key: ${bs58.encode(platformKeypair.secretKey)}`)
console.log()
console.log('➜ Add to .env.local:')
console.log(`PLATFORM_WALLET_PRIVATE_KEY=${bs58.encode(platformKeypair.secretKey)}`)
console.log()
console.log('➜ Fund this wallet with at least 0.05 SOL for transaction fees')
console.log()

// 2. JWT Secret
const jwtSecret = crypto.randomBytes(32).toString('hex')
console.log('=== JWT SECRET ===')
console.log(`JWT_SECRET=${jwtSecret}`)
console.log()

// 3. Cron Secret
const cronSecret = crypto.randomBytes(24).toString('hex')
console.log('=== CRON SECRET ===')
console.log(`CRON_SECRET=${cronSecret}`)
console.log()

console.log('⚠️  Save these values securely. You cannot recover them if lost.\n')

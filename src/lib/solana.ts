// src/lib/solana.ts
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

export const connection = new Connection(
  process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

// Generate a fresh keypair for a token's fee wallet
export function generateTokenWallet() {
  const keypair = Keypair.generate()
  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  }
}

// Get platform wallet keypair from env
export function getPlatformKeypair(): Keypair {
  const privKey = process.env.PLATFORM_WALLET_PRIVATE_KEY!
  return Keypair.fromSecretKey(bs58.decode(privKey))
}

// Convert lamports to SOL
export function lamportsToSol(lamports: bigint | number): number {
  return Number(lamports) / LAMPORTS_PER_SOL
}

// Convert SOL to lamports
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL))
}

// Get SOL balance of a wallet
export async function getSolBalance(publicKey: string): Promise<number> {
  try {
    const lamports = await connection.getBalance(new PublicKey(publicKey))
    return lamports / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

// ============================================================
// PumpPortal Token Deployment
// ============================================================

export interface DeployTokenParams {
  name: string
  symbol: string
  description?: string
  website?: string
  telegram?: string
  imageBuffer: Buffer
  imageFileName: string
  mintKeypair: Keypair
  devBuySol?: number // optional dev buy in SOL, defaults to 0
}

export interface DeployTokenResult {
  success: boolean
  mintAddress: string
  txSignature?: string
  pumpFunUrl?: string
  error?: string
}

export async function deployToken(params: DeployTokenParams): Promise<DeployTokenResult> {
  const {
    name, symbol, description, website, telegram,
    imageBuffer, imageFileName, mintKeypair, devBuySol = 0
  } = params

  try {
    // Step 1: Upload metadata + image to IPFS via pump.fun
    const formData = new FormData()
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('file', imageBlob, imageFileName)
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description || '')
    if (telegram) formData.append('telegram', telegram)
    if (website) formData.append('website', website)
    formData.append('showName', 'true')

    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    })

    if (!ipfsResponse.ok) {
      throw new Error(`IPFS upload failed: ${ipfsResponse.statusText}`)
    }

    const ipfsData = await ipfsResponse.json()
    const metadataUri = ipfsData.metadataUri

    if (!metadataUri) {
      throw new Error('No metadata URI returned from IPFS')
    }

    // Step 2: Deploy via PumpPortal Lightning API
    const tradePayload = {
      action: 'create',
      tokenMetadata: {
        name,
        symbol,
        uri: metadataUri,
      },
      mint: bs58.encode(mintKeypair.secretKey),
      denominatedInSol: 'true',
      amount: devBuySol, // 0 = no dev buy
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'pump',
    }

    const deployResponse = await fetch(
      `https://pumpportal.fun/api/trade?api-key=${process.env.PUMPPORTAL_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload),
      }
    )

    if (!deployResponse.ok) {
      const errText = await deployResponse.text()
      throw new Error(`PumpPortal deploy failed: ${errText}`)
    }

    const deployData = await deployResponse.json()
    const mintAddress = mintKeypair.publicKey.toBase58()

    return {
      success: true,
      mintAddress,
      txSignature: deployData.signature,
      pumpFunUrl: `https://pump.fun/coin/${mintAddress}`,
    }
  } catch (error: any) {
    console.error('[deployToken] Error:', error)
    return {
      success: false,
      mintAddress: mintKeypair.publicKey.toBase58(),
      error: error.message || 'Unknown error',
    }
  }
}

// ============================================================
// Fee Claiming
// ============================================================

export interface ClaimFeesParams {
  tokenWalletPrivKey: string   // bs58 encoded private key of token fee wallet
  destinationWallet: string    // user's Solana wallet to receive 90%
  platformWallet: string       // platform wallet to receive 10%
  amountLamports: bigint
  platformFeePct?: number      // default 10
}

export interface ClaimFeesResult {
  success: boolean
  txSignature?: string
  netAmountLamports?: bigint
  platformFeeLamports?: bigint
  error?: string
}

export async function claimFees(params: ClaimFeesParams): Promise<ClaimFeesResult> {
  const {
    tokenWalletPrivKey, destinationWallet,
    platformWallet, amountLamports,
    platformFeePct = 10
  } = params

  try {
    const { Transaction, SystemProgram, sendAndConfirmTransaction } = await import('@solana/web3.js')

    const tokenWalletKeypair = Keypair.fromSecretKey(bs58.decode(tokenWalletPrivKey))
    const platformFeeLamports = BigInt(Math.floor(Number(amountLamports) * platformFeePct / 100))
    const netAmountLamports = amountLamports - platformFeeLamports

    // Reserve some SOL for transaction fees (~5000 lamports)
    const txFeeReserve = BigInt(5000)
    const actualNet = netAmountLamports - txFeeReserve

    if (actualNet <= BigInt(0)) {
      throw new Error('Insufficient balance after fees')
    }

    const tx = new Transaction()

    // Send 90% to user
    tx.add(SystemProgram.transfer({
      fromPubkey: tokenWalletKeypair.publicKey,
      toPubkey: new PublicKey(destinationWallet),
      lamports: actualNet,
    }))

    // Send 10% to platform
    tx.add(SystemProgram.transfer({
      fromPubkey: tokenWalletKeypair.publicKey,
      toPubkey: new PublicKey(platformWallet),
      lamports: platformFeeLamports,
    }))

    const txSignature = await sendAndConfirmTransaction(connection, tx, [tokenWalletKeypair])

    return {
      success: true,
      txSignature,
      netAmountLamports: actualNet,
      platformFeeLamports,
    }
  } catch (error: any) {
    console.error('[claimFees] Error:', error)
    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}

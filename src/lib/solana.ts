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

// Helper function to convert Buffer to Blob
function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  const uint8Array = new Uint8Array(buffer)
  return new Blob([uint8Array], { type: mimeType })
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
  devBuySol?: number
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
    console.log('[deployToken] Starting deployment for:', name, symbol)
    
    // Step 1: Upload metadata + image to IPFS via pump.fun
    const formData = new FormData()
    
    // Convert Buffer to Blob using helper
    const imageBlob = bufferToBlob(imageBuffer, 'image/png')
    formData.append('file', imageBlob, imageFileName)
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description || '')
    if (telegram) formData.append('telegram', telegram)
    if (website) formData.append('website', website)
    formData.append('showName', 'true')

    console.log('[deployToken] Uploading to IPFS...')
    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    })

    if (!ipfsResponse.ok) {
      const errorText = await ipfsResponse.text()
      console.error('[deployToken] IPFS upload failed:', errorText)
      throw new Error(`IPFS upload failed: ${ipfsResponse.statusText} - ${errorText}`)
    }

    const ipfsData = await ipfsResponse.json()
    const metadataUri = ipfsData.metadataUri || ipfsData.uri

    if (!metadataUri) {
      console.error('[deployToken] No metadata URI in response:', ipfsData)
      throw new Error('No metadata URI returned from IPFS')
    }

    console.log('[deployToken] Metadata URI:', metadataUri)

    // Step 2: Deploy via PumpPortal API
    const mintPublicKey = mintKeypair.publicKey.toBase58()
    
    const deployPayload = {
      action: 'create',
      tokenMetadata: {
        name: name,
        symbol: symbol,
        uri: metadataUri,
      },
      mint: mintPublicKey,
      denominatedInSol: 'true',
      amount: devBuySol.toString(),
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'pump',
    }

    console.log('[deployToken] Deploying with payload:', JSON.stringify(deployPayload, null, 2))
    
    const deployResponse = await fetch('https://pumpportal.fun/api/trade', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': process.env.PUMPPORTAL_API_KEY || ''
      },
      body: JSON.stringify(deployPayload),
    })

    if (!deployResponse.ok) {
      const errText = await deployResponse.text()
      console.error('[deployToken] PumpPortal deploy failed:', errText)
      throw new Error(`PumpPortal deploy failed: ${deployResponse.status} - ${errText}`)
    }

    const deployData = await deployResponse.json()
    console.log('[deployToken] Deploy response:', deployData)

    const txSignature = deployData.signature || deployData.txid || deployData.transactionId
    
    if (!txSignature) {
      console.warn('[deployToken] No transaction signature in response')
    }

    const mintAddress = mintKeypair.publicKey.toBase58()
    const pumpFunUrl = `https://pump.fun/coin/${mintAddress}`

    console.log('[deployToken] Success! Token at:', pumpFunUrl)

    return {
      success: true,
      mintAddress,
      txSignature,
      pumpFunUrl,
    }
  } catch (error: any) {
    console.error('[deployToken] Error:', error)
    return {
      success: false,
      mintAddress: params.mintKeypair.publicKey.toBase58(),
      error: error.message || 'Unknown error',
    }
  }
}

// ============================================================
// Fee Claiming
// ============================================================

export interface ClaimFeesParams {
  tokenWalletPrivKey: string
  destinationWallet: string
  platformWallet: string
  amountLamports: bigint
  platformFeePct?: number
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

    const txFeeReserve = BigInt(5000)
    const actualNet = netAmountLamports - txFeeReserve

    if (actualNet <= BigInt(0)) {
      throw new Error('Insufficient balance after fees')
    }

    const tx = new Transaction()

    tx.add(SystemProgram.transfer({
      fromPubkey: tokenWalletKeypair.publicKey,
      toPubkey: new PublicKey(destinationWallet),
      lamports: actualNet,
    }))

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
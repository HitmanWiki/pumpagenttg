// src/lib/solana.ts
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { AnchorProvider } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { PumpFunSDK } from 'pumpdotfun-sdk'
import bs58 from 'bs58'
import fs from 'fs'
import path from 'path'

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

// Helper function to convert Buffer to Blob (fixed)
function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  const uint8Array = new Uint8Array(buffer)
  return new Blob([uint8Array], { type: mimeType })
}

// Helper to upload image to IPFS via pump.fun
async function uploadToIPFS(
  name: string,
  symbol: string,
  description: string,
  website: string,
  telegram: string,
  imageBuffer: Buffer,
  imageFileName: string
): Promise<string> {
  const formData = new FormData()
  const imageBlob = bufferToBlob(imageBuffer, 'image/png')
  formData.append('file', imageBlob, imageFileName)
  formData.append('name', name)
  formData.append('symbol', symbol)
  formData.append('description', description)
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
    throw new Error(`IPFS upload failed: ${ipfsResponse.statusText} - ${errorText}`)
  }

  const ipfsData = await ipfsResponse.json()
  const metadataUri = ipfsData.metadataUri || ipfsData.uri
  
  if (!metadataUri) {
    throw new Error('No metadata URI returned from IPFS')
  }

  console.log('[deployToken] Metadata URI:', metadataUri)
  return metadataUri
}

// Helper to get image URL from metadata
async function getImageUrlFromMetadata(metadataUri: string): Promise<string | null> {
  try {
    const metadataResponse = await fetch(metadataUri)
    const metadata = await metadataResponse.json()
    return metadata.image || null
  } catch (err) {
    console.error('[deployToken] Failed to fetch metadata:', err)
    return metadataUri.replace('/metadata.json', '/image.png')
  }
}

// Helper to convert Buffer to File (for SDK)
function bufferToFile(buffer: Buffer, filename: string): File {
  const uint8Array = new Uint8Array(buffer)
  return new File([uint8Array], filename, { type: 'image/png' })
}

// ============================================================
// Token Deployment with pumpdotfun-sdk
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
  imageUrl?: string
  error?: string
}

export async function deployToken(params: DeployTokenParams): Promise<DeployTokenResult> {
  const {
    name, symbol, description, website, telegram,
    imageBuffer, imageFileName, mintKeypair, devBuySol = 0
  } = params

  try {
    console.log('[deployToken] Starting deployment for:', name, symbol)
    
    // Step 1: Upload metadata to IPFS
    const metadataUri = await uploadToIPFS(
      name, symbol, description || '', website || '', telegram || '',
      imageBuffer, imageFileName
    )

    // Step 2: Get the actual image URL from metadata
    const imageUrl = await getImageUrlFromMetadata(metadataUri)
    console.log('[deployToken] Image URL:', imageUrl)

    // Step 3: Setup SDK
    const deployerKeypair = getPlatformKeypair()
    const wallet = new NodeWallet(deployerKeypair)
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed'
    })
    
    const sdk = new PumpFunSDK(provider)

    // Step 4: Create File object from buffer (SDK expects File, not filePath)
    const imageFile = bufferToFile(imageBuffer, imageFileName)
    
    const tokenMetadata = {
      name: name,
      symbol: symbol,
      description: description || '',
      file: imageFile,  // Use File object, not filePath
      twitter: '',
      telegram: telegram || '',
      website: website || '',
    }

    console.log('[deployToken] Creating token with SDK...')
    
    // Step 5: Create and optionally buy token
    const result = await sdk.createAndBuy(
      deployerKeypair,           // signer
      mintKeypair,               // new token mint
      tokenMetadata,             // token metadata
      BigInt(Math.floor(devBuySol * LAMPORTS_PER_SOL)), // dev buy amount in lamports
      BigInt(500),               // 5% slippage
      { 
        unitLimit: 250000, 
        unitPrice: 250000        // priority fee
      }
    )

    console.log('[deployToken] SDK Result:', result)

    if (!result || !result.signature) {
      throw new Error('SDK returned no transaction signature')
    }

    const mintAddress = mintKeypair.publicKey.toBase58()
    const pumpFunUrl = `https://pump.fun/coin/${mintAddress}`

    console.log('[deployToken] Success! Token at:', pumpFunUrl)
    console.log('[deployToken] Transaction:', `https://solscan.io/tx/${result.signature}`)

    return {
      success: true,
      mintAddress,
      txSignature: result.signature,
      pumpFunUrl,
      imageUrl: imageUrl || undefined,
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
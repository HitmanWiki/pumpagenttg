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

// Helper to upload image to IPFS via pump.fun
async function uploadToIPFS(
  name: string,
  symbol: string,
  description: string,
  website: string,
  twitter: string,
  telegram: string,
  imageBuffer: Buffer,
  imageFileName: string
): Promise<{ metadataUri: string; imageUri: string }> {
  const formData = new FormData()
  const imageBlob = bufferToBlob(imageBuffer, 'image/png')
  formData.append('file', imageBlob, imageFileName)
  formData.append('name', name)
  formData.append('symbol', symbol)
  formData.append('description', description)
  if (telegram) formData.append('telegram', telegram)
  if (twitter) formData.append('twitter', twitter)
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
  
  // Get both URIs from response
  const metadataUri = ipfsData.metadataUri || ipfsData.uri
  const imageUri = ipfsData.imageUri || ipfsData.image_url
  
  console.log('[deployToken] Metadata URI:', metadataUri)
  console.log('[deployToken] Image URI:', imageUri)
  
  if (!metadataUri) {
    throw new Error('No metadata URI returned from IPFS')
  }
  
  if (!imageUri) {
    throw new Error('No image URI returned from IPFS')
  }

  return { metadataUri, imageUri }
}

// Helper to get image URL from metadata with retry logic (fallback)
async function getImageUrlFromMetadata(metadataUri: string, retries: number = 3): Promise<string | null> {
  const imageCid = metadataUri.split('/ipfs/')[1]?.split('/')[0]
  const constructedUrl = `https://ipfs.io/ipfs/${imageCid}/image.png`
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[deployToken] Fetching metadata (attempt ${attempt}/${retries})...`)
      
      if (attempt > 1) {
        const delay = attempt * 1000
        console.log(`[deployToken] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      const metadataResponse = await fetch(metadataUri, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      })
      
      if (!metadataResponse.ok) {
        throw new Error(`HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`)
      }
      
      const text = await metadataResponse.text()
      
      try {
        const metadata = JSON.parse(text)
        
        if (metadata.image && metadata.image.includes('.png')) {
          console.log('[deployToken] Successfully extracted image URL from metadata:', metadata.image)
          return metadata.image
        } else if (metadata.image) {
          console.log('[deployToken] Found image in metadata but not PNG:', metadata.image)
          return constructedUrl
        } else {
          console.log('[deployToken] No image field in metadata, using constructed URL')
          return constructedUrl
        }
      } catch (parseError) {
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new Error('IPFS gateway returned HTML, content not ready yet')
        }
        throw parseError
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[deployToken] Metadata fetch attempt ${attempt} failed:`, errorMessage)
    }
  }
  
  console.warn('[deployToken] All metadata fetch attempts failed, using constructed image URL:', constructedUrl)
  return constructedUrl
}

// ============================================================
// PumpPortal Token Deployment
// ============================================================

export interface DeployTokenParams {
  name: string
  symbol: string
  description?: string
  website?: string
  twitter?: string
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
    name, symbol, description, website, twitter, telegram,
    imageBuffer, imageFileName, mintKeypair, devBuySol = 0
  } = params

  try {
    console.log('[deployToken] Starting deployment for:', name, symbol)
    
    // Step 1: Upload metadata to IPFS and get both URIs
    const { metadataUri, imageUri } = await uploadToIPFS(
      name, symbol, description || '', website || '', twitter || '', telegram || '',
      imageBuffer, imageFileName
    )

    // Step 2: Use the image URI directly from upload response
    let imageUrl: string | undefined = imageUri
    
    // If imageUri is missing, try to get from metadata or construct
    if (!imageUrl) {
      const fallbackUrl = await getImageUrlFromMetadata(metadataUri)
      imageUrl = fallbackUrl || undefined
    }
    
    // Verify the image URL is accessible (optional quick check)
    if (imageUrl) {
      try {
        const checkResponse = await fetch(imageUrl, { method: 'HEAD' })
        if (!checkResponse.ok) {
          console.log('[deployToken] Image URL not accessible, using fallback')
          imageUrl = undefined
        }
      } catch {
        console.log('[deployToken] Could not verify image URL')
      }
    }
    
    console.log('[deployToken] Final Image URL:', imageUrl)

    // Step 3: Deploy via PumpPortal API
    const mintSecretKey = bs58.encode(mintKeypair.secretKey)
    const apiKey = process.env.PUMPPORTAL_API_KEY
    
    console.log('[deployToken] API Key exists:', !!apiKey)
    console.log('[deployToken] Mint public key:', mintKeypair.publicKey.toBase58())
    
    const deployPayload = {
      action: 'create',
      tokenMetadata: {
        name: name,
        symbol: symbol,
        uri: metadataUri,
      },
      mint: mintSecretKey,
      denominatedInSol: 'true',
      amount: devBuySol.toString(),
      slippage: 10,
      priorityFee: 0.000005,
      pool: 'pump',
    }

    console.log('[deployToken] Deploying with payload...')
    
    const deployResponse = await fetch(`https://pumpportal.fun/api/trade?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
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

    const txSignature = deployData.signature
    
    if (!txSignature) {
      console.warn('[deployToken] No transaction signature in response')
    }

    const mintAddress = mintKeypair.publicKey.toBase58()
    const pumpFunUrl = `https://pump.fun/coin/${mintAddress}`

    console.log('[deployToken] Success! Token at:', pumpFunUrl)
    console.log('[deployToken] Transaction:', `https://solscan.io/tx/${txSignature}`)

    return {
      success: true,
      mintAddress,
      txSignature,
      pumpFunUrl,
      imageUrl: imageUrl,
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
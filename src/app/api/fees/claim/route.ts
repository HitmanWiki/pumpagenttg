// src/app/api/fees/claim/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { claimFees, getPlatformKeypair, solToLamports, connection } from '@/lib/solana'
import { PublicKey } from '@solana/web3.js'

export async function POST(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
      console.log('[Claim] No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const session = await verifySession(token)
    if (!session) {
      console.log('[Claim] Invalid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { destinationWallet } = await req.json()
    
    if (!destinationWallet) {
      return NextResponse.json({ error: 'Destination wallet required' }, { status: 400 })
    }
    
    // Validate destination wallet address
    try {
      new PublicKey(destinationWallet)
    } catch {
      return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 })
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Get all live tokens for this user
    const tokens = await prisma.token.findMany({
      where: {
        userId: user.id,
        status: 'LIVE',
      },
    })
    
    if (tokens.length === 0) {
      return NextResponse.json({ error: 'No active tokens found' }, { status: 400 })
    }
    
    // Calculate total claimable fees
    let totalClaimableLamports = BigInt(0)
    const tokenWallets: { tokenId: string; walletPrivKey: string; amount: bigint }[] = []
    
    for (const token of tokens) {
      try {
        const balance = await connection.getBalance(new PublicKey(token.tokenWalletAddress))
        if (balance > 0) {
          totalClaimableLamports += BigInt(balance)
          tokenWallets.push({
            tokenId: token.id,
            walletPrivKey: token.tokenWalletPrivKey,
            amount: BigInt(balance),
          })
        }
      } catch (error) {
        console.error(`Failed to get balance for token ${token.id}:`, error)
      }
    }
    
    const minClaimLamports = solToLamports(parseFloat(process.env.MIN_CLAIM_SOL || '0.1'))
    
    if (totalClaimableLamports < minClaimLamports) {
      return NextResponse.json({ 
        error: `Minimum claim is ${process.env.MIN_CLAIM_SOL || '0.1'} SOL. You have ${Number(totalClaimableLamports) / 1e9} SOL` 
      }, { status: 400 })
    }
    
    // Process claims for each token
    const platformWallet = getPlatformKeypair()
    const platformFeePct = parseInt(process.env.PLATFORM_FEE_PCT || '10')
    const results = []
    let totalClaimed = BigInt(0)
    
    for (const tokenWallet of tokenWallets) {
      try {
        const result = await claimFees({
          tokenWalletPrivKey: tokenWallet.walletPrivKey,
          destinationWallet,
          platformWallet: platformWallet.publicKey.toBase58(),
          amountLamports: tokenWallet.amount,
          platformFeePct,
        })
        
        if (result.success) {
          totalClaimed += result.netAmountLamports || BigInt(0)
          
          // Update token in database
          await prisma.token.update({
            where: { id: tokenWallet.tokenId },
            data: {
              claimableFeesLamports: BigInt(0),
              totalFeesEarnedLamports: {
                increment: tokenWallet.amount,
              },
            },
          })
          
          // Create claim record
          await prisma.claim.create({
            data: {
              tokenId: tokenWallet.tokenId,
              userId: user.id,
              amountLamports: tokenWallet.amount,
              platformFeeLamports: result.platformFeeLamports || BigInt(0),
              netAmountLamports: result.netAmountLamports || BigInt(0),
              destinationWallet,
              txSignature: result.txSignature,
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          })
          
          results.push({ tokenId: tokenWallet.tokenId, success: true })
        } else {
          results.push({ tokenId: tokenWallet.tokenId, success: false, error: result.error })
        }
      } catch (error) {
        console.error(`Failed to claim for token ${tokenWallet.tokenId}:`, error)
        results.push({ tokenId: tokenWallet.tokenId, success: false, error: String(error) })
      }
    }
    
    const successfulClaims = results.filter(r => r.success).length
    
    return NextResponse.json({
      success: true,
      totalClaimedSol: Number(totalClaimed) / 1e9,
      totalClaimedLamports: Number(totalClaimed),
      successfulClaims,
      failedClaims: results.length - successfulClaims,
      details: results,
    })
  } catch (error: any) {
    console.error('[Claim] Error:', error)
    return NextResponse.json({ error: error.message || 'Claim failed' }, { status: 500 })
  }
}
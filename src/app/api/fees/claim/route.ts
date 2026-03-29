// src/app/api/fees/claim/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { claimFees, getPlatformKeypair, solToLamports } from '@/lib/solana'

const MIN_CLAIM_SOL = parseFloat(process.env.MIN_CLAIM_SOL || '0.1')
const PLATFORM_FEE_PCT = parseInt(process.env.PLATFORM_FEE_PCT || '10')

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { destinationWallet, tokenIds } = await req.json()

  if (!destinationWallet) {
    return NextResponse.json({ error: 'destinationWallet is required' }, { status: 400 })
  }

  // Validate destination wallet format
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(destinationWallet)) {
    return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 })
  }

  // Get tokens to claim from
  const tokens = await prisma.token.findMany({
    where: {
      userId: session.id,
      status: 'LIVE',
      ...(tokenIds?.length ? { id: { in: tokenIds } } : {}),
    }
  })

  if (tokens.length === 0) {
    return NextResponse.json({ error: 'No tokens found' }, { status: 404 })
  }

  const totalClaimableLamports = tokens.reduce(
    (sum, t) => sum + Number(t.claimableFeesLamports), 0
  )

  const minLamports = Number(solToLamports(MIN_CLAIM_SOL))
  if (totalClaimableLamports < minLamports) {
    return NextResponse.json({
      error: `Minimum claim is ${MIN_CLAIM_SOL} SOL. You have ${(totalClaimableLamports / 1e9).toFixed(4)} SOL.`
    }, { status: 400 })
  }

  const platformKeypair = getPlatformKeypair()
  const results = []

  for (const token of tokens) {
    const claimableLamports = Number(token.claimableFeesLamports)
    if (claimableLamports === 0) continue

    // Create pending claim record
    const platformFeeLamports = Math.floor(claimableLamports * PLATFORM_FEE_PCT / 100)
    const netLamports = claimableLamports - platformFeeLamports

    const claim = await prisma.claim.create({
      data: {
        tokenId: token.id,
        userId: session.id,
        amountLamports: BigInt(claimableLamports),
        platformFeeLamports: BigInt(platformFeeLamports),
        netAmountLamports: BigInt(netLamports),
        destinationWallet,
        status: 'PROCESSING',
      }
    })

    // Execute on-chain transfer
    const result = await claimFees({
      tokenWalletPrivKey: token.tokenWalletPrivKey,
      destinationWallet,
      platformWallet: platformKeypair.publicKey.toBase58(),
      amountLamports: BigInt(claimableLamports),
      platformFeePct: PLATFORM_FEE_PCT,
    })

    if (result.success) {
      // Update claim to completed
      await prisma.claim.update({
        where: { id: claim.id },
        data: {
          status: 'COMPLETED',
          txSignature: result.txSignature,
          completedAt: new Date(),
        }
      })

      // Reset claimable balance on token
      await prisma.token.update({
        where: { id: token.id },
        data: { claimableFeesLamports: BigInt(0) }
      })

      results.push({ tokenId: token.id, success: true, txSignature: result.txSignature })
    } else {
      await prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'FAILED' }
      })
      results.push({ tokenId: token.id, success: false, error: result.error })
    }
  }

  return NextResponse.json({ results })
}

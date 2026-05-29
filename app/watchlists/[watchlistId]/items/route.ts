// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const items = await prisma.savedInstrument.findMany({
      where: { watchlistId: params.watchlistId },
      orderBy: { createdAt: 'desc' },
      include: {
        alerts: true,
        snapshots: true,
      },
    })

    return NextResponse.json({ ok: true, watchlistId: params.watchlistId, items })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load items' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()

    const item = await prisma.savedInstrument.create({
      data: {
        watchlistId: params.watchlistId,
        symbol: String(body.symbol ?? '').trim(),
        underlyingSymbol: String(body.underlyingSymbol ?? '').trim(),
        instrumentType: body.instrumentType ?? 'OPTION',
        optionSide: body.optionSide ?? null,
        strike: body.strike ?? null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        dte: body.dte ?? null,
        premiumPaid: body.premiumPaid ?? null,
        currentPremium: body.currentPremium ?? null,
        ivCurrent: body.ivCurrent ?? null,
        ivRank: body.ivRank ?? null,
        ivPercentile: body.ivPercentile ?? null,
        ivMovingAvg: body.ivMovingAvg ?? null,
        delta: body.delta ?? null,
        gamma: body.gamma ?? null,
        vega: body.vega ?? null,
        theta: body.theta ?? null,
        openInterest: body.openInterest ?? null,
        volume: body.volume ?? null,
        bid: body.bid ?? null,
        ask: body.ask ?? null,
        bidAskSpread: body.bidAskSpread ?? null,
        theoreticalPnl: body.theoreticalPnl ?? null,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
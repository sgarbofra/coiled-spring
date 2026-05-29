// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
      select: { id: true },
    })

    if (!watchlist) {
      return NextResponse.json(
        { ok: false, error: 'Watchlist not found' },
        { status: 404 }
      )
    }

    const items = await prisma.savedInstrument.findMany({
      where: { watchlistId: params.watchlistId },
      orderBy: { createdAt: 'desc' },
      include: {
        alerts: true,
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

    const symbol = String(body.symbol ?? '').trim()
    const underlyingSymbol = String(body.underlyingSymbol ?? '').trim()

    if (!symbol || !underlyingSymbol) {
      return NextResponse.json(
        { ok: false, error: 'Missing symbol or underlyingSymbol' },
        { status: 400 }
      )
    }

    const item = await prisma.savedInstrument.create({
      data: {
        watchlistId: params.watchlistId,
        symbol,
        underlyingSymbol,
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
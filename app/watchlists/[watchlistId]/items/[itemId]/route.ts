// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/[itemId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const item = await prisma.watchlistItem.findFirst({
      where: { id: params.itemId, watchlistId: params.watchlistId },
    })

    if (!item) {
      return NextResponse.json(
        { ok: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, item })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const body = await req.json()

    const current = await prisma.watchlistItem.findFirst({
      where: { id: params.itemId, watchlistId: params.watchlistId },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.watchlistItem.update({
      where: { id: params.itemId },
      data: {
        symbol:
          typeof body.symbol === 'string' ? body.symbol.trim() : undefined,
        underlyingSymbol:
          typeof body.underlyingSymbol === 'string'
            ? body.underlyingSymbol.trim()
            : undefined,
        instrumentType:
          typeof body.instrumentType === 'string'
            ? body.instrumentType
            : undefined,
        optionSide: body.optionSide ?? undefined,
        strike: body.strike ?? undefined,
        expirationDate:
          body.expirationDate
            ? new Date(body.expirationDate)
            : body.expirationDate === null
              ? null
              : undefined,
        dte: body.dte ?? undefined,
        premiumPaid: body.premiumPaid ?? undefined,
        currentPremium: body.currentPremium ?? undefined,
        ivCurrent: body.ivCurrent ?? undefined,
        ivRank: body.ivRank ?? undefined,
        ivPercentile: body.ivPercentile ?? undefined,
        ivMovingAvg: body.ivMovingAvg ?? undefined,
        delta: body.delta ?? undefined,
        gamma: body.gamma ?? undefined,
        vega: body.vega ?? undefined,
        theta: body.theta ?? undefined,
        openInterest: body.openInterest ?? undefined,
        volume: body.volume ?? undefined,
        bid: body.bid ?? undefined,
        ask: body.ask ?? undefined,
        bidAskSpread: body.bidAskSpread ?? undefined,
        theoreticalPnl: body.theoreticalPnl ?? undefined,
        notes: body.notes ?? undefined,
      },
    })

    return NextResponse.json({ ok: true, item: updated })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const current = await prisma.watchlistItem.findFirst({
      where: { id: params.itemId, watchlistId: params.watchlistId },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    await prisma.watchlistItem.delete({ where: { id: params.itemId } })

    return NextResponse.json({ ok: true, deleted: params.itemId })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}
// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/bulk-add/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type BulkItemInput = {
  symbol?: string
  underlyingSymbol?: string
  instrumentType?: string
  optionSide?: string | null
  strike?: number | null
  expirationDate?: string | null
  dte?: number | null
  premiumPaid?: number | null
  currentPremium?: number | null
  ivCurrent?: number | null
  ivRank?: number | null
  ivPercentile?: number | null
  ivMovingAvg?: number | null
  delta?: number | null
  gamma?: number | null
  vega?: number | null
  theta?: number | null
  openInterest?: number | null
  volume?: number | null
  bid?: number | null
  ask?: number | null
  bidAskSpread?: number | null
  theoreticalPnl?: number | null
  notes?: string | null
}

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No items provided' },
        { status: 400 }
      )
    }

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

    const data = items
      .map((raw: BulkItemInput) => {
        const symbol = String(raw.symbol ?? '').trim()
        const underlyingSymbol = String(raw.underlyingSymbol ?? '').trim()

        if (!symbol || !underlyingSymbol) return null

        return {
          watchlistId: params.watchlistId,
          symbol,
          underlyingSymbol,
          instrumentType: raw.instrumentType ?? 'OPTION',
          optionSide: raw.optionSide ?? null,
          strike: raw.strike ?? null,
          expirationDate: raw.expirationDate ? new Date(raw.expirationDate) : null,
          dte: raw.dte ?? null,
          premiumPaid: raw.premiumPaid ?? null,
          currentPremium: raw.currentPremium ?? null,
          ivCurrent: raw.ivCurrent ?? null,
          ivRank: raw.ivRank ?? null,
          ivPercentile: raw.ivPercentile ?? null,
          ivMovingAvg: raw.ivMovingAvg ?? null,
          delta: raw.delta ?? null,
          gamma: raw.gamma ?? null,
          vega: raw.vega ?? null,
          theta: raw.theta ?? null,
          openInterest: raw.openInterest ?? null,
          volume: raw.volume ?? null,
          bid: raw.bid ?? null,
          ask: raw.ask ?? null,
          bidAskSpread: raw.bidAskSpread ?? null,
          theoreticalPnl: raw.theoreticalPnl ?? null,
          notes: raw.notes ?? null,
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>

    if (data.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No valid items to insert' },
        { status: 400 }
      )
    }

    const result = await prisma.savedInstrument.createMany({
      data,
      skipDuplicates: true,
    })

    return NextResponse.json({
      ok: true,
      created: result.count,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to bulk add items' },
      { status: 500 }
    )
  }
}
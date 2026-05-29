// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/move/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()
    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id) => typeof id === 'string')
      : []
    const targetWatchlistId =
      typeof body.targetWatchlistId === 'string' ? body.targetWatchlistId.trim() : ''

    if (itemIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Missing itemIds' },
        { status: 400 }
      )
    }

    if (!targetWatchlistId) {
      return NextResponse.json(
        { ok: false, error: 'Missing targetWatchlistId' },
        { status: 400 }
      )
    }

    const sourceWatchlist = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
      select: { id: true },
    })

    if (!sourceWatchlist) {
      return NextResponse.json(
        { ok: false, error: 'Source watchlist not found' },
        { status: 404 }
      )
    }

    const targetWatchlist = await prisma.watchlist.findUnique({
      where: { id: targetWatchlistId },
      select: { id: true },
    })

    if (!targetWatchlist) {
      return NextResponse.json(
        { ok: false, error: 'Target watchlist not found' },
        { status: 404 }
      )
    }

    const result = await prisma.savedInstrument.updateMany({
      where: {
        id: { in: itemIds },
        watchlistId: params.watchlistId,
      },
      data: {
        watchlistId: targetWatchlistId,
      },
    })

    return NextResponse.json({
      ok: true,
      moved: result.count,
      targetWatchlistId,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to move items' },
      { status: 500 }
    )
  }
}
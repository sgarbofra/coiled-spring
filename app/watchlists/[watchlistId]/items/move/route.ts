// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/move/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()
    const itemIds: string[] = Array.isArray(body.itemIds)
      ? body.itemIds.filter((id): id is string => typeof id === 'string')
      : []
    const toWatchlistId =
      typeof body.toWatchlistId === 'string' ? body.toWatchlistId : ''

    if (itemIds.length === 0 || !toWatchlistId) {
      return NextResponse.json(
        { ok: false, error: 'itemIds and toWatchlistId are required' },
        { status: 400 }
      )
    }

    if (toWatchlistId === params.watchlistId) {
      return NextResponse.json(
        { ok: false, error: 'Target watchlist must be different' },
        { status: 400 }
      )
    }

    const target = await prisma.watchlist.findUnique({
      where: { id: toWatchlistId },
    })

    if (!target) {
      return NextResponse.json(
        { ok: false, error: 'Target watchlist not found' },
        { status: 404 }
      )
    }

    const items = await prisma.watchlistItem.findMany({
      where: {
        watchlistId: params.watchlistId,
        id: { in: itemIds },
      },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No items found to move' },
        { status: 404 }
      )
    }

    const result = await prisma.watchlistItem.updateMany({
      where: {
        watchlistId: params.watchlistId,
        id: { in: itemIds },
      },
      data: {
        watchlistId: toWatchlistId,
      },
    })

    return NextResponse.json({
      ok: true,
      movedCount: result.count,
      toWatchlistId,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to move items' },
      { status: 500 }
    )
  }
}
// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/bulk-delete/route.ts
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

    if (itemIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Missing itemIds' },
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

    const result = await prisma.savedInstrument.deleteMany({
      where: {
        id: { in: itemIds },
        watchlistId: params.watchlistId,
      },
    })

    return NextResponse.json({
      ok: true,
      deleted: result.count,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to remove items' },
      { status: 500 }
    )
  }
}
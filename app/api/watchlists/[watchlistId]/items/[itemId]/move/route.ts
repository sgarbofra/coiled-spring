// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/[itemId]/move/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const body = await req.json()
    const targetWatchlistId = typeof body.targetWatchlistId === 'string' ? body.targetWatchlistId.trim() : ''

    if (!targetWatchlistId) {
      return NextResponse.json({ ok: false, error: 'Missing targetWatchlistId' }, { status: 400 })
    }

    // verify source item exists and belongs to source watchlist
    const item = await prisma.savedInstrument.findFirst({
      where: { id: params.itemId, watchlistId: params.watchlistId },
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json({ ok: false, error: 'Item not found in source watchlist' }, { status: 404 })
    }

    // verify target watchlist exists
    const target = await prisma.watchlist.findUnique({
      where: { id: targetWatchlistId },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json({ ok: false, error: 'Target watchlist not found' }, { status: 404 })
    }

    // perform the move: update the watchlistId on the savedInstrument
    const updated = await prisma.savedInstrument.update({
      where: { id: params.itemId },
      data: { watchlistId: targetWatchlistId },
    })

    return NextResponse.json({ ok: true, item: updated })
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to move item' }, { status: 500 })
  }
}
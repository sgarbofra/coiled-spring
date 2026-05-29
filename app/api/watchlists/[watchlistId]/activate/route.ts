// coiled-spring-backend2/app/api/watchlists/[watchlistId]/activate/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const current = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
      select: { id: true, userId: true },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Watchlist not found' },
        { status: 404 }
      )
    }

    await prisma.$transaction([
      prisma.watchlist.updateMany({
        where: {
          userId: current.userId,
          isActive: true,
          id: { not: params.watchlistId },
        },
        data: { isActive: false },
      }),
      prisma.watchlist.update({
        where: { id: params.watchlistId },
        data: { isActive: true },
      }),
    ])

    const updated = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
    })

    return NextResponse.json({ ok: true, watchlist: updated })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to activate watchlist' },
      { status: 500 }
    )
  }
}
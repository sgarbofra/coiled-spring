// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/[itemId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const item = await prisma.savedInstrument.findFirst({
      where: {
        id: params.itemId,
        watchlistId: params.watchlistId,
      },
      include: {
        alerts: true,
      },
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
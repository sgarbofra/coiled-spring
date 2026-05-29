// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/bulk-remove/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string')
      : []

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'ids is required' },
        { status: 400 }
      )
    }

    const result = await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId: params.watchlistId,
        id: { in: ids },
      },
    })

    return NextResponse.json({ ok: true, deletedCount: result.count })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to bulk remove items' },
      { status: 500 }
    )
  }
}
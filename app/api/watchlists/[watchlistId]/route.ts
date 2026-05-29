// coiled-spring-backend2/app/api/watchlists/[watchlistId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined

    const current = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
      select: { id: true, userId: true, isActive: true },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Watchlist not found' },
        { status: 404 }
      )
    }

    if (isActive === true) {
      await prisma.watchlist.updateMany({
        where: {
          userId: current.userId,
          isActive: true,
          id: { not: params.watchlistId },
        },
        data: { isActive: false },
      })
    }

    const updated = await prisma.watchlist.update({
      where: { id: params.watchlistId },
      data: {
        ...(name ? { name } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })

    return NextResponse.json({ ok: true, watchlist: updated })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to update watchlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { watchlistId: string } }
) {
  try {
    const current = await prisma.watchlist.findUnique({
      where: { id: params.watchlistId },
      select: { id: true },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Watchlist not found' },
        { status: 404 }
      )
    }

    await prisma.watchlist.delete({
      where: { id: params.watchlistId },
    })

    return NextResponse.json({ ok: true, deleted: params.watchlistId })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to delete watchlist' },
      { status: 500 }
    )
  }
}
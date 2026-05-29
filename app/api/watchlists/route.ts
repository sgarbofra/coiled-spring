// coiled-spring-backend2/app/api/watchlists/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const watchlists = await prisma.watchlist.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ ok: true, watchlists })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load watchlists' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const userId = String(body.userId ?? '').trim()

    if (!name || !userId) {
      return NextResponse.json(
        { ok: false, error: 'Missing name or userId' },
        { status: 400 }
      )
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId,
        name,
        isActive: false,
      },
    })

    return NextResponse.json({ ok: true, watchlist }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create watchlist' },
      { status: 500 }
    )
  }
}
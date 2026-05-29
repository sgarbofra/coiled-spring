// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/[itemId]/alerts/route.ts
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
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json(
        { ok: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const alerts = await prisma.alert.findMany({
      where: { savedInstrumentId: params.itemId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, alerts })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to load alerts' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string; itemId: string } }
) {
  try {
    const item = await prisma.savedInstrument.findFirst({
      where: {
        id: params.itemId,
        watchlistId: params.watchlistId,
      },
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json(
        { ok: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const alertType = String(body.alertType ?? '').trim()
    const field = String(body.field ?? '').trim()
    const operator = String(body.operator ?? '').trim()
    const value = body.value

    if (!alertType || !field || !operator) {
      return NextResponse.json(
        { ok: false, error: 'Missing alertType, field or operator' },
        { status: 400 }
      )
    }

    const alert = await prisma.alert.create({
      data: {
        savedInstrumentId: params.itemId,
        alertType,
        field,
        operator,
        value: value ?? null,
        isEnabled: true,
      },
    })

    return NextResponse.json({ ok: true, alert }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}
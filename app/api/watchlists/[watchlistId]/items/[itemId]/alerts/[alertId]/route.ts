// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/[itemId]/alerts/[alertId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { watchlistId: string; itemId: string; alertId: string } }
) {
  try {
    const body = await req.json()
    const isEnabled =
      typeof body.isEnabled === 'boolean' ? body.isEnabled : undefined

    const current = await prisma.alert.findFirst({
      where: {
        id: params.alertId,
        savedInstrumentId: params.itemId,
      },
      select: { id: true },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Alert not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.alert.update({
      where: { id: params.alertId },
      data: {
        ...(typeof isEnabled === 'boolean' ? { isEnabled } : {}),
      },
    })

    return NextResponse.json({ ok: true, alert: updated })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { watchlistId: string; itemId: string; alertId: string } }
) {
  try {
    const current = await prisma.alert.findFirst({
      where: {
        id: params.alertId,
        savedInstrumentId: params.itemId,
      },
      select: { id: true },
    })

    if (!current) {
      return NextResponse.json(
        { ok: false, error: 'Alert not found' },
        { status: 404 }
      )
    }

    await prisma.alert.delete({
      where: { id: params.alertId },
    })

    return NextResponse.json({ ok: true, deleted: params.alertId })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to delete alert' },
      { status: 500 }
    )
  }
}
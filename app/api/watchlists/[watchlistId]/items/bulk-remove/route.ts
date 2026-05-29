// coiled-spring-backend2/app/api/watchlists/[watchlistId]/items/bulk-remove/route.ts
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { watchlistId: string } }
) {
  const body = await req.json()

  return NextResponse.json({
    ok: true,
    watchlistId: params.watchlistId,
    removed: body.ids ?? [],
  })
}
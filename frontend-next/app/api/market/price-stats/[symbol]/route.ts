import { pythonFetch } from '@/lib/python-api'

export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  try {
    const res = await pythonFetch(`/api/market/price-stats/${symbol}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: 'Backend unreachable' }, { status: 503 })
  }
}

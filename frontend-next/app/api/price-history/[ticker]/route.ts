import { pythonFetch } from '@/lib/python-api'

export async function GET(req: Request, { params }: { params: { ticker: string } }) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '1y'
  try {
    const res = await pythonFetch(`/api/market/price-history/${params.ticker}?period=${period}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    return Response.json({ error: 'Backend unreachable' }, { status: 503 })
  }
}

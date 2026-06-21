import { pythonFetch } from '@/lib/python-api'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const res = await pythonFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: 60000, // 60 seconds for AI chat with web search
    })
    // Stream the SSE response directly to the client
    return new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch {
    return new Response('data: {"type":"text","text":"Errore di connessione al server."}\n\ndata: [DONE]\n\n', {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  }
}

import { cookies } from 'next/headers'

const PYTHON_BASE = process.env.PYTHON_API_URL ?? 'http://localhost:8001'

export async function pythonFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get('cs_token')?.value

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const timeoutMs = options.timeoutMs ?? 30000 // Default 30s, customizable
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${PYTHON_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    return response
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Backend timeout: ${path} non ha risposto entro ${timeoutMs / 1000} secondi`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

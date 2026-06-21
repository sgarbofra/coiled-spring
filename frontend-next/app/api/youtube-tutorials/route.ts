import { NextResponse } from 'next/server'

type YouTubeVideo = {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID

  console.log('[YouTube API] Environment check:')
  console.log('[YouTube API] YOUTUBE_API_KEY:', apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}` : 'NOT SET')
  console.log('[YouTube API] YOUTUBE_PLAYLIST_ID:', playlistId || 'NOT SET')

  if (!apiKey || !playlistId) {
    console.error('[YouTube API] Missing credentials - apiKey:', !!apiKey, 'playlistId:', !!playlistId)
    return NextResponse.json({ ok: false, videos: [] })
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('playlistId', playlistId)
    url.searchParams.set('maxResults', '6')
    url.searchParams.set('key', apiKey)

    console.log('[YouTube API] Fetching URL:', url.toString())

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[YouTube API Error] Status:', response.status, response.statusText)
      console.error('[YouTube API Error] Response body:', errorBody)
      try {
        const errorJson = JSON.parse(errorBody)
        console.error('[YouTube API Error] Parsed error:', JSON.stringify(errorJson, null, 2))
      } catch {
        // Body wasn't JSON, already logged as text
      }
      return NextResponse.json({ ok: false, videos: [] })
    }

    const data = await response.json()
    console.log('[YouTube API] Success - received', data.items?.length || 0, 'videos')

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ ok: false, videos: [] })
    }

    const videos: YouTubeVideo[] = data.items
      .filter((item: any) => item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
      .map((item: any) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? '',
        publishedAt: item.snippet.publishedAt,
      }))

    return NextResponse.json({
      ok: true,
      videos,
    })
  } catch (error: unknown) {
    console.error('[YouTube API Network Error] Caught exception:')
    console.error('[YouTube API Network Error] Type:', error?.constructor?.name)
    console.error('[YouTube API Network Error] Message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('[YouTube API Network Error] Stack trace:', error.stack)
    }
    console.error('[YouTube API Network Error] Full error object:', error)
    return NextResponse.json({ ok: false, videos: [] })
  }
}

import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TraeExaminationApp',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: resp.status })
    }
    const contentType = resp.headers.get('content-type') || 'application/octet-stream'
    const blob = await resp.blob()
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    console.error('[API/ImageProxy] Error:', e)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

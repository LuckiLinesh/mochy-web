export default async function handler(req: any, res: any) {
  const q = String(req.query?.q || '')
  if (!q) { res.status(400).json({ error: 'missing q' }); return }
  try {
    const r = await fetch('https://music.youtube.com/youtubei/v1/search?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
      },
      body: JSON.stringify({
        query: q,
        params: 'EgIQAQ%3D%3D', // songs filter
        context: {
          client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' }
        }
      })
    })
    const data: any = await r.json()
    // parse search results
    const songs: any[] = []
    const sections = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? []
    for (const sec of sections) {
      const shelf = sec.musicShelfRenderer
      if (!shelf) continue
      for (const item of shelf.contents ?? []) {
        const renderer = item.musicResponsiveListItemRenderer
        if (!renderer) continue
        const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
        const artists = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
        const videoId = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId
          ?? renderer.navigationEndpoint?.watchEndpoint?.videoId
        const thumb = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url
        const duration = renderer.flexColumns?.[3]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
        if (title && videoId) {
          songs.push({ id: videoId, title, artists: [{ name: artists || 'Unknown' }], duration: parseDur(duration || '0:00'), thumbnail: thumb || '' })
        }
      }
    }
    res.json({ songs, videos: [], albums: [], artists: [], playlists: [] })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'search failed' })
  }
}

function parseDur(s: string): number {
  const parts = s.trim().split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  let t = 0; for (const p of parts) t = t * 60 + p; return t
}

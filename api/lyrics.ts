export default async function handler(req: any, res: any) {
  const artist = String(req.query?.artist || '')
  const title = String(req.query?.title || '')
  const duration = Number(req.query?.duration || 0)
  const album = String(req.query?.album || '')
  try {
    const params = new URLSearchParams({ artist_name: artist, track_name: title, duration: String(Math.round(duration)) })
    if (album) params.set('album_name', album)
    const r = await fetch('https://lrclib.net/api/get?' + params.toString(), { headers: { 'User-Agent': 'Mochy-Web/1.0' } })
    if (r.ok) {
      const d: any = await r.json()
      return res.json({ synced: d.syncedLyrics ?? '', plain: d.plainLyrics ?? '', instrumental: !!d.instrumental, source: 'LRCLIB' })
    }
    const r2 = await fetch('https://lrclib.net/api/search?' + new URLSearchParams({ q: `${artist} ${title}` }), { headers: { 'User-Agent': 'Mochy-Web/1.0' } })
    if (r2.ok) {
      const arr: any[] = await r2.json()
      const best = arr.find((x) => x.syncedLyrics) ?? arr[0]
      if (best) return res.json({ synced: best.syncedLyrics ?? '', plain: best.plainLyrics ?? '', instrumental: !!best.instrumental, source: 'LRCLIB' })
    }
    res.json({ synced: '', plain: '', instrumental: false, source: 'none' })
  } catch (e: any) {
    res.status(500).json({ error: e?.message })
  }
}

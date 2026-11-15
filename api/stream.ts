const PIPED_INSTANCES = [
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.kavin.rocks',
]

async function tryFetch(path: string): Promise<any> {
  for (const base of PIPED_INSTANCES) {
    try {
      const r = await fetch(base + path, { headers: { 'User-Agent': 'Mochy-Web/1.0' } })
      if (r.ok) return await r.json()
    } catch {}
  }
  throw new Error('All Piped instances failed')
}

export default async function handler(req: any, res: any) {
  const id = String(req.query?.id || '')
  if (!id) { res.status(400).json({ error: 'missing id' }); return }
  try {
    const data = await tryFetch(`/streams/${id}`)
    const audio = data.audioStreams ?? []
    const m4a = audio.filter((a: any) => a.mimeType?.includes('mp4') || a.codec?.includes('mp4a'))
    const best = (m4a.length ? m4a : audio).sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0]
    if (!best?.url) { res.status(404).json({ error: 'no stream' }); return }
    // redirect to the stream URL
    res.redirect(302, best.url)
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'stream failed' })
  }
}

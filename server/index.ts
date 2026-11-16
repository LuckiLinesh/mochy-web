import express from 'express'
import cors from 'cors'
import { Innertube, UniversalCache, Log } from 'youtubei.js'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, execSync } from 'node:child_process'

Log.setLevel(Log.Level.NONE)

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3000
const CACHE_DIR = path.join(process.cwd(), 'cache', 'audio')
const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads')
fs.mkdirSync(CACHE_DIR, { recursive: true })
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

// yt-dlp path
function ytdlpPath() {
  // Docker/Linux
  if (fs.existsSync('/usr/local/bin/yt-dlp')) return '/usr/local/bin/yt-dlp'
  if (fs.existsSync('/usr/bin/yt-dlp')) return '/usr/bin/yt-dlp'
  // Windows local
  const bundled = path.join(process.cwd(), 'bin', 'yt-dlp.exe')
  if (fs.existsSync(bundled)) return bundled
  return 'yt-dlp'
}

let yt: any = null
async function getYT() {
  if (yt) return yt
  yt = await Innertube.create({ cache: new UniversalCache(false), generate_session_locally: true })
  return yt
}

function txt(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v.text === 'string') return v.text
  if (v.runs) return v.runs.map((r: any) => r.text ?? '').join('')
  return ''
}
function parseDur(s: string): number {
  const parts = s.trim().split(':').map(Number)
  if (parts.some((n) => Number.isNaN(n))) return 0
  let t = 0; for (const p of parts) t = t * 60 + p; return t
}
function pickThumb(list: any): string {
  const arr = Array.isArray(list) ? list : list ? [list] : []
  const valid = arr.filter((t: any) => t?.url)
  if (!valid.length) return ''
  const sorted = [...valid].sort((a: any, b: any) => (a.width ?? 0) - (b.width ?? 0))
  let chosen = sorted[0]
  for (const t of sorted) { if ((t.width ?? 0) >= 200) { chosen = t; break } }
  return chosen?.url ?? ''
}
function shelfItems(node: any): any[] {
  if (!node) return []
  if (Array.isArray(node)) return node
  return node.contents ?? node.items ?? []
}
function mapTrack(item: any) {
  if (!item) return null
  const id = item.id ?? item.video_id ?? item.endpoint?.payload?.videoId
  if (!id) return null
  let title = txt(item.title) || txt(item.name)
  const artists: { name: string; id?: string }[] = []
  if (Array.isArray(item.artists)) for (const a of item.artists) if (a?.name) artists.push({ name: a.name, id: a.channel_id })
  const cols = item.flex_columns ?? []
  if (!title && cols[0]) title = txt(cols[0].title)
  if (!artists.length && cols[1]) { const t = txt(cols[1].title); if (t) artists.push({ name: t }) }
  let album: any
  if (item.album?.name) album = { name: item.album.name, id: item.album.id }
  let duration = item.duration?.seconds ?? 0
  if (!duration) { const dtxt = txt(item.duration) || (cols[3] ? txt(cols[3].title) : ''); duration = parseDur(dtxt) }
  const thumbs = item.thumbnails ?? item.thumbnail ?? []
  return { id, title: title || 'Unknown', artists: artists.length ? artists : [{ name: 'Unknown' }], album, duration, thumbnail: pickThumb(thumbs) }
}

// Search
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '')
    const y = await getYT()
    const [songRes, albumRes, artistRes, playlistRes] = await Promise.all([
      y.music.search(q, { type: 'song' }).catch(() => null),
      y.music.search(q, { type: 'album' }).catch(() => null),
      y.music.search(q, { type: 'artist' }).catch(() => null),
      y.music.search(q, { type: 'playlist' }).catch(() => null),
    ])
    const songs = shelfItems(songRes?.songs).map(mapTrack).filter(Boolean)
    const videos = shelfItems(songRes?.videos).map(mapTrack).filter(Boolean)
    const albums = shelfItems(albumRes?.albums).map((it: any) => ({ id: it.id ?? it.endpoint?.payload?.browseId, title: txt(it.title), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails), subtitle: txt(it.subtitle), kind: 'album' })).filter((x: any) => x.id)
    const artists = shelfItems(artistRes?.artists).map((it: any) => ({ id: it.id ?? it.endpoint?.payload?.browseId, title: txt(it.title), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails), subtitle: txt(it.subtitle), kind: 'artist' })).filter((x: any) => x.id)
    const playlists = shelfItems(playlistRes?.playlists).map((it: any) => ({ id: it.id ?? it.endpoint?.payload?.browseId, title: txt(it.title), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails), subtitle: txt(it.subtitle), kind: 'playlist' })).filter((x: any) => x.id)
    res.json({ songs, videos, albums, artists, playlists })
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Suggestions
app.get('/api/suggest', async (req, res) => {
  try {
    const y = await getYT()
    const r = await y.music.getSearchSuggestions(String(req.query.q || ''))
    const out: string[] = []
    for (const sec of r) for (const it of sec.contents ?? []) { const s = txt(it.suggestion); if (s) out.push(s) }
    res.json([...new Set(out)].slice(0, 8))
  } catch { res.json([]) }
})

// Home
app.get('/api/home', async (_req, res) => {
  try {
    const y = await getYT()
    const page = await y.music.getHomeFeed()
    const sections = page.sections ?? page.contents ?? []
    const out: any[] = []
    for (const sec of sections) {
      const title = txt(sec.header?.title) || txt(sec.title) || 'For you'
      const items = shelfItems(sec.contents).map((it: any) => {
        if (it.type === 'MusicResponsiveListItem' || it.video_id) return mapTrack(it)
        const c: any = { id: it.id ?? it.endpoint?.payload?.browseId, title: txt(it.title), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails), subtitle: txt(it.subtitle), kind: 'album' }
        return c.id ? c : null
      }).filter(Boolean)
      if (items.length) out.push({ title, items, kind: items[0]?.duration != null && items[0]?.artists ? 'tracks' : 'collections' })
    }
    res.json(out)
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Album
app.get('/api/album/:id', async (req, res) => {
  try {
    const y = await getYT()
    const page = await y.music.getAlbum(req.params.id)
    const header = page.header ?? page
    const title = txt(header.title) || txt(page.title) || 'Album'
    const thumbnail = pickThumb(header.thumbnail ?? header.thumbnails ?? page.thumbnail ?? page.thumbnails)
    const artist = txt(header.subtitle) || txt(header.second_subtitle)
    const tracks = shelfItems(page.contents).map(mapTrack).filter(Boolean)
    res.json({ id: req.params.id, title, thumbnail, artist, tracks })
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Artist
app.get('/api/artist/:id', async (req, res) => {
  try {
    const y = await getYT()
    const page = await y.music.getArtist(req.params.id)
    const header = page.header ?? page
    const name = txt(header.title) || txt(page.title) || 'Artist'
    const thumbnail = pickThumb(header.thumbnail ?? header.thumbnails ?? page.thumbnail ?? page.thumbnails)
    const sections = page.sections ?? page.contents ?? []
    let topSongs: any[] = []
    const albums: any[] = []
    for (const sec of sections) {
      const items = shelfItems(sec.contents ?? sec)
      if (!items.length) continue
      const first = items[0]
      if (first?.type === 'MusicResponsiveListItem' || first?.video_id) {
        if (!topSongs.length) topSongs = items.map(mapTrack).filter(Boolean)
      } else {
        for (const it of items) {
          const c = { id: it.id ?? it.endpoint?.payload?.browseId, title: txt(it.title), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails), subtitle: txt(it.subtitle), kind: 'album' }
          if (c.id) albums.push(c)
        }
      }
    }
    if (!topSongs.length) {
      const s = await (async () => { const r = await y.music.search(name); return shelfItems(r.songs).map(mapTrack).filter(Boolean) })()
      topSongs = s.slice(0, 15)
    }
    res.json({ id: req.params.id, name, thumbnail, topSongs, albums })
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Playlist
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const y = await getYT()
    const page = await y.music.getPlaylist(req.params.id)
    const header = page.header ?? page
    const title = txt(header.title) || txt(page.title) || 'Playlist'
    const thumbnail = pickThumb(header.thumbnail ?? header.thumbnails ?? page.thumbnail ?? page.thumbnails)
    const author = txt(header.subtitle) || txt(header.second_subtitle) || undefined
    const items = shelfItems(page.items ?? page.contents)
    const tracks = items.map(mapTrack).filter(Boolean)
    res.json({ id: req.params.id, title, thumbnail, author, tracks })
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Up next
app.get('/api/upnext/:id', async (req, res) => {
  try {
    const y = await getYT()
    const page = await y.music.getUpNext(req.params.id)
    const items = page.contents ?? page.items ?? []
    const tracks = items.map((it: any) => {
      if (it.video_id) {
        return { id: it.video_id, title: txt(it.title), artists: it.artists?.map((a: any) => ({ name: a.name })) ?? [{ name: it.author?.name ?? 'Unknown' }], duration: parseDur(txt(it.duration)), thumbnail: pickThumb(it.thumbnail ?? it.thumbnails) }
      }
      return mapTrack(it)
    }).filter(Boolean)
    res.json(tracks)
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Lyrics
app.get('/api/lyrics', async (req, res) => {
  try {
    const artist = String(req.query.artist || '')
    const title = String(req.query.title || '')
    const duration = Number(req.query.duration || 0)
    const album = String(req.query.album || '')
    const params = new URLSearchParams({ artist_name: artist, track_name: title, duration: String(Math.round(duration)) })
    if (album) params.set('album_name', album)
    const r = await fetch('https://lrclib.net/api/get?' + params.toString(), { headers: { 'User-Agent': 'mochy-web/0.1' } })
    if (r.ok) {
      const d: any = await r.json()
      return res.json({ synced: d.syncedLyrics ?? '', plain: d.plainLyrics ?? '', instrumental: !!d.instrumental, source: 'LRCLIB' })
    }
    // search fallback
    const r2 = await fetch('https://lrclib.net/api/search?' + new URLSearchParams({ q: `${artist} ${title}` }), { headers: { 'User-Agent': 'mochy-web/0.1' } })
    if (r2.ok) {
      const arr: any[] = await r2.json()
      const best = arr.find((x) => x.syncedLyrics) ?? arr[0]
      if (best) return res.json({ synced: best.syncedLyrics ?? '', plain: best.plainLyrics ?? '', instrumental: !!best.instrumental, source: 'LRCLIB' })
    }
    res.json({ synced: '', plain: '', instrumental: false, source: 'none' })
  } catch (e: any) { res.status(500).json({ error: e?.message }) }
})

// Audio: ensure download + serve with range
const entries = new Map<string, { file: string; done: boolean; error?: string; proc?: any; total: number }>()
function findFile(id: string) {
  try { const f = fs.readdirSync(CACHE_DIR).find((x) => x.startsWith(id + '.')); return f ? path.join(CACHE_DIR, f) : null } catch { return null }
}
function ensure(id: string) {
  let e = entries.get(id)
  if (e) return e
  // Validate cached file - if too small, delete and re-download
  let cached = findFile(id)
  if (cached) {
    try { const st = fs.statSync(cached); if (st.size < 50000) { fs.unlinkSync(cached); cached = null } } catch { cached = null }
  }
  e = { file: cached ?? path.join(CACHE_DIR, id + '.m4a'), done: !!cached, total: 0, error: undefined }
  if (cached) { try { e.total = fs.statSync(cached).size } catch {} }
  entries.set(id, e)
  if (cached) return e
  const proc = spawn(ytdlpPath(), ['--no-playlist', '--no-warnings', '--newline', '--force-ipv4', '-f', 'bestaudio[ext=m4a]/bestaudio', '-o', path.join(CACHE_DIR, '%(id)s.%(ext)s'), `https://music.youtube.com/watch?v=${id}`], { windowsHide: true })
  e.proc = proc
  let buf = ''
  proc.stdout.on('data', (d: Buffer) => {
    buf += d.toString()
    const lines = buf.split(/\r?\n/); buf = lines.pop() ?? ''
    for (const line of lines) { const m = line.match(/(\d+\.?\d*)%/); if (m) e!.total = e!.total } // progress not parsed for total
  })
  proc.on('close', (code: number) => {
    const f = findFile(id)
    if (f) { e!.file = f; e!.done = true; try { e!.total = fs.statSync(f).size } catch {} }
    else e!.error = `yt-dlp exited ${code}`
  })
  return e
}

app.get('/audio/:id', async (req, res) => {
  const id = req.params.id
  const e = ensure(id)
  const waitStart = Date.now()
  while (!e.done && !e.error && Date.now() - waitStart < 30000) {
    try { const st = fs.statSync(e.file); if (st.size >= 256 * 1024) break } catch {}
    await new Promise((r) => setTimeout(r, 120))
  }
  let stat: fs.Stats
  try { stat = fs.statSync(e.file) } catch { res.status(404).end(); return }
  const total = e.done ? stat.size : (e.total || stat.size)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/)
    if (m) {
      const start = parseInt(m[1], 10)
      let end = m[2] ? parseInt(m[2], 10) : total - 1
      if (!e.done) {
        const ws = Date.now()
        while (true) {
          try { const st2 = fs.statSync(e.file); if (st2.size >= end + 1) break } catch {}
          if (e.done || e.error || Date.now() - ws > 30000) break
          await new Promise((r) => setTimeout(r, 120))
        }
      }
      let st2: fs.Stats
      try { st2 = fs.statSync(e.file) } catch { res.status(404).end(); return }
      const ae = Math.min(end, st2.size - 1, total - 1)
      if (start > ae) { res.status(416).end(); return }
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${ae}/${total}`, 'Content-Length': ae - start + 1, 'Content-Type': 'audio/mp4', 'Accept-Ranges': 'bytes' })
      fs.createReadStream(e.file, { start, end: ae }).pipe(res)
      return
    }
  }
  res.writeHead(200, { 'Content-Type': 'audio/mp4', 'Accept-Ranges': 'bytes', ...(e.done ? { 'Content-Length': String(total) } : {}) })
  let pos = 0
  const pump = () => {
    if (res.destroyed) return
    let size = 0
    try { size = fs.statSync(e.file).size } catch {}
    if (pos < size) {
      const stream = fs.createReadStream(e.file, { start: pos, end: size - 1 })
      pos = size
      stream.pipe(res, { end: false })
      stream.on('end', () => { if (e.done && pos >= (e.total || size)) res.end(); else setTimeout(pump, 120) })
      stream.on('error', () => res.end())
    } else {
      if (e.done) res.end(); else setTimeout(pump, 120)
    }
  }
  pump()
})

// Download
app.get('/api/download/:id', async (req, res) => {
  const id = req.params.id
  const e = ensure(id)
  const waitStart = Date.now()
  while (!e.done && !e.error && Date.now() - waitStart < 120000) await new Promise((r) => setTimeout(r, 200))
  if (e.error) { res.status(500).json({ error: e.error }); return }
  const safe = id + '.m4a'
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  res.setHeader('Content-Type', 'audio/mp4')
  fs.createReadStream(e.file).pipe(res)
})

// Download (with Content-Disposition for browser download)
app.get('/download/:id', async (req, res) => {
  const id = req.params.id
  const e = ensure(id)
  const waitStart = Date.now()
  while (!e.done && !e.error && Date.now() - waitStart < 120000) await new Promise((r) => setTimeout(r, 200))
  if (e.error) { res.status(500).json({ error: e.error }); return }
  const safe = id + '.m4a'
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  res.setHeader('Content-Type', 'audio/mp4')
  fs.createReadStream(e.file).pipe(res)
})

// Debug: try downloading a video
app.get('/api/debug-download/:id', async (req, res) => {
  const id = req.params.id
  const { spawn } = require('node:child_process')
  const proc = spawn('yt-dlp', ['--no-playlist', '--no-warnings', '--newline', '--force-ipv4', '-f', 'bestaudio[ext=m4a]/bestaudio', '-o', path.join(CACHE_DIR, '%(id)s.%(ext)s'), `https://music.youtube.com/watch?v=${id}`], { windowsHide: true })
  let stdout = '', stderr = ''
  proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
  proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
  proc.on('close', (code: number) => {
    const files = fs.readdirSync(CACHE_DIR).filter((f: string) => f.startsWith(id))
    res.json({ code, files, stdout: stdout.slice(-500), stderr: stderr.slice(-500) })
  })
})
  try {
    const version = execSync('yt-dlp --version', { timeout: 10000 }).toString().trim()
    res.json({ ok: true, ytdlp: version, platform: process.platform })
  } catch (e: any) {
    res.json({ ok: false, error: e?.message, platform: process.platform })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mochy Web running at http://localhost:${PORT}`)
  console.log(`On your phone: http://<your-pc-ip>:${PORT}`)
})

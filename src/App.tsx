import { useState } from 'react'

const API = '' // search uses Vercel (relative)
const STREAM_API = 'https://mochy-web-vvbp.onrender.com' // audio streaming uses Render backend

type Track = { id: string; title: string; artists: { name: string }[]; duration: number; thumbnail: string }

export default function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState<Track | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      setResults(d.songs ?? [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }

  const play = (t: Track) => {
    setCurrent(t)
    // Try Vercel stream first, fall back to local PC backend
    const a = new Audio(`${STREAM_API}/audio/${t.id}`)
    a.onerror = () => {
      // Fallback to local backend
      const a2 = new Audio(`http://192.168.100.181:3000/audio/${t.id}`)
      if (audio) audio.pause()
      a2.play().catch(() => {})
      setAudio(a2)
    }
    if (audio) { audio.pause() }
    a.play().catch(() => {})
    setAudio(a)
    setPlaying(true)
    a.onended = () => setPlaying(false)
  }

  const toggle = () => {
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const download = (t: Track) => {
    const a = document.createElement('a')
    a.href = `${STREAM_API}/audio/${t.id}`
    a.download = `${t.title}.m4a`
    a.click()
  }

  return (
    <div className="app">
      <div className="header"><h1>Mochy Web</h1></div>
      <div className="search-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs..." onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button onClick={search}>{loading ? '...' : 'Search'}</button>
      </div>
      <div className="list">
        {results.map((t) => (
          <div key={t.id} className={`track ${current?.id === t.id ? 'playing' : ''}`} onClick={() => play(t)}>
            {t.thumbnail && <img className="art" src={t.thumbnail} alt="" />}
            <div className="info">
              <div className="title">{t.title}</div>
              <div className="artist">{t.artists.map((a) => a.name).join(', ')}</div>
            </div>
            <button className="dl" onClick={(e) => { e.stopPropagation(); download(t) }}>⬇</button>
          </div>
        ))}
        {results.length === 0 && !loading && <div className="empty">Search for a song to get started.</div>}
      </div>
      {current && (
        <div className="player">
          {current.thumbnail && <img className="art" src={current.thumbnail} alt="" />}
          <div className="info">
            <div className="title">{current.title}</div>
            <div className="artist">{current.artists.map((a) => a.name).join(', ')}</div>
          </div>
          <div className="controls">
            <button onClick={toggle}>{playing ? '❚❚' : '▶'}</button>
            <button className="dl" onClick={() => download(current)}>⬇</button>
          </div>
        </div>
      )}
    </div>
  )
}

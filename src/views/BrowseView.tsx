import { useState } from 'react'
import { useUi } from '../store'
import { Card } from '../components/Card'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'
import { playTracks } from '../player'

const MOODS = ['Happy', 'Sad', 'Chill', 'Energetic', 'Focus', 'Party', 'Romantic', 'Sleep', 'Workout', 'Jazz', 'Classical', 'Hip Hop', 'Rock', 'Electronic', 'Lo-Fi', 'Acoustic']
const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country', 'Metal', 'Indie', 'Folk', 'Blues', 'Reggae', 'Latin', 'K-Pop', 'Anime']

export function BrowseView() {
  const setRoute = useUi((s) => s.setRoute)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async (q: string) => {
    setQuery(q); setLoading(true)
    try { setResults(await window.mochy.search(q, 'songs')) }
    catch {} finally { setLoading(false) }
  }

  return (
    <div>
      <div className="hero"><h1>Browse</h1><p>Moods, genres and more.</p></div>
      <div className="section-title">Moods</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {MOODS.map((m) => <button key={m} className="btn" onClick={() => run(m + ' mood')}>{m}</button>)}
      </div>
      <div className="section-title">Genres</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {GENRES.map((g) => <button key={g} className="btn" onClick={() => run(g)}>{g}</button>)}
      </div>
      {loading && <div className="empty"><span className="spinner" /> Loading…</div>}
      {results && (
        <>
          <div className="section-title">Results for "{query}"</div>
          {results.songs.map((t: any, i: number) => <TrackRow key={t.id + i} track={t} index={i} queue={results.songs} />)}
          {results.songs.length === 0 && <div className="empty">No results.</div>}
        </>
      )}
    </div>
  )
}

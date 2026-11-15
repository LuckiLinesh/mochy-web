import { useEffect, useState } from 'react'
import { useUi } from '../store'
import { Card } from '../components/Card'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'
import { playTracks } from '../player'

const FILTERS = [
  { id: 'songs', label: 'Songs' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'videos', label: 'Videos' }
] as const

export function SearchView() {
  const query = useUi((s) => s.searchQuery)
  const filter = useUi((s) => s.searchFilter)
  const results = useUi((s) => s.searchResults)
  const searching = useUi((s) => s.searching)
  const suggestions = useUi((s) => s.suggestions)
  const setQuery = useUi((s) => s.setSearchQuery)
  const setFilter = useUi((s) => s.setSearchFilter)
  const setResults = useUi((s) => s.setSearchResults)
  const setSearching = useUi((s) => s.setSearching)
  const setSuggestions = useUi((s) => s.setSuggestions)
  const setRoute = useUi((s) => s.setRoute)
  const [local, setLocal] = useState(query)

  useEffect(() => { setLocal(query) }, [query])

  const run = async (q: string, f: string) => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const r = await window.mochy.search(q, f)
      setResults(r as any)
    } catch (e: any) {
      useUi.getState().setToast('Search failed')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!local.trim()) { setResults(null); return }
    const t = setTimeout(() => {
      setQuery(local)
      run(local, filter)
      window.mochy.suggest(local).then((s) => setSuggestions(s as string[]))
    }, 350)
    return () => clearTimeout(t)
  }, [local, filter])

  return (
    <div>
      <div className="hero"><h1>Search</h1><p>Find songs, albums, artists and playlists.</p></div>
      <div className="search-bar">
        <Icon name="search" size={16} />
        <input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="What do you want to listen to?" autoFocus />
        {searching && <span className="spinner" />}
      </div>
      <div className="filters" style={{ marginBottom: 18, display: 'flex', gap: 6 }}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`filter ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {suggestions.length > 0 && !results && (
        <div style={{ marginBottom: 18 }}>
          {suggestions.map((s) => (
            <button key={s} className="btn" style={{ marginRight: 6, marginBottom: 6 }} onClick={() => { setLocal(s); setQuery(s) }}>{s}</button>
          ))}
        </div>
      )}
      {results && filter === 'songs' && (
        <div>
          {results.songs.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={results.songs} />)}
          {results.songs.length === 0 && <div className="empty">No songs found.</div>}
        </div>
      )}
      {results && filter === 'videos' && (
        <div>
          {results.videos.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={results.videos} />)}
          {results.videos.length === 0 && <div className="empty">No videos found.</div>}
        </div>
      )}
      {results && (filter === 'albums' || filter === 'artists' || filter === 'playlists') && (
        <div className="card-grid">
          {(filter === 'albums' ? results.albums : filter === 'artists' ? results.artists : results.playlists).map((c) => (
            <Card key={c.id} item={c} onClick={() => {
              if (filter === 'albums') setRoute({ view: 'album', id: c.id })
              else if (filter === 'artists') setRoute({ view: 'artist', id: c.id })
              else setRoute({ view: 'playlist', id: c.id })
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useUi } from '../store'
import { TrackRow } from '../components/TrackRow'
import { playTracks } from '../player'

export function StatsView() {
  const [history, setHistory] = useState<any[]>([])
  useEffect(() => { window.mochy.library.history().then((h) => setHistory(h as any[])) }, [])

  const totalSeconds = history.reduce((a, t) => a + (t.duration || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)

  // top artists
  const artistCounts: Record<string, number> = {}
  for (const t of history) for (const a of t.artists ?? []) artistCounts[a.name] = (artistCounts[a.name] ?? 0) + 1
  const topArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // top tracks
  const trackCounts: Record<string, { t: any; n: number }> = {}
  for (const t of history) {
    if (!trackCounts[t.id]) trackCounts[t.id] = { t, n: 0 }
    trackCounts[t.id].n++
  }
  const topTracks = Object.values(trackCounts).sort((a, b) => b.n - a.n).slice(0, 10).map((x) => x.t)

  return (
    <div>
      <div className="hero"><h1>Listening stats</h1><p>Your activity.</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{history.length}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Tracks played</div>
        </div>
        <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{hours}h {mins}m</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Listening time</div>
        </div>
        <div style={{ background: 'var(--panel-2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{topArtists.length}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Unique artists</div>
        </div>
      </div>
      <div className="section-title">Top artists</div>
      {topArtists.map(([name, n]) => (
        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <span>{name}</span><span style={{ color: 'var(--text-muted)' }}>{n} plays</span>
        </div>
      ))}
      <div className="section-title">Top tracks</div>
      {topTracks.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={topTracks} />)}
      {history.length === 0 && <div className="empty">No listening history yet.</div>}
    </div>
  )
}

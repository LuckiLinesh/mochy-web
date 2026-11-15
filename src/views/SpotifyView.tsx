import { useEffect, useState } from 'react'
import { useUi } from '../store'
import { Card } from '../components/Card'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'
import { playTracks } from '../player'

export function SpotifyView() {
  const [signedIn, setSignedIn] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [liked, setLiked] = useState<any[]>([])
  const [tab, setTab] = useState<'playlists' | 'liked'>('playlists')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [matching, setMatching] = useState(false)

  const refresh = async () => {
    const si = await window.mochy.spotify.signedIn()
    setSignedIn(si)
    if (si) {
      setProfile(await window.mochy.spotify.profile())
      setPlaylists(await window.mochy.spotify.playlists())
    }
  }

  useEffect(() => { refresh() }, [])

  const login = async () => {
    setLoading(true)
    const r = await window.mochy.spotify.login()
    setLoading(false)
    if (r?.ok) { await refresh(); useUi.getState().setToast('Signed in to Spotify' + (r.name ? ' as ' + r.name : '')) }
    else useUi.getState().setToast('Spotify login failed: ' + (r?.error ?? ''))
  }

  const openPlaylist = async (p: any) => {
    setSelected(p); setTracks([]); setMatching(true)
    const spTracks = await window.mochy.spotify.playlistTracks(p.id)
    // match to YTM
    const matched: any[] = []
    for (const st of spTracks) {
      const hit = await window.mochy.spotify.matchTrack(st.title, st.artist)
      if (hit) matched.push(hit)
    }
    setTracks(matched); setMatching(false)
  }

  const loadLiked = async () => {
    setMatching(true)
    const spTracks = await window.mochy.spotify.liked()
    const matched: any[] = []
    for (const st of spTracks) {
      const hit = await window.mochy.spotify.matchTrack(st.title, st.artist)
      if (hit) matched.push(hit)
    }
    setLiked(matched); setMatching(false)
  }

  if (!signedIn) {
    return (
      <div>
        <div className="hero"><h1>Spotify</h1><p>Connect your Spotify account to import your library.</p></div>
        <div style={{ background: 'var(--panel-2)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', maxWidth: 480 }}>
          <div style={{ marginBottom: 12, color: 'var(--text-dim)', fontSize: 13 }}>
            You need to create a Spotify app at developer.spotify.com and paste its Client ID in Settings → Spotify. Then click Connect.
          </div>
          <button className="btn primary" disabled={loading} onClick={login}>{loading ? <span className="spinner" /> : 'Connect Spotify'}</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="hero"><h1>Spotify</h1><p>{profile?.display_name ?? 'Connected'}</p></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`filter ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>Playlists</button>
        <button className={`filter ${tab === 'liked' ? 'active' : ''}`} onClick={() => { setTab('liked'); if (liked.length === 0) loadLiked() }}>Liked songs</button>
        <button className="btn" onClick={() => window.mochy.spotify.logout().then(() => { setSignedIn(false); setPlaylists([]); setLiked([]) })}>Disconnect</button>
      </div>
      {tab === 'playlists' && !selected && (
        <div className="card-grid">
          {playlists.map((p) => (
            <Card key={p.id} item={{ id: p.id, title: p.name, thumbnail: p.thumbnail, subtitle: p.trackCount + ' tracks', kind: 'playlist' } as any} onClick={() => openPlaylist(p)} />
          ))}
          {playlists.length === 0 && <div className="empty">No playlists.</div>}
        </div>
      )}
      {tab === 'playlists' && selected && (
        <>
          <button className="btn" onClick={() => setSelected(null)} style={{ marginBottom: 12 }}><Icon name="back" size={14} /> Back</button>
          <div className="section-title">{selected.name}</div>
          {matching && <div className="empty"><span className="spinner" /> Matching to YouTube Music…</div>}
          {tracks.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={tracks} />)}
          {tracks.length > 0 && <button className="btn primary" style={{ marginTop: 12 }} onClick={() => playTracks(tracks, 0)}><Icon name="play" size={14} /> Play all</button>}
        </>
      )}
      {tab === 'liked' && (
        <>
          {matching && <div className="empty"><span className="spinner" /> Matching to YouTube Music…</div>}
          {liked.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={liked} />)}
          {liked.length > 0 && <button className="btn primary" style={{ marginTop: 12 }} onClick={() => playTracks(liked, 0)}><Icon name="play" size={14} /> Play all</button>}
        </>
      )}
    </div>
  )
}

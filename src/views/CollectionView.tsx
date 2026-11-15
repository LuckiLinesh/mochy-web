import { useEffect } from 'react'
import { useUi } from '../store'
import { Card } from '../components/Card'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'
import { playTracks } from '../player'

export function CollectionView() {
  const route = useUi((s) => s.route)
  const collection = useUi((s) => s.selectedCollection)
  const loading = useUi((s) => s.loadingCollection)
  const setCollection = useUi((s) => s.setSelectedCollection)
  const setLoading = useUi((s) => s.setLoadingCollection)
  const setRoute = useUi((s) => s.setRoute)

  const id = (route as any).id

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setCollection(null)
    const fetcher = route.view === 'album' ? window.mochy.album(id)
      : route.view === 'artist' ? window.mochy.artist(id)
      : window.mochy.playlist(id)
    fetcher.then((c) => { setCollection(c as any); setLoading(false) })
      .catch(() => { setLoading(false); useUi.getState().setToast('Failed to load') })
  }, [id, route.view])

  if (loading) return <div className="empty"><span className="spinner" /> Loading…</div>
  if (!collection) return <div className="empty">Nothing here.</div>

  const isAlbum = route.view === 'album'
  const isArtist = route.view === 'artist'
  const title = (collection as any).title ?? (collection as any).name
  const thumb = (collection as any).thumbnail
  const tracks: any[] = (collection as any).tracks ?? (collection as any).topSongs ?? []
  const subtitle = isAlbum ? (collection as any).artist : isArtist ? (collection as any).subscribers : (collection as any).author

  return (
    <div>
      <button className="btn" onClick={() => useUi.getState().back()} style={{ marginBottom: 16 }}><Icon name="back" size={14} /> Back</button>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 24 }}>
        <img src={thumb} alt="" style={{ width: 200, height: 200, borderRadius: 16, objectFit: 'cover', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }} />
        <div>
          <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 1.2, marginBottom: 6 }}>
            {isAlbum ? 'Album' : isArtist ? 'Artist' : 'Playlist'}
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 6px', letterSpacing: -0.5 }}>{title}</h1>
          <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>{subtitle} {tracks.length ? `· ${tracks.length} tracks` : ''}</div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn primary" onClick={() => tracks.length && playTracks(tracks, 0)}>
              <Icon name="play" size={14} /> Play
            </button>
            <button className="btn" onClick={async () => {
              if (!tracks.length) return
              useUi.getState().setToast('Starting radio…')
              const up = await window.mochy.upnext(tracks[0].id)
              if (up && up.length) playTracks(up, 0)
              else playTracks(tracks, 0)
            }}><Icon name="shuffle" size={14} /> Start radio</button>
              {isAlbum && (
              <button className="btn" onClick={() => {
                const t = tracks[0]
                if (t) window.mochy.playlists.create(title).then((p: any) => {
                  tracks.forEach((tr) => window.mochy.playlists.add(p.id, tr))
                  useUi.getState().setPlaylists(window.mochy.playlists.list() as any)
                  useUi.getState().setToast('Saved as playlist')
                })
              }}>Save</button>
            )}
            <button className="btn" onClick={async () => {
              useUi.getState().setToast('Downloading...')
              for (const t of tracks) {
                try { await window.mochy.audio.saveDownload(t.id, t) } catch {}
              }
              const d = await window.mochy.downloads.list()
              useUi.getState().setDownloads(d as any)
              useUi.getState().setToast('Downloaded ' + tracks.length + ' tracks')
            }}><Icon name="download" size={14} /> Download all</button>
          </div>
        </div>
      </div>
      {isArtist && (collection as any).albums?.length > 0 && (
        <>
          <div className="section-title">Albums</div>
          <div className="card-grid" style={{ marginBottom: 24 }}>
            {(collection as any).albums.map((c: any) => (
              <Card key={c.id} item={c} onClick={() => setRoute({ view: 'album', id: c.id })} />
            ))}
          </div>
        </>
      )}
      <div className="section-title">{isArtist ? 'Top songs' : 'Tracks'}</div>
      {tracks.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} queue={tracks} />)}
      {tracks.length === 0 && <div className="empty">No tracks.</div>}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useUi } from '../store'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'
import { playTracks } from '../player'

export function LibraryView() {
  const liked = useUi((s) => s.liked)
  const playlists = useUi((s) => s.playlists)
  const setLiked = useUi((s) => s.setLiked)
  const setPlaylists = useUi((s) => s.setPlaylists)
  const setRoute = useUi((s) => s.setRoute)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    window.mochy.library.liked().then((l) => setLiked(l as any))
    window.mochy.playlists.list().then((p) => setPlaylists(p as any))
  }, [])

  return (
    <div>
      <div className="hero"><h1>Library</h1><p>Your liked songs and playlists.</p></div>
      <div className="section-title">Liked songs <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 400 }}>· {liked.length}</span></div>
      {liked.length === 0 && <div className="empty">No liked songs yet. Tap the heart on any track.</div>}
      {liked.map((t: any, i: number) => <TrackRow key={t.id + i} track={t} index={i} queue={liked} />)}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
        <div className="section-title" style={{ margin: 0 }}>Playlists</div>
        <button className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" size={14} /> New</button>
      </div>
      {creating && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Playlist name" style={{ flex: 1, height: 38, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', color: 'var(--text)' }} />
          <button className="btn primary" onClick={() => {
            if (!newName.trim()) return
            window.mochy.playlists.create(newName.trim()).then(() => {
              window.mochy.playlists.list().then((p) => setPlaylists(p as any))
              setNewName(''); setCreating(false)
            })
          }}>Create</button>
          <button className="btn" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}
      <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
        {playlists.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }} onClick={() => setRoute({ view: 'playlist', id: p.id })}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.tracks.length} tracks</div>
            </div>
            <button className="btn" onClick={(e) => { e.stopPropagation(); if (confirm('Delete playlist?')) { window.mochy.playlists.delete(p.id).then(() => window.mochy.playlists.list().then((pp) => setPlaylists(pp as any))) } }}>Delete</button>
          </div>
        ))}
      </div>
      {playlists.length === 0 && !creating && <div className="empty">No playlists yet.</div>}
    </div>
  )
}

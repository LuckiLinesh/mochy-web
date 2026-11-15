import { useEffect } from 'react'
import { useUi } from '../store'
import { TrackRow } from '../components/TrackRow'
import { Icon } from '../components/Icons'

export function DownloadsView() {
  const downloads = useUi((s) => s.downloads)
  const setDownloads = useUi((s) => s.setDownloads)
  const cacheSize = useUi((s) => (s as any).cacheSize)

  useEffect(() => {
    window.mochy.downloads.list().then((d) => setDownloads(d as any))
  }, [])

  return (
    <div>
      <div className="hero"><h1>Downloads</h1><p>Tracks saved for offline playback.</p></div>
      {downloads.length === 0 && <div className="empty">No downloads yet. Tap the download icon on any track.</div>}
      {downloads.map((d: any, i: number) => (
        <div key={d.id + i} className="track-row">
          <div className="idx">{i + 1}</div>
          <div className="info">
            <div className="t">{d.track.title}</div>
            <div className="a">{d.track.artists.map((a: any) => a.name).join(', ')} · {Math.round(d.size / 1024 / 1024)} MB</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => {
              // play from cache via url
              window.mochy.audio.url(d.id).then(({ url }) => {
                const audio = new Audio(url); audio.play()
              })
            }}>Play</button>
            <button className="btn" onClick={() => {
              if (confirm('Delete download?')) {
                window.mochy.downloads.remove(d.id).then(() => window.mochy.downloads.list().then((dd) => setDownloads(dd as any)))
              }
            }}>Delete</button>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 24, padding: 14, background: 'var(--panel-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Audio cache</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Temporary files used for playback.</div>
          </div>
          <button className="btn" onClick={() => { window.mochy.audio.clearCache().then(() => useUi.getState().setToast('Cache cleared')) }}>Clear cache</button>
        </div>
      </div>
    </div>
  )
}

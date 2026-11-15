import { usePlayer, useUi } from '../store'
import { playTracks } from '../player'
import { Icon } from './Icons'
import type { Track } from '@shared/types'

function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60); const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function TrackRow({ track, index, queue, showIndex = true }: { track: Track; index: number; queue?: Track[]; showIndex?: boolean }) {
  const current = usePlayer((s) => s.current)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const isCurrent = current?.id === track.id
  const liked = useUi((s) => s.liked.some((t: any) => t.id === track.id))

  const play = () => {
    if (queue) playTracks(queue, index)
    else playTracks([track], 0)
  }

  return (
    <div className={`track-row ${isCurrent ? 'playing' : ''}`} onClick={play}>
      <div className="idx">
        {isCurrent && isPlaying ? <Icon name="pause" size={14} /> : (showIndex ? index + 1 : <Icon name="play" size={14} />)}
      </div>
      <div className="info">
        <div className="t">{track.title}</div>
        <div className="a">{track.artists.map((a) => a.name).join(', ')}{track.album?.name ? ` · ${track.album.name}` : ''}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={(e) => { e.stopPropagation(); window.mochy.library.toggleLiked(track).then(() => window.mochy.library.liked().then((l) => useUi.getState().setLiked(l as any))) }} style={{ color: liked ? 'var(--accent)' : 'var(--text-muted)' }}>
          <Icon name={liked ? 'heartfilled' : 'heart'} size={15} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); window.mochy.audio.saveDownload(track.id, track).then(() => { useUi.getState().setToast('Downloaded'); window.mochy.downloads.list().then((d) => useUi.getState().setDownloads(d as any)) }) }} style={{ color: 'var(--text-muted)' }}>
          <Icon name="download" size={15} />
        </button>
        <div className="dur">{fmt(track.duration)}</div>
      </div>
    </div>
  )
}

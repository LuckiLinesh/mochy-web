import { usePlayer, useUi } from '../store'
import { Icon } from './Icons'
import { play, pause, next, prev, seek, togglePlay, skip } from '../player'
import type { Track } from '@shared/types'

function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60); const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function PlayerBar() {
  const current = usePlayer((s) => s.current)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const position = usePlayer((s) => s.position)
  const duration = usePlayer((s) => s.duration)
  const volume = usePlayer((s) => s.volume)
  const shuffle = usePlayer((s) => s.shuffle)
  const repeat = usePlayer((s) => s.repeat)
  const loading = usePlayer((s) => s.loading)
  const buffering = usePlayer((s) => s.buffering)
  const setVolume = usePlayer((s) => s.setVolume)
  const setShuffle = usePlayer((s) => s.setShuffle)
  const setRepeat = usePlayer((s) => s.setRepeat)
  const setNowPlayingFull = useUi((s) => s.setNowPlayingFull)
  const setQueueOpen = useUi((s) => s.setQueueOpen)

  if (!current) {
    return (
      <div className="player">
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Pick a song to start listening
        </div>
      </div>
    )
  }

  return (
    <div className="player">
      {current.thumbnail && <div className="bg-art" style={{ backgroundImage: `url(${current.thumbnail})` }} />}
      <div className="np-left">
        <img className="np-art" src={current.thumbnail} alt="" onClick={() => setNowPlayingFull(true)} style={{ cursor: 'pointer' }} />
        <div className="np-meta">
          <div className="np-title">{current.title}</div>
          <div className="np-artist">{current.artists.map((a) => a.name).join(', ')}</div>
        </div>
        <button className="icon-btn" onClick={() => window.mochy.library.toggleLiked(current).then(() => useUi.getState().setLiked(window.mochy.library.liked() as any))}>
          <Icon name={useUi.getState().liked.some((t: any) => t.id === current.id) ? 'heartfilled' : 'heart'} size={16} />
        </button>
      </div>
      <div className="np-controls">
        <div className="ctrl-row">
          <button className="icon-btn" onClick={() => { setShuffle(!shuffle) }} style={{ color: shuffle ? 'var(--accent)' : undefined }}><Icon name="shuffle" size={16} /></button>
          <button className="icon-btn" onClick={prev}><Icon name="prev" size={18} /></button>
          <button className="icon-btn" onClick={() => skip(-10)} title="Back 10s" style={{ fontSize: 11, fontWeight: 700 }}>-10</button>
          <button className="play-btn" onClick={togglePlay} disabled={loading}>
            {loading || buffering ? <span className="spinner" /> : isPlaying ? <Icon name="pause" size={18} /> : <Icon name="play" size={18} />}
          </button>
          <button className="icon-btn" onClick={() => skip(10)} title="Forward 10s" style={{ fontSize: 11, fontWeight: 700 }}>+10</button>
          <button className="icon-btn" onClick={next}><Icon name="next" size={18} /></button>
          <button className="icon-btn" onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} style={{ color: repeat !== 'off' ? 'var(--accent)' : undefined }}>
            <Icon name={repeat === 'one' ? 'repeatone' : 'repeat'} size={16} />
          </button>
        </div>
        <div className="progress">
          <span>{fmt(position)}</span>
          <input type="range" min={0} max={duration || 0} step={0.1} value={position} onChange={(e) => seek(parseFloat(e.target.value))} />
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <div className="np-right">
        <button className="icon-btn" onClick={() => setQueueOpen(true)}><Icon name="queue" size={16} /></button>
        <button className="icon-btn" onClick={() => setNowPlayingFull(true)}><Icon name="lyrics" size={16} /></button>
        <button className="icon-btn" onClick={() => { const v = volume > 0 ? 0 : 0.8; setVolume(v) }}>
          <Icon name={volume === 0 ? 'volumeMute' : 'volume'} size={16} />
        </button>
        <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} style={{ width: 80, accentColor: 'var(--accent)' }} />
      </div>
    </div>
  )
}

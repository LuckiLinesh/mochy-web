import { useEffect, useRef } from 'react'
import { usePlayer, useUi } from '../store'
import { Icon } from '../components/Icons'
import { getAnalyser } from '../audioEngine'
import { pause, play, next, prev, seek, skip } from '../player'
import { TrackRow } from '../components/TrackRow'

function fmt(s: number) {
  if (!s || !isFinite(s)) return '0:00'
  const m = Math.floor(s / 60); const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function NowPlayingFull() {
  const current = usePlayer((s) => s.current)
  const isPlaying = usePlayer((s) => s.isPlaying)
  const position = usePlayer((s) => s.position)
  const duration = usePlayer((s) => s.duration)
  const lyrics = useUi((s) => s.lyrics)
  const lyricsLoading = useUi((s) => s.lyricsLoading)
  const setNowPlayingFull = useUi((s) => s.setNowPlayingFull)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const draw = () => {
      const an = getAnalyser()
      const w = canvas.width, h = canvas.height
      ctx.clearRect(0, 0, w, h)
      if (an) {
        const data = new Uint8Array(an.frequencyBinCount)
        an.getByteFrequencyData(data)
        const barW = w / data.length
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 255
          const bh = v * h
          const grad = ctx.createLinearGradient(0, h - bh, 0, h)
          grad.addColorStop(0, 'rgba(180,190,254,0.9)')
          grad.addColorStop(1, 'rgba(203,166,247,0.4)')
          ctx.fillStyle = grad
          ctx.fillRect(i * barW, h - bh, barW - 1, bh)
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!lyrics?.synced?.length) return
    // find active line
    let active = -1
    for (let i = 0; i < lyrics.synced.length; i++) {
      if (position >= lyrics.synced[i].time) active = i
      else break
    }
    const el = containerRef.current?.querySelector(`[data-idx="${active}"]`) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [position, lyrics])

  if (!current) return null

  const activeIdx = lyrics?.synced ? lyrics.synced.reduce((acc, l, i) => (position >= l.time ? i : acc), -1) : -1

  return (
    <div className="nowplaying-full">
      <button className="btn" style={{ position: 'absolute', top: 20, right: 20, zIndex: 5 }} onClick={() => setNowPlayingFull(false)}>
        <Icon name="close" size={16} /> Close
      </button>
      <div className="art-wrap">
        <img className="art" src={current.thumbnail} alt="" />
        <canvas ref={canvasRef} width={420} height={80} style={{ width: '100%', maxWidth: 420, height: 80, marginTop: 16, borderRadius: 12, opacity: 0.85 }} />
        <div style={{ marginTop: 24, textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{current.title}</div>
          <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{current.artists.map((a) => a.name).join(', ')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            <button className="icon-btn" onClick={() => skip(-10)} style={{ fontSize: 12, fontWeight: 700 }}>-10</button>
            <button className="icon-btn" onClick={prev}><Icon name="prev" size={22} /></button>
            <button className="play-btn" onClick={() => (isPlaying ? pause() : play())}>
              {isPlaying ? <Icon name="pause" size={22} /> : <Icon name="play" size={22} />}
            </button>
            <button className="icon-btn" onClick={next}><Icon name="next" size={22} /></button>
            <button className="icon-btn" onClick={() => skip(10)} style={{ fontSize: 12, fontWeight: 700 }}>+10</button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(position)}</span>
            <input type="range" min={0} max={duration || 0} step={0.1} value={position} onChange={(e) => seek(parseFloat(e.target.value))} style={{ width: 320, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmt(duration)}</span>
          </div>
        </div>
      </div>
      <div className="lyrics" ref={containerRef}>
        {lyricsLoading && <div className="empty"><span className="spinner" /> Loading lyrics…</div>}
        {!lyricsLoading && lyrics && lyrics.synced.length > 0 && lyrics.synced.map((l, i) => (
          <div key={i} data-idx={i} className={`lyric-line ${i === activeIdx ? 'active' : i < activeIdx ? 'passed' : ''}`}>
            {l.text || '♪'}
          </div>
        ))}
        {!lyricsLoading && lyrics && lyrics.synced.length === 0 && lyrics.plain && (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-dim)', fontSize: 15 }}>{lyrics.plain}</div>
        )}
        {!lyricsLoading && lyrics && lyrics.instrumental && (
          <div className="empty">Instrumental track.</div>
        )}
        {!lyricsLoading && (!lyrics || (lyrics.synced.length === 0 && !lyrics.plain && !lyrics.instrumental)) && (
          <div className="empty">No lyrics found.</div>
        )}
      </div>
    </div>
  )
}

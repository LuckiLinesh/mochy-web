import { usePlayer, useUi } from './store'
import { initAudioEngine, setVolume as engineSetVolume, setEqEnabled, applyEqBands, setBassBoost, setSpeed, setPitch, setEightD, crossfadeTo, resumeContext } from './audioEngine'
import type { Track } from '@shared/types'

const audio = new Audio()
audio.preload = 'auto'
audio.crossOrigin = 'anonymous'

let currentUrl: string | null = null
let progressTimer: number | null = null
let prefetching = new Set<string>()

function emit() {
  const s = usePlayer.getState()
  // sync audio volume
  audio.volume = s.volume
}

export function initPlayer() {
  const s = usePlayer.getState()
  audio.volume = s.volume
  initAudioEngine(audio)
  resumeContext()

  audio.addEventListener('timeupdate', () => {
    usePlayer.getState().setPosition(audio.currentTime)
  })
  audio.addEventListener('durationchange', () => {
    usePlayer.getState().setDuration(audio.duration || 0)
  })
  audio.addEventListener('playing', () => {
    usePlayer.getState().setPlaying(true)
    usePlayer.getState().setBuffering(false)
  })
  audio.addEventListener('pause', () => {
    usePlayer.getState().setPlaying(false)
  })
  audio.addEventListener('waiting', () => {
    usePlayer.getState().setBuffering(true)
  })
  audio.addEventListener('canplay', () => {
    usePlayer.getState().setBuffering(false)
  })
  audio.addEventListener('ended', () => {
    handleEnded()
  })
  audio.addEventListener('error', () => {
    usePlayer.getState().setError(audio.error?.message ?? 'Playback error')
    usePlayer.getState().setPlaying(false)
  })

  // media session
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => play())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => prev())
    navigator.mediaSession.setActionHandler('nexttrack', () => next())
    navigator.mediaSession.setActionHandler('seekto', (e) => {
      if (e.seekTime != null) { audio.currentTime = e.seekTime; usePlayer.getState().setPosition(e.seekTime) }
    })
  }

  // volume sync from store
  usePlayer.subscribe((st, prev) => {
    if (st.volume !== prev.volume) audio.volume = st.volume
  })
}

function updateMediaSession(track: Track | null) {
  if (!track || !('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album?.name,
    artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : []
  })
}

export async function loadTrack(track: Track, autoplay = true) {
  const p = usePlayer.getState()
  p.setLoading(true)
  p.setError(undefined)
  p.setBuffering(true)
  try {
    const { url, error } = await window.mochy.audio.url(track.id, track)
    if (error) throw new Error(error)
    currentUrl = url
    audio.src = url
    audio.load()
    updateMediaSession(track)
    // apply audio settings
    const st = useUi.getState().settings
    if (st) {
      engineSetVolume(st.volume ?? usePlayer.getState().volume)
      audio.playbackRate = st.speed ?? 1
      audio.preservesPitch = (st.pitch ?? 0) === 0
      setEqEnabled(!!st.eqEnabled)
      applyEqBands(st.eqBands ?? [])
      setBassBoost(st.bassBoost ?? 0)
      setEightD(!!st.eightD)
    }
    if (autoplay) {
      await audio.play()
    }
    window.mochy.library.pushHistory(track).catch(() => {})
    usePlayer.getState().setLoading(false)
    // prefetch next
    prefetchNext()
    // discord + lastfm hooks
    const st2 = useUi.getState().settings
    if (st2?.discordEnabled && st2.discordClientId) {
      window.mochy.discord.update({ title: track.title, artist: track.artists.map((a) => a.name).join(', '), duration: track.duration, position: 0, thumbnail: track.thumbnail })
    }
    if (st2?.lastfmEnabled && st2.lastfmApiKey && st2.lastfmSession) {
      window.mochy.lastfm.nowPlaying(st2.lastfmApiKey, st2.lastfmSecret, st2.lastfmSession, { title: track.title, artist: track.artists.map((a) => a.name).join(', '), album: track.album?.name, duration: track.duration })
      // scrobble after half duration or on end
      const scrobbleTs = Math.floor(Date.now() / 1000)
      setTimeout(() => {
        const s = useUi.getState().settings
        if (s?.lastfmEnabled && s.lastfmSession && usePlayer.getState().current?.id === track.id) {
          window.mochy.lastfm.scrobble(s.lastfmApiKey, s.lastfmSecret, s.lastfmSession, { title: track.title, artist: track.artists.map((a) => a.name).join(', '), album: track.album?.name, duration: track.duration }, scrobbleTs)
        }
      }, Math.max(30000, (track.duration * 1000) / 2))
    }
  } catch (e: any) {
    usePlayer.getState().setLoading(false)
    usePlayer.getState().setError(e?.message ?? 'Failed to load')
  }
}

function fetchLyrics(track: Track) {
  const ui = useUi.getState()
  ui.setLyricsLoading(true)
  const source = ui.settings?.lyricsSource ?? 'auto'
  window.mochy.lyrics(track, source).then((l) => {
    ui.setLyrics(l)
    ui.setLyricsLoading(false)
  }).catch(() => { ui.setLyricsLoading(false) })
}

function prefetchNext() {
  const p = usePlayer.getState()
  const nextIdx = getNextIndex(p)
  const nextTrack = p.queue[nextIdx]
  if (nextTrack && !prefetching.has(nextTrack.id)) {
    prefetching.add(nextTrack.id)
    window.mochy.audio.prefetch(nextTrack.id).catch(() => {})
  }
}

function getNextIndex(p: ReturnType<typeof usePlayer.getState>) {
  if (p.queue.length === 0) return 0
  if (p.repeat === 'one') return p.index
  if (p.shuffle) {
    let i = p.index
    while (i === p.index && p.queue.length > 1) i = Math.floor(Math.random() * p.queue.length)
    return i
  }
  let i = p.index + 1
  if (i >= p.queue.length) i = p.repeat === 'all' ? 0 : p.index
  return i
}

export async function play() {
  const p = usePlayer.getState()
  if (!p.current && p.queue.length) {
    p.setQueue(p.queue, 0)
    await loadTrack(p.queue[0])
    return
  }
  if (!p.current) return
  if (audio.src !== currentUrl) {
    await loadTrack(p.current, true)
    return
  }
  try { await audio.play() } catch {}
}

export function pause() {
  audio.pause()
  usePlayer.getState().setPlaying(false)
}

export async function togglePlay() {
  if (usePlayer.getState().isPlaying) pause(); else await play()
}

export async function next() {
  const p = usePlayer.getState()
  if (!p.queue.length) return
  const i = getNextIndex(p)
  if (i === p.index && p.repeat !== 'one' && p.repeat !== 'all' && i === p.queue.length - 1) {
    audio.pause()
    usePlayer.getState().setPlaying(false)
    return
  }
  const cf = useUi.getState().settings?.crossfade ?? 0
  const doSwap = async () => {
    usePlayer.setState({ index: i, current: p.queue[i] })
    await loadTrack(p.queue[i], true)
  }
  if (cf > 0) crossfadeTo(cf, () => { doSwap() })
  else await doSwap()
}

export async function prev() {
  const p = usePlayer.getState()
  if (audio.currentTime > 3) { audio.currentTime = 0; usePlayer.getState().setPosition(0); return }
  if (!p.queue.length) return
  let i = p.index - 1
  if (i < 0) i = p.repeat === 'all' ? p.queue.length - 1 : 0
  usePlayer.setState({ index: i, current: p.queue[i] })
  await loadTrack(p.queue[i], true)
}

let sleepTimerHandle: number | null = null
export function applySleepTimer() {
  if (sleepTimerHandle) { clearTimeout(sleepTimerHandle); sleepTimerHandle = null }
  const mins = useUi.getState().settings?.sleepTimer ?? 0
  if (mins > 0) {
    sleepTimerHandle = window.setTimeout(() => {
      pause()
      useUi.getState().setToast('Sleep timer: playback paused')
    }, mins * 60 * 1000)
  }
}

export function seek(t: number) {
  audio.currentTime = t
  usePlayer.getState().setPosition(t)
}

export function skip(delta: number) {
  const t = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + delta))
  audio.currentTime = t
  usePlayer.getState().setPosition(t)
}

export function setVolume(v: number) {
  usePlayer.getState().setVolume(v)
  audio.volume = v
}

function handleEnded() {
  const p = usePlayer.getState()
  if (p.repeat === 'one') {
    audio.currentTime = 0
    audio.play()
    return
  }
  if (p.index + 1 < p.queue.length) {
    next()
  } else if (p.repeat === 'all' && p.queue.length) {
    const cf = useUi.getState().settings?.crossfade ?? 0
    const doSwap = async () => {
      usePlayer.setState({ index: 0, current: p.queue[0] })
      await loadTrack(p.queue[0], true)
    }
    if (cf > 0) crossfadeTo(cf, () => { doSwap() })
    else doSwap()
  } else {
    usePlayer.getState().setPlaying(false)
  }
}

export async function playTracks(tracks: Track[], startIndex = 0) {
  if (!tracks.length) return
  usePlayer.getState().setQueue(tracks, startIndex)
  await loadTrack(tracks[startIndex], true)
}

export async function playNow(track: Track) {
  const p = usePlayer.getState()
  // insert after current
  const q = [...p.queue]
  const insertAt = p.queue.length ? p.index + 1 : 0
  q.splice(insertAt, 0, track)
  usePlayer.getState().setQueue(q, insertAt)
  await loadTrack(track, true)
}

// patch store with setIndex helper (not in type) via direct setState already
declare module 'zustand' {}

import { useEffect } from 'react'
import { useUi, usePlayer } from './store'
import { initPlayer, play, pause, next, prev, playTracks, applySleepTimer } from './player'
import { setEqEnabled, applyEqBands, setBassBoost, setEightD, setVolume as engineSetVolume, setExponentialVolume, setReplayGain } from './audioEngine'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { HomeView } from './views/HomeView'
import { SearchView } from './views/SearchView'
import { LibraryView } from './views/LibraryView'
import { DownloadsView } from './views/DownloadsView'
import { SettingsView } from './views/SettingsView'
import { CollectionView } from './views/CollectionView'
import { NowPlayingFull } from './views/NowPlayingFull'
import { BrowseView } from './views/BrowseView'
import { StatsView } from './views/StatsView'
import { SpotifyView } from './views/SpotifyView'
import { Icon } from './components/Icons'

export function App() {
  const route = useUi((s) => s.route)
  const settings = useUi((s) => s.settings)
  const setSettings = useUi((s) => s.setSettings)
  const setPlaylists = useUi((s) => s.setPlaylists)
  const setLiked = useUi((s) => s.setLiked)
  const setDownloads = useUi((s) => s.setDownloads)
  const setAccount = useUi((s) => s.setAccount)
  const nowPlayingFull = useUi((s) => s.nowPlayingFull)
  const queueOpen = useUi((s) => s.queueOpen)
  const setQueueOpen = useUi((s) => s.setQueueOpen)
  const toast = useUi((s) => s.toast)
  const setToast = useUi((s) => s.setToast)
  const volume = usePlayer((s) => s.volume)
  const setVolume = usePlayer((s) => s.setVolume)
  const shuffle = usePlayer((s) => s.shuffle)
  const setShuffle = usePlayer((s) => s.setShuffle)
  const repeat = usePlayer((s) => s.repeat)
  const setRepeat = usePlayer((s) => s.setRepeat)

  useEffect(() => {
    initPlayer()
    window.mochy.settings.get().then((s) => {
      setSettings(s as any)
      setVolume((s as any).volume ?? 0.8)
      setShuffle((s as any).shuffle ?? false)
      setRepeat((s as any).repeat ?? 'off')
      applySleepTimer()
      // module themes
      window.mochy.modules.applyThemes().then((vars: any) => { for (const k in vars) document.documentElement.style.setProperty(k, vars[k]) })
      // discord
      if ((s as any).discordEnabled && (s as any).discordClientId) {
        window.mochy.discord.init((s as any).discordClientId)
      }
    })
    window.mochy.playlists.list().then((p) => setPlaylists(p as any))
    window.mochy.library.liked().then((l) => setLiked(l as any))
    window.mochy.downloads.list().then((d) => setDownloads(d as any))
    // progress events
    const unsub = window.mochy.audio.onProgress(() => {
      // refresh downloads list on completion
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // apply theme settings
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.style.setProperty('--accent', settings.accent)
    root.style.setProperty('--accent-2', settings.accent)
    usePlayer.getState().setVolume(settings.volume)
    engineSetVolume(settings.volume)
    if (!settings.blur) {
      root.style.setProperty('--blur', 'none')
    } else {
      root.style.setProperty('--blur', 'blur(24px) saturate(140%)')
    }
    // spacing
    const spacing = settings.spacing === 'compact' ? '8px' : settings.spacing === 'spacious' ? '20px' : '14px'
    root.style.setProperty('--spacing', spacing)
    // anim speed
    const dur = settings.animSpeed === 'slow' ? '0.4s' : settings.animSpeed === 'fast' ? '0.1s' : '0.2s'
    root.style.setProperty('--anim-dur', dur)
    // audio engine
    setEqEnabled(settings.eqEnabled)
    applyEqBands(settings.eqBands)
    setBassBoost(settings.bassBoost)
    setEightD(settings.eightD)
    setExponentialVolume(settings.exponentialVolume)
    setReplayGain(settings.replayGainPreamp ?? 0)
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    if (audio) {
      audio.playbackRate = settings.nightcore ? 1.25 : settings.vaporwave ? 0.8 : settings.speed
      audio.preservesPitch = settings.pitch === 0 && !settings.nightcore && !settings.vaporwave
    }
    applySleepTimer()
  }, [settings])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); (usePlayer.getState().isPlaying ? pause() : play()) }
      if (e.code === 'ArrowRight') { e.preventDefault(); next() }
      if (e.code === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const queue = usePlayer((s) => s.queue)
  const index = usePlayer((s) => s.index)
  const setCurrentIndex = (i: number) => usePlayer.setState({ index: i, current: queue[i] })

  const renderMain = () => {
    switch (route.view) {
      case 'home': return <HomeView />
      case 'search': return <SearchView />
      case 'browse': return <BrowseView />
      case 'stats': return <StatsView />
      case 'spotify': return <SpotifyView />
      case 'library': return <LibraryView />
      case 'downloads': return <DownloadsView />
      case 'settings': return <SettingsView />
      case 'album':
      case 'artist':
      case 'playlist': return <CollectionView />
      default: return <HomeView />
    }
  }

  return (
    <>
      <div className="app-shell">
        <TitleBar />
        <Sidebar />
        <main className="main">{renderMain()}</main>
        <PlayerBar />
      </div>
      {nowPlayingFull && <NowPlayingFull />}
      {queueOpen && (
        <div className="modal-backdrop" onClick={() => setQueueOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 420, maxHeight: '70vh', overflow: 'auto' }}>
            <h2>Queue</h2>
            {queue.length === 0 && <div className="empty">Queue is empty.</div>}
            {queue.map((t, i) => (
              <div key={t.id + i} className={`track-row ${i === index ? 'playing' : ''}`} onClick={() => playTracks(queue, i)}>
                <div className="idx">{i + 1}</div>
                <div className="info">
                  <div className="t">{t.title}</div>
                  <div className="a">{t.artists.map((a) => a.name).join(', ')}</div>
                </div>
                <button className="btn" onClick={(e) => { e.stopPropagation(); usePlayer.getState().removeFromQueue(i) }}>✕</button>
              </div>
            ))}
            {queue.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => usePlayer.getState().clearQueue()}>Clear queue</button>
              </div>
            )}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

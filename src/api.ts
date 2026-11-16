// Web API client replacing window.mochy (Electron IPC)
const API = '' // same origin (Vercel) or use Render URL
const STREAM_API = 'http://192.168.100.181:3000'

export const api = {
  settings: {
    get: async () => {
      const s = localStorage.getItem('mochy-settings')
      return s ? JSON.parse(s) : null
    },
    set: (patch: any) => {
      const s = localStorage.getItem('mochy-settings')
      const cur = s ? JSON.parse(s) : {}
      const next = { ...cur, ...patch }
      localStorage.setItem('mochy-settings', JSON.stringify(next))
      return next
    }
  },
  search: (q: string, filter: string) => fetch(`${API}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
  suggest: (q: string) => Promise.resolve([]),
  home: () => fetch(`${API}/api/home`).then(r => r.json()).catch(() => []),
  album: (id: string) => fetch(`${API}/api/album/${id}`).then(r => r.json()),
  artist: (id: string) => fetch(`${API}/api/artist/${id}`).then(r => r.json()),
  playlist: (id: string) => fetch(`${API}/api/playlist/${id}`).then(r => r.json()),
  upnext: (id: string) => fetch(`${API}/api/upnext/${id}`).then(r => r.json()).catch(() => []),
  lyrics: (track: any, source?: string) => fetch(`${API}/api/lyrics?artist=${encodeURIComponent(track.artists.map((a:any)=>a.name).join(', '))}&title=${encodeURIComponent(track.title)}&duration=${track.duration}&album=${encodeURIComponent(track.album?.name||'')}`).then(r => r.json()),
  audio: {
    url: async (id: string) => ({ url: `${STREAM_API}/audio/${id}`, error: undefined }),
    prefetch: () => Promise.resolve(true),
    saveDownload: async (id: string, track: any) => {
      const a = document.createElement('a')
      a.href = `${STREAM_API}/download/${id}`
      a.download = `${track.title}.m4a`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // record in downloads list
      const item = { id, track, path: '', size: 0, createdAt: Date.now() }
      const d = localStorage.getItem('mochy-downloads')
      const arr = d ? JSON.parse(d) : []
      arr.unshift(item)
      localStorage.setItem('mochy-downloads', JSON.stringify(arr))
      return item
    },
    deleteCache: () => Promise.resolve(),
    clearCache: () => Promise.resolve(),
    cacheSize: () => Promise.resolve(0),
    onProgress: () => () => {}
  },
  downloads: {
    list: () => { const d = localStorage.getItem('mochy-downloads'); return Promise.resolve(d ? JSON.parse(d) : []) },
    remove: (id: string) => {
      const d = localStorage.getItem('mochy-downloads')
      const arr = d ? JSON.parse(d) : []
      localStorage.setItem('mochy-downloads', JSON.stringify(arr.filter((x: any) => x.id !== id)))
      return Promise.resolve()
    }
  },
  library: {
    liked: () => { const d = localStorage.getItem('mochy-liked'); return Promise.resolve(d ? JSON.parse(d) : []) },
    toggleLiked: (track: any) => {
      const d = localStorage.getItem('mochy-liked')
      const arr = d ? JSON.parse(d) : []
      const i = arr.findIndex((t: any) => t.id === track.id)
      if (i >= 0) { arr.splice(i, 1); localStorage.setItem('mochy-liked', JSON.stringify(arr)); return Promise.resolve(false) }
      arr.unshift(track); localStorage.setItem('mochy-liked', JSON.stringify(arr)); return Promise.resolve(true)
    },
    isLiked: (id: string) => { const d = localStorage.getItem('mochy-liked'); const arr = d ? JSON.parse(d) : []; return Promise.resolve(arr.some((t: any) => t.id === id)) },
    pushHistory: (track: any) => {
      const d = localStorage.getItem('mochy-history')
      const arr = d ? JSON.parse(d) : []
      const next = [track, ...arr.filter((t: any) => t.id !== track.id)].slice(0, 200)
      localStorage.setItem('mochy-history', JSON.stringify(next))
      return Promise.resolve()
    },
    history: () => { const d = localStorage.getItem('mochy-history'); return Promise.resolve(d ? JSON.parse(d) : []) }
  },
  playlists: {
    list: () => { const d = localStorage.getItem('mochy-playlists'); return Promise.resolve(d ? JSON.parse(d) : []) },
    create: (name: string) => {
      const d = localStorage.getItem('mochy-playlists')
      const arr = d ? JSON.parse(d) : []
      const pl = { id: 'pl_' + Date.now(), name, tracks: [], createdAt: Date.now() }
      arr.unshift(pl)
      localStorage.setItem('mochy-playlists', JSON.stringify(arr))
      return Promise.resolve(pl)
    },
    rename: (id: string, name: string) => {
      const d = localStorage.getItem('mochy-playlists')
      const arr = d ? JSON.parse(d) : []
      const pl = arr.find((p: any) => p.id === id)
      if (pl) { pl.name = name; localStorage.setItem('mochy-playlists', JSON.stringify(arr)) }
      return Promise.resolve()
    },
    delete: (id: string) => {
      const d = localStorage.getItem('mochy-playlists')
      const arr = d ? JSON.parse(d) : []
      localStorage.setItem('mochy-playlists', JSON.stringify(arr.filter((p: any) => p.id !== id)))
      return Promise.resolve()
    },
    add: (id: string, track: any) => {
      const d = localStorage.getItem('mochy-playlists')
      const arr = d ? JSON.parse(d) : []
      const pl = arr.find((p: any) => p.id === id)
      if (pl && !pl.tracks.some((t: any) => t.id === track.id)) { pl.tracks.push(track); if (!pl.thumbnail) pl.thumbnail = track.thumbnail; localStorage.setItem('mochy-playlists', JSON.stringify(arr)) }
      return Promise.resolve()
    },
    remove: (id: string, trackId: string) => {
      const d = localStorage.getItem('mochy-playlists')
      const arr = d ? JSON.parse(d) : []
      const pl = arr.find((p: any) => p.id === id)
      if (pl) { pl.tracks = pl.tracks.filter((t: any) => t.id !== trackId); localStorage.setItem('mochy-playlists', JSON.stringify(arr)) }
      return Promise.resolve()
    }
  },
  import: {
    spotify: (url: string) => Promise.resolve({ name: 'Imported', tracks: [] }),
    apple: (url: string) => Promise.resolve({ name: 'Imported', tracks: [] })
  },
  auth: {
    login: () => Promise.resolve({ signedIn: false, error: 'Not available on web' }),
    logout: () => Promise.resolve(true),
    library: () => Promise.resolve({ playlists: [], liked: [] })
  },
  shell: {
    openExternal: (url: string) => { window.open(url, '_blank'); return Promise.resolve() }
  },
  window: {
    minimize: () => {},
    maximize: () => {},
    close: () => {},
    isMaximized: () => Promise.resolve(false)
  },
  modules: {
    list: () => Promise.resolve([]),
    install: () => Promise.resolve({ ok: false }),
    toggle: () => Promise.resolve(true),
    delete: () => Promise.resolve(true),
    applyThemes: () => Promise.resolve({}),
    lyricsSources: () => Promise.resolve([])
  },
  dialog: {
    pickFolder: () => Promise.resolve(null)
  },
  discord: { init: () => Promise.resolve(false), update: () => Promise.resolve(true), clear: () => Promise.resolve(true) },
  lastfm: { getToken: () => Promise.resolve(''), getSession: () => Promise.resolve(''), nowPlaying: () => Promise.resolve(), scrobble: () => Promise.resolve() }
}

// Make available globally like Electron's window.mochy
;(window as any).mochy = api
export default api
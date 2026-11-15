import { create } from 'zustand'
import type { Track, Collection, SearchResults, AlbumDetails, ArtistDetails, PlaylistDetails, Playlist, LyricsResult, PlayerState, Route, Settings } from '@shared/types'

type UiState = {
  route: Route
  history: Route[]
  searchQuery: string
  searchFilter: 'songs' | 'albums' | 'artists' | 'playlists' | 'videos'
  searchResults: SearchResults | null
  searching: boolean
  suggestions: string[]
  home: { title: string; items: any[]; kind: string }[]
  homeLoading: boolean
  selectedCollection: AlbumDetails | ArtistDetails | PlaylistDetails | null
  loadingCollection: boolean
  lyrics: LyricsResult | null
  lyricsLoading: boolean
  nowPlayingFull: boolean
  queueOpen: boolean
  settings: Settings | null
  account: { signedIn: boolean; name?: string; avatar?: string } | null
  liked: any[]
  playlists: Playlist[]
  downloads: any[]
  toast: string | null
  setRoute: (r: Route, push?: boolean) => void
  back: () => void
  setSearchQuery: (q: string) => void
  setSearchFilter: (f: any) => void
  setSearchResults: (r: SearchResults | null) => void
  setSearching: (b: boolean) => void
  setSuggestions: (s: string[]) => void
  setHome: (h: any[]) => void
  setHomeLoading: (b: boolean) => void
  setSelectedCollection: (c: any) => void
  setLoadingCollection: (b: boolean) => void
  setLyrics: (l: LyricsResult | null) => void
  setLyricsLoading: (b: boolean) => void
  setNowPlayingFull: (b: boolean) => void
  setQueueOpen: (b: boolean) => void
  setSettings: (s: Settings) => void
  setAccount: (a: any) => void
  setLiked: (l: any[]) => void
  setPlaylists: (p: Playlist[]) => void
  setDownloads: (d: any[]) => void
  setToast: (t: string | null) => void
}

export const useUi = create<UiState>((set, get) => ({
  route: { view: 'home' },
  history: [],
  searchQuery: '',
  searchFilter: 'songs',
  searchResults: null,
  searching: false,
  suggestions: [],
  home: [],
  homeLoading: false,
  selectedCollection: null,
  loadingCollection: false,
  lyrics: null,
  lyricsLoading: false,
  nowPlayingFull: false,
  queueOpen: false,
  settings: null,
  account: null,
  liked: [],
  playlists: [],
  downloads: [],
  toast: null,
  setRoute: (r, push = true) => set((s) => ({
    route: r,
    history: push ? [...s.history, s.route] : s.history
  })),
  back: () => set((s) => {
    const prev = s.history[s.history.length - 1]
    if (!prev) return s
    return { route: prev, history: s.history.slice(0, -1) }
  }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchFilter: (f) => set({ searchFilter: f }),
  setSearchResults: (r) => set({ searchResults: r }),
  setSearching: (b) => set({ searching: b }),
  setSuggestions: (s) => set({ suggestions: s }),
  setHome: (h) => set({ home: h }),
  setHomeLoading: (b) => set({ homeLoading: b }),
  setSelectedCollection: (c) => set({ selectedCollection: c }),
  setLoadingCollection: (b) => set({ loadingCollection: b }),
  setLyrics: (l) => set({ lyrics: l }),
  setLyricsLoading: (b) => set({ lyricsLoading: b }),
  setNowPlayingFull: (b) => set({ nowPlayingFull: b }),
  setQueueOpen: (b) => set({ queueOpen: b }),
  setSettings: (s) => set({ settings: s }),
  setAccount: (a) => set({ account: a }),
  setLiked: (l) => set({ liked: l }),
  setPlaylists: (p) => set({ playlists: p }),
  setDownloads: (d) => set({ downloads: d }),
  setToast: (t) => set({ toast: t })
}))

// Player state lives separately
type PlayerStore = PlayerState & {
  setQueue: (tracks: Track[], index?: number) => void
  enqueue: (t: Track) => void
  removeFromQueue: (i: number) => void
  clearQueue: () => void
  setCurrent: (t: Track | null) => void
  setPlaying: (b: boolean) => void
  setPosition: (n: number) => void
  setDuration: (n: number) => void
  setVolume: (n: number) => void
  setShuffle: (b: boolean) => void
  setRepeat: (r: 'off' | 'all' | 'one') => void
  setLoading: (b: boolean) => void
  setBuffering: (b: boolean) => void
  setError: (e?: string) => void
  reorder: (from: number, to: number) => void
}

export const usePlayer = create<PlayerStore>((set, get) => ({
  queue: [],
  index: 0,
  current: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',
  loading: false,
  buffering: false,
  error: undefined,
  setQueue: (tracks, index = 0) => set({ queue: tracks, index, current: tracks[index] ?? null }),
  enqueue: (t) => set((s) => ({ queue: [...s.queue, t] })),
  removeFromQueue: (i) => set((s) => {
    const q = s.queue.filter((_, idx) => idx !== i)
    let idx = s.index
    if (i < idx) idx--
    if (idx >= q.length) idx = Math.max(0, q.length - 1)
    return { queue: q, index: idx, current: q[idx] ?? null }
  }),
  clearQueue: () => set({ queue: [], index: 0, current: null, isPlaying: false }),
  setCurrent: (t) => set({ current: t }),
  setPlaying: (b) => set({ isPlaying: b }),
  setPosition: (n) => set({ position: n }),
  setDuration: (n) => set({ duration: n }),
  setVolume: (n) => set({ volume: n }),
  setShuffle: (b) => set({ shuffle: b }),
  setRepeat: (r) => set({ repeat: r }),
  setLoading: (b) => set({ loading: b }),
  setBuffering: (b) => set({ buffering: b }),
  setError: (e) => set({ error: e }),
  reorder: (from, to) => set((s) => {
    const q = [...s.queue]
    const [moved] = q.splice(from, 1)
    q.splice(to, 0, moved)
    let idx = s.index
    if (s.index === from) idx = to
    else if (from < s.index && to >= s.index) idx--
    else if (from > s.index && to <= s.index) idx++
    return { queue: q, index: idx }
  })
}))

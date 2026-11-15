import { useUi, usePlayer } from '../store'
import { Icon } from './Icons'

const NAV = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'browse', label: 'Browse', icon: 'search' },
  { id: 'spotify', label: 'Spotify', icon: 'search' },
  { id: 'library', label: 'Library', icon: 'library' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'stats', label: 'Stats', icon: 'library' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
] as const

export function Sidebar() {
  const route = useUi((s) => s.route)
  const setRoute = useUi((s) => s.setRoute)
  const playlists = useUi((s) => s.playlists)

  const active = (id: string) => route.view === id

  return (
    <aside className="sidebar">
      {NAV.map((n) => (
        <button key={n.id} className={`nav-item ${active(n.id) ? 'active' : ''}`} onClick={() => setRoute({ view: n.id as any })}>
          <Icon name={n.icon} size={18} />
          <span>{n.label}</span>
        </button>
      ))}
      <div className="section">Playlists</div>
      {playlists.length === 0 && <div className="playlist-item" style={{ color: 'var(--text-muted)', cursor: 'default' }}>No playlists yet</div>}
      {playlists.map((p) => (
        <button key={p.id} className={`playlist-item ${route.view === 'playlist' && route.id === p.id ? 'active' : ''}`} onClick={() => setRoute({ view: 'playlist', id: p.id })}>
          {p.name}
        </button>
      ))}
      <div style={{ marginTop: 'auto', padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
        Mochy Desktop · beta
      </div>
    </aside>
  )
}

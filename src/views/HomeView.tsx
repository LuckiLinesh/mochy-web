import { useEffect } from 'react'
import { useUi } from '../store'
import { Card } from '../components/Card'
import { TrackRow } from '../components/TrackRow'
import { playTracks } from '../player'
import { Icon } from '../components/Icons'

export function HomeView() {
  const home = useUi((s) => s.home)
  const homeLoading = useUi((s) => s.homeLoading)
  const setHome = useUi((s) => s.setHome)
  const setHomeLoading = useUi((s) => s.setHomeLoading)
  const setRoute = useUi((s) => s.setRoute)

  useEffect(() => {
    if (home.length === 0 && !homeLoading) {
      setHomeLoading(true)
      window.mochy.home().then((h) => {
        setHome(h as any)
        setHomeLoading(false)
      }).catch(() => setHomeLoading(false))
    }
  }, [])

  if (homeLoading) return <div className="empty"><span className="spinner" /> Loading…</div>
  if (!home.length) return <div className="empty">No recommendations yet. Search for something.</div>

  return (
    <div>
      <div className="hero">
        <h1>Good evening</h1>
        <p>Your music, your way.</p>
      </div>
      {home.map((sec: any, i: number) => (
        <div key={i}>
          <div className="section-title">{sec.title}</div>
          {sec.kind === 'tracks' ? (
            <div>
              {sec.items.slice(0, 10).map((t: any, idx: number) => (
                <TrackRow key={t.id + idx} track={t} index={idx} queue={sec.items} />
              ))}
            </div>
          ) : (
            <div className="card-grid">
              {sec.items.map((c: any) => (
                <Card key={c.id} item={c} onClick={() => {
                  if (c.kind === 'album') setRoute({ view: 'album', id: c.id })
                  else if (c.kind === 'artist') setRoute({ view: 'artist', id: c.id })
                  else if (c.kind === 'playlist') setRoute({ view: 'playlist', id: c.id })
                }} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

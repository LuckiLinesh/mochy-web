import type { Collection, Track } from '@shared/types'

export function Card({ item, onClick }: { item: Collection | Track; onClick: () => void }) {
  const isTrack = 'artists' in item
  const title = isTrack ? (item as Track).title : (item as Collection).title
  const sub = isTrack
    ? (item as Track).artists.map((a) => a.name).join(', ')
    : (item as Collection).subtitle
  const thumb = isTrack ? (item as Track).thumbnail : (item as Collection).thumbnail
  return (
    <div className="card" onClick={onClick}>
      <img className="art" src={thumb} alt="" loading="lazy" />
      <div className="title">{title}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

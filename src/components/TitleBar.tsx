import { Icon } from './Icons'

export function TitleBar() {
  return (
    <div className="titlebar">
      <div className="brand">MOCHY MUSIC</div>
      <div className="controls">
        <button className="ctrl" onClick={() => window.mochy.window.minimize()} aria-label="minimize"><Icon name="minimize" size={14} /></button>
        <button className="ctrl" onClick={() => window.mochy.window.maximize()} aria-label="maximize"><Icon name="maximize" size={13} /></button>
        <button className="ctrl close" onClick={() => window.mochy.window.close()} aria-label="close"><Icon name="close" size={14} /></button>
      </div>
    </div>
  )
}

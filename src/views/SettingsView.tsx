import { useEffect, useState } from 'react'
import { useUi } from '../store'
import { Icon } from '../components/Icons'
import { applySleepTimer } from '../player'

export function SettingsView() {
  const settings = useUi((s) => s.settings)
  const setSettings = useUi((s) => s.setSettings)
  const setAccount = useUi((s) => s.setAccount)
  const account = useUi((s) => s.account)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [cacheSize, setCacheSize] = useState<number | null>(null)
  const [settingsQ, setSettingsQ] = useState('')
  const [mods, setMods] = useState<any[]>([])

  useEffect(() => {
    if (!settings) window.mochy.settings.get().then((s) => setSettings(s as any))
    window.mochy.audio.cacheSize().then((n) => setCacheSize(n as number))
    window.mochy.modules.list().then((m) => setMods(m as any[]))
    window.mochy.modules.applyThemes().then((vars: any) => { for (const k in vars) document.documentElement.style.setProperty(k, vars[k]) })
  }, [])

  const update = (patch: any) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    window.mochy.settings.set(patch)
  }

  const login = async () => {
    const r = await window.mochy.auth.login()
    setAccount(r as any)
    useUi.getState().setToast(r.signedIn ? `Signed in${r.name ? ' as ' + r.name : ''}` : 'Sign-in failed')
  }

  const doImport = async (kind: 'spotify' | 'apple') => {
    if (!importUrl.trim()) return
    setImporting(true)
    try {
      const r = kind === 'spotify' ? await window.mochy.import.spotify(importUrl.trim()) : await window.mochy.import.apple(importUrl.trim())
      const pl = await window.mochy.playlists.create(r.name)
      for (const t of r.tracks) await window.mochy.playlists.add(pl.id, t)
      const list = await window.mochy.playlists.list()
      useUi.getState().setPlaylists(list as any)
      useUi.getState().setToast(`Imported ${r.tracks.length} tracks`)
      setImportUrl('')
    } catch (e: any) {
      useUi.getState().setToast('Import failed: ' + (e?.message ?? ''))
    } finally {
      setImporting(false)
    }
  }

  if (!settings) return <div className="empty"><span className="spinner" /> Loading…</div>

  return (
    <div>
      <div className="hero"><h1>Settings</h1><p>Make Mochy yours.</p></div>
      <div className="search-bar" style={{ marginBottom: 18 }}>
        <Icon name="search" size={16} />
        <input value={settingsQ} onChange={(e) => setSettingsQ(e.target.value)} placeholder="Search settings…" />
      </div>

      <div className="section-title">Account</div>
      <div className="settings-row">
        <div>
          <div className="label">YouTube Music</div>
          <div className="desc">{account?.signedIn ? `Signed in${account.name ? ' as ' + account.name : ''}` : 'Sign in to sync your library and playlists.'}</div>
        </div>
        {account?.signedIn ? (
          <button className="btn" onClick={() => { window.mochy.auth.logout(); setAccount({ signedIn: false }) }}>Sign out</button>
        ) : (
          <button className="btn primary" onClick={login}>Sign in</button>
        )}
      </div>

      <div className="section-title">Import playlist</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="Spotify or Apple Music playlist URL" style={{ flex: 1, height: 40, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', color: 'var(--text)' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" disabled={importing} onClick={() => doImport('spotify')}>{importing ? <span className="spinner" /> : 'Import from Spotify'}</button>
        <button className="btn" disabled={importing} onClick={() => doImport('apple')}>{importing ? <span className="spinner" /> : 'Import from Apple Music'}</button>
      </div>

      <div className="section-title">Playback</div>
      <div className="settings-row">
        <div>
          <div className="label">Default volume</div>
          <div className="desc">Initial volume on launch.</div>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={settings.volume} onChange={(e) => update({ volume: parseFloat(e.target.value) })} style={{ width: 140, accentColor: 'var(--accent)' }} />
      </div>

      <div className="section-title">Storage</div>
      <div className="settings-row">
        <div>
          <div className="label">Audio cache size</div>
          <div className="desc">{cacheSize !== null ? `${cacheSize} MB used` : 'Calculating…'}</div>
        </div>
        <button className="btn" onClick={() => window.mochy.audio.clearCache().then(() => { window.mochy.audio.cacheSize().then((n) => setCacheSize(n as number)); useUi.getState().setToast('Cache cleared') })}>Clear</button>
      </div>

      <div className="section-title">Audio effects</div>
      <div className="settings-row">
        <div><div className="label">Equalizer</div><div className="desc">10-band EQ. Enable to apply.</div></div>
        <button className={`btn ${settings.eqEnabled ? 'primary' : ''}`} onClick={() => update({ eqEnabled: !settings.eqEnabled })}>{settings.eqEnabled ? 'On' : 'Off'}</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['Flat','Bass Boost','Treble Boost','Vocal','Rock','Pop','Jazz','Classical','Electronic'].map((p) => (
          <button key={p} className={`filter ${settings.eqPreset === p ? 'active' : ''}`} onClick={() => {
            const presets: Record<string, number[]> = {
              'Flat': [0,0,0,0,0,0,0,0,0,0],
              'Bass Boost': [6,5,4,2,1,0,0,0,0,0],
              'Treble Boost': [0,0,0,0,0,1,2,3,4,5],
              'Vocal': [-2,-1,0,2,4,4,3,1,0,-1],
              'Rock': [4,3,2,0,-1,-1,0,2,3,4],
              'Pop': [-1,0,2,3,3,2,1,0,-1,-1],
              'Jazz': [3,2,1,1,0,-1,-1,0,1,2],
              'Classical': [4,3,2,1,0,0,0,1,2,3],
              'Electronic': [5,4,2,0,-1,-1,0,2,3,4]
            }
            update({ eqPreset: p, eqBands: presets[p] })
          }}>{p}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6, marginBottom: 16 }}>
        {settings.eqBands.map((g: number, i: number) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <input type="range" min={-12} max={12} step={1} value={g} style={{ writingMode: 'vertical-lr', height: 90, accentColor: 'var(--accent)' }} onChange={(e) => {
              const b = [...settings.eqBands]; b[i] = parseInt(e.target.value); update({ eqBands: b, eqPreset: 'Custom' })
            }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{[32,64,125,250,500,'1k','2k','4k','8k','16k'][i]}</div>
          </div>
        ))}
      </div>
      <div className="settings-row">
        <div><div className="label">Bass boost</div><div className="desc">Extra low-end punch.</div></div>
        <input type="range" min={0} max={12} step={1} value={settings.bassBoost} onChange={(e) => update({ bassBoost: parseInt(e.target.value) })} style={{ width: 140, accentColor: 'var(--accent)' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Speed</div><div className="desc">Playback speed.</div></div>
        <input type="range" min={0.5} max={2} step={0.05} value={settings.speed} onChange={(e) => update({ speed: parseFloat(e.target.value) })} style={{ width: 140, accentColor: 'var(--accent)' }} />
        <span style={{ marginLeft: 8, fontSize: 12 }}>{settings.speed.toFixed(2)}x</span>
      </div>
      <div className="settings-row">
        <div><div className="label">8D audio</div><div className="desc">Rotating stereo pan.</div></div>
        <button className={`btn ${settings.eightD ? 'primary' : ''}`} onClick={() => update({ eightD: !settings.eightD })}>{settings.eightD ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Nightcore</div><div className="desc">Faster + higher pitch.</div></div>
        <button className={`btn ${settings.nightcore ? 'primary' : ''}`} onClick={() => update({ nightcore: !settings.nightcore, speed: settings.nightcore ? 1 : 1.25 })}>{settings.nightcore ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Vaporwave</div><div className="desc">Slower + lower pitch.</div></div>
        <button className={`btn ${settings.vaporwave ? 'primary' : ''}`} onClick={() => update({ vaporwave: !settings.vaporwave, speed: settings.vaporwave ? 1 : 0.8 })}>{settings.vaporwave ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Crossfade</div><div className="desc">Seconds to fade between tracks.</div></div>
        <input type="range" min={0} max={12} step={1} value={settings.crossfade} onChange={(e) => update({ crossfade: parseInt(e.target.value) })} style={{ width: 140, accentColor: 'var(--accent)' }} />
        <span style={{ marginLeft: 8, fontSize: 12 }}>{settings.crossfade}s</span>
      </div>
      <div className="settings-row">
        <div><div className="label">Mono audio</div><div className="desc">Combine left and right channels.</div></div>
        <button className={`btn ${settings.monoAudio ? 'primary' : ''}`} onClick={() => update({ monoAudio: !settings.monoAudio })}>{settings.monoAudio ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Exponential volume</div><div className="desc">Finer control at low volumes.</div></div>
        <button className={`btn ${settings.exponentialVolume ? 'primary' : ''}`} onClick={() => update({ exponentialVolume: !settings.exponentialVolume })}>{settings.exponentialVolume ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">ReplayGain pre-amp (dB)</div><div className="desc">Manual gain adjustment.</div></div>
        <input type="range" min={-12} max={12} step={0.5} value={settings.replayGainPreamp} onChange={(e) => update({ replayGainPreamp: parseFloat(e.target.value) })} style={{ width: 140, accentColor: 'var(--accent)' }} />
        <span style={{ marginLeft: 8, fontSize: 12 }}>{settings.replayGainPreamp}dB</span>
      </div>

      <div className="section-title">Appearance</div>
      <div className="settings-row">
        <div><div className="label">Accent color</div><div className="desc">Highlight color.</div></div>
        <input type="color" value={settings.accent} onChange={(e) => update({ accent: e.target.value })} style={{ width: 48, height: 32, border: 'none', background: 'none' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Blur effects</div><div className="desc">Blurry backgrounds (disable if laggy).</div></div>
        <button className={`btn ${settings.blur ? 'primary' : ''}`} onClick={() => update({ blur: !settings.blur })}>{settings.blur ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Spacing</div><div className="desc">UI density.</div></div>
        <select value={settings.spacing} onChange={(e) => update({ spacing: e.target.value })} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
      </div>
      <div className="settings-row">
        <div><div className="label">Animation speed</div></div>
        <select value={settings.animSpeed} onChange={(e) => update({ animSpeed: e.target.value })} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>

      <div className="section-title">Data saver</div>
      <div className="settings-row">
        <div><div className="label">Data saver</div><div className="desc">Play lighter streams on mobile data.</div></div>
        <button className={`btn ${settings.dataSaver ? 'primary' : ''}`} onClick={() => update({ dataSaver: !settings.dataSaver })}>{settings.dataSaver ? 'On' : 'Off'}</button>
      </div>

      <div className="section-title">Sleep timer</div>
      <div className="settings-row">
        <div><div className="label">Sleep timer (minutes)</div><div className="desc">Pause playback after this many minutes. 0 = off.</div></div>
        <input type="number" min={0} max={240} value={settings.sleepTimer} onChange={(e) => { update({ sleepTimer: parseInt(e.target.value) || 0 }); applySleepTimer() }} style={{ width: 80, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>

      <div className="section-title">Lyrics source</div>
      <div className="settings-row">
        <div><div className="label">Provider</div></div>
        <select value={settings.lyricsSource} onChange={(e) => update({ lyricsSource: e.target.value })} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          <option value="auto">Auto (LRCLIB)</option>
          <option value="lrclib">LRCLIB</option>
          <option value="better">Better Lyrics</option>
          <option value="simpmusic">SimpMusic</option>
        </select>
      </div>

      <div className="section-title">Discord Rich Presence</div>
      <div className="settings-row">
        <div><div className="label">Enable</div><div className="desc">Show current track in Discord.</div></div>
        <button className={`btn ${settings.discordEnabled ? 'primary' : ''}`} onClick={() => { update({ discordEnabled: !settings.discordEnabled }); if (!settings.discordEnabled && settings.discordClientId) window.mochy.discord.init(settings.discordClientId) }}>Toggle</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Client ID</div><div className="desc">Your Discord application client ID.</div></div>
        <input value={settings.discordClientId} onChange={(e) => update({ discordClientId: e.target.value })} placeholder="Discord client ID" style={{ width: 220, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>

      <div className="section-title">Last.fm scrobbling</div>
      <div className="settings-row">
        <div><div className="label">Enable</div></div>
        <button className={`btn ${settings.lastfmEnabled ? 'primary' : ''}`} onClick={() => update({ lastfmEnabled: !settings.lastfmEnabled })}>{settings.lastfmEnabled ? 'On' : 'Off'}</button>
      </div>
      <div className="settings-row">
        <div><div className="label">API key</div></div>
        <input value={settings.lastfmApiKey} onChange={(e) => update({ lastfmApiKey: e.target.value })} style={{ width: 220, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Shared secret</div></div>
        <input value={settings.lastfmSecret} onChange={(e) => update({ lastfmSecret: e.target.value })} style={{ width: 220, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Session key</div><div className="desc">Authorize via Last.fm to get this.</div></div>
        <button className="btn" onClick={async () => {
          if (!settings.lastfmApiKey) { useUi.getState().setToast('Enter API key first'); return }
          try {
            const token = await window.mochy.lastfm.getToken(settings.lastfmApiKey)
            window.mochy.shell.openExternal(`https://www.last.fm/api/auth/?api_key=${settings.lastfmApiKey}&token=${token}`)
            useUi.getState().setToast('Authorize in browser, then paste token')
            const session = await window.mochy.lastfm.getSession(settings.lastfmApiKey, settings.lastfmSecret, token)
            if (session) { update({ lastfmSession: session }); useUi.getState().setToast('Last.fm connected') }
          } catch { useUi.getState().setToast('Last.fm auth failed') }
        }}>Connect</button>
      </div>

      <div className="section-title">Modules</div>
      <div className="settings-row">
        <div><div className="label">Install module</div><div className="desc">Load a module from a folder containing manifest.json.</div></div>
        <button className="btn primary" onClick={async () => {
          const r = await window.mochy.modules.install()
          if (r?.ok) {
            const vars = await window.mochy.modules.applyThemes()
            for (const k in vars) document.documentElement.style.setProperty(k, vars[k])
            setMods(await window.mochy.modules.list())
            useUi.getState().setToast('Module installed: ' + r.id)
          } else {
            useUi.getState().setToast('Install failed: ' + (r?.error ?? ''))
          }
        }}>Install from folder</button>
      </div>
      {mods.map((m: any) => (
        <div key={m.id} className="settings-row">
          <div>
            <div className="label">{m.manifest.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>v{m.manifest.version ?? '1.0'}</span></div>
            <div className="desc">{m.manifest.description ?? ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className={`btn ${m.manifest.enabled !== false ? 'primary' : ''}`} onClick={async () => {
              await window.mochy.modules.toggle(m.id, m.manifest.enabled === false)
              setMods(await window.mochy.modules.list())
            }}>{m.manifest.enabled !== false ? 'Enabled' : 'Disabled'}</button>
            <button className="btn" onClick={async () => {
              if (confirm('Delete module?')) {
                await window.mochy.modules.delete(m.id)
                setMods(await window.mochy.modules.list())
              }
            }}>Delete</button>
          </div>
        </div>
      ))}
      {mods.length === 0 && <div className="empty">No modules installed.</div>}

      <div className="section-title">Theme presets</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { name: 'Mochy Dark', vars: { '--bg': '#0b0b0f', '--text': '#f4f4f8', '--accent': '#b4befe' } },
          { name: 'OLED', vars: { '--bg': '#000000', '--text': '#ffffff', '--accent': '#b4befe' } },
          { name: 'Light', vars: { '--bg': '#f5f5f7', '--text': '#1a1a1a', '--accent': '#6366f1' } },
          { name: 'Ocean', vars: { '--bg': '#0a1628', '--text': '#e0f2fe', '--accent': '#38bdf8' } },
          { name: 'Forest', vars: { '--bg': '#0a1a0f', '--text': '#dcfce7', '--accent': '#4ade80' } },
          { name: 'Mocha', vars: { '--bg': '#1e1e2e', '--text': '#cdd6f4', '--accent': '#cba6f7' } }
        ].map((t) => (
          <button key={t.name} className="btn" onClick={() => {
            for (const k in t.vars) document.documentElement.style.setProperty(k, (t.vars as any)[k])
            update({ theme: t.name })
          }}>{t.name}</button>
        ))}
      </div>
      <div className="settings-row">
        <div><div className="label">Custom CSS</div><div className="desc">Applied to the app. Use CSS variables.</div></div>
      </div>
      <textarea value={settings.customCss} onChange={(e) => update({ customCss: e.target.value })} placeholder="/* custom css */" style={{ width: '100%', minHeight: 80, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 }} />
      {settings.customCss && <style>{settings.customCss}</style>}

      <div className="section-title">Audio source</div>
      <div className="settings-row">
        <div><div className="label">Source</div><div className="desc">YouTube Music or Monochrome (Tidal HiFi).</div></div>
        <select value={settings.audioSource} onChange={(e) => update({ audioSource: e.target.value })} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          <option value="youtube">YouTube Music</option>
          <option value="monochrome">Monochrome (Tidal)</option>
        </select>
      </div>
      <div className="settings-row">
        <div><div className="label">Tidal API URL</div><div className="desc">Your Tidal HiFi API server (for Monochrome source).</div></div>
        <input value={settings.tidalApiUrl} onChange={(e) => update({ tidalApiUrl: e.target.value })} placeholder="https://your-tidal-api" style={{ width: 220, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Monochrome quality</div></div>
        <select value={settings.monochromeQuality} onChange={(e) => update({ monochromeQuality: e.target.value })} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
          <option value="HI_RES">Hi-Res</option>
          <option value="LOSSLESS">Lossless</option>
          <option value="HIGH">High</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="section-title">Download folder</div>
      <div className="settings-row">
        <div><div className="label">Folder</div><div className="desc">{settings.downloadFolder || 'Default (userData/downloads)'}</div></div>
        <button className="btn" onClick={async () => {
          const f = await window.mochy.dialog.pickFolder()
          if (f) update({ downloadFolder: f })
        }}>Choose…</button>
      </div>

      <div className="section-title">Backup & restore</div>
      <div className="settings-row">
        <div><div className="label">Export library</div><div className="desc">Download your playlists, liked songs and settings as JSON.</div></div>
        <button className="btn" onClick={() => {
          const data = { settings, liked: useUi.getState().liked, playlists: useUi.getState().playlists, downloads: useUi.getState().downloads }
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'mochy-backup.json'; a.click(); URL.revokeObjectURL(url)
        }}>Export</button>
      </div>
      <div className="settings-row">
        <div><div className="label">Import backup</div><div className="desc">Restore from a JSON backup file.</div></div>
        <label className="btn" style={{ cursor: 'pointer' }}>
          Import
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            const text = await f.text()
            try {
              const data = JSON.parse(text)
              if (data.settings) { window.mochy.settings.set(data.settings); useUi.getState().setSettings(data.settings) }
              if (data.playlists) { for (const p of data.playlists) { const pl = await window.mochy.playlists.create(p.name); for (const t of p.tracks) await window.mochy.playlists.add(pl.id, t) } }
              if (data.liked) { for (const t of data.liked) await window.mochy.library.toggleLiked(t) }
              useUi.getState().setToast('Backup restored')
            } catch { useUi.getState().setToast('Invalid backup file') }
          }} />
        </label>
      </div>

      <div className="section-title">Blocked content</div>
      <div className="settings-row">
        <div><div className="label">Clear blocked list</div><div className="desc">Unblock all artists, albums and tracks.</div></div>
        <button className="btn" onClick={() => { localStorage.removeItem('mochy-blocked'); useUi.getState().setToast('Cleared') }}>Clear</button>
      </div>

      <div className="section-title">Spotify</div>
      <div className="settings-row">
        <div><div className="label">Client ID</div><div className="desc">From your Spotify app at developer.spotify.com.</div></div>
        <input value={settings.spotifyClientId} onChange={(e) => update({ spotifyClientId: e.target.value })} placeholder="Spotify client ID" style={{ width: 220, background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }} />
      </div>
      <div className="settings-row">
        <div><div className="label">Redirect URI</div><div className="desc">Register this exact URI in your Spotify app settings.</div></div>
        <code style={{ background: 'var(--panel-2)', padding: '6px 10px', borderRadius: 8, fontSize: 12 }}>http://127.0.0.1:8888/callback</code>
      </div>
      <div className="settings-row">
        <div><div className="label">Connect</div><div className="desc">Sign in to access your playlists and liked songs.</div></div>
        <button className="btn primary" onClick={async () => {
          if (!settings.spotifyClientId) { useUi.getState().setToast('Enter client ID first'); return }
          const r = await window.mochy.spotify.login()
          if (r?.ok) useUi.getState().setToast('Spotify connected' + (r.name ? ' as ' + r.name : ''))
          else useUi.getState().setToast('Spotify login failed: ' + (r?.error ?? ''))
        }}>Connect Spotify</button>
      </div>

      <div className="section-title">About</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
        Mochy Desktop — an unofficial desktop companion. Not affiliated with YouTube, Spotify, or Apple. Music is fetched from third-party services when you ask for it.
      </div>
    </div>
  )
}

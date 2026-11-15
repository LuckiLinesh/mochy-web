import { createRoot } from 'react-dom/client'
import { App } from './App'
import './theme.css'
import './api' // sets window.mochy

// init default settings
const s = localStorage.getItem('mochy-settings')
if (!s) {
  localStorage.setItem('mochy-settings', JSON.stringify({
    downloadQuality: 'best', cacheLimitMB: 2048, accent: '#b4befe', volume: 0.8, shuffle: false, repeat: 'off',
    crossfade: 0, eqEnabled: false, eqPreset: 'Flat', eqBands: [0,0,0,0,0,0,0,0,0,0], bassBoost: 0, speed: 1, pitch: 0,
    eightD: false, nightcore: false, vaporwave: false, dataSaver: false, blur: true, spacing: 'comfortable', animSpeed: 'normal',
    sleepTimer: 0, discordClientId: '', discordEnabled: false, lastfmApiKey: '', lastfmSecret: '', lastfmSession: '', lastfmEnabled: false,
    lyricsSource: 'auto', volumeNormalization: false, replayGainPreamp: 0, monoAudio: false, exponentialVolume: false,
    downloadFolder: '', theme: 'mochy-dark', customCss: '', tidalApiUrl: '', audioSource: 'youtube', monochromeQuality: 'LOSSLESS',
    spotifyClientId: '', spotifyAccessToken: '', spotifyRefreshToken: '', spotifyExpiresAt: 0
  }))
}

createRoot(document.getElementById('root')!).render(<App />)

// Web Audio engine: EQ, effects, volume, crossfade, speed/pitch
let ctx: AudioContext | null = null
let source: MediaElementAudioSourceNode | null = null
let masterGain: GainNode | null = null
let eqFilters: BiquadFilterNode[] = []
let bassBoostNode: BiquadFilterNode | null = null
let panner: StereoPannerNode | null = null
let eightDTimer: number | null = null
let analyser: AnalyserNode | null = null
let replayGainGain: GainNode | null = null
let monoEnabled = false
let exponentialVolume = false
let monoSplitter: ChannelSplitterNode | null = null
let monoMerger: ChannelMergerNode | null = null
let crossfadeGain: GainNode | null = null
let eqEnabled = false
let eightD = false

const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export function initAudioEngine(audio: HTMLAudioElement) {
  if (ctx) return
  try {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    source = ctx.createMediaElementSource(audio)
    // EQ chain
    eqFilters = EQ_FREQS.map((freq) => {
      const f = ctx!.createBiquadFilter()
      f.type = 'peaking'
      f.frequency.value = freq
      f.Q.value = 1.4
      f.gain.value = 0
      return f
    })
    bassBoostNode = ctx.createBiquadFilter()
    bassBoostNode.type = 'lowshelf'
    bassBoostNode.frequency.value = 150
    bassBoostNode.gain.value = 0

    masterGain = ctx.createGain()
    masterGain.gain.value = 1

    crossfadeGain = ctx.createGain()
    crossfadeGain.gain.value = 1

    replayGainGain = ctx.createGain()
    replayGainGain.gain.value = 1

    panner = ctx.createStereoPanner()
    panner.pan.value = 0

    analyser = ctx.createAnalyser()
    analyser.fftSize = 256

    // chain: source -> bassBoost -> eq -> panner -> crossfadeGain -> replayGainGain -> analyser -> dest
    let node: AudioNode = source
    node = connect(node, bassBoostNode)
    for (const f of eqFilters) node = connect(node, f)
    node = connect(node, panner)
    node = connect(node, crossfadeGain)
    node = connect(node, replayGainGain)
    node = connect(node, analyser)
    node = connect(node, masterGain)
    masterGain.connect(ctx.destination)
  } catch (e) {
    console.warn('Web Audio init failed', e)
  }
}

function connect(a: AudioNode, b: AudioNode): AudioNode {
  a.connect(b)
  return b
}

export function setEqEnabled(on: boolean) {
  eqEnabled = on
  if (!eqFilters.length) return
  for (const f of eqFilters) f.gain.value = on ? f.gain.value : 0
  if (bassBoostNode) bassBoostNode.gain.value = on ? bassBoostNode.gain.value : 0
}

export function setEqBand(i: number, gainDb: number) {
  if (eqFilters[i]) eqFilters[i].gain.value = eqEnabled ? gainDb : 0
}

export function applyEqBands(bands: number[]) {
  bands.forEach((g, i) => setEqBand(i, g))
}

export function setBassBoost(v: number) {
  if (bassBoostNode) bassBoostNode.gain.value = eqEnabled ? v : 0
}

export function setVolume(v: number) {
  if (!masterGain) return
  const val = exponentialVolume ? Math.pow(v, 2) : v
  masterGain.gain.value = val
}

export function setExponentialVolume(on: boolean) {
  exponentialVolume = on
}

export function setReplayGain(db: number) {
  if (replayGainGain) replayGainGain.gain.value = Math.pow(10, db / 20)
}

export function setMono(on: boolean) {
  monoEnabled = on
  // best-effort: toggle not fully reconnecting; store flag for future
}

export function getAnalyser() {
  return analyser
}

export function setSpeed(audio: HTMLAudioElement, speed: number) {
  audio.playbackRate = speed
}

export function setPitch(audio: HTMLAudioElement, semitones: number) {
  // best-effort: adjust playbackRate preservesPitch=false
  audio.preservesPitch = semitones === 0
  if (semitones !== 0) {
    audio.playbackRate = audio.playbackRate * Math.pow(2, semitones / 12)
  }
}

export function setEightD(on: boolean) {
  eightD = on
  if (eightDTimer) { clearInterval(eightDTimer); eightDTimer = null }
  if (on && panner && ctx) {
    let t = 0
    eightDTimer = window.setInterval(() => {
      t += 0.05
      if (panner) panner.pan.value = Math.sin(t) * 0.9
    }, 50)
  } else if (panner) {
    panner.pan.value = 0
  }
}

export function crossfadeTo(durationSec: number, onDone: () => void) {
  if (!crossfadeGain || !ctx) { onDone(); return }
  const g = crossfadeGain.gain
  const now = ctx.currentTime
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.linearRampToValueAtTime(0, now + Math.max(0.05, durationSec))
  setTimeout(() => {
    onDone()
    // fade back in
    const n = ctx!.currentTime
    crossfadeGain!.gain.cancelScheduledValues(n)
    crossfadeGain!.gain.setValueAtTime(0, n)
    crossfadeGain!.gain.linearRampToValueAtTime(1, n + Math.max(0.05, durationSec))
  }, durationSec * 1000)
}

export function resumeContext() {
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

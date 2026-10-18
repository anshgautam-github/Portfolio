// Procedural paper / book sounds (no audio files). Everything is synthesised with WebAudio, created lazily
// inside a user gesture, and never throws.
let ctx = null;
let muted = false;
let noiseBuf = null;

const get = () => {
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch (_) {
    return null;
  }
};

// 2s of white noise, reused by every sound
const noise = (c) => {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * 2);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
};

// sparse little clicks = paper fibres crackling
const crackle = (c, dur, density) => {
  const n = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) {
    if (Math.random() < density) d[i] = (Math.random() * 2 - 1) * (0.4 + Math.random() * 0.6);
  }
  return b;
};

const env = (g, t, peak, attack, total) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + total);
};

export const setMuted = (m) => {
  muted = m;
};
export const isMuted = () => muted;

/** A page turning: airy swoosh that sweeps up then down, paper crackle, soft landing tap. */
export function flip({ speed = 1, vol = 1 } = {}) {
  const c = get();
  if (!c || muted) return;
  const t = c.currentTime + 0.01;
  const d = 0.85 / speed;
  const out = c.createGain();
  out.gain.value = 0.9 * vol;
  out.connect(c.destination);

  // swoosh
  const s = c.createBufferSource();
  s.buffer = noise(c);
  s.playbackRate.value = 0.85 + Math.random() * 0.3;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.7;
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.exponentialRampToValueAtTime(3400, t + d * 0.42);
  bp.frequency.exponentialRampToValueAtTime(1000, t + d);
  const g = c.createGain();
  env(g, t, 0.5, d * 0.3, d);
  s.connect(bp).connect(g).connect(out);
  s.start(t);
  s.stop(t + d + 0.05);

  // crackle
  const k = c.createBufferSource();
  k.buffer = crackle(c, d * 0.7, 0.012);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2200;
  const kg = c.createGain();
  env(kg, t, 0.28, d * 0.15, d * 0.7);
  k.connect(hp).connect(kg).connect(out);
  k.start(t);

  // landing tap
  const o = c.createOscillator();
  o.type = "sine";
  const tl = t + d * 0.86;
  o.frequency.setValueAtTime(150, tl);
  o.frequency.exponentialRampToValueAtTime(55, tl + 0.1);
  const og = c.createGain();
  env(og, tl, 0.22, 0.008, 0.14);
  o.connect(og).connect(out);
  o.start(tl);
  o.stop(tl + 0.2);
}

/** The cover opening / closing: leathery creak, heavy swoosh, thud. */
export function cover({ closing = false, vol = 1 } = {}) {
  const c = get();
  if (!c || muted) return;
  const t = c.currentTime + 0.01;
  const d = 1.3;
  const out = c.createGain();
  out.gain.value = 0.9 * vol;
  out.connect(c.destination);

  // creak
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(closing ? 120 : 52, t);
  o.frequency.exponentialRampToValueAtTime(closing ? 58 : 118, t + d * 0.8);
  const lfo = c.createOscillator();
  lfo.frequency.value = 17;
  const lg = c.createGain();
  lg.gain.value = 9;
  lfo.connect(lg).connect(o.frequency);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const og = c.createGain();
  env(og, t, 0.08, d * 0.3, d * 0.9);
  o.connect(lp).connect(og).connect(out);
  o.start(t);
  lfo.start(t);
  o.stop(t + d);
  lfo.stop(t + d);

  // heavy swoosh
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.6;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(2200, t + d * 0.5);
  bp.frequency.exponentialRampToValueAtTime(500, t + d);
  const g = c.createGain();
  env(g, t, 0.55, d * 0.4, d);
  s.connect(bp).connect(g).connect(out);
  s.start(t);
  s.stop(t + d + 0.05);

  // thud
  const th = c.createOscillator();
  th.type = "sine";
  const tt = t + d * 0.88;
  th.frequency.setValueAtTime(110, tt);
  th.frequency.exponentialRampToValueAtTime(38, tt + 0.22);
  const tg = c.createGain();
  env(tg, tt, 0.5, 0.01, 0.3);
  th.connect(tg).connect(out);
  th.start(tt);
  th.stop(tt + 0.35);
}

/** Pen scratching on paper for `dur` seconds. */
export function scratch(dur = 1.6, vol = 1) {
  const c = get();
  if (!c || muted) return;
  const t = c.currentTime + 0.01;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  s.loop = true;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3200;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 5200;
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  // stroke-by-stroke pulsing so it sounds like letters being formed
  const strokes = Math.max(4, Math.round(dur * 4));
  for (let i = 0; i < strokes; i++) {
    const a = t + (i / strokes) * dur;
    g.gain.linearRampToValueAtTime(0.07 * vol * (0.6 + Math.random() * 0.6), a + 0.05);
    g.gain.linearRampToValueAtTime(0.012, a + (dur / strokes) * 0.8);
  }
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
  s.connect(hp).connect(bp).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.1);
}

/** Tiny pen click. */
export function click() {
  const c = get();
  if (!c || muted) return;
  const t = c.currentTime + 0.01;
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(1800, t);
  o.frequency.exponentialRampToValueAtTime(600, t + 0.03);
  const g = c.createGain();
  env(g, t, 0.05, 0.002, 0.05);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.07);
}

/*
  Sound for the "Step inside the work" percentage counter.
  - /audio/warp-bed.wav: a looping techno hum (sub drone + pulse + digital ticks). Its playback speed and brightness climb with the %.
  - A synthesised arpeggio sequencer on top: its tempo goes from a slow beat at 0% to a rapid-fire machine at 100%,
    and its pitch rises too. A final "complete" sweep plays when the counter hits 100.
  - It only sounds while the number is actually changing (scrolling) and fades out when you stop.
  Browsers only allow audio after a click / key / tap, so unlock() is called from those events.
*/
let ctx = null;
let master = null;
let bedBuf = null;
let bedLoading = false;
let noiseBuf = null;
let muted = false;
let bed = null; // { src, gain, lp }
let timer = 0;
let idle = 0;
let lastT = 0;
let lastV = 0;
let p = 0; // progress 0..1
let next = 0;
let step = 0;
let onLock = () => {};

const PENT = [0, 3, 5, 7, 10]; // minor pentatonic
const URL_BED = `${import.meta.env.BASE_URL}audio/warp-bed.wav`;

export const setLockListener = (fn) => (onLock = fn || (() => {}));
export const isMuted = () => muted;
export const isLocked = () => !ctx || ctx.state !== "running";
export const setMuted = (m) => {
  muted = m;
  if (m) stopAll(0.05);
};

export function unlock() {
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = 1.6;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 5;
      master.connect(comp);
      comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume().then(() => onLock(false)).catch(() => {});
    else onLock(false);
    if (!bedBuf && !bedLoading) {
      bedLoading = true;
      fetch(URL_BED)
        .then((r) => r.arrayBuffer())
        .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then((b) => (bedBuf = b))
        .catch(() => {})
        .finally(() => (bedLoading = false));
    }
  } catch {
    /* audio unavailable */
  }
}

const tone = (t, f, dur, { type = "square", g = 0.1, lp = 4000 } = {}) => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  const flt = ctx.createBiquadFilter();
  flt.type = "lowpass";
  flt.frequency.value = lp;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(g, t + 0.004);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(flt);
  flt.connect(gn);
  gn.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
};
const hat = (t, g) => {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 7000;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  s.connect(f);
  f.connect(gn);
  gn.connect(master);
  s.start(t, Math.random() * 0.5);
  s.stop(t + 0.06);
};
const thud = (t, g) => {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(g, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(gn);
  gn.connect(master);
  o.start(t);
  o.stop(t + 0.2);
};

const interval = () => 0.27 - 0.225 * Math.pow(p, 1.15); // 0.27s per step at 0%  ->  0.045s at 100%

const schedule = () => {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  if (next < now) next = now + 0.01;
  while (next < now + 0.12) {
    const n = step++;
    const oct = Math.floor(n / 5) % 3;
    const semis = PENT[n % 5] + oct * 12 + p * 14;
    const f = 196 * Math.pow(2, semis / 12);
    tone(next, f, 0.07 + 0.05 * (1 - p), { type: p > 0.55 ? "sawtooth" : "square", g: 0.05 + 0.07 * p, lp: 1200 + 5200 * p });
    if (n % 4 === 0) thud(next, 0.16 + 0.12 * p);
    if (p > 0.35) hat(next, 0.05 + 0.08 * p);
    next += interval();
  }
};

function startBed() {
  if (bed || !bedBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = bedBuf;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  src.connect(lp);
  lp.connect(gain);
  gain.connect(master);
  src.start();
  bed = { src, gain, lp };
}

function stopAll(fade = 0.3) {
  clearInterval(timer);
  timer = 0;
  clearInterval(idle);
  idle = 0;
  if (bed && ctx) {
    const b = bed;
    bed = null;
    const t = ctx.currentTime;
    b.gain.gain.cancelScheduledValues(t);
    b.gain.gain.setTargetAtTime(0.0001, t, fade / 3);
    setTimeout(() => {
      try {
        b.src.stop();
      } catch {
        /* already stopped */
      }
    }, fade * 1000 + 120);
  }
}

const complete = () => {
  const t = ctx.currentTime + 0.02;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(600, t);
  f.frequency.exponentialRampToValueAtTime(9000, t + 0.4);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(0.13, t + 0.05);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(f);
  f.connect(gn);
  gn.connect(master);
  o.start(t);
  o.stop(t + 0.6);
  [784, 1175, 1568].forEach((hz, k) => tone(t + 0.4 + k * 0.05, hz, 0.7, { type: "sine", g: 0.13 }));
  thud(t + 0.4, 0.4);
};

/** call with the displayed percentage (0..100) every time it changes */
export function update(v) {
  const prev = lastV;
  lastV = v;
  if (muted) return;
  if (!ctx || ctx.state !== "running") {
    onLock(true);
    return;
  }
  p = Math.max(0, Math.min(1, v / 100));
  lastT = performance.now();

  startBed();
  if (bed) {
    const t = ctx.currentTime;
    bed.gain.gain.setTargetAtTime(0.16 + 0.34 * p, t, 0.08);
    bed.src.playbackRate.setTargetAtTime(0.78 + 1.45 * Math.pow(p, 1.25), t, 0.1);
    bed.lp.frequency.setTargetAtTime(500 + 8200 * Math.pow(p, 1.4), t, 0.1);
  }
  if (!timer) {
    next = ctx.currentTime + 0.02;
    step = 0;
    timer = setInterval(schedule, 25);
  }
  if (!idle) {
    idle = setInterval(() => {
      if (performance.now() - lastT > 260) stopAll(0.35);
    }, 80);
  }
  if (prev < 100 && v >= 100) complete();
}

export const stop = () => stopAll(0.15);

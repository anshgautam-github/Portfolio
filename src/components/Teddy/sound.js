// Tiny WebAudio blips for the retro UI. Lazily creates the AudioContext on first use
// (always inside a user gesture), and never throws.
let ctx;

function blip({ freq = 660, dur = 0.05, type = "square", vol = 0.04, to = 0, delay = 0 } = {}) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (_) {
    /* audio blocked - ignore */
  }
}

export const sfx = {
  key: () => blip({ freq: 480 + Math.random() * 260, dur: 0.03, vol: 0.022 }),
  enter: () => blip({ freq: 360, to: 720, dur: 0.07, type: "triangle", vol: 0.05 }),
  tab: () => blip({ freq: 520, dur: 0.05, type: "triangle", vol: 0.045 }),
  ok: () => {
    blip({ freq: 740, dur: 0.07, type: "triangle", vol: 0.045 });
    blip({ freq: 990, dur: 0.1, type: "triangle", vol: 0.045, delay: 0.07 });
  },
  err: () => blip({ freq: 180, to: 90, dur: 0.18, type: "sawtooth", vol: 0.04 }),
  open: () => {
    blip({ freq: 330, dur: 0.1, type: "triangle", vol: 0.05 });
    blip({ freq: 495, dur: 0.1, type: "triangle", vol: 0.05, delay: 0.09 });
    blip({ freq: 660, dur: 0.16, type: "triangle", vol: 0.05, delay: 0.18 });
  },
  close: () => {
    blip({ freq: 660, dur: 0.08, type: "triangle", vol: 0.045 });
    blip({ freq: 330, dur: 0.14, type: "triangle", vol: 0.045, delay: 0.08 });
  },
  boot: () => blip({ freq: 200, to: 900, dur: 0.5, type: "sawtooth", vol: 0.03 }),
  pop: () => blip({ freq: 500, to: 900, dur: 0.06, type: "sine", vol: 0.06 }),
};

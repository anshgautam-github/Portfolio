// Handshake sound: a soft rising tremor while you hold, then a weighty-but-gentle "clasp" when the hands lock.
// Everything is synthesised (no assets). It follows the site's sound switch: if the visitor muted sound, it stays silent.
import { score } from "../../lib/score.js";

let ctx = null, master = null, noiseBuf = null, bed = null;

function muted() { try { return score.state() === "off"; } catch (e) { return false; } }

function ensure() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  const L = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, L, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); let b = 0;
  for (let i = 0; i < L; i++) { b = (b + (Math.random() * 2 - 1) * 0.06) / 1.06; d[i] = b * 9; }   // brown-ish noise
  return ctx;
}

/** Call from the press gesture (the browser only allows audio after a user action). */
export function holdStart() {
  if (muted() || bed) return;
  const c = ensure(); if (!c) return;
  const t = c.currentTime;
  const out = c.createGain(); out.gain.setValueAtTime(0.0001, t); out.connect(master);
  // low rumble
  const n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 160; lp.Q.value = 0.7;
  n.connect(lp); lp.connect(out); n.start();
  // sub tone with a tremolo that speeds up as the link builds: this is the "vibration"
  const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 58;
  const trem = c.createGain(); trem.gain.value = 0.5;
  const lfo = c.createOscillator(); lfo.frequency.value = 7; const lfoAmt = c.createGain(); lfoAmt.gain.value = 0.45;
  lfo.connect(lfoAmt); lfoAmt.connect(trem.gain);
  o.connect(trem); trem.connect(out); o.start(); lfo.start();
  bed = { out, lp, o, lfo, n };
}

/** p = 0..1 sync progress */
export function holdLevel(p) {
  if (!bed || !ctx) return;
  const t = ctx.currentTime, q = Math.max(0, Math.min(1, p));
  bed.out.gain.setTargetAtTime(0.0001 + Math.pow(q, 1.4) * 0.38, t, 0.06);
  bed.lp.frequency.setTargetAtTime(160 + q * 520, t, 0.08);
  bed.o.frequency.setTargetAtTime(58 + q * 40, t, 0.08);
  bed.lfo.frequency.setTargetAtTime(7 + q * 21, t, 0.08);
}

export function holdStop(fast) {
  if (!bed || !ctx) return;
  const b = bed; bed = null; const t = ctx.currentTime;
  b.out.gain.cancelScheduledValues(t); b.out.gain.setTargetAtTime(0.0001, t, fast ? 0.03 : 0.12);
  const end = t + (fast ? 0.2 : 0.7);
  [b.o, b.lfo, b.n].forEach((s) => { try { s.stop(end); } catch (e) { /* already stopped */ } });
}

/** The clasp: a dull thump, a soft skin-on-skin slap, then a warm shimmer as the link locks. */
export function clasp() {
  holdStop(true);
  if (muted()) return;
  const c = ensure(); if (!c) return;
  const t = c.currentTime + 0.01;
  const g = (v) => { const x = c.createGain(); x.gain.value = v; return x; };
  const env = (node, when, peak, dur) => { node.gain.setValueAtTime(0.0001, when); node.gain.exponentialRampToValueAtTime(peak, when + 0.006); node.gain.exponentialRampToValueAtTime(0.0001, when + dur); };
  // thump
  const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
  const og = g(0); env(og, t, 0.95, 0.7); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.8);
  // slap (band-passed noise, very short)
  const n = c.createBufferSource(); n.buffer = noiseBuf;
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.14); bp.Q.value = 0.8;
  const ng = g(0); env(ng, t, 0.7, 0.16); n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t, Math.random()); n.stop(t + 0.25);
  // shimmer: a quiet major chord blooming after the hit
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const s = c.createOscillator(); s.type = "sine"; s.frequency.value = f;
    const sg = g(0), st = t + 0.05 + i * 0.045;
    sg.gain.setValueAtTime(0.0001, st); sg.gain.exponentialRampToValueAtTime(0.07 / (1 + i * 0.35), st + 0.05); sg.gain.exponentialRampToValueAtTime(0.0001, st + 1.8);
    s.connect(sg); sg.connect(master); s.start(st); s.stop(st + 1.9);
  });
}

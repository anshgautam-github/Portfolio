/*
  score.js - the site's sound design, v6: light, natural, slow music played by real recorded instruments (a piano and a harp, from the public-domain
  VSCO 2 Community library, in /public/audio/score), with a very soft string bed under them. A different colour for each section.

  Not one loop with a speed knob. Every section of the page is a "scene" with its own key, chords, instruments, rhythm and its own
  way of reacting to the scroll. Walking from one scene into the next plays that scene's own transition cue, and the harmony
  glides into the new key. Everything is synthesised with Web Audio (no files, no licensing).

    loader      D minor, dark: a low cello, sparse felt piano. It tightens as the counter climbs.
    landing     D lydian, bright and hopeful: sparse piano and music-box bells, almost nothing under them.
    dive        "look closer": you fall through an eye into stars. E minor, glass bells, a long falling tone that sinks as you descend.
    bloom       the star swells to amber: strings and choir grow with the scroll and resolve from Dsus2 to D major at the top.
    finale      "say hello": F lydian, warm: a slow piano melody over cellos.
    horizon     "what I do": A dorian, plucked marimba ostinato and a soft frame drum. It pans as the horizontal strip moves.
    showreel    C lydian: bright bell runs and octave piano, kinetic.
    stack       the fan of screens squares up: voices spread apart and collapse into one note as the cards align.
    freefall    after the landing: ringing aftermath -> noise -> a rise -> the chapters (A minor, cello and piano, a chime per chapter)
                -> the paddock (driving plucks).
    warp        "selected projects": F# minor, dark and driving: kick, bass, a saw arpeggio, hats.
    tech        the stack: nearly silent until the switch is flipped, then a power-up and a clean, ticking sequencer.
    hours       the watch dial: every bit of scroll is a clock tick, every hour a bell.
    arc         programs and communities: G minor, choir and timpani, rising as you move.
    toolkit     the way out: C major, a lyrical piano, firefly bells, and a last long chord at the end of the page.

  Scroll drives it gently: speed lifts the strings a little and adds a breath of air. every ~10% of a screen of travel plays the next note of the scene's own scale (up when you scroll down, down when you scroll up).
  Scrolling back up plays a short "rewind" instead of the cue.

  Browsers only allow sound after a click / key / tap: the consent card (components/SoundToggle) asks once and that click starts it.
  The answer is remembered. Pauses when the tab is hidden. Nothing here ever throws.
*/
import { whenReleased, whenStory } from "./loader.js";

const KEY = "ag:score";   // "on" | "off" | unset (never asked: the consent card shows)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pickOf = (a) => a[(Math.random() * a.length) | 0];

/* ---------- harmony helpers ---------- */
const MIN = [0, 7, 12, 15, 19], MAJ = [0, 7, 12, 16, 19], M7 = [0, 7, 10, 15, 19], MAJ7 = [0, 7, 11, 16, 19];
const ADD9 = [0, 7, 14, 16, 19], SUS2 = [0, 7, 12, 14, 19], DOM7 = [0, 7, 10, 16, 19], MIN9 = [0, 7, 10, 14, 15];
/** a chord: root = the cello (MIDI), s = five string voices in an open voicing, arp = the pool the piano / plucks play from */
const mk = (root, offs) => {
  const arp = [];
  offs.forEach((o) => { let m = root + o; while (m < 60) m += 12; while (m >= 72) m -= 12; arp.push(m, m + 12); });
  return { root, s: offs.slice(0, 5).map((o) => root + 12 + o), arp: Array.from(new Set(arp)).sort((a, b) => a - b).filter((m) => m <= 84) };
};
const pent = (root, minor, oct = 2) => {
  const iv = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9], a = [];
  for (let o = 0; o < oct; o++) iv.forEach((i) => a.push(root + i + 12 * o));
  return a;
};

/* ---------- recorded instruments: loaded once, after the visitor says yes ---------- */
const BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
const SEMI = { C: 0, Ds: 3, D: 2, E: 4, Fs: 6, F: 5, G: 7, A: 9, B: 11 };
const BANK_FILES = {
  piano: ["C", "Ds", "Fs", "A"].flatMap((n) => [2, 3, 4, 5, 6].map((o) => n + o)),
  harp: ["C3", "E3", "G3", "B3", "D4", "F4", "A4", "C5", "E5", "G5", "B5", "D6", "F6", "A6"],
};
const banks = { piano: [], harp: [] };
let bankState = 0;                                  // 0 not started, 1 loading, 2 ready, 3 failed (the synthesised fallback plays)
let chimePending = false;
const fileMidi = (f) => { const m = /^([A-G]s?)(\d)$/.exec(f); return m ? 12 * (+m[2] + 1) + SEMI[m[1]] : 60; };
function loadBanks() {
  if (bankState || !ctx) return;
  bankState = 1;
  const jobs = [];
  Object.keys(BANK_FILES).forEach((bank) => BANK_FILES[bank].forEach((f) => {
    jobs.push(fetch(BASE + "audio/score/" + bank + "/" + f + ".mp3").then((r) => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { banks[bank].push({ m: fileMidi(f), buf }); }));
  }));
  Promise.all(jobs).then(() => {
    Object.keys(banks).forEach((k) => banks[k].sort((a, b) => a.m - b.m));
    bankState = 2; if (chimePending) { chimePending = false; chime(); }
  }, () => { bankState = 3; if (chimePending) { chimePending = false; chime(); } });
}
/** play the nearest recording, re-pitched (never more than a couple of semitones) */
function sample(bank, t, m, vel, pan = 0, lpHz = 3600) {
  const list = banks[bank]; if (!list.length) return;
  let best = list[0]; for (const e of list) if (Math.abs(e.m - m) < Math.abs(best.m - m)) best = e;
  const src = ctx.createBufferSource(); src.buffer = best.buf; src.playbackRate.value = Math.pow(2, (m - best.m) / 12);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpHz; lp.Q.value = 0.3;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.012);
  src.connect(lp); lp.connect(g); toBus(g, pan);
  src.start(t);
}

let ctx = null, master, comp, bus, tone, conv, wet, pianoBus, uiBus, air, airBP, noiseBuf, droneG, cello, celloLP, sub, oct, padG, padLP, padDelay;
let choirG, choirVoices = [], glO, glO2, glG, glLP;
let pads = [];
let chimeNext = false, wantOn = false, running = false, built = false, hidden = false, ducked = false, released = false;
let v = 0, kickW = 0, tension = 0, prog = 0, chord = -1, chordScene = null, lastY = 0, lastT = 0, armed = 0, lastImpact = 0, lastSwell = 0, lastParams = 0, fadeStart = 0;
let nextStep = 0, stepN = 0, timer = 0, raf = 0, wakeTimer = 0, act = 0;
let lastSecCue = 0, lastHover = 0, lastHoverEl = null, secT = 0, sceneT = 0, scene = null, sceneP = 0, scenePrevP = 0, dist = 0, lastNote = 0;
const subs = new Set();

let choice = null;
try { choice = localStorage.getItem(KEY) || (localStorage.getItem("ag:score-muted") === "1" ? "off" : null); } catch (e) { /* storage blocked */ }
wantOn = choice === "on";
const save = () => { try { localStorage.setItem(KEY, choice); } catch (e) { /* ignore */ } };
const emit = () => subs.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });

// a dark, wide hall: noise that fades out and loses its top end as it decays
function makeIR(c, sec, decay) {
  const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const k = 0.12 + 0.5 * Math.pow(1 - i / n, 2);
      lp += ((Math.random() * 2 - 1) - lp) * k;
      d[i] = lp * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1);
    }
  }
  return b;
}

function build() {
  if (built) return !!ctx;
  built = true;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ctx = new C({ latencyHint: "playback" });
    setTimeout(loadBanks, 0);
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 26; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.45;
    const lim = ctx.createDynamicsCompressor();                        // a last-stage limiter: loud transitions can never clip
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.2;
    comp.connect(master); master.connect(lim); lim.connect(ctx.destination);

    conv = ctx.createConvolver(); conv.buffer = makeIR(ctx, 5, 2.4);
    wet = ctx.createGain(); wet.gain.value = 0.5; conv.connect(wet); wet.connect(comp);

    bus = ctx.createGain(); bus.gain.value = 0;
    tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2600; tone.Q.value = 0.3;
    bus.connect(tone); tone.connect(comp); tone.connect(conv);

    pianoBus = ctx.createGain(); pianoBus.gain.value = 1;
    pianoBus.connect(comp);
    const ps = ctx.createGain(); ps.gain.value = 0.85; pianoBus.connect(ps); ps.connect(conv);
    const dl = ctx.createDelay(1.5); dl.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const dlp = ctx.createBiquadFilter(); dlp.type = "lowpass"; dlp.frequency.value = 2100;
    const dp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const ds = ctx.createGain(); ds.gain.value = 0.3;
    pianoBus.connect(ds); ds.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl);
    if (dp) { dp.pan.value = 0.45; dlp.connect(dp); dp.connect(comp); dp.connect(conv); } else { dlp.connect(comp); }

    uiBus = ctx.createGain(); uiBus.gain.value = 1; uiBus.connect(comp);
    const us = ctx.createGain(); us.gain.value = 0.18; uiBus.connect(us); us.connect(conv);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

    // the cello
    droneG = ctx.createGain(); droneG.gain.value = 0;
    celloLP = ctx.createBiquadFilter(); celloLP.type = "lowpass"; celloLP.frequency.value = 380; celloLP.Q.value = 0.6;
    cello = ctx.createOscillator(); cello.type = "triangle"; cello.frequency.value = mtof(38);
    const cg = ctx.createGain(); cg.gain.value = 0.3; cello.connect(cg); cg.connect(celloLP); celloLP.connect(droneG);
    oct = ctx.createOscillator(); oct.type = "sine"; oct.frequency.value = mtof(50);
    const og = ctx.createGain(); og.gain.value = 0.8; oct.connect(og); og.connect(droneG);
    sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = mtof(38);
    const sg = ctx.createGain(); sg.gain.value = 0.12; sub.connect(sg); sg.connect(droneG);
    const bow = ctx.createOscillator(); bow.frequency.value = 5.1;
    const bowG = ctx.createGain(); bowG.gain.value = 5; bow.connect(bowG); bowG.connect(cello.detune);
    droneG.connect(bus);
    [cello, oct, sub, bow].forEach((o) => o.start());

    // the strings
    padLP = ctx.createBiquadFilter(); padLP.type = "lowpass"; padLP.frequency.value = 900; padLP.Q.value = 0.25;
    padG = ctx.createGain(); padG.gain.value = 0;
    padDelay = ctx.createDelay(0.1); padDelay.delayTime.value = 0.024;
    const chor = ctx.createOscillator(); chor.frequency.value = 0.37; const chG = ctx.createGain(); chG.gain.value = 0.004; chor.connect(chG); chG.connect(padDelay.delayTime); chor.start();
    const dmix = ctx.createGain(); dmix.gain.value = 0.55;
    padLP.connect(padG); padLP.connect(padDelay); padDelay.connect(dmix); dmix.connect(padG); padG.connect(bus);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.3; const vibG = ctx.createGain(); vibG.gain.value = 4; vib.connect(vibG); vib.start();
    const breathe = ctx.createOscillator(); breathe.frequency.value = 0.065; const brG = ctx.createGain(); brG.gain.value = 0.12; breathe.connect(brG); brG.connect(padG.gain); breathe.start();
    const c0 = mk(38, MIN);
    pads = c0.s.map((m, j) => {
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null, g = ctx.createGain(); g.gain.value = 0.1;
      if (pan) { pan.pan.value = (j / 4) * 1.3 - 0.65; g.connect(pan); pan.connect(padLP); } else g.connect(padLP);
      return [-6, 0, 6].map((d) => {
        const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = mtof(m); o.detune.value = d;
        vibG.connect(o.detune); o.connect(g); o.start(); return { o, d };
      });
    });

    // a choir: three voices of detuned saws through "ah" formants (only some scenes open it)
    choirG = ctx.createGain(); choirG.gain.value = 0;
    [[700, 5], [1150, 6], [2500, 4]].forEach(([f, q], i) => {
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
      const bg = ctx.createGain(); bg.gain.value = [1, 0.7, 0.28][i];
      bp.connect(bg); bg.connect(choirG); choirVoices.push(bp);
    });
    const chIn = ctx.createGain(); chIn.gain.value = 1;
    choirVoices.forEach((bp) => chIn.connect(bp));
    choirG.connect(bus);
    choirVoices = [0, 1, 2].map((j) => [-8, 0, 8].map((d) => {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = mtof(c0.s[j + 1]); o.detune.value = d;
      const g = ctx.createGain(); g.gain.value = 0.2; o.connect(g); g.connect(chIn); vibG.connect(o.detune); o.start(); return { o, d };
    }));

    // a gliding tone: the fall in the dive, the rise before the bloom
    glLP = ctx.createBiquadFilter(); glLP.type = "lowpass"; glLP.frequency.value = 1200; glLP.Q.value = 1.2;
    glG = ctx.createGain(); glG.gain.value = 0;
    glO = ctx.createOscillator(); glO.type = "sawtooth"; glO.frequency.value = 400;
    glO2 = ctx.createOscillator(); glO2.type = "triangle"; glO2.frequency.value = 400; glO2.detune.value = 7;
    glO.connect(glLP); glO2.connect(glLP); glLP.connect(glG); glG.connect(comp); glG.connect(conv);
    glO.start(); glO2.start();

    // wind
    air = ctx.createGain(); air.gain.value = 0;
    airBP = ctx.createBiquadFilter(); airBP.type = "bandpass"; airBP.frequency.value = 500; airBP.Q.value = 0.6;
    const as = ctx.createBufferSource(); as.buffer = noiseBuf; as.loop = true;
    as.connect(airBP); airBP.connect(air); air.connect(comp); air.connect(conv);
    as.start();
    return true;
  } catch (e) { ctx = null; return false; }
}

/* ---------- instruments (one-shots) ---------- */
const toBus = (node, pan, dest) => {
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = clamp(pan, -0.9, 0.9); node.connect(p); p.connect(dest || pianoBus); } else node.connect(dest || pianoBus);
};

/** a felt piano note */
function piano(t, m, vel = 0.6) {
  if (!ctx) return;
  if (bankState === 2) { sample("piano", t, m, 0.75 * vel * (m < 52 ? 1.15 : 1), clamp((m - 62) / 40, -0.5, 0.5) + rnd(-0.1, 0.1), 1800 + vel * 3200); return; }
  if (bankState !== 3) return;
  const f = mtof(m), out = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1500 + vel * 2600; lp.Q.value = 0.2;
  const peak = 0.36 * vel * (m < 52 ? 1.1 : 1), dur = 2.2 + (m < 60 ? 1.2 : 0);
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(peak, t + 0.006); out.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.35); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[1, 1], [2.003, 0.46], [3.01, 0.2], [4.02, 0.08]].forEach(([k, a], i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f * k; g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.7));
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  });
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; const nb = ctx.createBiquadFilter(); nb.type = "bandpass"; nb.frequency.value = 1400 + f; nb.Q.value = 0.9;
  const ng = ctx.createGain(); ng.gain.setValueAtTime(0.03 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  n.connect(nb); nb.connect(ng); ng.connect(lp); n.start(t, Math.random()); n.stop(t + 0.06);
  lp.connect(out);
  toBus(out, clamp((m - 62) / 40, -0.5, 0.5) + rnd(-0.12, 0.12));
}

/** a glass / celesta bell: inharmonic partials, a fast bright decay */
function bell(t, m, vel = 0.5, pan = 0) {
  if (!ctx) return;
  if (bankState === 2) { while (m > 88) m -= 12; sample("harp", t, m, 0.85 * vel, pan + rnd(-0.15, 0.15), 4200); return; }
  if (bankState !== 3) return;
  const f = mtof(m), out = ctx.createGain(), dur = 2.6;
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.2 * vel, t + 0.004); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[1, 1], [2.76, 0.34], [5.4, 0.12], [8.9, 0.045]].forEach(([k, a], i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f * k; g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 1.3));
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  });
  toBus(out, pan + rnd(-0.15, 0.15));
}

/** a marimba / kalimba pluck: a soft body, one wooden overtone and a tick */
function pluck(t, m, vel = 0.5, pan = 0) {
  if (!ctx) return;
  const f = mtof(m), out = ctx.createGain(), lp = ctx.createBiquadFilter(), dur = 0.9;
  lp.type = "lowpass"; lp.frequency.value = 2200 + vel * 2200; lp.Q.value = 0.3;
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.34 * vel, t + 0.004); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  [[1, 1, dur], [3.97, 0.28, 0.22], [9.2, 0.05, 0.08]].forEach(([k, a, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f * k; g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + d + 0.05);
  });
  lp.connect(out); toBus(out, pan);
}

/** a clock tick (tick / tock) */
function tick(t, tock = false, vel = 0.6) {
  if (!ctx) return;
  noiseBurst({ t, dur: 0.035, from: tock ? 2400 : 3600, to: tock ? 1500 : 2300, peak: 0.09 * vel, attack: 0.001, type: "bandpass", q: 3, dest: comp });
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(tock ? 1050 : 1500, t); o.frequency.exponentialRampToValueAtTime(tock ? 700 : 1000, t + 0.05);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g); g.connect(comp); o.start(t); o.stop(t + 0.09);
}

/** a clean saw / square synth note (the techy scenes) */
function arpSynth(t, m, vel = 0.5, dur = 0.2, pan = 0) {
  if (!ctx) return;
  const f = mtof(m), out = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 2.2;
  lp.frequency.setValueAtTime(500 + 2800 * vel, t); lp.frequency.exponentialRampToValueAtTime(380, t + dur);
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.1 * vel, t + 0.006); out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
  ["sawtooth", "square"].forEach((ty, i) => {
    const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = i ? 6 : -6;
    const g = ctx.createGain(); g.gain.value = i ? 0.35 : 0.6; o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 0.1);
  });
  lp.connect(out); toBus(out, pan, comp);
  const s = ctx.createGain(); s.gain.value = 0.25; out.connect(s); s.connect(conv);
}

function noiseBurst({ t, dur, from, to, peak, attack, type = "bandpass", q = 0.8, dest }) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || comp); if (!dest) g.connect(conv);
  s.start(t, Math.random()); s.stop(t + dur + 0.1);
}

/** a low frame drum / kick: a pitched thump and a short muffled skin (lvl is the loudness) */
function thud(t, lvl = 0.3, f0 = 124) {
  if (lvl < 0.02 || !ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.28);
  g.gain.setValueAtTime(lvl, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  o.connect(g); g.connect(comp); const s = ctx.createGain(); s.gain.value = 0.45; g.connect(s); s.connect(conv);
  o.start(t); o.stop(t + 0.75);
  noiseBurst({ t, dur: 0.22, from: 900, to: 220, peak: lvl * 0.5, attack: 0.004, type: "lowpass", q: 0.4 });
}

/** a timpani: a pitched skin that blooms and rings */
function timp(t, m, vel = 0.5) {
  if (!ctx || vel < 0.02) return;
  const f = mtof(m + 12), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.22);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(g); g.connect(comp); const s = ctx.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(conv); o.start(t); o.stop(t + 1.7);
  noiseBurst({ t, dur: 0.12, from: 1200, to: 300, peak: 0.12 * vel, attack: 0.003, type: "lowpass", q: 0.5 });
}

/* ---------- cues: building blocks ---------- */
const nowT = () => ctx.currentTime + 0.02;
const curChord = () => (scene ? scene.ch[Math.max(0, chord)] || scene.ch[0] : mk(38, MIN));
function riser(dur = 1.6, s = 1, from = 260, to = 6800, t = nowT()) { noiseBurst({ t, dur, from, to, peak: 0.12 * s, attack: dur * 0.92, q: 1.0 }); }
function faller(dur = 1.4, s = 1, t = nowT()) { noiseBurst({ t, dur, from: 5200, to: 180, peak: 0.1 * s, attack: 0.03, q: 0.9 }); }
function bellRun(notes, step = 0.12, vel = 0.5, t = nowT()) { notes.forEach((m, i) => bell(t + i * step, m, vel * (1 - i * 0.04))); }
function pianoRoll(notes, step = 0.1, vel = 0.5, t = nowT()) { notes.forEach((m, i) => piano(t + i * step, m, vel * (0.9 + 0.1 * Math.min(1, i / 3)))); }
function pluckRun(notes, step = 0.07, vel = 0.5, t = nowT()) { notes.forEach((m, i) => pluck(t + i * step, m, vel)); }

/** the rise before something happens: wind climbing and the strings leaning up */
function swell(dur = 1.6, s = 1) {
  if (!running) return;
  const t = ctx.currentTime, root = curChord().root;
  [12, 19, 24].forEach((k, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "triangle"; o.detune.value = (i - 1) * 9;
    o.frequency.setValueAtTime(mtof(root + k), t); o.frequency.exponentialRampToValueAtTime(mtof(root + k) * 1.059, t + dur);
    lp.type = "lowpass"; lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(2800, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.034 * s, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(lp); lp.connect(g); g.connect(comp); g.connect(conv); o.start(t); o.stop(t + dur + 0.15);
  });
}

/** a soft landing: a warm low bloom and two piano notes (no crash, no hit) */
function impact(s = 1, at) {
  if (!running) return;
  const t = at || ctx.currentTime, root = curChord().root;
  lastImpact = performance.now();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = mtof(root + 12);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * s, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
  o.connect(g); g.connect(comp); const sg = ctx.createGain(); sg.gain.value = 0.6; g.connect(sg); sg.connect(conv); o.start(t); o.stop(t + 4.2);
  piano(t + 0.2, root + 12, 0.45 * s); piano(t + 0.6, root + 19, 0.38 * s);
  swell(3, 0.2 * s);
}

/** a smaller hit for scene changes (a landing without the crash) */
function hit(t, s = 0.6) {
  thud(t, 0.32 * s, 150);
  noiseBurst({ t, dur: 1.2, from: 3600, to: 200, peak: 0.07 * s, attack: 0.01, type: "lowpass", q: 0.4 });
  const root = curChord().root;
  piano(t + 0.02, root + 12, 0.6 * s); piano(t + 0.04, root + 19, 0.45 * s);
}

/** "yes, sound is on": a rising piano figure and a swell, so the visitor hears it work straight away */
function chime() {
  if (!running) return;
  const t = ctx.currentTime + 0.04;
  [62, 69, 72, 74, 81].forEach((m, i) => piano(t + i * 0.17, m, 0.62 - i * 0.02));
  swell(2.3, 0.55);
}

/* ---------- interface sounds: a fine tick on hover, a soft muted tap on press ---------- */
function uiTone(t, f0, f1, dur, peak, type = "sine") {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(uiBus); o.start(t); o.stop(t + dur + 0.02);
}
function sceneNote() { const sc = (scene && scene.sc) || [72, 74, 76, 79, 81]; return (() => { let m = pickOf(sc); while (m < 66) m += 12; while (m > 86) m -= 12; return m; })(); }
function uiHover() {
  if (!running || !wantOn) return;
  if (bankState === 2) { sample("harp", ctx.currentTime, sceneNote(), 0.14, rnd(-0.5, 0.5), 4200); return; }
  const t = ctx.currentTime, f = 2300 * rnd(0.96, 1.05);
  uiTone(t, f, f * 0.86, 0.05, 0.02);
  noiseBurst({ t, dur: 0.03, from: 5200, to: 3200, peak: 0.01, attack: 0.002, type: "highpass", q: 0.5, dest: uiBus });
}
function uiClick() {
  if (!running || !wantOn) return;
  if (bankState === 2) { const t = ctx.currentTime, m = sceneNote(); sample("piano", t, m - 12, 0.3, 0, 2600); sample("harp", t + 0.06, m, 0.16, rnd(-0.4, 0.4), 4200); return; }
  const t = ctx.currentTime;
  uiTone(t, 190, 82, 0.09, 0.075);
  uiTone(t, 920, 640, 0.07, 0.03);
  uiTone(t + 0.012, 1840, 1500, 0.2, 0.014, "triangle");
  noiseBurst({ t, dur: 0.04, from: 3600, to: 1800, peak: 0.016, attack: 0.002, type: "highpass", q: 0.5, dest: uiBus });
}
const UI_SEL = "a[href], button, [role='button'], summary, [data-snd], input[type='range'], .cta";

/* ---------- the scenes: one calm piece, a different colour for each section ---------- */
const A = (c, i) => c.arp[((i % c.arp.length) + c.arp.length) % c.arp.length];
const MEL = [0, 2, 1, 3, 2, 4, 3, 1];
let tsOn = false, tkEnd = false;
const D = { pad: 0.7, cel: 0.7, cho: 0, air: 0.5, br: 0.4, wet: 0.5 };   // default mix of the bed
const mid = (c) => c.arp.filter((m) => m >= 60 && m <= 79);

/** the shared calm pattern: a long piano note every few seconds, now and then a second one a little higher, a faint bell. Nothing rhythmic. */
function calm(o) {
  return function (t, n, k) {
    const c = k.c, pool = mid(c), every = (o.every || 8) * 2, beat = 60 / this.bpm;
    if (n % every === 0 && chance(clamp((o.p || 0.55) + 0.25 * k.act + 0.1, 0, 0.92))) {
      const vel = (o.vel || 0.34) * 0.85 + 0.1 * k.act;
      if (o.melody) {
        for (let j = 0; j < 3; j++) piano(t + j * beat * 0.95, A(c, MEL[(((n / every) | 0) * 3 + j) % 8] + 2), vel * (1 - j * 0.08));
      } else {
        const cnt = 2 + ((Math.random() * 2) | 0), dir = chance(0.6) ? 1 : -1;
        let i = clamp(((Math.random() * (pool.length - 2)) | 0) + (dir < 0 ? 2 : 0), 0, pool.length - 1);
        for (let j = 0; j < cnt; j++) { piano(t + j * beat * rnd(0.85, 1.1), pool[i], vel * (1 - j * 0.1)); i = clamp(i + dir, 0, pool.length - 1); }
        if (o.bell && chance(Math.min(1, o.bell))) bell(t + cnt * beat + 0.4, pool[i] + 12, 0.2);
      }
    }
    if (o.low && n % (every * 3) === 0) piano(t, Math.max(50, c.root + 12), 0.28);
  };
}
/** the way into a new scene: a soft rolled chord and a slow swell. No hits, no risers. */
const gentle = (n = 3, vel = 0.34, sw = 0.22) => function () { const c = curChord(), t = nowT(); pianoRoll(mid(c).slice(0, n), 0.34, vel, t + 0.2); swell(2.6, sw); };

const SCENES = [
  { id: "loader", sel: null, bpm: 42, tempoK: 0, sec: 16, mix: { ...D, pad: 0.8, cel: 0.8, br: 0.28, wet: 0.62 },
    ch: [mk(38, MIN), mk(34, MAJ7), mk(41, ADD9), mk(36, SUS2)], sc: pent(62, true), note: "piano", step: calm({ every: 8, p: 0.5, vel: 0.32, low: 1 }) },
  { id: "landing", sel: "[data-reveal]", bpm: 42, tempoK: 0, sec: 18, mix: { ...D, pad: 0.5, cel: 0.55, air: 0.25, br: 0.4, wet: 0.62 },
    ch: [mk(38, MAJ7), mk(35, M7), mk(43, ADD9), mk(45, SUS2)], sc: pent(62, false, 2), note: "piano", step: calm({ every: 8, p: 0.5, vel: 0.34, bell: 0.4, pair: 0.35 }), cue: gentle(3) },
  { id: "dive", sel: ".dv", bpm: 38, tempoK: 0, sec: 20, mix: { ...D, pad: 0.55, cel: 0.7, air: 0.45, br: 0.26, wet: 0.7 },
    ch: [mk(40, MIN), mk(36, MAJ7), mk(35, SUS2)], sc: pent(76, true), note: "bell", step: calm({ every: 8, p: 0.4, vel: 0.3, bell: 0.7 }), cue: gentle(2, 0.3, 0.3) },
  { id: "bloom", sel: ".bl", bpm: 38, tempoK: 0, sec: 60, mix: { ...D },
    mixP: (p) => ({ pad: 0.3 + 0.7 * p, cel: 0.5 + 0.2 * p, cho: 0.1 + 0.6 * smooth(0.2, 1, p), air: 0.2, br: 0.22 + 0.4 * p, wet: 0.66 }),
    ch: [mk(38, SUS2), mk(38, MAJ)], ci: (p) => (p > 0.9 ? 1 : 0), sc: pent(74, false), note: "bell", step() {},
    marks: [{ p: 0.9, fn() { const t = nowT(); pianoRoll([62, 69, 74, 78], 0.3, 0.4, t); swell(3, 0.3); } }], cue: gentle(2, 0.3, 0.3) },
  { id: "finale", sel: ".fn", bpm: 44, tempoK: 0, sec: 16, mix: { ...D, pad: 0.75, cel: 0.8, air: 0.2, br: 0.4, wet: 0.6 },
    ch: [mk(41, MAJ7), mk(36, ADD9), mk(38, M7), mk(34, MAJ7)], sc: pent(65, false), note: "piano", step: calm({ every: 8, p: 0.6, vel: 0.36, melody: 1, low: 1, pair: 0.15 }), cue: gentle(4, 0.36) },
  { id: "horizon", sel: ".hz", bpm: 46, tempoK: 0, sec: 16, mix: { ...D, pad: 0.55, cel: 0.7, air: 0.35, br: 0.4, wet: 0.58 },
    ch: [mk(45, M7), mk(38, MAJ7), mk(43, MAJ7), mk(40, M7)], sc: pent(69, true), note: "piano", step: calm({ every: 4, p: 0.4, vel: 0.3, pair: 0.2 }), cue: gentle(3) },
  { id: "showreel", sel: ".sr", bpm: 46, tempoK: 0, sec: 16, mix: { ...D, pad: 0.5, cel: 0.6, air: 0.25, br: 0.5, wet: 0.6 },
    ch: [mk(36, MAJ7), mk(43, ADD9), mk(45, M7), mk(41, MAJ7)], sc: pent(72, false), note: "bell", step: calm({ every: 8, p: 0.5, vel: 0.32, bell: 0.7 }), cue: gentle(3) },
  { id: "stack", sel: ".ss", bpm: 42, tempoK: 0, sec: 20, mix: { ...D, pad: 0.65, cel: 0.6, air: 0.2, br: 0.4, wet: 0.62 },
    ch: [mk(43, SUS2), mk(41, ADD9), mk(43, SUS2)], sc: pent(67, false), note: "bell", spread: (p) => 1 + 3 * (1 - smooth(0.1, 0.9, p)),
    step: calm({ every: 8, p: 0.45, vel: 0.3, bell: 0.5 }),
    marks: [{ p: 0.9, fn() { const t = nowT(), r = curChord().root; pianoRoll([r + 12, r + 19, r + 24, r + 31], 0.28, 0.38, t); } }], cue: gentle(3) },
  { id: "freefall", sel: ".fs", bpm: 40, tempoK: 0, sec: 18, mix: { ...D, pad: 0.6, cel: 0.8, air: 0.5, br: 0.3, wet: 0.66 },
    mixP: (p) => (p < 0.4 ? { pad: 0.5, cel: 0.7, air: 0.55 - p, br: 0.26, wet: 0.7 } : { pad: 0.75, cel: 0.85, air: 0.18, br: 0.38, wet: 0.58 }),
    ch: [mk(38, MIN), mk(34, MAJ7), mk(45, M7), mk(41, MAJ7), mk(36, ADD9), mk(43, SUS2)],
    ci: (p) => (p < 0.2 ? 0 : p < 0.42 ? 1 : 2 + ((p - 0.42) * 6.5 | 0) % 4), sc: pent(69, true), note: "piano",
    step(t, n, k) { return calm({ every: k.p < 0.4 ? 12 : 8, p: k.p < 0.4 ? 0.35 : 0.6, vel: 0.32, melody: k.p > 0.42, low: 1, bell: k.p < 0.4 ? 0.5 : 0.2 }).call(this, t, n, k); },
    marks: [...[0.52, 0.6, 0.68, 0.76, 0.84].map((p) => ({ p, fn() { const t = nowT(), c = curChord(); bell(t, c.root + 48, 0.3); piano(t + 0.3, c.arp[3], 0.34); } }))],
    cue() { const c = curChord(), t = nowT(); pianoRoll([c.root + 24, c.root + 31], 0.5, 0.4, t + 0.1); noiseBurst({ t, dur: 5, from: 2200, to: 160, peak: 0.04, attack: 1.2, type: "lowpass", q: 0.5 }); } },
  { id: "warp", sel: "[data-warp-wrap]", bpm: 46, tempoK: 0, sec: 16, mix: { ...D, pad: 0.45, cel: 0.9, air: 0.2, br: 0.35, wet: 0.5 },
    ch: [mk(42, MIN), mk(38, MAJ7), mk(45, MAJ), mk(40, MAJ7)], sc: pent(66, true), note: "piano", step: calm({ every: 4, p: 0.4, vel: 0.3, low: 1 }), cue: gentle(3, 0.34, 0.25) },
  { id: "tech", sel: ".ts", bpm: 44, tempoK: 0, sec: 16, mix: { ...D, pad: 0.35, cel: 0.45, air: 0.12, br: 0.45, wet: 0.5 },
    ch: [mk(38, M7), mk(43, ADD9), mk(45, M7), mk(43, ADD9)], sc: pent(62, true), note: "bell",
    step(t, n, k) { return (tsOn ? calm({ every: 8, p: 0.5, vel: 0.3, bell: 0.6 }) : calm({ every: 32, p: 0.35, vel: 0.2 })).call(this, t, n, k); }, cue: gentle(2, 0.26, 0.15) },
  { id: "hours", sel: ".hr", bpm: 40, tempoK: 0, sec: 18, mix: { ...D, pad: 0.55, cel: 0.7, air: 0.12, br: 0.3, wet: 0.62 },
    ch: [mk(36, MIN), mk(44, MAJ7), mk(39, ADD9), mk(43, SUS2)], sc: pent(60, true), note: null, step: calm({ every: 8, p: 0.5, vel: 0.32, bell: 0.4 }),
    prog(p, pp) { const a = Math.floor(p * 90), b = Math.floor(pp * 90); if (a === b) return; if (Math.max(a, b) % 8 === 0) bell(nowT(), curChord().root + 36 + (Math.max(a, b) % 16 === 0 ? 7 : 0), 0.3); else if (chance(0.5)) tick(nowT(), a % 2 === 0, 0.18); },
    cue: gentle(2, 0.3, 0.2) },
  { id: "arc", sel: ".arc", bpm: 42, tempoK: 0, sec: 16, mix: { ...D, pad: 0.55, cel: 0.7, cho: 0.5, air: 0.2, br: 0.4, wet: 0.66 },
    ch: [mk(43, MIN), mk(39, MAJ7), mk(46, ADD9), mk(41, MAJ)], sc: pent(67, true), note: "piano", step: calm({ every: 8, p: 0.5, vel: 0.34, pair: 0.35, low: 1 }), cue: gentle(3, 0.34, 0.3) },
  { id: "toolkit", sel: ".tk-wrap", bpm: 42, tempoK: 0, sec: 18, mix: { ...D, pad: 0.8, cel: 0.8, air: 0.2, br: 0.4, wet: 0.66 },
    ch: [mk(36, MAJ7), mk(41, ADD9), mk(43, ADD9), mk(36, MAJ)], sc: pent(72, false), note: "piano", ci: (p) => (p > 0.9 ? 3 : (p * 3) | 0),
    step(t, n, k) { if (tkEnd) { if (n % 64 === 0) piano(t, k.c.root + 24, 0.3); return; } return calm({ every: 8, p: 0.6, vel: 0.36, melody: 1, bell: 0.5, pair: 0.2 }).call(this, t, n, k); },
    marks: [{ p: 0.9, fn() { const t = nowT(); tkEnd = true; [48, 55, 60, 64, 67, 72, 76, 79].forEach((m, i) => piano(t + i * 0.45, m, 0.4 - i * 0.025)); swell(5, 0.28); } }],
    cue() { const c = curChord(); tkEnd = false; pianoRoll(mid(c).slice(0, 4), 0.4, 0.36, nowT() + 0.2); swell(3, 0.25); } },
];
SCENES.forEach((s) => { s.marks = s.marks || []; });

/* ---------- harmony ---------- */
function setChord(i, scn) {
  scn = scn || scene;
  if (!ctx || !scn) return;
  if (i === chord && scn === chordScene) return;
  const first = chord < 0, big = scn !== chordScene;
  chord = i; chordScene = scn;
  const c = scn.ch[i] || scn.ch[0], t = ctx.currentTime, k = first ? 0.01 : big ? 1.2 : 1.7;      // chords glide into each other
  pads.forEach((vo, j) => vo.forEach(({ o }) => o.frequency.setTargetAtTime(mtof(c.s[j]), t, k)));
  choirVoices.forEach((vo, j) => vo.forEach(({ o }) => o.frequency.setTargetAtTime(mtof(c.s[j + 1]), t, k)));
  const rk = first ? 0.01 : 1.0;
  cello.frequency.setTargetAtTime(mtof(c.root), t, rk); sub.frequency.setTargetAtTime(mtof(c.root), t, rk); oct.frequency.setTargetAtTime(mtof(c.root + 12), t, rk);
}

/* ---------- scheduling: the current scene's own pattern, a little ahead of time ---------- */
function schedule() {
  if (!ctx || !running || !scene) return;
  const now = ctx.currentTime;
  const bpm = scene.bpm * (1 + (scene.tempoK || 0) * act);
  if (nextStep < now) nextStep = now + 0.05;
  const sd = 60 / bpm / 4;                                  // sixteenth notes
  const c = scene.ch[Math.max(0, chord)] || scene.ch[0];
  while (nextStep < now + 0.16) {
    try { scene.step(nextStep, stepN, { act, c, p: sceneP }); } catch (e) { /* a scene must never stop the music */ }
    nextStep += sd; stepN++;
  }
}

/* ---------- which scene are we in? ---------- */
let sceneEls = null, sceneElsT = 0;
function findScenes(now) {
  if (sceneEls && now - sceneElsT < 1500) return;
  sceneElsT = now;
  sceneEls = SCENES.map((s) => {
    if (!s.sel) return null;
    const el = document.querySelector(s.sel);
    return el ? (el.closest("#main > *") || el) : null;
  });
}

function enterScene(S, up) {
  const prev = scene;
  scene = S; sceneT = performance.now(); stepN = 0; tkEnd = false;
  S.marks.forEach((m) => { m.f = 0; });
  chord = -1; chordScene = null;
  setChord(S.ci ? S.ci(sceneP, 0) : 0, S);
  if (!prev || !running) return;
  const now = performance.now();
  if (now - lastSecCue < 1100) return;
  lastSecCue = now;
  try { if (up) { faller(0.7, 0.6); bell(nowT() + 0.1, curChord().root + 36, 0.3); } else if (S.cue) S.cue(); } catch (e) { /* ignore */ }
}

function trackScene(now) {
  if (now - secT < 120) return;
  secT = now;
  let S = SCENES[0];
  if (released && document.getElementById("main")) {
    findScenes(now);
    const vh = window.innerHeight; let best = -1, bestOv = 0;
    for (let i = 1; i < SCENES.length; i++) {
      const el = sceneEls[i]; if (!el) continue;
      const r = el.getBoundingClientRect();
      const ov = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (ov > bestOv) { bestOv = ov; best = i; }
    }
    if (best >= 1 && bestOv > vh * 0.45) {
      S = SCENES[best];
      const r = sceneEls[best].getBoundingClientRect(), span = r.height - vh;
      const p = span > 40 ? clamp(-r.top / span) : clamp((vh - r.top) / (r.height + vh));
      scenePrevP = sceneP; sceneP += (p - sceneP) * 0.5; if (S !== scene) sceneP = p;
    } else if (scene && scene.id !== "loader") S = scene;                 // between sections (seams): stay where we were
  } else { sceneP = 0; }
  if (S !== scene) {
    const up = scene ? SCENES.indexOf(S) < SCENES.indexOf(scene) && scene.id !== "loader" && v > 0.02 : false;
    enterScene(S, up);
  }
}

/* ---------- the per-frame mapping: scroll speed + position -> sound ---------- */
const cur = { ...D }, tgt = { ...D };
let glF = 400, tsLast = false, lastDir = 1, walk = 0;

function scrollNote(dir, vel) {
  if (!scene || !scene.note || !scene.sc) return;
  const sc = scene.sc;
  walk = clamp(walk + dir, 0, sc.length - 1);
  const m = sc[walk], t = nowT(), vv = clamp(0.2 + 0.2 * vel, 0.18, 0.4), pan = (walk / (sc.length - 1)) * 1.0 - 0.5;
  if (scene.note === "piano") piano(t, m, vv * 0.8);
  else if (scene.note === "bell") bell(t, m, vv, pan);
  
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!ctx || !running) return;
  const dt = Math.max(1, now - lastT); lastT = now;
  const y = window.scrollY || 0, dy = y - lastY;
  const speed = Math.abs(dy) / dt * 1000; lastY = y;                         // px per second
  kickW *= 0.93;
  const target = Math.max(clamp(speed / 2600), kickW);
  const pv = v;
  v += (target - v) * (target > v ? 0.2 : 0.035);
  act = Math.max(v, tension * 0.7);
  const span = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  prog += (clamp(y / span) - prog) * 0.1;

  // a burst of speed gets a swell on the way in and an impact when it lands
  if (v > 0.5 && pv <= 0.5 && now - lastSwell > 5000) { lastSwell = now; swell(2.6, 0.3); }

  trackScene(now);
  const S = scene || SCENES[0];

  // the scene's own chord (by position in the section and slowly by time)
  const secs = (now - sceneT) / 1000;
  const ci = S.ci ? S.ci(sceneP, secs) : (Math.floor(secs / (S.sec || 12)) + Math.floor(sceneP * S.ch.length)) % S.ch.length;
  setChord(clamp(ci, 0, S.ch.length - 1), S);

  // marks (one-off moments inside a scene) fire when the scroll passes them going down, and re-arm when it goes back
  if (S.id !== "loader") {
    for (const m of S.marks) {
      if (!m.f && sceneP >= m.p && dy >= 0) { m.f = 1; try { m.fn(); } catch (e) { /* ignore */ } }
      else if (m.f && sceneP < m.p - 0.05) m.f = 0;
    }
    if (S.prog && Math.abs(sceneP - scenePrevP) > 0.0005) { try { S.prog(sceneP, scenePrevP); } catch (e) { /* ignore */ } }
    scenePrevP = sceneP;
  }
  if (S.id === "tech") { const on = !!document.querySelector("#tech-switch .is-on, #tech-switch.is-on, .ts .is-on, .ts.is-on"); if (on !== tsOn) { tsOn = on; if (on) { const t = nowT(); tick(t, false, 0.4); pianoRoll([50, 57, 62, 69], 0.3, 0.34, t + 0.1); swell(2.4, 0.2); } } }

  // scroll-linked notes: every ~10% of a screen of travel plays the next note of the scene's scale (down the page = up the scale)
  dist += Math.abs(dy);
  const stepPx = Math.max(150, window.innerHeight * 0.24);
  let nn = 0;
  while (dist >= stepPx && nn < 2) {
    dist -= stepPx; nn++;
    if (now - lastNote > 300 && v > 0.03 && (!S.prog)) { lastNote = now; lastDir = dy >= 0 ? 1 : -1; scrollNote(lastDir, v); }
  }
  if (dist > stepPx * 3) dist = 0;

  if (now - lastParams < 33) return;
  lastParams = now;
  const t = ctx.currentTime;
  const mx = S.mixP ? { ...D, ...S.mixP(sceneP) } : S.mix;
  for (const k of Object.keys(D)) { cur[k] += ((mx[k] === undefined ? D[k] : mx[k]) - cur[k]) * 0.06; }
  const energy = 0.3 + 0.4 * Math.sin(Math.PI * Math.min(1, prog * 1.15));
  const bright = clamp(cur.br + 0.28 * v + 0.3 * tension + 0.06 * energy - 0.06);
  tone.frequency.setTargetAtTime(2400 * Math.pow(2, bright * 2.2), t, 0.1);
  padLP.frequency.setTargetAtTime(650 * Math.pow(2, bright * 2.5), t, 0.12);
  celloLP.frequency.setTargetAtTime(300 + 500 * bright, t, 0.15);
  padG.gain.setTargetAtTime((0.5 + 0.45 * bright) * (cur.pad / 0.7) * 0.6, t, 0.4);
  droneG.gain.setTargetAtTime((0.075 + 0.03 * energy) * (cur.cel / 0.7) * 0.7, t, 0.4);
  choirG.gain.setTargetAtTime(0.03 * cur.cho, t, 0.5);
  const sp = S.spread ? S.spread(sceneP) : 1;                                // the stack: voices spread apart, then collapse into one
  const bend = v * 8 + tension * 6;
  pads.forEach((vo) => vo.forEach(({ o, d }) => o.detune.setTargetAtTime(d * sp + bend, t, 0.18)));
  airBP.frequency.setTargetAtTime(280 * Math.pow(2, v * 3.8), t, 0.1);
  air.gain.setTargetAtTime((0.002 + Math.pow(v, 1.5) * 0.03) * (cur.air / 0.5), t, 0.3);
  wet.gain.setTargetAtTime(cur.wet - 0.05 * v, t, 0.4);
  const gl = null;                            // the scene's gliding tone (a fall, a rise)
  if (gl) { glF += (gl.f - glF) * 0.2; glO.frequency.setTargetAtTime(glF, t, 0.05); glO2.frequency.setTargetAtTime(glF * 1.003, t, 0.05); glLP.frequency.setTargetAtTime(glF * 2.2 + 200, t, 0.05); }
  glG.gain.setTargetAtTime(gl ? gl.g : 0, t, gl ? 0.15 : 0.4);
  const fade = clamp((now - fadeStart) / 2400);
  master.gain.setTargetAtTime(wantOn ? 0.5 * (ducked ? 0.35 : 1) : 0, t, wantOn ? 0.25 : 0.2);
  bus.gain.setTargetAtTime(fade * fade, t, 0.1);
}

/* ---------- starting, stopping, unlocking ---------- */
function loop(on) {
  if (on && !timer) { timer = setInterval(schedule, 60); lastT = performance.now(); lastY = window.scrollY || 0; raf = requestAnimationFrame(frame); }
  if (!on) { clearInterval(timer); timer = 0; cancelAnimationFrame(raf); raf = 0; }
}

function resumeCtx() {
  if (!wantOn || hidden || !build() || !ctx) return;
  const was = running;
  const p = ctx.resume && ctx.resume();
  const done = () => {
    const ok = ctx.state === "running";
    if (ok && !was) { running = true; fadeStart = performance.now(); nextStep = 0; if (!scene) { scene = SCENES[0]; sceneT = performance.now(); } chord = -1; chordScene = null; setChord(0, scene); loop(true); if (chimeNext) { chimeNext = false; if (bankState === 2 || bankState === 3) chime(); else chimePending = true; } }
    if (ok !== was) emit();
  };
  if (p && p.then) p.then(done, () => {}); else done();
}

function suspendCtx(after = 0) {
  clearTimeout(wakeTimer);
  wakeTimer = setTimeout(() => {
    if (!ctx) return;
    running = false; loop(false);
    try { ctx.suspend(); } catch (e) { /* ignore */ }
    emit();
  }, after);
}

let wired = false;
export function initScore() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  if (wantOn) resumeCtx();
  const unlock = (e) => {
    if (e && e.target && e.target.closest && e.target.closest("[data-snd-consent]")) return;
    if (wantOn && !running) resumeCtx();
    if (running) off();
  };
  const evs = ["pointerdown", "pointerup", "touchend", "keydown", "click"];
  const off = () => evs.forEach((e) => window.removeEventListener(e, unlock, true));
  evs.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
  window.addEventListener("wheel", (e) => { kickW = Math.min(1, kickW + Math.min(1, Math.abs(e.deltaY) / 500) * 0.5); }, { passive: true });
  let ty = 0;
  window.addEventListener("touchstart", (e) => { ty = e.touches[0] ? e.touches[0].clientY : 0; }, { passive: true });
  window.addEventListener("touchmove", (e) => { const y = e.touches[0] ? e.touches[0].clientY : ty; kickW = Math.min(1, kickW + Math.min(1, Math.abs(y - ty) / 60) * 0.25); ty = y; }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    if (!running || e.pointerType === "touch" || !e.target.closest) return;
    const el = e.target.closest(UI_SEL);
    if (!el || el === lastHoverEl || el.closest("[data-snd-consent]") || el.closest("[data-snd-off]")) return;
    lastHoverEl = el;
    const n = performance.now(); if (n - lastHover < 170) return; lastHover = n;
    uiHover();
  }, { passive: true, capture: true });
  document.addEventListener("pointerout", (e) => { if (e.target === lastHoverEl) lastHoverEl = null; }, { passive: true, capture: true });
  document.addEventListener("pointerdown", (e) => {
    if (!running || !e.target.closest) return;
    const el = e.target.closest(UI_SEL);
    if (el && !el.closest("[data-snd-off]")) uiClick();
  }, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => {
    hidden = document.hidden;
    if (hidden) suspendCtx(400); else { clearTimeout(wakeTimer); if (wantOn) resumeCtx(); }
  });
  // the story's own beats: the loader hands over to the Earth (a swell), the curtain lifts onto the landing (an impact)
  whenStory(() => { tension = 0.4; swell(3, 0.4); });
  whenReleased(() => { released = true; impact(0.8); tension = 0; });
}

/* ---------- the public API ---------- */
export const score = {
  init: initScore,
  /** 0..1 - how much the preloader has loaded: the score tightens as the count climbs */
  setTension(x) { tension = clamp(x); },
  impact, swell,
  /** another section is playing its own loud sound: sit back for a while */
  duck(on) { ducked = !!on; },
  /** the visitor said yes (called from the consent card's click, which is the gesture the browser wants) */
  accept() {
    choice = "on"; wantOn = true; chimeNext = true; save(); clearTimeout(wakeTimer); fadeStart = performance.now();
    resumeCtx();
    try { if (ctx) { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } } catch (e) { /* iOS wants a sound inside the gesture */ }
    emit();
  },
  /** the visitor said no: silence, and the card never comes back (the small switch can still turn it on) */
  decline() {
    choice = "off"; wantOn = false; save();
    if (ctx && running) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); suspendCtx(900); }
    emit();
  },
  toggle() { if (wantOn) this.decline(); else this.accept(); },
  /** "on" playing, "off" muted by the visitor, "locked" wanted but the browser is waiting for a click / key / tap, "ask" never asked */
  state() { return choice === "off" ? "off" : choice === null ? "ask" : running ? "on" : "locked"; },
  level() { return v; },
  /** the id of the scene playing now (handy for debugging) */
  scene() { return scene ? scene.id : null; },
  /** true for a moment after the music started, so the click that started it is not also read as "turn it off" */
  justStarted() { return running && performance.now() - fadeStart < 900; },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};

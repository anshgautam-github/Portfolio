/*
  score.js - the site's sound, v12. Two quiet things, both in the loader only:

    loader   a soft wind that answers any scroll, gentle when slow and stronger when fast: it belongs to the fall from the sky.
             It eases out as the capsule comes in to land and is gone at the SRM touchdown (the loader reports its progress via setFall).
    airliner a far-off jet (low rumble, thin whine) follows the plane that crosses the clouds at the end of the loader.

  The landing page and everything after it is silent. Browsers only allow sound after a click / key / tap: the consent card asks once.
  The answer is remembered. Pauses when the tab is hidden. Nothing here ever throws.
*/
import { whenReleased } from "./loader.js";

const KEY = "ag:score";   // "on" | "off" | unset (never asked: the consent card shows)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let ctx = null, master, wind, windLP, windBP, airHP, airG, bodyG, pan, noiseBuf, gust, jetBP, jetLP, jetG, roarBP, roarG, whine, whineG, jetPan;
let wantOn = false, running = false, built = false, hidden = false, ducked = false, released = false;
let v = 0, wg = 1, kickW = 0, lastY = 0, lastT = 0, raf = 0, wakeTimer = 0, fadeStart = 0, breath = 0, sv = 0, fallP = -1, planeT = 0, planeV = 0, planeX = 0.5, planePk = 0, pl = 0;
const subs = new Set();

let choice = null;
try { choice = localStorage.getItem(KEY) || (localStorage.getItem("ag:score-muted") === "1" ? "off" : null); } catch (e) { /* storage blocked */ }
wantOn = choice === "on";
const save = () => { try { localStorage.setItem(KEY, choice); } catch (e) { /* ignore */ } };
const emit = () => subs.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });

// a dark, wide room: noise that fades out and loses its top end as it decays
function makeIR(c, sec, decay) {
  const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const k = 0.1 + 0.45 * Math.pow(1 - i / n, 2);
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
    master = ctx.createGain(); master.gain.value = 0;
    const lim = ctx.createDynamicsCompressor();                        // a soft ceiling so nothing can ever be loud
    lim.threshold.value = -12; lim.knee.value = 10; lim.ratio.value = 8; lim.attack.value = 0.01; lim.release.value = 0.3;
    master.connect(lim); lim.connect(ctx.destination);

    // ---- the wind (loader only) ----
    noiseBuf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {                                    // brown-ish noise: softer and rounder than white
      const d = noiseBuf.getChannelData(ch); let last = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2; }
    }
    wind = ctx.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
    windBP = ctx.createBiquadFilter(); windBP.type = "bandpass"; windBP.frequency.value = 320; windBP.Q.value = 0.55;
    windLP = ctx.createBiquadFilter(); windLP.type = "lowpass"; windLP.frequency.value = 1400; windLP.Q.value = 0.2;
    bodyG = ctx.createGain(); bodyG.gain.value = 0;
    wind.connect(windBP); windBP.connect(windLP); windLP.connect(bodyG);
    airHP = ctx.createBiquadFilter(); airHP.type = "highpass"; airHP.frequency.value = 1800; airHP.Q.value = 0.3;
    const airLP = ctx.createBiquadFilter(); airLP.type = "lowpass"; airLP.frequency.value = 5200; airLP.Q.value = 0.2;
    airG = ctx.createGain(); airG.gain.value = 0;
    wind.connect(airHP); airHP.connect(airLP); airLP.connect(airG);
    gust = ctx.createOscillator(); gust.frequency.value = 0.19;
    const gg = ctx.createGain(); gg.gain.value = 0.22;
    pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = ctx.createGain(); out.gain.value = 1;
    gust.connect(gg); gg.connect(out.gain);                             // the gust scales the wind (it adds nothing when the wind is silent)
    bodyG.connect(out); airG.connect(out);
    if (pan) { out.connect(pan); pan.connect(master); const dr = ctx.createOscillator(); dr.frequency.value = 0.11; const dg = ctx.createGain(); dg.gain.value = 0.35; dr.connect(dg); dg.connect(pan.pan); dr.start(); } else out.connect(master);
    wind.start(); gust.start();

    // ---- the airliner that crosses the clouds at the end of the loader: a far-off jet, heard through cloud ----
    const jn = ctx.createBufferSource(); jn.buffer = noiseBuf; jn.loop = true;
    jetBP = ctx.createBiquadFilter(); jetBP.type = "bandpass"; jetBP.frequency.value = 230; jetBP.Q.value = 0.5;      // the low rumble of the engines
    jetLP = ctx.createBiquadFilter(); jetLP.type = "lowpass"; jetLP.frequency.value = 650; jetLP.Q.value = 0.3;
    jetG = ctx.createGain(); jetG.gain.value = 0;
    roarBP = ctx.createBiquadFilter(); roarBP.type = "bandpass"; roarBP.frequency.value = 850; roarBP.Q.value = 0.6;   // the thinner rush of air over the wings
    roarG = ctx.createGain(); roarG.gain.value = 0;
    jn.connect(jetBP); jetBP.connect(jetLP); jetLP.connect(jetG); jn.connect(roarBP); roarBP.connect(roarG);
    whine = ctx.createOscillator(); whine.type = "sine"; whine.frequency.value = 640;                                 // a faint turbine whine
    const wh2 = ctx.createOscillator(); wh2.type = "sine"; wh2.frequency.value = 1283;
    whineG = ctx.createGain(); whineG.gain.value = 0; const w2g = ctx.createGain(); w2g.gain.value = 0.4;
    whine.connect(whineG); wh2.connect(w2g); w2g.connect(whineG);
    const jetOut = ctx.createGain(); jetOut.gain.value = 1; jetG.connect(jetOut); roarG.connect(jetOut); whineG.connect(jetOut);
    jetPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (jetPan) { jetOut.connect(jetPan); jetPan.connect(master); } else jetOut.connect(master);
    jn.start(0, Math.random() * 2); whine.start(); wh2.start();

    return true;
  } catch (e) { ctx = null; return false; }
}

/** the per-frame mapping: wind while the loader is up; one soft tone after it */
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (!ctx || !running) return;
  const dt = Math.max(1, now - lastT); lastT = now;
  const y = window.scrollY || 0;
  const speed = Math.abs(y - lastY) / dt * 1000; lastY = y;                      // px per second (smooth with Lenis, native on phones)
  kickW *= 0.93;                                                                  // wheel / touch input counts too (the loader scrolls a virtual page)
  sv += (clamp(speed / 3000) - sv) * 0.15;
  const t = ctx.currentTime;

  // ---- wind: loader only, and gone for good once the landing page is up ----
  // any scroll brings the wind in (a gentle breath for a slow scroll, a rush for a fast one); no scroll, no wind
  const raw = Math.max(clamp(speed / 2200), clamp(kickW / 0.8));
  const target = released || raw < 0.012 ? 0 : 0.2 + 0.8 * Math.pow(raw, 0.6);
  v += (target - v) * (target > v ? 0.14 : 0.035);
  // the wind belongs to the fall: it eases out over the approach and is gone when the capsule touches down on SRM (it follows the fall both ways)
  const fg = released ? 0 : fallP < 0 ? 1 : 1 - smooth(0.36, 0.47, fallP);
  wg += (fg - wg) * 0.05;
  const b = breath > now ? clamp((breath - now) / 900) : 0;                       // the soft breath that confirms "sound is on" (loader only)
  const lvl = clamp(Math.pow(v, 1.1) + 0.22 * Math.sin(Math.PI * (1 - b)) * (b > 0 ? 1 : 0)) * wg;
  windBP.frequency.setTargetAtTime(260 + 1500 * lvl, t, 0.12);
  windLP.frequency.setTargetAtTime(900 + 2400 * lvl, t, 0.15);
  bodyG.gain.setTargetAtTime(0.0001 + 0.95 * lvl, t, 0.12);
  airG.gain.setTargetAtTime(0.0001 + 0.3 * Math.pow(lvl, 1.6), t, 0.15);

  // ---- the airliner: it follows the plane on screen (position -> pan, closeness -> loudness, passing -> pitch drops) ----
  const live = now - planeT < 220;
  const near = Math.exp(-(((planePk - 0.5) / 0.3) ** 2));
  pl += ((live ? planeV * (0.28 + 0.72 * near) : 0) - pl) * 0.1;
  const dop = 1.1 - 0.22 * smooth(0.25, 0.75, planePk);
  jetBP.frequency.setTargetAtTime(230 * dop, t, 0.1); roarBP.frequency.setTargetAtTime(850 * dop, t, 0.1); whine.frequency.setTargetAtTime(640 * dop, t, 0.1);
  jetG.gain.setTargetAtTime(0.0001 + 0.55 * pl, t, 0.1); roarG.gain.setTargetAtTime(0.0001 + 0.2 * Math.pow(pl, 1.3), t, 0.1); whineG.gain.setTargetAtTime(0.0001 + 0.012 * pl, t, 0.1);
  if (jetPan) jetPan.pan.setTargetAtTime(clamp((planeX - 0.5) * 1.7, -0.85, 0.85), t, 0.1);

  const fade = clamp((now - fadeStart) / 900);
  master.gain.setTargetAtTime(wantOn ? 0.5 * fade * (ducked ? 0.3 : 1) : 0, t, wantOn ? 0.2 : 0.15);
}

function loop(on) {
  if (on && !raf) { lastT = performance.now(); lastY = window.scrollY || 0; raf = requestAnimationFrame(frame); }
  if (!on) { cancelAnimationFrame(raf); raf = 0; }
}

function resumeCtx() {
  if (!wantOn || hidden || !build() || !ctx) return;
  const was = running;
  const p = ctx.resume && ctx.resume();
  const done = () => {
    const ok = ctx.state === "running";
    if (ok && !was) { running = true; fadeStart = performance.now(); loop(true); }
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
  whenReleased(() => { released = true; });                                       // the loader is done: the wind stops, the tone takes over
  if (wantOn) resumeCtx();
  const unlock = (e) => {
    if (e && e.target && e.target.closest && e.target.closest("[data-snd-consent]")) return;   // the consent card decides for itself
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
  document.addEventListener("visibilitychange", () => {
    hidden = document.hidden;
    if (hidden) suspendCtx(400); else { clearTimeout(wakeTimer); if (wantOn) resumeCtx(); }
  });
}

/* ---------- the public API ---------- */
const noop = () => {};
export const score = {
  init: initScore,
  /** the loader's airliner is on screen: x 0..1 across the screen, how visible it is (0..1), how far through its crossing (0..1) */
  plane(x, vis, pk) { planeT = performance.now(); planeX = +x; planeV = clamp(+vis); planePk = clamp(+pk); },
  /** the loader tells us how far through the fall it is (0..1, touchdown is at about .47): the wind fades out towards it */
  setFall(p) { fallP = +p; },
  /** kept for the loader (it used to tighten the music as the count climbed): silent now */
  setTension: noop,
  impact: noop, swell: noop,
  /** another section is playing its own sound: sit back while it does */
  duck(on) { ducked = !!on; },
  /** the visitor said yes (called from the consent card's click, which is the gesture the browser wants) */
  accept() {
    choice = "on"; wantOn = true; save(); clearTimeout(wakeTimer); fadeStart = performance.now(); if (!released) breath = performance.now() + 900;
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
  scene() { return released ? "landing" : "loader"; },
  /** true for a moment after the sound started, so the click that started it is not also read as "turn it off" */
  justStarted() { return running && performance.now() - fadeStart < 900; },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
};

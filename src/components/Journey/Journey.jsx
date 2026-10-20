import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { content } from "../../content.js";
import { getGL, texture } from "./glUtil.js";
import { makeWorld, makeRegion } from "./maps.js";
import { createEarth } from "./earthGL.js";
import { createTerrain } from "./terrainGL.js";
import { createCity, CITY_LABELS } from "./cityGL.js";
import { terrainState, earthState, showEarth, showTerrain, showCore, altitudeKm, sm } from "./camera.js";
import { drawHUD } from "./hud.js";
import { drawCore } from "./coreFx.js";
import { createCore } from "./coreGL.js";
import { createShatter } from "./shatter.js";
import { createWind } from "./windSound.js";
import { loaderTask, pendingTasks, release } from "../../lib/loader.js";
import "./journey.css";
import { capDpr, START_SCALE, IS_MOBILE, perf } from "../../lib/perf.js";

const PROLOGUE_TEXT = [
  "Every story has a beginning.",
  "This one starts far above the clouds,",
  "on a pale blue dot, in the dark.",
  "Somewhere down there, I build things.",
  "Let\u2019s go home.",
];
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * 100, y: r(2) * 100, s: 1 + r(3) * 1.8, d: 2 + r(4) * 4, o: -r(5) * 6 };
});
// narrator text: split into words, *word* gets the accent colour
const narrWords = (text) => {
  let on = false;
  return text.split(/\s+/).map((w) => {
    if (w.startsWith("*")) on = true;
    const a = on ? 1 : 0;
    if (w.endsWith("*") || /\*[^*]?$/.test(w)) on = false;
    return { t: w.replace(/\*/g, ""), a };
  });
};
// where we are in the descent, by flight progress: [until p, caption]
const FALL = [
  [0.012, "Scroll to start falling"], [0.1, "Leaving orbit"], [0.2, "Falling toward Earth"], [0.3, "Over India"], [0.385, "Diving toward the coast"],
  [0.5, "Approaching Chennai"], [0.62, "Down GST Road"], [0.78, "Touching down at SRM"], [0.9, "Almost there"], [2, "You have arrived"],
];
const fmtAlt = (km) => (km >= 100 ? Math.round(km).toLocaleString("en-US") + " KM" : km >= 1 ? km.toFixed(1) + " KM" : Math.round(km * 1000) + " M");
const fmtLat = (v) => Math.abs(v).toFixed(4) + "°" + (v >= 0 ? "N" : "S");
const fmtLon = (v) => Math.abs(v).toFixed(4) + "°" + (v >= 0 ? "E" : "W");

export default function Journey() {
  const J = content.journey;
  const sec = useRef(null);
  const pin = useRef(null);
  const glRef = useRef(null);
  const coreRef = useRef(null);
  const shRef = useRef(null);
  const warpRef = useRef(null);
  const skipRef = useRef(null);
  const sndRef = useRef(null);
  const proRef = useRef(null);
  const proLines = useRef([]);
  const proNum = useRef(null);
  const proBar = useRef(null);
  const cueRef = useRef(null);
  const hudRef = useRef(null);
  const stRefs = useRef([]);
  const rd = useRef({});
  const barRef = useRef(null);
  const [noGL, setNoGL] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const secEl = sec.current;
    const glc = glRef.current, coreC = coreRef.current, hudC = hudRef.current;
    const gl = getGL(glc);
    // the loader waits for the planet to be built, so the curtain opens onto a finished Earth
    const readyDone = loaderTask();
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* noop */ }
    window.scrollTo(0, 0);
    if (!gl) { setNoGL(true); readyDone(); }

    let earth = null, terrain = null, city = null, core3d = null, ready = false, dead = false, idleId = 0;
    if (gl) {
      // Heavy CPU texture generation + shader compiles used to run in one long task right at page load.
      // Now: wait until the page is idle after load, then do it in small slices so scrolling/painting never stalls.
      const steps = [
        () => { gl.activeTexture(gl.TEXTURE0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); texture(gl, IS_MOBILE ? makeWorld(1536, 768) : makeWorld(3072, 1536), 0); },
        () => { gl.activeTexture(gl.TEXTURE0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); texture(gl, IS_MOBILE ? makeRegion(2048, 1536) : makeRegion(3584, 2688), 1); },
        () => { earth = createEarth(gl); },
        () => { terrain = createTerrain(gl); },
        () => { city = createCity(gl); },
        () => { core3d = createCore(gl); },
        // one throw-away 4x4 draw so the driver compiles the Earth shader now, not in the middle of the transition
        () => { if (earth) { gl.viewport(0, 0, 4, 4); earth.draw(4, 4, earthState(0, 0), 0); gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } },
        () => { ready = !!(earth && terrain); if (!ready) setNoGL(true); readyDone(); },
      ];
      let si = 0;
      const init = () => {
        if (dead) return;
        if (si < steps.length) { steps[si++](); idleId = setTimeout(init, IS_MOBILE ? 200 : 70); }
      };
      const start = () => { idleId = setTimeout(init, IS_MOBILE ? 500 : 350); };
      if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
    }

    const shC = shRef.current;
    const shCtx = shC.getContext("2d");
    const shatter = createShatter();
    const warpC = warpRef.current, wctx = warpC.getContext("2d");
    const coreCtx = coreC.getContext("2d");
    const hudCtx = hudC.getContext("2d");
    let W = 0, H = 0, scale = START_SCALE, dpr = 1, hudDpr = 1, cw = 0, ch = 0, SW = 0, SHh = 0;
    const size = () => {
      cw = pin.current.clientWidth; ch = pin.current.clientHeight;
      dpr = capDpr(2, 1.25);
      W = Math.round(cw * dpr * scale); H = Math.round(ch * dpr * scale);
      glc.width = W; glc.height = H;
      hudDpr = capDpr(1.5, 1);
      hudC.width = Math.round(cw * hudDpr); hudC.height = Math.round(ch * hudDpr);
      const cs = 0.75;
      coreC.width = Math.round(cw * cs); coreC.height = Math.round(ch * cs);
      SW = Math.round(cw * Math.min(dpr, 1.25)); SHh = Math.round(ch * Math.min(dpr, 1.25));
      shC.width = SW; shC.height = SHh;
      warpC.width = Math.round(cw * 0.5); warpC.height = Math.round(ch * 0.5);
      if (gl) gl.viewport(0, 0, W, H);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(pin.current);

    // ---- the story clock ---------------------------------------------------------------------------------------------------
    // drive.s   0..1  how far along the flight (orbit -> India -> Chennai -> campus -> me) we are
    // drive.in  0..1  the planet fading up out of the hyperspace flash when the curtain opens
    // drive.sh  0..1  the shatter that breaks the last frame open onto the landing page
    const drive = { s: 0, in: 0, sh: 0 };
    const FLIGHT = IS_MOBILE ? 26 : 32;   // seconds of flying (tune here)
    let started = false, finished = false, skipTween = null;
    let target = 0, cur = 0, last = 0, frames = 0, acc = 0, lastP = -1, tick = 0, jacc = 0;
    let spin = 0, shT = 0, shCur = 0, snapped = false, burst = 0, stageIdx = -1, prevCur = 0, shatterStarted = false, velS = 0, Ilast = 0;
    const grainEl = pin.current.querySelector(".jr-grain");
    const wind = createWind();
    const T0 = performance.now();
    const A = 2.7 / J.length, B = 6.6 / J.length;
    const mapS = (sS) => (sS < A ? (sS / A) * 0.3 : sS < B ? 0.3 + ((sS - A) / (B - A)) * 0.13 : 0.43 + ((sS - B) / (1 - B)) * 0.57);

    const finish = () => {
      if (finished) return;
      finished = true;
      release();                       // (no-op if the shatter already released it)
      try { gl && gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* noop */ }
      setGone(true);
    };
    const playShatter = () => {
      if (shatterStarted) return;
      shatterStarted = true;
      skipRef.current && skipRef.current.classList.remove("on");
      sndRef.current && sndRef.current.classList.remove("on");
      cueRef.current && cueRef.current.classList.remove("on");
      wind.stop();
      live = false;
      // the landing page starts its own intro (the name being written, stickers falling) right behind the breaking glass
      release();
      gsap.to(drive, { sh: 1, duration: 1.9, ease: "power1.in", onComplete: () => setTimeout(finish, 350) });
    };
    // ---- Act 0: the Earth IS the loader -----------------------------------------------------------------------------------
    // While the planet (and the landing page behind it) build, a prologue is told over the dark sky. When everything is ready
    // the sky fades in on the Earth at orbit and from then on the story moves exactly as fast as you scroll.
    const MIN = 5600, MAX = 15000;
    const PROLOGUE = [1700, 3400, 5100];   // when (ms) lines 2..4 appear; line 1 is at 0, the last line waits for "ready"
    const proEl = proRef.current;
    const t0p = performance.now();
    let pLine = -1, pPct = 0, proDone = false, proDoneAt = 0, lastPct = -1;
    const showLine = (i) => {
      if (i === pLine) return;
      pLine = i;
      proLines.current.forEach((el, k) => { if (el) el.className = "jr-line" + (k === i ? " on" : k < i ? " past" : ""); });
    };
    let live = false, sT = 0, over = 0, overV = 0;
    const begin = () => {
      if (started || dead || finished) return;
      if (!ready || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { finish(); return; }
      started = true;
      burst = 1.2;
      gsap.to(drive, { in: 1, duration: 3.2, ease: "power2.out" });
      gsap.delayedCall(1.8, () => {
        if (dead || finished) return;
        live = true;
        cueRef.current && cueRef.current.classList.add("on");
        skipRef.current && skipRef.current.classList.add("on");
        sndRef.current && sndRef.current.classList.add("on");
      });
    };
    const proTick = () => {
      if (proDone || dead) return;
      const el = performance.now() - t0p;
      const ok = el >= MIN && pendingTasks() === 0 && (ready || !gl);
      let tg = Math.min(0.92, (el / MIN) * 0.92);
      if (ok || el > MAX) tg = 1; else if (el > MIN) tg = Math.min(0.985, 0.92 + (el - MIN) / 40000);
      pPct += (tg - pPct) * 0.12;
      if (tg === 1 && pPct > 0.995) pPct = 1;
      const pct = Math.round(pPct * 100);
      if (pct !== lastPct) { lastPct = pct; if (proNum.current) proNum.current.textContent = String(pct).padStart(3, "0"); }
      if (proBar.current) proBar.current.style.transform = `scaleX(${pPct})`;
      let li = 0;
      for (let k = 0; k < PROLOGUE.length; k++) if (el >= PROLOGUE[k]) li = k + 1;
      if (pPct >= 0.985) li = ok || el > MAX ? PROLOGUE.length + 1 : Math.min(li, PROLOGUE.length);
      showLine(li);
      if (pPct >= 1) {
        if (!proDoneAt) proDoneAt = el;
        if (el - proDoneAt > 1300) { proDone = true; proEl.classList.add("out"); begin(); }   // hold "let's go home" for a beat
      }
    };
    gsap.ticker.add(proTick);

    // ---- Act 1: scroll drives the whole flight -----------------------------------------------------------------------------
    // wheel / touch / keys move a virtual scroll position (the page itself stays locked until the shatter).
    const feed = (dpx) => {
      if (!live || shatterStarted || skipTween) return;
      const vh = window.innerHeight;
      if (sT >= 1 && (dpx > 0 || over > 0)) {
        over = Math.min(1, Math.max(0, over + dpx / (vh * 0.7)));   // pushing past the end: the glass strains...
        if (over >= 1) { playShatter(); return; }                   // ...and breaks
      } else {
        sT = Math.min(1, Math.max(0, sT + dpx / (vh * J.length)));
      }
      drive.s = sT;
      if (cueRef.current) cueRef.current.classList.toggle("on", sT < 0.015);
      if (rd.current.fall) rd.current.fall.classList.toggle("on", sT >= 0.015);
    };
    const onWheel = (e) => { if (finished) return; e.preventDefault(); feed(e.deltaY * (e.deltaMode === 1 ? 32 : 1)); };
    // phones: a swipe moves the flight ~2x further than on desktop and keeps coasting after you lift your finger (like a native flick)
    const TK = IS_MOBILE ? 3.4 : 1.7;
    let ty = 0, tt = 0, tv = 0, coast = 0;
    const coastTick = (time, dtm) => {
      if (Math.abs(tv) < 0.02 || finished) { tv = 0; gsap.ticker.remove(coastTick); coast = 0; return; }
      feed(tv * dtm);
      tv *= Math.pow(0.94, dtm / 16.7);
    };
    const onTS = (e) => { ty = e.touches[0].clientY; tt = performance.now(); tv = 0; if (coast) { gsap.ticker.remove(coastTick); coast = 0; } };
    const onTM = (e) => {
      if (finished) return;
      e.preventDefault();
      const y = e.touches[0].clientY, n = performance.now(), d = (ty - y) * TK;
      feed(d);
      const dtm = Math.max(1, n - tt);
      tv = tv * 0.6 + (d / dtm) * 0.4;
      ty = y; tt = n;
    };
    const onTE = () => { if (!IS_MOBILE || Math.abs(tv) < 0.05 || performance.now() - tt > 90) { tv = 0; return; } if (!coast) { coast = 1; gsap.ticker.add(coastTick); } };
    const onKey = (e) => {
      if (finished || e.metaKey || e.ctrlKey || e.altKey) return;
      const vh = window.innerHeight;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); feed(vh * 0.7); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); feed(-vh * 0.7); }
      else if (e.key === "Escape" && live) skip();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTS, { passive: true });
    window.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("touchend", onTE, { passive: true });
    window.addEventListener("touchcancel", onTE, { passive: true });
    window.addEventListener("keydown", onKey);
    // "skip": not a cut, a dash - the rest of the flight is flown in ~2 seconds, then the shatter
    function skip() {
      if (!live || shatterStarted || skipTween) return;
      live = false;
      skipRef.current && skipRef.current.classList.remove("on");
      cueRef.current && cueRef.current.classList.remove("on");
      skipTween = gsap.to(drive, { s: 1, duration: 2.2, ease: "power2.inOut", onComplete: playShatter });
    }
    const sndBtn = sndRef.current;
    const onSnd = () => { const on = wind.toggle(); sndBtn.classList.toggle("is-on", on); sndBtn.firstChild.textContent = on ? "Sound on" : "Sound off"; };
    sndBtn.addEventListener("click", onSnd);
    const skipBtn = skipRef.current;
    skipBtn.addEventListener("click", skip);

    // ---- the feeling of falling toward the Earth ----------------------------------------------------------------------------
    // No more streaks: soft cloud banks rush past (growing out of the centre of the screen), a warm re-entry glow breathes at the rim of the
    // screen on the way down through the atmosphere, and a little dust whips by. All of it moves only as fast as you scroll (flow), and the
    // altitude ruler on the right edge (hud.js) counts the fall.
    const cloudSprite = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d");
      for (let i = 0; i < 8; i++) {
        const x = 34 + Math.random() * 60, y = 44 + Math.random() * 40, r = 22 + Math.random() * 30;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(255,255,255,.5)"); gr.addColorStop(0.55, "rgba(235,242,255,.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      }
      return c;
    })();
    const CLOUDS = Array.from({ length: IS_MOBILE ? 9 : 16 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.7 + Math.random() * 0.8, rot: Math.random() * 6.28 }));
    const DUST = Array.from({ length: IS_MOBILE ? 24 : 56 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.6 + Math.random() * 1.2 }));
    let flow = 0;
    const drawWarp = (I, p) => {
      const w = warpC.width, h = warpC.height;
      wctx.clearRect(0, 0, w, h);
      if (I < 0.015) return;
      const cx = w * 0.5, cy = h * 0.5, R = Math.hypot(w, h) * 0.5;
      // radial (zoom) motion blur: faint copies of the current frame, a little smaller each, give the planet real speed streaks
      // (everything that rushes outward from the centre of the screen smears along its path - the way a falling camera sees it)
      const zb = Math.min(1, I * 1.15) * (1 - sm(0.52, 0.64, p));
      if (!IS_MOBILE && zb > 0.04) {
        const N = 7;
        for (let k = N; k >= 1; k--) {
          const sc = 1 - k * 0.017 * zb, dw = w * sc, dh = h * sc;
          wctx.globalAlpha = 0.16 * zb * (1 - (k - 1) / (N + 1));
          wctx.drawImage(glc, (w - dw) / 2, (h - dh) / 2, dw, dh);
        }
        wctx.globalAlpha = 1;
      }
      // re-entry glow at the rim while we drop through the upper atmosphere
      const heat = sm(0.03, 0.15, p) * (1 - sm(0.3, 0.38, p)) * (0.3 + 0.7 * I);
      if (heat > 0.02) {
        const gr = wctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
        gr.addColorStop(0, "rgba(255,140,60,0)"); gr.addColorStop(1, "rgba(255,110,40," + (0.34 * heat).toFixed(3) + ")");
        wctx.fillStyle = gr; wctx.fillRect(0, 0, w, h);
      }
      // cloud banks punching past
      const cf = (1 - sm(0.42, 0.5, p)) * Math.min(1, I * 1.2);
      if (cf > 0.01) {
        for (let i = 0; i < CLOUDS.length; i++) {
          const c = CLOUDS[i];
          const ph = (flow * c.s + c.r) % 1, e = ph * ph;
          const rad = R * (0.04 + 1.0 * e), size = R * (0.18 + 0.9 * e) * c.s;
          wctx.globalAlpha = Math.sin(Math.PI * ph) * 0.55 * cf;
          wctx.save();
          wctx.translate(cx + Math.cos(c.a) * rad, cy + Math.sin(c.a) * rad);
          wctx.rotate(c.rot + ph * 0.6);
          wctx.drawImage(cloudSprite, -size / 2, -size / 2, size, size);
          wctx.restore();
        }
        wctx.globalAlpha = 1;
      }
      // fine dust whipping past (tiny, short)
      wctx.fillStyle = "rgb(210,225,255)";
      for (let i = 0; i < DUST.length; i++) {
        const d = DUST[i];
        const ph = (flow * 1.6 * d.s + d.r) % 1, e = ph * ph;
        const rad = R * (0.08 + 1.0 * e);
        wctx.globalAlpha = Math.min(1, ph * 3) * (1 - ph) * 0.6 * I;
        wctx.beginPath(); wctx.arc(cx + Math.cos(d.a) * rad, cy + Math.sin(d.a) * rad, 0.5 + e * 2.2, 0, 6.2832); wctx.fill();
      }
      wctx.globalAlpha = 1;
    };

    const stages = J.stages;
    const PIECE = [[-160, -240, -10], [-340, -320, -7], [380, 300, 8], [-120, 320, 6], [260, -260, -9]];
    const pieces = () => { const el = stRefs.current[stages.length - 1]; return el ? Array.from(el.querySelectorAll(".jr-tag, .jr-title span, .jr-body, .jr-cta")) : []; };
    const barEl = () => secEl.querySelector(".jr-bar");
    const render = (time, dt) => {
      if (!started || finished) return;
      // phones: cap the heavy WebGL + HUD redraw at ~30 fps (dt is accumulated so the easing speed stays correct)
      jacc += dt;
      if (perf.frameMs && jacc < perf.frameMs - 2) return;
      dt = jacc; jacc = 0;
      const now = performance.now();
      const k = 1 - Math.pow(0.0001, dt / 1000);
      target = mapS(drive.s);
      shT = drive.sh;
      cur += (target - cur) * Math.min(1, k * 0.9);
      if (Math.abs(target - cur) < 1e-5) cur = target;
      {
        // arrival: the planet fades up out of the light while flying in from close range
        const i = drive.in;
        const a = sm(0, 0.75, i), z = 1 + 0.42 * Math.pow(1 - sm(0, 1, i), 2);
        overV += (over - overV) * 0.18;
      // atmospheric entry: the whole view shakes, harder the faster you fall (a soft sum of sines, not random jitter)
      const entry = sm(0.03, 0.12, cur) * (1 - sm(0.3, 0.4, cur));
      const shk = Ilast * (0.5 + 2.4 * entry) * (IS_MOBILE ? 0.6 : 1);
      const tm = now * 0.001;
      const sx = shk * (Math.sin(tm * 41) + 0.6 * Math.sin(tm * 97 + 1.3)), sy = shk * (Math.sin(tm * 37 + 2) + 0.6 * Math.sin(tm * 83));
      const sr = shk * 0.035 * Math.sin(tm * 53);
      const shake = shk > 0.02 ? `translate3d(${sx.toFixed(2)}px,${sy.toFixed(2)}px,0) rotate(${sr.toFixed(3)}deg) scale(1.02) ` : "";
      grainEl.style.opacity = (0.5 + 0.5 * Ilast).toFixed(3);
        if (overV > 0.0005 && !shatterStarted) burst = Math.max(burst, overV * 0.9);
        pin.current.style.opacity = i >= 0.999 ? "1" : a.toFixed(3);
        pin.current.style.transform = i >= 0.999 ? (overV > 0.001 || shake ? shake + `scale(${(1 + 0.03 * overV).toFixed(4)})` : "none") : `scale(${z.toFixed(4)})`;
      }
      shCur += (shT - shCur) * Math.min(1, k * 0.9);
      if (Math.abs(shT - shCur) < 1e-4) shCur = shT;
      const p = cur;
      const t = (now - T0) / 1000;

      // adaptive resolution
      if (last) {
        acc += now - last; frames++;
        if (frames >= (IS_MOBILE ? 20 : 40)) {
          const avg = acc / frames;
          if (!navigator.webdriver && avg > (perf.frameMs ? perf.frameMs + 7 : 26) && scale > 0.45) { scale = Math.max(0.45, scale - 0.12); size(); }
          acc = 0; frames = 0;
        }
      }
      last = now;

      spin += (dt / 1000) * 7.5 * (1 - sm(0, 0.02, p));
      const es = earthState(p, spin), ts = terrainState(p);
      const S = { p, earth: es, ter: ts, city, labels: CITY_LABELS };

      const shat = shCur > 0.0005;
      if (!snapped) {
        // WebGL
        if (ready) {
          const sE = showEarth(p), sT = showTerrain(p);
          glc.style.visibility = "visible";
          const inCore = core3d && p > 0.79;
          if (p <= 0.9 || !core3d) {
            if (sE) earth.draw(W, H, es, t);
            else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
            if (sT) terrain.draw(W, H, ts, t);
            if (city && p > 0.39 && p < 0.9) city.draw(W, H, p, t);
          } else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
          if (inCore) {
            core3d.draw(W, H, sm(0.8, 0.98, p), sm(0.805, 0.875, p), sm(0.8, 0.83, p) * (1 - sm(0.83, 0.88, p)), t, 0, 0.35 + 0.65 * sm(0.82, 0.9, p));
          }
        }
        // legacy 2D core (fallback only)
        if (showCore(p) && !core3d) {
          coreC.style.visibility = "visible";
          drawCore(coreCtx, coreC.width, coreC.height, sm(0.8, 1, p), sm(0.78, 0.86, p), t);
        } else coreC.style.visibility = "hidden";
        // hud
        hudCtx.setTransform(hudDpr, 0, 0, hudDpr, 0, 0);
        drawHUD(hudCtx, cw, ch, S, t);
      }
      // shatter exit: freeze the last frame and break it into shards
      if (shat && !snapped) {
        shatter.capture(glc, hudC, SW, SHh);
        snapped = true;
        pin.current.classList.add("shat");
        shC.style.visibility = "visible";
      } else if (!shat && snapped) {
        snapped = false;
        pin.current.classList.remove("shat");
        shC.style.visibility = "hidden";
        shCtx.clearRect(0, 0, SW, SHh);
        pieces().forEach((el) => { el.style.transform = ""; el.style.filter = ""; el.style.opacity = ""; });
        barEl().style.opacity = "";
      }
      if (snapped) {
        shatter.draw(shCtx, SW, SHh, shCur);
        const ps = pieces();
        ps.forEach((el, i) => {
          const o = PIECE[i % PIECE.length];
          const u = Math.min(1, Math.max(0, (shCur - 0.1 - i * 0.035) / 0.55));
          const e = u * u * (3 - 2 * u);
          el.style.transform = `translate3d(${o[0] * e}px,${o[1] * e + 260 * e * e}px,0) rotate(${o[2] * e}deg) scale(${1 + 0.35 * e})`;
          if (!IS_MOBILE) el.style.filter = e > 0.02 ? `blur(${(e * 9).toFixed(1)}px)` : "none";
          el.style.opacity = String(1 - Math.pow(e, 1.3));
        });
        barEl().style.opacity = String(1 - Math.min(1, shCur / 0.12));
      }
      // text stages
      stages.forEach((s, i) => {
        const el = stRefs.current[i];
        if (!el) return;
        const [a, b, c, d] = s.range;
        const v = sm(a, b, p) * (1 - sm(c, d, p));
        if (v < 0.003) { if (el.style.visibility !== "hidden") el.style.visibility = "hidden"; return; }
        el.style.visibility = "visible";
        el.style.opacity = v;
        const into = 1 - sm(a, b, p), out = sm(c, d, p);
        el.style.transform = `translate3d(0,${into * 36 - out * 28}px,0)`;
        if (s.write) {
          // the story writes itself, word by word, exactly as fast as you scroll
          const ws = el.querySelector(".jr-body").children, n = ws.length;
          const r = Math.min(1, Math.max(0, (p - s.write[0]) / (s.write[1] - s.write[0])));
          for (let j = 0; j < n; j++) {
            const w = Math.min(1, Math.max(0, r * (n + 2) - j));
            const sp = ws[j].style;
            sp.opacity = w.toFixed(3);
            sp.transform = w >= 1 ? "none" : `translate3d(0,${((1 - w) * 10).toFixed(1)}px,0)`;
          }
        }
        if (!IS_MOBILE) el.style.filter = v < 0.98 ? `blur(${((1 - v) * 10).toFixed(1)}px)` : "none";
      });

      // chapter changes: a burst of light-speed streaks + the title tracks in
      {
        let idx = 0;
        stages.forEach((s, i) => { if (p >= s.range[0] + (s.range[1] - s.range[0]) * 0.5) idx = i; });
        if (idx !== stageIdx) { if (stageIdx >= 0) burst = Math.max(burst, 0.95); stageIdx = idx; }
        burst = Math.max(0, burst - dt / 1300);
        const dcur = Math.abs(cur - prevCur);
        const vel = dcur / Math.max(0.001, dt / 1000);
        prevCur = cur;
        velS += (vel - velS) * 0.18;
        flow += dcur * 9;                                           // clouds only move when you do
        const I = Math.min(1, velS * 14) * (1 - sm(0.76, 0.82, p)) * (snapped ? 0 : 1);
        Ilast = I;
        drawWarp(I, p);
        wind.set(I, sm(0.03, 0.12, cur) * (1 - sm(0.3, 0.4, cur)));
        if (!IS_MOBILE) {
          for (let i = 0; i < stages.length; i++) {
            const el = stRefs.current[i];
            if (!el) continue;
            const [a2, b2, c2, d2] = stages[i].range;
            const v = sm(a2, b2, p) * (1 - sm(c2, d2, p));
            if (v < 0.003) continue;
            const ls = v < 0.995 ? (-0.01 + (1 - sm(a2, b2, p)) * 0.28 + sm(c2, d2, p) * 0.1).toFixed(3) + "em" : "";
            const spans = el.querySelectorAll(".jr-title span");
            for (let j = 0; j < spans.length; j++) spans[j].style.letterSpacing = ls;
          }
        }
      }
      // readouts (throttled)
      if (++tick % 3 === 0 && Math.abs(p - lastP) > 1e-5) {
        lastP = p;
        let idx = 0;
        stages.forEach((s, i) => { if (p >= s.range[0] + (s.range[1] - s.range[0]) * 0.5) idx = i; });
        const r = rd.current;
        {
          // "falling to meet Ansh": a live caption that says where you are in the descent and how far is left
          const altNow = p > 0.8 ? 0 : p < 0.44 ? altitudeKm(p, ts) : city ? Math.max(0.03, city.eye()[1] / 1000) : altitudeKm(p, ts);
          const ph = FALL.findIndex((f) => p < f[0]);
          const fi = ph < 0 ? FALL.length - 1 : ph;
          if (r.fphase && r.fphase.dataset.i !== String(fi)) {
            r.fphase.dataset.i = String(fi);
            r.fphase.textContent = FALL[fi][1];
            r.fphase.classList.remove("swap"); void r.fphase.offsetWidth; r.fphase.classList.add("swap");
          }
          if (r.fnum) {
            const t = fmtAlt(Math.max(altNow, 0.03)), k = t.lastIndexOf(" ");
            r.fnum.textContent = t.slice(0, k); r.funit.textContent = t.slice(k + 1);
          }
          if (r.fall) r.fall.style.opacity = p > 0.78 ? String(1 - sm(0.78, 0.84, p)) : "";   // at the core the big title takes over
        }
        r.stage.textContent = String(idx + 1).padStart(2, "0") + " / " + String(stages.length).padStart(2, "0");
        r.name.textContent = stages[idx].tag;
        if (p > 0.8) {
          r.lat.textContent = "NODE"; r.lon.textContent = "ONLINE"; r.alt.textContent = "—";
        } else if (p < 0.3) {
          const lat = (es.la * 180) / Math.PI, lon = (es.lo * 180) / Math.PI;
          r.lat.textContent = fmtLat(lat); r.lon.textContent = fmtLon(lon); r.alt.textContent = fmtAlt(altitudeKm(p, ts));
        } else if (city && p > 0.44) {
          const e = city.eye();
          const k = Math.min(1, Math.max(0, e[2] / 1400));
          r.lat.textContent = fmtLat(13.083 - 0.26 * k + e[0] * 9e-6);
          r.lon.textContent = fmtLon(80.27 - 0.225 * k + e[0] * 1e-5);
          r.alt.textContent = fmtAlt(Math.max(0.03, e[1] / 1000));
        } else {
          r.lat.textContent = fmtLat(ts.c[1]); r.lon.textContent = fmtLon(ts.c[0]); r.alt.textContent = fmtAlt(altitudeKm(p, ts));
        }
        barRef.current.style.transform = `scaleX(${p})`;
      }
    };
    gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(render);
      gsap.ticker.remove(proTick); skipTween && skipTween.kill(); gsap.killTweensOf(drive);
      ro.disconnect();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTS);
      window.removeEventListener("touchmove", onTM);
      window.removeEventListener("touchend", onTE);
      window.removeEventListener("touchcancel", onTE);
      gsap.ticker.remove(coastTick);
      window.removeEventListener("keydown", onKey);
      skipBtn.removeEventListener("click", skip);
      sndBtn.removeEventListener("click", onSnd);
      wind.stop();
      readyDone();
      dead = true;
      clearTimeout(idleId);
    };
  }, []);

  const set = (k) => (el) => { rd.current[k] = el; };

  if (gone) return null;
  return (
    <section ref={sec} className="jr" id="journey" aria-label="Journey from orbit to my desk">
      <div ref={proRef} className="jr-pro" role="status" aria-label="Loading portfolio">
        <div className="jr-stars" aria-hidden="true">
          {STARS.map((s, i) => <i key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.s, height: s.s, animationDuration: s.d + "s", animationDelay: s.o + "s" }} />)}
        </div>
        <div className="jr-pro-top"><span>PROLOGUE</span><span>13.08°N · 80.27°E</span></div>
        <div className="jr-story" aria-live="polite">
          {PROLOGUE_TEXT.map((t, i) => <p key={i} ref={(el) => (proLines.current[i] = el)} className="jr-line">{t}</p>)}
        </div>
        <div className="jr-pro-foot"><span className="jr-pro-num"><b ref={proNum}>000</b>%</span><div className="jr-pro-bar"><i ref={proBar} /></div></div>
        <div className="jr-flash" aria-hidden="true" />
      </div>
      <div ref={pin} className="jr-pin" style={{ opacity: 0 }}>
        <div className={"jr-fallback" + (noGL ? " on" : "")} />
        <canvas ref={glRef} className="jr-gl" />
        <canvas ref={coreRef} className="jr-core" />
        <canvas ref={hudRef} className="jr-hud" />
        <canvas ref={warpRef} className="jr-warp" />
        <canvas ref={shRef} className="jr-shatter" />
        <div className="jr-shade" />
        <div className="jr-grain" />

        <div className="jr-bar">
          <div className="jr-bar-l"><span className="jr-plus">+</span> {J.label}</div>
          <div className="jr-bar-r">
            <span><i>STAGE</i> <b ref={set("stage")}>01 / 06</b></span>
            <span><i>LAT</i> <b ref={set("lat")}>—</b></span>
            <span><i>LON</i> <b ref={set("lon")}>—</b></span>
            <span><i>ALT</i> <b ref={set("alt")}>—</b></span>
          </div>
        </div>
        <div className="jr-fl" ref={set("fall")}>
          <div className="jr-fl-top"><i>▼</i><b ref={set("fphase")} /></div>
          <div className="jr-fl-num"><strong ref={set("fnum")}>—</strong><em ref={set("funit")} /></div>
          <div className="jr-fl-to">to meet Ansh</div>
        </div>
        <div className="jr-name" ref={set("name")} />

        {J.stages.map((s, i) => (
          <div key={i} ref={(el) => (stRefs.current[i] = el)} className={"jr-st jr-st--" + (s.pos || "bl")} style={{ visibility: "hidden", opacity: 0 }}>
            <div className="jr-tag"><span className="jr-plus">+</span> {s.tag}</div>
            <h2 className="jr-title">{s.title.map((l, j) => <span key={j}>{l}</span>)}</h2>
            <p className="jr-body">{narrWords(s.body).map((w, j) => <span key={j} className={"jr-nw" + (w.a ? " a" : "")} style={s.write ? { opacity: 0 } : undefined}>{w.t} </span>)}</p>
            {s.cap && <p className="jr-cap">{s.cap}</p>}
            {s.cta && <p className="jr-cta">{s.cta} <span className="jr-arrow">↓</span></p>}
          </div>
        ))}

        <div ref={cueRef} className="jr-cue" aria-hidden="true"><span>Scroll to begin the journey</span><i /></div>
        <div className="jr-ctl">
          <button ref={sndRef} type="button" className="jr-skip jr-snd"><b>Sound off</b> <span>♪</span></button>
          <button ref={skipRef} type="button" className="jr-skip">Skip intro <span>→</span></button>
        </div>
        <div className="jr-prog"><div ref={barRef} className="jr-prog-i" /></div>
      </div>
    </section>
  );
}

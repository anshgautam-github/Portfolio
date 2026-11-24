// Device tiering + shared performance knobs.
// Phones / tablets / weak laptops get a cheaper render budget (lower canvas resolution, no animated blur filters,
// lighter glass) so scrolling stays on the compositor and every frame fits in 16 ms.

const nav = typeof navigator !== "undefined" ? navigator : {};
const win = typeof window !== "undefined" ? window : {};

export const IS_TOUCH = !!win.matchMedia && win.matchMedia("(pointer: coarse)").matches;
export const IS_SMALL = !!win.matchMedia && win.matchMedia("(max-width: 820px)").matches;
export const IS_MOBILE = IS_TOUCH || IS_SMALL;
/** desktop Safari (and any WebKit that is not Chrome / Firefox / Edge): its compositor flickers over live canvases with blend modes and backdrop blur */
export const IS_SAFARI = typeof navigator !== "undefined" && /^((?!chrome|chromium|crios|fxios|edg|android|opr).)*safari/i.test(navigator.userAgent || "");

const cores = nav.hardwareConcurrency || 8;
const mem = nav.deviceMemory || 8;
export const IS_LOW_END = IS_MOBILE || cores <= 4 || mem <= 4;

/**
 * Phone tiers. Phones differ a lot (a flagship and a budget Android run the same page at very different speeds), so one fixed budget is either
 * too heavy for the weak phone or wasteful on the strong one.
 *   0 = full look (flagships: nothing changes)
 *   1 = lite   : no backdrop blur, canvases at a lower resolution, endless CSS loops frozen while scrolling
 *   2 = potato : also ~20 fps decorative canvases, lower WebGL scale, blend / blur decorations dropped
 * The tier starts from the hardware (few cores / little memory) and from what an earlier visit measured, and the governor below moves it
 * up while the visitor scrolls if frames are actually being dropped. Add ?tier=0|1|2 to the URL to force one for testing.
 */
const TIER_KEY = "pf-tier", TIER_TTL = 14 * 864e5;
const forced = /[?&]tier=([012])\b/.exec(typeof location !== "undefined" ? location.search : "");
const storedTier = (() => {
  try { const [t, ts] = (localStorage.getItem(TIER_KEY) || "").split(":"); return Date.now() - (+ts || 0) < TIER_TTL ? Math.min(2, +t || 0) : 0; } catch (e) { return 0; }
})();
const hwTier = IS_MOBILE && (cores <= 4 || mem <= 3) ? 1 : 0;
export const TIER = forced ? +forced[1] : IS_MOBILE ? Math.max(hwTier, storedTier) : 0;

/** Highest devicePixelRatio we are willing to render a canvas at. */
export const capDpr = (desktopMax = 1.5, mobileMax = 1.25) =>
  Math.min(win.devicePixelRatio || 1, IS_MOBILE ? (TIER >= 2 ? Math.min(mobileMax, 1) : TIER === 1 ? Math.min(mobileMax, 1.1) : mobileMax) : desktopMax);

/** Starting render scale for the big WebGL scene (the adaptive code only ever steps down from here). */
export const START_SCALE = IS_MOBILE ? (TIER >= 2 ? 0.55 : TIER === 1 ? 0.64 : 0.72) : IS_LOW_END ? 0.85 : 1;

if (typeof document !== "undefined") {
  const c = document.documentElement.classList;
  if (IS_MOBILE) c.add("is-mobile");
  if (IS_SAFARI) c.add("is-safari");
  if (IS_LOW_END) c.add("is-lite");
  if (TIER >= 1) c.add("is-tier1");
  if (TIER >= 2) c.add("is-potato");
}

/**
 * Shared frame-rate budget for decorative canvas loops.
 * frameMs = 0 means "run every display frame"; 33 means "cap at ~30 fps".
 * Phones start capped; other devices get capped automatically if they are measured to be struggling.
 */
export const perf = { frameMs: IS_MOBILE ? (TIER >= 2 ? 50 : 33) : 0, hold: false, tier: TIER };   // hold: true while a phone is mid-transition; decorative canvases keep their last frame
/** true when a loop that last ran at `last` should skip this rAF tick */
export const skipFrame = (now, last) => perf.frameMs > 0 && now - last < perf.frameMs - 2;

if (typeof window !== "undefined" && window.requestAnimationFrame && !IS_MOBILE) {
  let t0 = 0, n = 0, windows = 0;
  const probe = (t) => {
    if (document.hidden || windows >= 6) { t0 = 0; if (windows < 6) requestAnimationFrame(probe); return; }
    if (!t0) { t0 = t; n = 0; } else if (++n >= 90) {
      windows++;
      if ((t - t0) / n > 26) { perf.frameMs = 33; document.documentElement.classList.add("is-lite"); windows = 99; return; }
      t0 = 0;
    }
    requestAnimationFrame(probe);
  };
  // start measuring after the initial load burst so startup hitches don't trigger it
  setTimeout(() => requestAnimationFrame(probe), 6000);
}


/**
 * Frame pacing for phones (one shared clock).
 * Phones differ a lot: 60 / 90 / 120 / 144 Hz panels. The site runs ~20 independent requestAnimationFrame loops (loader, WebGL scenes, canvases,
 * GSAP). On a 120-144 Hz screen they all fire every 7-8 ms with whatever phase they started in, so one layer updates, another does not, and the
 * eye reads that as flicker / shimmer, while a 60 Hz phone happens to line them up. On a high-refresh phone we therefore replace
 * requestAnimationFrame with ONE paced loop that delivers every callback together on every Nth vsync (about 60 fps, always the same cadence).
 * 60-90 Hz phones are left untouched. Add ?nopace to the URL to switch it off.
 */
if (IS_MOBILE && typeof window !== "undefined" && window.requestAnimationFrame && !/[?&]nopace\b/.test(location.search)) {
  const nativeRaf = window.requestAnimationFrame.bind(window), nativeCaf = window.cancelAnimationFrame.bind(window);
  const q = new Map();
  let next = 1e9, every = 1, tick = 0, live = false;
  const loop = (t) => {
    live = false;
    if (++tick % every === 0 || every === 1) {
      const batch = Array.from(q); q.clear();
      for (const [, cb] of batch) { try { cb(t); } catch (e) { setTimeout(() => { throw e; }); } }
    }
    if (q.size && !live) { live = true; nativeRaf(loop); }
  };
  window.requestAnimationFrame = (cb) => {
    const id = next++;
    q.set(id, cb);
    if (!live) { live = true; nativeRaf(loop); }
    return id;
  };
  window.cancelAnimationFrame = (id) => { if (!q.delete(id)) nativeCaf(id); };
  // measure the panel: the median gap between native frames over the first ~30 frames
  const gaps = []; let prev = 0;
  const measure = (t) => {
    if (document.hidden) { prev = 0; nativeRaf(measure); return; }
    if (prev) gaps.push(t - prev);
    prev = t;
    if (gaps.length < 30) { nativeRaf(measure); return; }
    gaps.sort((a, b) => a - b);
    const hz = 1000 / gaps[15];
    every = hz >= 100 ? Math.max(1, Math.round(hz / 60)) : 1;
    if (every > 1) document.documentElement.classList.add("is-paced");
  };
  nativeRaf(measure);
}

/**
 * Stable viewport height on touch devices.
 * Mobile browsers resize window.innerHeight every time the URL bar collapses / expands, so every pin, clip-path, transition offset
 * and canvas that reads it shifts by 60-100px *during* the scroll: that is the sections that "flash out and back in". We pin
 * innerHeight to the small-viewport height (100svh, constant while scrolling) and only re-measure on a real width change (rotation).
 */
if (IS_TOUCH && typeof document !== "undefined" && typeof CSS !== "undefined" && CSS.supports && CSS.supports("height", "100svh")) {
  try {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none";
    document.documentElement.appendChild(probe);
    let h = probe.offsetHeight || window.innerHeight;
    let w = window.innerWidth;
    Object.defineProperty(window, "innerHeight", { configurable: true, get: () => h });
    const remeasure = () => {
      const nw = window.innerWidth;
      if (nw === w) return;           // height-only resize = URL bar, ignore
      w = nw;
      const v = probe.offsetHeight;
      if (v > 0) h = v;
    };
    window.addEventListener("resize", remeasure, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(remeasure, 250), { passive: true });
  } catch (e) { /* keep the native value */ }
}


/**
 * Phone governor: while the visitor scrolls, count dropped frames; if a good share of them is slow, move the phone one tier down in cost.
 * The change is immediate for what CSS and the shared frame cap can do, and it is remembered so the next visit starts at that tier
 * (canvas resolution and WebGL scale are chosen at load). A phone that scrolls well never leaves tier 0, so nothing changes for it.
 */
if (IS_MOBILE && typeof window !== "undefined" && window.requestAnimationFrame && !forced) {
  const root = document.documentElement;
  let tier = TIER, scrolling = false, stopTimer = 0, paused = [];
  const pauseLoops = () => {                       // freeze endless CSS loops while the page is moving (finite entrance animations are untouched)
    if (tier < 1 || !document.getAnimations) return;
    try {
      for (const a of document.getAnimations()) {
        if (a.playState === "running" && typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation && a.effect && a.effect.getComputedTiming().iterations === Infinity) { a.pause(); paused.push(a); }
      }
    } catch (e) { /* ignore */ }
  };
  const resumeLoops = () => { const p = paused; paused = []; for (const a of p) { try { a.play(); } catch (e) { /* ignore */ } } };
  window.addEventListener("scroll", () => {
    if (!scrolling) { scrolling = true; pauseLoops(); }
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { scrolling = false; resumeLoops(); }, 160);
  }, { passive: true });

  const raise = () => {
    tier = Math.min(2, tier + 1);
    perf.tier = tier;
    root.classList.add("is-tier1");
    if (tier >= 2) { root.classList.add("is-potato"); perf.frameMs = Math.max(perf.frameMs, 50); }
    try { localStorage.setItem(TIER_KEY, tier + ":" + Date.now()); } catch (e) { /* ignore */ }
  };
  let last = 0, n = 0, slow = 0, windows = 0;
  const sample = (t) => {
    if (document.hidden) { last = 0; requestAnimationFrame(sample); return; }
    if (last && scrolling && t > 4500) {           // ignore the loader / start-up burst
      const dt = t - last;
      if (dt < 250) { n++; if (dt > 26) slow++; }
      if (n >= 70) {
        windows++;
        if (slow / n > 0.25 && tier < 2) raise();
        n = 0; slow = 0;
      }
    }
    last = t;
    if (windows < 14 && tier < 2) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

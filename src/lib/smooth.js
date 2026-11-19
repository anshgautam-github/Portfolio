// Buttery inertial scrolling for mouse wheels / trackpads (Lenis), wired into GSAP so every ScrollTrigger / pin / scrub stays in sync.
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isSettled, whenSettled } from "./loader.js";

// Phones scroll natively: JS-driven touch scrolling (Lenis syncTouch) re-runs the scroll position every frame on the main thread,
// which makes pinned/scrubbed sections jitter and re-fire play/reverse triggers (the fade-out / fade-in flicker). Desktop keeps Lenis.
const IS_TOUCH_DEVICE = typeof window !== "undefined" && window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 820px)").matches);
const SMOOTH_TOUCH = false;
let lenis = null;

/* While the page is scrolling, <html> carries .is-scrolling. The section stylesheets use it to freeze purely decorative loops
   (drifting aurora, sparks, marquee, orbits...) so every frame of a scroll / transition goes to the content that is actually moving. */
let scrollFlag = false;
function trackScrolling() {
  const root = document.documentElement;
  let timer = 0;
  const stop = () => { scrollFlag = false; root.classList.remove("is-scrolling"); };
  window.addEventListener("scroll", () => {
    if (!scrollFlag) { scrollFlag = true; root.classList.add("is-scrolling"); }
    clearTimeout(timer);
    timer = setTimeout(stop, 140);
  }, { passive: true });
}

/* The page must never fall back to the landing screen on its own.
   1. ScrollTrigger.refresh() (run when scrolling goes quiet: fonts, late images, resize observers) un-pins and re-pins every section on a very tall
      page; the browser clamps the scroll offset while the page is short, and Lenis can pick that clamped value up. So the offset is saved when a refresh
      starts and put back exactly when it ends.
   2. Safety net: a jump from deep in the page to the very top, with no wheel / touch / key / click from the visitor just before it, is not a scroll
      the visitor made, so it is undone. */
function keepPosition(lx) {
  const rawScrollTo = lx.scrollTo.bind(lx);
  const rawWinScrollTo = window.scrollTo.bind(window);
  const vh = () => window.innerHeight || 800;
  const now = () => performance.now();
  let keep = 0, on = false;

  /* What counts as "the visitor asked for this".
       gesture    = wheel / touch scrolling (the page may legitimately move, but never by a huge instant jump to the top)
       deliberate = a press or a key (the only things that start a real "back to top")                                   */
  let lastGesture = 0, lastDeliberate = 0, lastHomeKey = 0, pressed = false, glideUntil = 0;
  ["wheel", "touchstart", "touchmove"].forEach((ev) => window.addEventListener(ev, () => { lastGesture = now(); }, { passive: true, capture: true }));
  window.addEventListener("keydown", (e) => {
    lastDeliberate = now();
    if (e.key === "Home" || ((e.metaKey || e.ctrlKey) && e.key === "ArrowUp")) lastHomeKey = now();
  }, { passive: true, capture: true });
  window.addEventListener("pointerdown", () => { pressed = true; lastDeliberate = now(); }, { passive: true, capture: true });
  ["pointerup", "pointercancel", "blur"].forEach((ev) => window.addEventListener(ev, () => { pressed = false; }, { passive: true, capture: true }));
  const deliberate = (ms) => pressed || now() - lastDeliberate < ms;
  const gesture = (ms) => now() - lastGesture < ms;
  const warn = (what) => { try { console.warn("[scroll-guard] " + what, new Error().stack); } catch (e) { /* ignore */ } };
  const farDown = () => window.scrollY > vh() * 1.5;

  /* 1. Block code that scrolls to the top by itself. Every legitimate "back to top" starts from a press / key, so a call to ~0 from deep in the
        page with none in the last 6 s (even while the visitor is wheel-scrolling) is the bug: ignore it and log who called it. */
  lx.scrollTo = (target, opts = {}) => {
    const toTop = target === "top" || target === "start" || (typeof target === "number" && target <= 8);
    if (toTop && !on && isSettled() && farDown() && !deliberate(6000)) { warn("ignored an automatic lenis.scrollTo(top)"); return; }
    if (!opts.immediate) glideUntil = now() + (opts.duration == null ? 1.6 : opts.duration) * 1000 + 800;
    return rawScrollTo(target, opts);
  };
  window.scrollTo = function (a, b) {
    const y = a && typeof a === "object" ? a.top : b;
    if (typeof y === "number" && y <= 8 && !on && isSettled() && farDown() && !deliberate(6000)) { warn("ignored an automatic window.scrollTo(top)"); return undefined; }
    return rawWinScrollTo.apply(window, arguments);
  };

  /* 2. ScrollTrigger.refresh() un-pins and re-pins every section on a very tall page; the browser (Safari above all) clamps the offset while the
        page is short. The offset is saved when a refresh starts and put back exactly when it ends. */
  ScrollTrigger.addEventListener("refreshInit", () => { keep = window.scrollY; on = true; });
  ScrollTrigger.addEventListener("refresh", () => {
    if (!on) return;
    on = false;
    if (keep > 8 && Math.abs(window.scrollY - keep) > 4) {
      rawScrollTo(keep, { immediate: true, force: true });
      rawWinScrollTo(0, keep);
    }
  });

  /* 3. Safety net for anything else (layout clamps, a stray focus / anchor, browser quirks):
        a) INSTANT collapse: the page falls from far down to the very top within one event (or a fraction of a second). A real wheel / touch scroll
           never does that (Lenis moves a fraction of the distance per frame), so it is undone even while the visitor is scrolling.
        b) SLOW slide: back at the top after having been deep down in the last ~1.8 s, with no input at all from the visitor.            */
  const samples = [];
  let restoring = false, prevY = window.scrollY, prevT = now();
  const restore = (to, why) => {
    restoring = true;
    warn(why + "; restoring y=" + Math.round(to));
    rawScrollTo(to, { immediate: true, force: true });
    rawWinScrollTo(0, to);
    samples.length = 0; samples.push([now(), to]);
    prevY = to; prevT = now();
    setTimeout(() => { restoring = false; }, 300);
  };
  window.addEventListener("scroll", () => {
    if (restoring || on) { prevY = window.scrollY; prevT = now(); return; }
    const t = now(), y = window.scrollY;
    const settled = isSettled();
    const homeKey = t - lastHomeKey < 1500;
    // a) instant collapse
    if (settled && y < 40 && prevY > Math.max(500, vh() * 0.6) && t - prevT < 250 && t > glideUntil && !homeKey && !(pressed || t - lastDeliberate < 400)) {
      restore(prevY, "the page dropped to the top in one step");
      return;
    }
    prevY = y; prevT = t;
    // b) slow slide
    samples.push([t, y]);
    while (samples.length && t - samples[0][0] > 1800) samples.shift();
    if (y < 10 && settled && t > glideUntil && !homeKey && !deliberate(2500) && !gesture(2500)) {
      let peak = 0;
      for (const s of samples) if (s[1] > peak) peak = s[1];
      if (peak > Math.max(600, vh() * 0.8)) restore(peak, "the page slid back to the top on its own");
    }
  }, { passive: true });
}

export function initSmoothScroll() {
  if (lenis || typeof window === "undefined") return lenis;
  if (!IS_TOUCH_DEVICE) trackScrolling();   // phones: toggling a class on <html> mid-scroll restyles the page and pauses/resumes animations = visible hitches
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (IS_TOUCH_DEVICE) return null;   // native momentum scrolling on phones / tablets
  lenis = new Lenis({
    // lerp (not duration + easing): every wheel / trackpad tick just moves the *target*, and the page eases toward it a fixed fraction per
    // frame, so continuous trackpad input glides with no velocity restarts. A duration + easing curve restarts on every event and steps.
    // Lower = floatier (0.06), higher = tighter (0.12).
    lerp: 0.085,
    smoothWheel: true,
    wheelMultiplier: 1,
    // touch: drive the scroll ourselves too, so phones get the same inertial glide instead of the browser's native flick.
    // If a low-end phone ever feels worse than native, set SMOOTH_TOUCH to false.
    syncTouch: SMOOTH_TOUCH,
    syncTouchLerp: 0.085,
    touchInertiaExponent: 1.8,
    touchMultiplier: 1,
    autoRaf: false,
  });
  window.__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  keepPosition(lenis);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  // the page is locked while the Earth intro plays, and for a few seconds after it shatters so the landing can be seen
  if (!isSettled()) { lenis.stop(); whenSettled(() => lenis.start()); }
  return lenis;
}

/**
 * Subscribe to "the scroll position just changed" in step with the frame that moved it.
 * With Lenis the page is moved inside the GSAP ticker, but the browser only fires the native scroll event on the NEXT frame. Code that
 * listens to that event (and then waits for an rAF on top) lands one to two frames behind ScrollTrigger, so pinned layers and the
 * transforms driven by hand slide against each other: visible judder. Lenis's own event fires in the same tick as ScrollTrigger.update.
 * Without Lenis (phones, reduced motion) this falls back to a native listener coalesced to one call per frame. Returns an unsubscribe.
 */
export function onScrollFrame(fn) {
  if (lenis) { lenis.on("scroll", fn); return () => lenis && lenis.off("scroll", fn); }
  let q = 0;
  const h = () => { if (!q) q = requestAnimationFrame(() => { q = 0; fn(); }); };
  window.addEventListener("scroll", h, { passive: true });
  return () => { window.removeEventListener("scroll", h); if (q) cancelAnimationFrame(q); };
}

/** smooth programmatic scroll: a number (px), an element, or a selector. Falls back to the browser when Lenis is off. */
export function smoothScrollTo(target, opts = {}) {
  if (lenis) { lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts }); return; }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else { const el = typeof target === "string" ? document.querySelector(target) : target; if (el) el.scrollIntoView({ behavior: "smooth" }); }
}

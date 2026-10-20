// Buttery inertial scrolling for mouse wheels / trackpads (Lenis), wired into GSAP so every ScrollTrigger / pin / scrub stays in sync.
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isSettled, whenSettled } from "./loader.js";

const SMOOTH_TOUCH = true;
let lenis = null;

export function initSmoothScroll() {
  if (lenis || typeof window === "undefined") return lenis;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  lenis = new Lenis({
    duration: 1.7,                                              // longer glide = the "buttery" agency feel (try 1.2 for snappier)
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),   // expo-out: fast start, long soft landing
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
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  // the page is locked while the Earth intro plays, and for a few seconds after it shatters so the landing can be seen
  if (!isSettled()) { lenis.stop(); whenSettled(() => lenis.start()); }
  return lenis;
}

/** smooth programmatic scroll: a number (px), an element, or a selector. Falls back to the browser when Lenis is off. */
export function smoothScrollTo(target, opts = {}) {
  if (lenis) { lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), ...opts }); return; }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else { const el = typeof target === "string" ? document.querySelector(target) : target; if (el) el.scrollIntoView({ behavior: "smooth" }); }
}

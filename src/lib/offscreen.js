// Off-screen loop governor.
//
// The site has ~360 endless CSS keyframe loops (birds, clouds, pulses, orbits, marquees...) plus a few SVG SMIL loops. Chrome keeps
// ticking the ones on the main thread even when they are thousands of pixels away from the viewport, so every single frame of a scroll
// pays for a document-wide style recalc + SVG relayout on top of the scroll work itself. That is the "scroll is not buttery" feeling.
//
// This module pauses an endless loop while the block it lives in is more than ~3/4 of a screen away from the viewport, and lets it go
// again before it can be seen. It only ever touches endless loops (finite entrance animations, GSAP, canvas and WebGL are untouched),
// it keeps each loop's phase (pausing is not resetting), and it works through a CSS attribute so the stylesheet stays in charge of
// everything else (hover pauses, .is-scrolling freezes, reduced motion...).
//
// A "block" is a direct child of #root or of the <main> landmark inside it (or the element a ScrollTrigger pin-spacer wraps). Elements that are position:fixed inside a block
// are never paused, and blocks with no measurable box are never paused, so overlays and cursors behave exactly as before.

const ATTR = "data-lp";                       // set on the animated element while its block is off-screen
const MARGIN = "75% 0px 75% 0px";             // wake loops this far before they can be seen

let started = false;

export function initOffscreenPause() {
  if (started || typeof window === "undefined") return;
  if (!("IntersectionObserver" in window) || typeof Element === "undefined" || !Element.prototype.getAnimations) return;
  if (typeof CSSAnimation === "undefined") return;
  const root = document.getElementById("root");
  if (!root) return;
  started = true;

  // the stylesheet side: the attribute pauses every animation on that element (and its ::before / ::after)
  const style = document.createElement("style");
  style.setAttribute("data-offscreen-pause", "");
  style.textContent = `[${ATTR}],[${ATTR}]::before,[${ATTR}]::after{animation-play-state:paused !important}`;
  document.head.appendChild(style);

  const blocks = new WeakMap();               // block element -> { off, tagged:Set<Element>, svgs:Set<SVGSVGElement> }

  const isLoop = (a) => {
    if (!(a instanceof CSSAnimation) || !a.effect) return false;
    try { return a.effect.getComputedTiming().iterations === Infinity; } catch (e) { return false; }
  };
  const insideFixed = (el, block) => {        // overlays that are fixed to the viewport keep running whatever their parent block does
    for (let n = el; n && n !== block; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true;
    return false;
  };
  const smilSvgs = (block) => [...block.querySelectorAll("svg")].filter((s) => s.pauseAnimations && s.querySelector("animate,animateTransform,animateMotion,set"));

  const sleep = (block, st) => {
    if (st.off) return;
    st.off = true;
    const hit = new Set();
    for (const a of block.getAnimations({ subtree: true })) {
      const t = a.effect && a.effect.target;
      if (t && !st.tagged.has(t) && isLoop(a) && !insideFixed(t, block)) hit.add(t);
    }
    hit.forEach((t) => { t.setAttribute(ATTR, ""); st.tagged.add(t); });
    for (const s of smilSvgs(block)) if (!s.animationsPaused()) { s.pauseAnimations(); st.svgs.add(s); }
  };
  const wake = (st) => {
    if (!st.off) return;
    st.off = false;
    st.tagged.forEach((t) => t.removeAttribute(ATTR));
    st.tagged.clear();
    st.svgs.forEach((s) => s.unpauseAnimations());
    st.svgs.clear();
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const block = e.target, st = blocks.get(block);
      if (!st) continue;
      const r = e.boundingClientRect;
      const measurable = r.height >= 2 && r.width >= 2;
      if (e.isIntersecting || !measurable || !block.isConnected) wake(st);
      else sleep(block, st);
    }
  }, { rootMargin: MARGIN, threshold: 0 });

  const watch = (el) => {
    if (!(el instanceof HTMLElement) || blocks.has(el) || el.tagName === "STYLE" || el.tagName === "SCRIPT") return;
    if (el.tagName === "MAIN") { mo.observe(el, { childList: true }); [...el.children].forEach(watch); return; }   // the <main> landmark wraps the sections: they are the blocks
    if (el.classList.contains("pin-spacer")) { [...el.children].forEach(watch); return; }   // observe what the pin wraps, not its tall spacer
    blocks.set(el, { off: false, tagged: new Set(), svgs: new Set() });
    io.observe(el);
  };
  const scan = () => [...root.children].forEach(watch);
  const mo = new MutationObserver(scan);
  mo.observe(root, { childList: true });
  scan();

  // loops that start while their block is already asleep (a class flips, a section mounts late) are put to sleep too
  document.addEventListener("animationstart", (ev) => {
    const t = ev.target;
    if (!(t instanceof Element) || t.hasAttribute(ATTR)) return;
    let block = t, st = null;
    while (block && !(st = blocks.get(block))) block = block.parentElement;
    if (!st || !st.off || insideFixed(t, block)) return;
    const a = t.getAnimations().find((x) => x instanceof CSSAnimation && x.animationName === ev.animationName);
    if (a && isLoop(a)) { t.setAttribute(ATTR, ""); st.tagged.add(t); }
  }, true);
}

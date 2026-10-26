import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createIris } from "./iris.js";
import { IS_MOBILE } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/**
 * <PushTransition /> — two scroll-linked hand-offs, both fully reversible.
 *
 * 1. ENTER HOLD (landing -> paddock): the paddock is pinned at the very top while the landing's black mosaic dissolves
 *    into it, so it opens in place (see engine.js, which reads dataset.hold).
 * 2. LIQUID CURTAINS (paddock -> projects): three wavy-edged sheets sweep right -> left in sequence — a periwinkle ribbon,
 *    a navy band carrying a vertical "SELECTED WORK (03)" label, then the projects section itself, revealed through the
 *    same wave (clip-path) while it drifts against the sweep. The edges ripple hardest mid-sweep and flatten at both ends;
 *    the paddock leans away, softens and recedes. No tiles here — the mosaic is reserved for the landing hand-off.
 */
const ease = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const hashUnused = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

const ACCENT = "#6f95f2";

export default function PushTransition({ from = ".kimi .last-layer", to = "[data-warp-wrap]" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let iris = null, st = null, hst = null, A = null, B = null, cv = null, cx = null, last = 0, hlast = 0;

    /* Minimal hand-off: the projects section is revealed by a single clean vertical edge travelling right -> left, with a hairline
       on the edge and a small label riding it. The paddock just steps back (slight scale + dim). No blur, no glass, no extra layers. */
    const ensureOverlay = () => {
      if (cv && cv.isConnected) return cv;
      cv = document.createElement("div");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:38;pointer-events:none;display:none;overflow:hidden";
      cv.innerHTML =
        '<div data-sh="1" style="position:absolute;top:0;bottom:0;width:140px;margin-left:-140px;background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.28));will-change:transform"></div>' +
        '<div data-ln="1" style="position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,.9);will-change:transform"></div>' +
        '<div data-lb="1" style="position:absolute;left:0;top:50%;white-space:nowrap;font:500 11px/1 \'JetBrains Mono\',ui-monospace,monospace;letter-spacing:.42em;color:#fff;mix-blend-mode:difference;will-change:transform,opacity">( 03 )&nbsp;&nbsp;SELECTED WORK</div>';
      document.body.appendChild(cv);
      cx = { sh: cv.querySelector('[data-sh]'), ln: cv.querySelector('[data-ln]'), lb: cv.querySelector('[data-lb]') };
      return cv;
    };

    const clear = () => {
      if (A && A.dataset.hold === undefined) { A.style.transform = ""; A.style.filter = ""; A.style.willChange = ""; A.style.pointerEvents = ""; }
      if (B) { B.style.transform = ""; B.style.clipPath = ""; B.style.willChange = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; }
      if (cv) cv.style.display = "none";
    };

    const apply = (p) => {
      last = p;
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      // sp = real scroll progress: the sections' positional compensation follows it exactly (any lag shows as vibration);
      // only the decorative reveal uses the eased progress p.
      const sp = st ? st.progress : p;
      if ((p <= 0 && sp <= 0) || (p >= 1 && sp >= 1)) { clear(); return; }
      const H = window.innerHeight, W = window.innerWidth;
      ensureOverlay();
      cv.style.display = "block";
      const e = smoother(clamp01(p));
      const edge = W * (1 - e);                              // viewport x of the reveal edge
      const tx = (1 - e) * W * 0.035;                        // projects drift in a touch against the sweep

      A.style.willChange = IS_MOBILE ? "transform" : "transform, filter";
      A.style.pointerEvents = "none";
      A.style.transformOrigin = "50% 100%";
      A.style.transform = `translate3d(0, ${(H * sp).toFixed(2)}px, 0) scale(${(1 - 0.03 * e).toFixed(4)})`;
      // a filter on a whole section is re-rasterised every frame: far too heavy for phones (the dim is cosmetic there)
      if (!IS_MOBILE) A.style.filter = `brightness(${(1 - 0.35 * e).toFixed(3)})`;

      B.style.willChange = "transform, clip-path";
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transform = `translate3d(${tx.toFixed(2)}px, ${(-H * (1 - sp)).toFixed(2)}px, 0)`;
      const lx = (edge - tx).toFixed(2);
      B.style.clipPath = `polygon(${lx}px 0px,${W + 200}px 0px,${W + 200}px ${H}px,${lx}px ${H}px)`;

      cx.ln.style.transform = `translate3d(${edge.toFixed(2)}px,0,0)`;
      cx.sh.style.transform = `translate3d(${edge.toFixed(2)}px,0,0)`;
      cx.sh.style.opacity = String(Math.sin(Math.PI * e).toFixed(3));
      cx.lb.style.transform = `translate3d(${(edge + 22).toFixed(2)}px,-50%,0)`;
      cx.lb.style.opacity = String((Math.sin(Math.PI * clamp01((e - 0.05) / 0.9)) * 0.95).toFixed(3));
    };

    /* ENTER HOLD: while the paddock rises into the viewport after the landing's mosaic, keep it pinned at the very top
       (its own scroll is cancelled) so it opens in place, from the top, over the landing's black mosaic: no slide-up, no gap.
       The paddock reads dataset.hold (0..1) to drive its own mosaic. */
    const holdClear = () => {
      if (iris) iris.hide();
      if (!A) return;
      if (A.dataset.hold !== undefined) { delete A.dataset.hold; A.style.transform = ""; A.style.transformOrigin = ""; A.style.willChange = ""; }
    };
    const holdApply = (p) => {
      hlast = p;
      if (!A || !A.isConnected) { A = document.querySelector(from); }
      if (!A) return;
      if (p <= 0 || p >= 1) { holdClear(); return; }
      const H = window.innerHeight;
      // the same 8-bladed aperture the landing closed with now opens (continuing its rotation) onto the paddock
      const e = Math.min(1, p / 0.8);
      if (!iris || !iris.el.isConnected) iris = createIris(document.body, { fixed: true, z: 60 });
      iris.show();
      iris.draw(e, 0, -1);
      A.dataset.hold = p.toFixed(4);
      A.style.willChange = "transform";
      A.style.transformOrigin = "50% 50vh";
      // pull-back: the paddock settles from a slight zoom + tilt while the iris opens
      const k = 1 - Math.min(1, p / 0.8);
      A.style.transform = `translate3d(0, ${(-H * (1 - p)).toFixed(2)}px, 0) scale(${(1 + 0.12 * k * k).toFixed(4)}) rotate(${(-2.5 * k * k).toFixed(3)}deg)`;
    };

    /* The sweep never follows the scroll 1:1: the shown progress chases the scroll position with easing and a speed cap, so a flick
       of the wheel plays the transition out smoothly (about 1.3s minimum) instead of jumping, and tiny scroll jitters are absorbed. */
    let cur = 0, tgt = 0, raf2 = 0, lt = 0;
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      // the eased sweep may trail the real scroll by at most LAG (the ends of the curve are flat, so this is invisible); this
      // guarantees it has fully finished by the time the section reaches its own pinned position (a transform left on the
      // section while its pinned content has gone `fixed` is what made the heading drop and pop back up).
      cur = Math.min(tgt + 0.18, Math.max(tgt - 0.18, cur));
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else {
        let v = d * (1 - Math.exp(-4.2 * dt));
        const m = 0.75 * dt; v = Math.max(-m, Math.min(m, v));
        cur += v;
      }
      apply(cur);
      raf2 = cur !== tgt ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf2) { lt = performance.now(); raf2 = requestAnimationFrame(tick); } };

    /* ARRIVAL LOCK: once the paddock has landed at the top, the page is held here (scroll, wheel, touch and keys are
       frozen) while its entrance animation plays out, then it is released. Only on the forward arrival from the landing. */
    const LOCK_MS = 1200;
    let lockTimer = 0, lockKeys = null;
    const unlock = () => {
      clearTimeout(lockTimer); lockTimer = 0;
      if (lockKeys) { window.removeEventListener("keydown", lockKeys, true); lockKeys = null; }
      const lx = window.__lenis;
      if (lx && !document.documentElement.classList.contains("kimi-menu-open")) lx.start();
    };
    const lockHere = () => {
      const lx = window.__lenis;
      if (!lx || lockTimer) return;
      lx.stop();
      lockKeys = (e) => { if ([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"].includes(e.key)) e.preventDefault(); };
      window.addEventListener("keydown", lockKeys, true);
      lockTimer = setTimeout(unlock, LOCK_MS);
    };

    let gliding = false;
    const glide = (y, lock = false) => {
      const lx = window.__lenis;
      if (!lx || gliding) return;
      gliding = true;
      lx.scrollTo(Math.max(0, y), { duration: 0.8, lock: true, force: true, onComplete: () => { gliding = false; if (lock) lockHere(); } });
      setTimeout(() => { gliding = false; }, 1400);
    };

    const build = () => {
      A = document.querySelector(from);
      B = document.querySelector(to);
      if (!A || !B) return;
      // (landing -> paddock hold + iris removed: the paddock now just scrolls in after the landing)
      st = ScrollTrigger.create({
        trigger: B,
        start: "top bottom",
        end: "top top",
        invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = self.progress; wake(); },
        onLeave: () => { tgt = 1; cur = 1; wake(); },
        onLeaveBack: () => { tgt = 0; cur = 0; wake(); },
      });
    };

    const onInit = () => { holdClear(); clear(); };
    const onDone = () => { if (st) { cur = tgt = st.progress; } apply(st ? st.progress : last); holdApply(hst ? hst.progress : hlast); };
    ScrollTrigger.addEventListener("refreshInit", onInit);
    ScrollTrigger.addEventListener("refresh", onDone);
    const raf = requestAnimationFrame(() => { build(); ScrollTrigger.refresh(); });
    const pulse = setInterval(() => { if (st && (!A || !A.isConnected || !B || !B.isConnected)) apply(st.progress); }, 400);

    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(raf2);
      unlock();
      clearInterval(pulse);
      ScrollTrigger.removeEventListener("refreshInit", onInit);
      ScrollTrigger.removeEventListener("refresh", onDone);
      if (st) st.kill();
      if (hst) hst.kill();
      holdClear();
      clear();
      if (iris) iris.destroy();
      if (cv) cv.remove();
    };
  }, [from, to]);

  return null;
}

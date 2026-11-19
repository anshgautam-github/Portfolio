import { useEffect } from "react";

/*
  <Fx /> - site-wide pointer polish, no markup of its own.
  Magnetic buttons: the call-to-action buttons lean toward the pointer with a soft, damped pull and ease back on leave.
  It uses the individual `translate` property, so it never fights the `transform` that GSAP / CSS animations set on the same element,
  and it is skipped on touch screens and for reduced motion. Add data-magnetic to any element to opt in.
*/
const SEL = "[data-magnetic], .pj-btn, .wp-btn, .spot-cta, .cb-cta a, .cb-cta button, .prf-arrow";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function Fx() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const state = new Map();          // el -> { x, y, tx, ty }
    let cur = null, raf = 0;

    const tick = () => {
      raf = 0;
      let moving = false;
      for (const [el, s] of state) {
        s.x += (s.tx - s.x) * 0.16; s.y += (s.ty - s.y) * 0.16;
        if (Math.abs(s.x - s.tx) < 0.04 && Math.abs(s.y - s.ty) < 0.04) {
          s.x = s.tx; s.y = s.ty;
          if (s.tx === 0 && s.ty === 0 && el !== cur) { el.style.translate = ""; el.style.willChange = ""; state.delete(el); continue; }
        } else moving = true;
        el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
      }
      if (moving || cur) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const release = () => { if (cur && state.has(cur)) { const s = state.get(cur); s.tx = 0; s.ty = 0; } cur = null; wake(); };

    const onMove = (e) => {
      const el = e.target instanceof Element ? e.target.closest(SEL) : null;
      if (el !== cur) {
        release();
        if (el) {
          if (!state.has(el)) {
            if (getComputedStyle(el).translate !== "none") return;       // something else owns `translate` here: leave it alone
            state.set(el, { x: 0, y: 0, tx: 0, ty: 0 });
            el.style.willChange = "translate";
          }
          cur = el;
        }
      }
      if (!cur) return;
      const r = cur.getBoundingClientRect(), s = state.get(cur);
      const pull = clamp(Math.min(r.width, r.height) * 0.22, 5, 11);
      s.tx = clamp(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * pull, -pull, pull);
      s.ty = clamp(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * pull, -pull, pull);
      wake();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      cancelAnimationFrame(raf);
      for (const el of state.keys()) { el.style.translate = ""; el.style.willChange = ""; }
    };
  }, []);
  return null;
}

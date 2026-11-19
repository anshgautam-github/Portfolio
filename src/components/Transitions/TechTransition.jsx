import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <TechTransition /> - projects -> the stack switch, told through the laptop on the last project.
 *   1. POWER: the laptop screen blooms to white (a soft blue halo around it), the projects hold still and dim.
 *   2. ENTER: the camera pushes into that screen - the white rectangle grows from the laptop's screen to the whole viewport while the
 *      tech page (the cream switch screen) is revealed inside it, scaling up from "a page on a laptop" to "the page".
 * Fully reversible; the eased value never trails real scroll by more than LAG, so nothing stays transformed once the section is in flow.
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const LAG = 0.18;
const BIAS = -0.5;   // keep in step with the copy of the tech page that Warp puts inside the laptop screen

export default function TechTransition({ from = "[data-warp-wrap]", to = "section.ts" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let A = null, B = null, st = null, cv = null, dm = null, cx = null, rect = null, cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0;

    const overlay = () => {
      if (cv && cv.isConnected) return cv;
      cv = document.createElement("div");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:42;pointer-events:none;display:none;overflow:hidden";
      cv.innerHTML = '<div data-w="1" style="position:absolute;left:0;top:0;background:none;will-change:transform,opacity"></div>';
      document.body.appendChild(cv);
      dm = document.createElement("div");                            // sits UNDER the incoming page: darkens only the projects
      dm.setAttribute("aria-hidden", "true");
      dm.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:38;pointer-events:none;display:none;background:#05070d;opacity:0";
      document.body.appendChild(dm);
      cx = { w: cv.querySelector("[data-w]"), dim: dm };
      return cv;
    };

    const clear = () => {
      if (A) { A.style.transform = ""; A.style.transformOrigin = ""; A.style.willChange = ""; A.style.pointerEvents = ""; }
      if (B) { B.style.transform = ""; B.style.transformOrigin = ""; B.style.clipPath = ""; B.style.willChange = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; }
      if (cv) cv.style.display = "none";
      if (dm) dm.style.display = "none";
    };

    /* where the last project's laptop screen is on screen right now (A must be untransformed when this runs) */
    const measure = (sp) => {
      const W = window.innerWidth, H = window.innerHeight;
      const slides = A.querySelectorAll("[data-slide]");
      const scr = slides.length ? slides[slides.length - 1].querySelector(".pj-mb-screen") : null;
      const r = scr ? scr.getBoundingClientRect() : null;
      if (r && r.width > 40 && r.height > 40 && r.bottom > 0 && r.top < H) rect = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 + H * sp, w: r.width, h: r.height };
      else rect = { cx: W * 0.64, cy: H * 0.46, w: W * 0.4, h: W * 0.25 };
    };

    const apply = (p) => {
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;                               // real progress: positional compensation follows it exactly
      if ((p <= 0 && sp <= 0) || (p >= 1 && sp >= 1)) { clear(); return; }
      const H = window.innerHeight, W = window.innerWidth;
      overlay();
      if (!rect) measure(sp);
      cv.style.display = "block"; dm.style.display = "block";

      const pw = 1;                                                  // the laptop screen is already white (Warp's finale beat), so the overlay starts fully on
      const ex = smoother(clamp01((p - 0.1) / 0.9));                 // enter: the screen grows to the viewport
      const rw = lerp(rect.w, W, ex), rh = lerp(rect.h, H, ex);
      const ccx = lerp(rect.cx, W / 2, ex), ccy = lerp(rect.cy - H * sp, H / 2, ex);   // the screen rides up with the page until it takes over
      const rad = lerp(10, 0, ex);

      // projects: they scroll away naturally (never transformed: a transform would re-anchor their fixed layers); just dim them
      cx.dim.style.opacity = (0.9 * smoother(clamp01(p * 1.7))).toFixed(3);

      // the tech page rides inside the growing rectangle: scaled so the whole viewport fits the rect's width, clipped to the rect
      const s = rw / W;
      const vy0 = Math.max(0, (H - rh / s) / 2);
      // portrait screens: the visible band is moved up the page (to where the headline sits); it eases back to centre as the page fills the screen
      const vy = vy0 * (1 + (W < H ? BIAS : 0)), shift = vy - vy0;
      B.style.willChange = "transform, clip-path";
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transformOrigin = `50% ${(H / 2).toFixed(0)}px`;
      B.style.transform = `translate3d(${(ccx - W / 2).toFixed(2)}px, ${(ccy - H / 2 - shift * s - H * (1 - sp)).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
      B.style.clipPath = `inset(${vy.toFixed(1)}px 0px ${(B.offsetHeight - vy - rh / s).toFixed(1)}px 0px round ${(rad / s).toFixed(1)}px)`;

      // the white screen: blooms in over the laptop, then melts away to reveal the page inside it
      const wo = 1;                                                  // transparent plate (the page already sits inside the laptop screen): only the glow is drawn
      const halo = pw * (1 - ex) * clamp01(p * 10);
      cx.w.style.width = rw.toFixed(1) + "px"; cx.w.style.height = rh.toFixed(1) + "px";
      cx.w.style.borderRadius = rad.toFixed(1) + "px";
      cx.w.style.transform = `translate3d(${(ccx - rw / 2).toFixed(1)}px, ${(ccy - rh / 2).toFixed(1)}px, 0)`;
      cx.w.style.opacity = wo.toFixed(3);
      cx.w.style.boxShadow = `0 0 ${(30 + 90 * halo).toFixed(0)}px ${(4 + 26 * halo).toFixed(0)}px rgba(150,180,255,${(0.55 * halo).toFixed(3)})`;
    };

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      cur = Math.min(tgt + LAG, Math.max(tgt - LAG, cur));
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else { const v = d * (1 - Math.exp(-8 * dt)); const m = 1.8 * dt; cur += Math.max(-m, Math.min(m, v)); }
      apply(cur);
      raf = cur !== tgt ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) { lt = performance.now(); raf = requestAnimationFrame(tick); } };

    const build = () => {
      A = document.querySelector(from); B = document.querySelector(to);
      if (!A || !B) return;
      st = ScrollTrigger.create({
        trigger: B, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = self.progress; apply(cur); wake(); },
        onLeave: () => { tgt = 1; cur = 1; wake(); },
        onLeaveBack: () => { tgt = 0; cur = 0; rect = null; wake(); },
      });
    };
    const onInit = () => { clear(); rect = null; };
    const onDone = () => { if (st) { cur = tgt = st.progress; apply(cur); } };
    ScrollTrigger.addEventListener("refreshInit", onInit);
    ScrollTrigger.addEventListener("refresh", onDone);
    boot = requestAnimationFrame(() => { build(); ScrollTrigger.refresh(); });

    return () => {
      cancelAnimationFrame(boot); cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refreshInit", onInit);
      ScrollTrigger.removeEventListener("refresh", onDone);
      if (st) st.kill();
      clear();
      if (cv) cv.remove();
      if (dm) dm.remove();
    };
  }, [from, to]);

  return null;
}

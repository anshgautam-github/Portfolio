import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <GardenTransition /> — projects -> garden. The projects hold still (pinned at the bottom of their last frame) while the
 * garden opens over them like a sunrise: a circle of golden-hour sky growing from the bottom centre. A hairline rides the circle's edge with a
 * small label at its crown. Fully reversible; the eased reveal never trails the real scroll by more than LAG, so it has always
 * finished by the time the diary is back in normal flow (no transform left on a section that holds fixed children).
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const LAG = 0.18;

export default function GardenTransition({ from = "[data-warp-wrap]", to = "section.gd" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let A = null, B = null, st = null, cv = null, cx = null, cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0;
    const NS = "http://www.w3.org/2000/svg";

    const overlay = () => {
      if (cv && cv.isConnected) return cv;
      cv = document.createElementNS(NS, "svg");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:38;pointer-events:none;display:none;overflow:visible";
      cv.innerHTML =
        '<rect data-dim="1" width="100%" height="100%" fill="#000" opacity="0"/>' +
        '<circle data-g="1" fill="none" stroke="rgba(255,205,130,.55)" stroke-width="46"/>' +
        '<circle data-r="1" fill="none" stroke="rgba(255,244,214,.95)" stroke-width="1.5"/>' +
        '<text data-t="1" fill="#fff" font-family="JetBrains Mono, monospace" font-size="11" letter-spacing="5" text-anchor="middle" >( 04 )  LET\'S GROW</text>';
      document.body.appendChild(cv);
      cx = { dim: cv.querySelector('[data-dim]'), g: cv.querySelector('[data-g]'), r: cv.querySelector('[data-r]'), t: cv.querySelector('[data-t]') };
      return cv;
    };

    const clear = () => {
      if (A) { A.style.transform = ""; A.style.filter = ""; A.style.willChange = ""; A.style.pointerEvents = ""; }
      if (B) { B.style.transform = ""; B.style.clipPath = ""; B.style.willChange = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; }
      if (cv) cv.style.display = "none";
      if (B) B.removeAttribute("data-tx");
    };

    const apply = (p) => {
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;                          // real scroll progress: positional compensation follows it exactly
      if ((p <= 0 && sp <= 0) || (p >= 1 && sp >= 1)) { clear(); return; }
      const H = window.innerHeight, W = window.innerWidth;
      overlay();
      cv.style.display = "block";
      const e = smoother(clamp01(p));
      const R = Math.hypot(W / 2, H) * 1.04 * e;                // circle radius, growing from the bottom centre
      const cxp = W / 2, cyp = H;

      A.style.willChange = "transform";
      A.style.pointerEvents = "none";
      A.style.transform = `translate3d(0, ${(H * sp).toFixed(2)}px, 0)`;
      B.setAttribute("data-tx", "1");
      cx.dim.style.opacity = (0.18 * e).toFixed(3);

      B.style.willChange = "transform, clip-path";
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transform = `translate3d(0, ${(-H * (1 - sp)).toFixed(2)}px, 0)`;
      B.style.clipPath = `circle(${R.toFixed(1)}px at ${cxp}px ${cyp}px)`;

      for (const k of ["g", "r"]) { cx[k].setAttribute("cx", cxp); cx[k].setAttribute("cy", cyp); cx[k].setAttribute("r", Math.max(0, R).toFixed(1)); }
      const fade = Math.sin(Math.PI * clamp01(e));
      cx.g.setAttribute("opacity", (fade * 0.9).toFixed(3));
      cx.r.setAttribute("opacity", Math.min(1, fade * 2.2).toFixed(3));
      cx.t.setAttribute("transform", `translate(${cxp} ${(cyp - R - 18).toFixed(1)})`);
      cx.t.setAttribute("opacity", (Math.min(1, fade * 1.6) * (R > 120 && cyp - R > 40 ? 1 : 0)).toFixed(3));
    };

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      cur = Math.min(tgt + LAG, Math.max(tgt - LAG, cur));
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else { let v = d * (1 - Math.exp(-8 * dt)); const m = 1.8 * dt; cur += Math.max(-m, Math.min(m, v)); }
      apply(cur);
      raf = cur !== tgt ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) { lt = performance.now(); raf = requestAnimationFrame(tick); } };

    const build = () => {
      A = document.querySelector(from); B = document.querySelector(to);
      if (!A || !B) return;
      st = ScrollTrigger.create({
        trigger: B, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = self.progress; wake(); },
        onLeave: () => { tgt = 1; cur = 1; wake(); },
        onLeaveBack: () => { tgt = 0; cur = 0; wake(); },
      });
    };
    const onInit = () => clear();
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
    };
  }, [from, to]);

  return null;
}

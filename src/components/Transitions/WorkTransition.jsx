import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <WorkTransition /> - projects -> "Where I've Worked".
 *
 * The projects hold still on their last frame. As you keep scrolling, ONE continuous turn plays: the big screen shrinks to a smaller
 * rounded screen and spins ANTICLOCKWISE while fading out, and the next page, small and turned the other way, grows and spins
 * anticlockwise into place while fading in. The two overlap, so you look through one screen into the other (a cross-dissolve),
 * over a backdrop whose colour travels between the two pages (no dark patch). Everything is a pure function of scroll progress,
 * so it plays backwards just as cleanly.
 *
 * The internship page is told when it has actually arrived ("ff:reveal"), so its headline and cards animate in then,
 * not while it is still turning in.
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const LAG = 0.16;
const DONE_AT = 0.86;                                            // the turn finishes here; the last stretch of scroll is a plain, settled page
const REV = 150;                                                 // degrees the projects spin anticlockwise on their way out
const REV_IN = 110;                                              // the next page starts this far clockwise and turns anticlockwise to 0
const SMALL = 0.52;                                              // how small the screens get at the heart of the turn
const mix = (a, b, t) => Math.round(a + (b - a) * t);
const FROM = [16, 18, 17];                                       // the projects' own background (#101211)
const TO = [241, 241, 238];                                      // the next page's paper (#f1f1ee)

export default function WorkTransition({ from = "[data-warp-wrap]", to = ".ff" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let A = null, B = null, st = null, back = null, cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0, fired = false;

    const layers = () => {
      if (back && back.isConnected) return;
      // a stage behind the two turning screens (so their rotating corners never show the raw page). Its colour travels from the
      // projects' colour to the next page's colour with the turn, so no dark patch ever appears in between.
      back = document.createElement("div");
      back.setAttribute("aria-hidden", "true");
      back.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none;display:none";
      document.body.appendChild(back);
    };

    const fire = () => { if (!fired) { fired = true; window.dispatchEvent(new Event("ff:reveal")); } };

    const clear = () => {
      if (A && A.dataset.wtx) { A.style.transform = ""; A.style.clipPath = ""; A.style.transformOrigin = ""; A.style.pointerEvents = ""; A.style.backgroundColor = ""; A.style.zIndex = ""; A.style.opacity = ""; A.style.willChange = ""; delete A.dataset.wtx; }
      if (B) { B.style.transform = ""; B.style.transformOrigin = ""; B.style.opacity = ""; B.style.filter = ""; B.style.willChange = ""; B.style.clipPath = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; B.removeAttribute("data-tx"); }
      if (back) back.style.display = "none";
    };

    const apply = (p) => {
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;                              // real scroll progress drives the positional hold exactly
      if (p <= 0 && sp <= 0) { fired = false; clear(); return; }
      if (p >= 1 && sp >= 1) { clear(); fire(); return; }
      const H = window.innerHeight;
      layers();
      back.style.display = "block";

      /* ONE continuous turn, both screens see-through to each other (a cross-dissolve while they spin):
         the projects shrink and spin anticlockwise while fading out; the next page, starting small and turned the other way,
         grows and spins anticlockwise into place while fading in. Every curve is a smooth function of the same progress. */
      const e = smoother(clamp01(p));
      const fadeA = 1 - smoother(clamp01((p - 0.22) / 0.55));
      const fadeB = smoother(clamp01((p - 0.12) / 0.55));

      back.style.display = "block";
      const c = smoother(clamp01(p / 0.7));
      back.style.background = `rgb(${mix(FROM[0], TO[0], c)},${mix(FROM[1], TO[1], c)},${mix(FROM[2], TO[2], c)})`;

      A.dataset.wtx = "1";
      A.style.willChange = "transform, opacity, clip-path";
      A.style.pointerEvents = "none";
      A.style.zIndex = "2";
      A.style.backgroundColor = "#101211";
      A.style.transformOrigin = `50% calc(100% - ${(H / 2).toFixed(1)}px)`;
      A.style.clipPath = `inset(${Math.max(0, A.offsetHeight - H)}px 0px 0px 0px round ${(10 + 70 * e).toFixed(1)}px)`;
      A.style.transform = `translate3d(0, ${(H * sp).toFixed(2)}px, 0) rotate(${(-REV * e).toFixed(3)}deg) scale(${(1 - (1 - SMALL) * e).toFixed(4)})`;
      A.style.opacity = fadeA.toFixed(3);

      const k = 1 - e;
      B.setAttribute("data-tx", "1");
      B.style.willChange = "transform, opacity, clip-path";
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transformOrigin = "50% 50%";
      B.style.transform = `translate3d(0, ${(-H * (1 - sp)).toFixed(2)}px, 0) rotate(${(REV_IN * k).toFixed(3)}deg) scale(${(SMALL + (1 - SMALL) * e).toFixed(4)})`;
      B.style.clipPath = k > 0.002 ? `inset(0px round ${(10 + 140 * k).toFixed(1)}px)` : "";
      B.style.opacity = fadeB.toFixed(3);
      B.style.filter = "";

      if (e > 0.6) fire(); else if (e < 0.2) fired = false;
    };

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      cur = Math.min(tgt + LAG, Math.max(tgt - LAG, cur));
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else { const v = d * (1 - Math.exp(-5.5 * dt)); const m = 1.0 * dt; cur += Math.max(-m, Math.min(m, v)); }
      apply(cur);
      raf = cur !== tgt ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) { lt = performance.now(); raf = requestAnimationFrame(tick); } };

    const build = () => {
      A = document.querySelector(from); B = document.querySelector(to);
      if (!A || !B) return;
      st = ScrollTrigger.create({
        trigger: B, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = clamp01(self.progress / DONE_AT); wake(); },
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
      if (back) back.remove();
    };
  }, [from, to]);

  return null;
}

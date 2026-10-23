import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <WorkTransition /> - projects -> "Where I've Worked".
 *
 * The projects hold still on their last frame. As you keep scrolling, a paper-white SEAL rises out of the dark in the middle of
 * the screen, ringed by slowly turning type ("NEXT CHAPTER . WHERE I'VE WORKED ."). Then the seal opens like a camera aperture:
 * its centre becomes a window onto the internship page, which swells outward from the seal's own rim. Ripples chase the edge,
 * the ring type rides the rim as it grows, and the new page starts slightly zoomed and settles to scale 1 so it feels like
 * you are falling into it. Everything is a pure function of scroll progress, so it plays backwards just as cleanly.
 *
 * The internship page is told when it has actually been revealed ("ff:reveal"), so its headline and cards animate in then,
 * not behind the curtain.
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const LAG = 0.12;
const DONE_AT = 0.86;                                            // the reveal finishes here; the last stretch of scroll is a plain, fully revealed page
const NS = "http://www.w3.org/2000/svg";
const RING = "NEXT CHAPTER · WHERE I’VE WORKED · NEXT CHAPTER · WHERE I’VE WORKED · ";

export default function WorkTransition({ from = "[data-warp-wrap]", to = ".ff" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let A = null, B = null, st = null, cv = null, bl = null, cx = null, cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0, fired = false;

    const overlay = () => {
      if (cv && cv.isConnected) return cv;
      cv = document.createElementNS(NS, "svg");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:38;pointer-events:none;display:none;overflow:visible";
      cv.innerHTML =
        '<defs><radialGradient id="wtDisc" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e4e4df"/></radialGradient>' +
        '<path id="wtRing" d=""/></defs>' +
        '<rect data-dim="1" width="100%" height="100%" fill="#000" opacity="0"/>' +
        '<g data-seal="1">' +
          '<circle data-halo="1" fill="none" stroke="rgba(111,149,242,.35)" stroke-width="26"/>' +
          '<circle data-hair="1" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
          '<circle data-disc="1" fill="url(#wtDisc)"/>' +
          '<g data-core="1" stroke="#0d0d10" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path data-arrow="1"/></g>' +
          '<text data-core-t="1" fill="#0d0d10" font-family="JetBrains Mono, ui-monospace, monospace" font-size="10" letter-spacing="3.5" text-anchor="middle">05</text>' +
        '</g>' +
        '<g data-echo="1" fill="none" stroke="#fff"><circle/><circle/><circle/></g>' +
        '<circle data-glow="1" fill="none" stroke="rgba(111,149,242,.32)" stroke-width="30"/>' +
        '<circle data-rim="1" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.5"/>' +
        '<text data-ring-t="1" fill="#fff" font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" letter-spacing="3"><textPath href="#wtRing" lengthAdjust="spacing"></textPath></text>' +
        '<circle data-dot="1" r="4" fill="#6f95f2"/>' +
        '<text data-cap="1" fill="#fff" font-family="JetBrains Mono, ui-monospace, monospace" font-size="11" letter-spacing="5" text-anchor="middle">SCROLL TO ENTER</text>';
      document.body.appendChild(cv);
      // frosted veil: blurs whatever is behind the seal (the projects) while the circle is on screen; sits under the new page
      bl = document.createElement("div");
      bl.setAttribute("aria-hidden", "true");
      bl.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:37;pointer-events:none;display:none;will-change:backdrop-filter";
      document.body.appendChild(bl);
      const q = (s) => cv.querySelector(s);
      cx = {
        dim: q("[data-dim]"), seal: q("[data-seal]"), halo: q("[data-halo]"), hair: q("[data-hair]"), disc: q("[data-disc]"),
        core: q("[data-core]"), arrow: q("[data-arrow]"), coreT: q("[data-core-t]"), echo: [...cv.querySelectorAll("[data-echo] circle")],
        glow: q("[data-glow]"), rim: q("[data-rim]"), ringT: q("[data-ring-t]"), ringP: q("#wtRing"), tp: q("textPath"), dot: q("[data-dot]"), cap: q("[data-cap]"),
      };
      cx.tp.textContent = RING;
      return cv;
    };

    const fire = () => { if (!fired) { fired = true; window.dispatchEvent(new Event("ff:reveal")); } };

    const clear = () => {
      if (A && A.dataset.wtx) { A.style.transform = ""; A.style.pointerEvents = ""; delete A.dataset.wtx; }
      if (B) { B.style.transform = ""; B.style.transformOrigin = ""; B.style.clipPath = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; B.removeAttribute("data-tx"); }
      if (cv) cv.style.display = "none";
      if (bl) bl.style.display = "none";
    };

    const set = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); };

    const apply = (p) => {
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;                              // real scroll progress drives the positional hold exactly
      if (p <= 0 && sp <= 0) { fired = false; clear(); return; }
      if (p >= 1 && sp >= 1) { clear(); fire(); return; }
      const H = window.innerHeight, W = window.innerWidth;
      overlay();
      cv.style.display = "block";

      const cxp = W / 2, cyp = H * 0.54;
      const r0 = Math.max(78, Math.min(150, Math.min(W, H) * 0.15));
      const Rmax = Math.hypot(Math.max(cxp, W - cxp), Math.max(cyp, H - cyp)) * 1.06;
      const a = smoother(clamp01(p / 0.22));                         // the seal is summoned
      const eo = smoother(clamp01((p - 0.2) / 0.8));                 // the aperture opens
      const R = Rmax * Math.pow(eo, 1.3);
      const rs = r0 * (0.55 + 0.45 * a);                             // seal radius while it appears
      const rim = Math.max(rs * 0.001, R);
      const open = R / Math.max(1, rs);                              // 0 = closed, >1 = wider than the seal

      A.dataset.wtx = "1";
      A.style.pointerEvents = "none";
      A.style.transform = `translate3d(0, ${(H * sp).toFixed(2)}px, 0)`;

      B.setAttribute("data-tx", "1");
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transformOrigin = `${cxp}px ${cyp}px`;
      B.style.transform = `translate3d(0, ${(-H * (1 - sp)).toFixed(2)}px, 0) scale(${(1 + 0.12 * (1 - eo)).toFixed(4)})`;
      B.style.clipPath = `circle(${R.toFixed(1)}px at ${cxp}px ${cyp}px)`;

      cx.dim.setAttribute("opacity", (0.22 * eo * (1 - smoother(clamp01((R / Rmax - 0.7) / 0.25)))).toFixed(3));
      if (R >= Rmax * 0.96) { cv.style.display = "none"; bl.style.display = "none"; if (eo > 0.55) fire(); return; }
      // background blur grows continuously with the circle: a whisper while the seal is small, deep once it has swelled
      const grow = clamp01(R / Rmax);
      const veil = 1 - smoother(clamp01((grow - 0.62) / 0.28));    // the blur has done its job by the time the circle covers most of the screen
      const blur = Math.round((1 * a + 14 * Math.pow(grow, 0.85)) * veil);
      bl.style.display = blur > 0 && veil > 0.01 ? "block" : "none";
      const bf = `blur(${blur}px)`;
      if (bl._bf !== bf) { bl._bf = bf; bl.style.backdropFilter = bf; bl.style.webkitBackdropFilter = bf; }
      bl.style.background = `rgba(8,10,16,${((0.04 * a + 0.16 * grow) * veil).toFixed(3)})`;

      // seal: rises, then its centre opens
      const lift = (1 - a) * 70;
      cx.seal.setAttribute("transform", `translate(0 ${lift.toFixed(1)})`);
      cx.seal.setAttribute("opacity", a.toFixed(3));
      set(cx.disc, { cx: cxp, cy: cyp, r: rs.toFixed(1) });
      set(cx.hair, { cx: cxp, cy: cyp, r: (rs + 11).toFixed(1), opacity: (a * 0.9).toFixed(3) });
      set(cx.halo, { cx: cxp, cy: cyp, r: (rs + 4).toFixed(1), opacity: (a * (0.55 + 0.45 * Math.sin(p * 38))).toFixed(3) });
      const coreOp = clamp01(1 - open * 1.6);
      cx.core.setAttribute("opacity", coreOp.toFixed(3));
      cx.coreT.setAttribute("opacity", coreOp.toFixed(3));
      cx.coreT.setAttribute("x", cxp); cx.coreT.setAttribute("y", cyp - rs * 0.42);
      const bob = Math.sin(p * 46) * 3;
      cx.arrow.setAttribute("d", `M${cxp} ${cyp - 12 + bob} V${cyp + 16 + bob} M${cxp - 8} ${cyp + 8 + bob} L${cxp} ${cyp + 17 + bob} L${cxp + 8} ${cyp + 8 + bob}`);

      // ring type rides the rim as it grows
      const rt = Math.max(rs, R) + 26;
      const ringOp = a * (1 - smoother(clamp01((R - Rmax * 0.32) / (Rmax * 0.3))));
      cx.ringP.setAttribute("d", `M${cxp - rt} ${cyp + lift} a${rt} ${rt} 0 1 1 ${2 * rt} 0 a${rt} ${rt} 0 1 1 ${-2 * rt} 0`);
      cx.tp.setAttribute("textLength", (2 * Math.PI * rt - 6).toFixed(1));
      cx.ringT.setAttribute("opacity", ringOp.toFixed(3));
      cx.ringT.setAttribute("transform", `rotate(${(-p * 560).toFixed(1)} ${cxp} ${cyp + lift})`);
      const ang = (p * 4.2 - 0.6) * Math.PI;
      set(cx.dot, { cx: (cxp + Math.cos(ang) * (rs + 11)).toFixed(1), cy: (cyp + lift + Math.sin(ang) * (rs + 11)).toFixed(1), opacity: (a * (1 - clamp01(open * 0.9))).toFixed(3) });

      // rim, glow and ripples
      const edgeFade = Math.sin(Math.PI * clamp01(eo)) * 0.9 + 0.1 * (eo > 0 ? 1 : 0);
      for (const k of [cx.rim, cx.glow]) set(k, { cx: cxp, cy: cyp, r: rim.toFixed(1) });
      cx.rim.setAttribute("opacity", Math.min(1, edgeFade * 2.2).toFixed(3));
      cx.glow.setAttribute("opacity", (edgeFade * 0.9).toFixed(3));
      cx.echo.forEach((c, k) => {
        const rr = R - (k + 1) * (34 + 26 * eo) * (0.6 + eo);
        set(c, { cx: cxp, cy: cyp, r: Math.max(0, rr).toFixed(1), "stroke-width": (1.4 - k * 0.35).toFixed(2), opacity: (rr > rs ? edgeFade * (0.42 - k * 0.12) : 0).toFixed(3) });
      });
      set(cx.cap, { x: cxp, y: (cyp + rs + 78 + lift).toFixed(1), opacity: (a * (1 - clamp01(eo * 6))).toFixed(3) });

      if (eo > 0.55) fire(); else if (eo < 0.2) fired = false;
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
      if (cv) cv.remove();
      if (bl) bl.remove();
    };
  }, [from, to]);

  return null;
}

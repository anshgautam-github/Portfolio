import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import "./toolkit.css";
import Garden from "../Garden/Garden.jsx";
import { IS_MOBILE } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Pinned hand-off into "Let's grow" (all scroll-scrubbed, fully reversible).
  There is no separate card any more: the next scene IS the thing that arrives.
   1. the wordmark settles on the dark stage, a dawn glow gathers along the bottom edge
   2. the "Let's grow" scene rises from below as a wide, soft hill; the stage recedes behind it (parallax, dimming) and the wordmark drifts up and away
   3. as it climbs, the hill flattens, the scene settles from a slight zoom and the glow along its crest fades: it ends as the full screen, 1:1
  Copy / colours live in content.js -> toolkit (mark, finaleLabel).
*/

const PER = 0.46;     // pinned scroll distance per timeline unit, in viewport heights
const T = 4.0;        // timeline length in units
const RISE = 0.9;     // the scene starts to rise (the Garden's intro + live flag key off this too)
const RISE_DUR = 2.5; // how long the climb takes

export default function Toolkit() {
  const wrap = useRef(null);
  const root = useRef(null);
  const bg = useRef(null);
  const word = useRef(null);
  const markEl = useRef(null);
  const pillEl = useRef(null);
  const dawn = useRef(null);
  const rise = useRef(null);
  const gwin = useRef(null);
  const inner = useRef(null);
  const gctl = useRef(null);
  const { mark, finaleLabel } = content.toolkit;

  useLayoutEffect(() => {
    let ctx;
    let lastW = window.innerWidth;
    let covered = false, rising = false;
    let peLast = "";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      ctx = gsap.context(() => {
        const W = root.current.clientWidth;
        const H = root.current.clientHeight;

        // phones: the section is held by CSS `position: sticky` inside a tall wrapper instead of ScrollTrigger's pin. A pin swaps the section to
        // position:fixed from JS, which on a touch device trails the native scroll by a frame (the section visibly jitters / flips while you swipe);
        // sticky is handled by the compositor, so the held scene never moves. The timeline is still scrubbed by the same scroll distance.
        const dist = T * H * PER;
        if (wrap.current) wrap.current.style.height = IS_MOBILE && !reduce ? `${H + dist}px` : "";
        const tl = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          scrollTrigger: reduce
            ? undefined
            : {
                trigger: IS_MOBILE ? wrap.current : root.current,
                start: "top top",
                end: () => "+=" + T * H * PER,
                pin: !IS_MOBILE,
                scrub: IS_MOBILE ? true : 0.6,
                anticipatePin: IS_MOBILE ? 0 : 1,
                onUpdate: (self) => {
                  if (gctl.current) gctl.current.live(self.progress > (IS_MOBILE ? RISE + RISE_DUR * 0.92 : RISE + 0.8) / T);   // phones: the loops wake once the scene has arrived, not halfway up the climb
                  const pe = self.progress > 0.97 ? "auto" : "none";
                  if (gwin.current && pe !== peLast) { peLast = pe; gwin.current.style.pointerEvents = pe; }
                  // once the scene has fully arrived the dark stage behind it is hidden: nothing under it is painted or composited any more
                  const ris = self.progress > 0.2;   // the climb has started: the stage behind it stops animating
                  if (ris !== rising) { rising = ris; if (root.current) root.current.dataset.rising = ris ? "1" : "0"; }
                  const cov = self.progress > 0.88;
                  if (cov !== covered) { covered = cov; if (root.current) root.current.dataset.covered = cov ? "1" : "0"; }
                },
              },
        });

        /* ---- 1. the wordmark arrives on the stage; a dawn glow gathers at the bottom edge ---- */
        tl.fromTo(markEl.current, { y: H * 0.05, opacity: 0 }, { y: 0, opacity: 1, ease: "power3.out", duration: 0.9 }, 0);
        tl.fromTo(pillEl.current, { y: H * 0.07, opacity: 0 }, { y: 0, opacity: 1, ease: "power3.out", duration: 0.9 }, 0.12);
        tl.fromTo(dawn.current, { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, ease: "power2.out", duration: RISE + 0.6 }, 0);

        /* ---- 2. the scene rises from below as a wide hill that flattens as it climbs ---- */
        const r = rise.current;
        const g = gwin.current;
        const st = { k: 1, glow: 0 };
        // three tweens call shape() on every frame of the climb, and each write re-clips (and, with the glow, re-paints) the full-screen layer holding the whole
        // garden. The values are quantised (a 1-2 px step in the radius, invisible) and nothing is written when they did not change.
        let shapeKey = "";
        // phones: the rise is pure transform (compositor only). The morphing rounded crest, its glow, the zoom of the whole scene and the scale of the stage
        // behind were all re-painted / re-composited on the main thread every frame of the climb; here the scene is a flat card with a hairline edge instead.
        if (IS_MOBILE) { r.style.borderRadius = "0"; r.style.boxShadow = "0 -1px 0 rgba(190,205,255,.45)"; }
        const shape = () => {
          if (IS_MOBILE) return;
          const q = IS_MOBILE ? 40 : 200;
          const kq = Math.round(st.k * q) / q;
          const gq = IS_MOBILE ? 0 : Math.round(st.glow * 100) / 100;
          const key = kq + "|" + gq;
          if (key === shapeKey) return;
          shapeKey = key;
          const rx = (W * 0.62 * kq).toFixed(1), ry = (H * 0.2 * kq).toFixed(1);
          r.style.borderRadius = kq === 0 ? "0" : `${rx}px ${rx}px 0 0 / ${ry}px ${ry}px 0 0`;
          // the 130px-blur glow along the crest is re-painted every frame of the climb: phones skip it (the crest still reads from the hill shape)
          r.style.boxShadow = gq > 0.002
            ? `0 -2px 0 rgba(255,214,190,${(0.5 * gq).toFixed(3)}), 0 -14px 46px rgba(238,111,78,${(0.5 * gq).toFixed(3)}), 0 -40px 130px rgba(138,96,211,${(0.55 * gq).toFixed(3)})`
            : "none";
        };
        gsap.set(r, { y: H * 1.04, force3D: true });
        gsap.set(g, { width: "100%", height: "100%" });
        gsap.set(inner.current, { scale: IS_MOBILE ? 1 : 1.1, transformOrigin: "50% 100%", force3D: true });
        shape();

        tl.to(r, { y: 0, ease: "power3.inOut", duration: RISE_DUR }, RISE);
        tl.to(st, { k: 0, ease: "power2.inOut", duration: RISE_DUR * 0.9, onUpdate: shape }, RISE);                 // the hill flattens a little before it arrives
        tl.fromTo(st, { glow: 0 }, { glow: 1, ease: "power1.out", duration: RISE_DUR * 0.3, onUpdate: shape, immediateRender: false }, RISE);
        tl.to(st, { glow: 0, ease: "power1.in", duration: RISE_DUR * 0.4, onUpdate: shape }, RISE + RISE_DUR * 0.6);    // the glow along the crest fades as it arrives
        tl.to(inner.current, { scale: 1, ease: "power2.out", duration: RISE_DUR }, RISE);                            // the scene settles from a slight zoom

        // the stage recedes behind it
        tl.to(bg.current, IS_MOBILE ? { opacity: 0.35, ease: "power2.inOut", duration: RISE_DUR } : { yPercent: -4, scale: 0.97, opacity: 0.35, ease: "power2.inOut", duration: RISE_DUR }, RISE);
        tl.to(word.current, { y: -H * 0.14, scale: 0.94, opacity: 0, ease: "power2.in", duration: RISE_DUR * 0.7 }, RISE);
        tl.to(dawn.current, { opacity: 0, ease: "power1.in", duration: RISE_DUR * 0.6 }, RISE + RISE_DUR * 0.4);

        tl.call(() => gctl.current && gctl.current.intro(), null, RISE + RISE_DUR * 0.45);

        tl.set({}, {}, T);
        if (reduce) tl.progress(1);
      }, root);
    };

    build();

    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        ctx.revert();
        build();
        ScrollTrigger.refresh();
      }, 220);
    };
    window.addEventListener("resize", onResize);

    /* the build reads only the section's own box (h-screen), which fonts cannot change, so there is no rebuild on fonts.ready: it used to
       tear down and recreate the pinned timeline a second time at load. App.jsx already refreshes ScrollTrigger once fonts are in. */
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      ctx.revert();
      if (wrap.current) wrap.current.style.height = "";
    };
  }, []);

  return (
    <div ref={wrap} className="tk-wrap">
    <section
      ref={root}
      className="tk-sec relative h-screen min-h-[560px] w-full overflow-hidden text-[#e8f1ff] [--c:min(56vw,38vh)] md:[--c:min(26vw,44vh)]"
    >
      {/* ---------------- the dark stage the card rises from ---------------- */}
      <div ref={bg} className="tk-bg" aria-hidden="true">
        <div className="tk-aurora-glow" />
        <div className="tk-stars" />
        <div className="tk-light-sweep" />

        <div className="tk-floor">
          <svg className="tk-wave-stream" viewBox="0 0 1200 400" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tkWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                <stop offset="35%" stopColor="#818cf8" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="tkWaveGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
                <stop offset="40%" stopColor="#e879f9" stopOpacity="0.75" />
                <stop offset="75%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="tk-wave-path tk-wave-path--1" d="M0,210 C300,110 480,290 760,160 C980,60 1100,240 1200,180" fill="none" stroke="url(#tkWaveGrad1)" strokeWidth="2" />
            <path className="tk-wave-path tk-wave-path--2" d="M0,170 C240,270 540,90 840,240 C1040,320 1120,150 1200,200" fill="none" stroke="url(#tkWaveGrad2)" strokeWidth="1.5" strokeDasharray="6 8" />
          </svg>
          <div className="tk-floor-orbit tk-floor-orbit--1"><span className="tk-orbit-dot" /></div>
          <div className="tk-floor-orbit tk-floor-orbit--2" />
        </div>

        <i className="tk-dots" />
      </div>

      {/* dawn glow gathering along the bottom edge, the colours the scene's crest will carry */}
      <div
        ref={dawn}
        aria-hidden="true"
        className="tk-dawn pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: "58%", opacity: 0, background: "radial-gradient(70% 90% at 50% 112%, rgba(238,111,78,.5) 0%, rgba(138,96,211,.34) 38%, transparent 72%)", filter: IS_MOBILE ? "none" : "blur(18px)" }}
      />

      {/* the wordmark that holds the stage; the scene rising from below carries it away */}
      <div ref={word} className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center will-change-transform">
        <span ref={markEl} className="font-display font-extrabold text-[#fbf1ea] will-change-transform" style={{ fontSize: "calc(var(--c) * 0.62)", lineHeight: 0.8, letterSpacing: "-0.09em", textShadow: "0 10px 60px rgba(238,111,78,.35)" }}>
          {mark}
        </span>
        <div ref={pillEl} className="will-change-transform" style={{ marginTop: "calc(var(--c) * 0.14)" }}>
          <span
            className="inline-block whitespace-nowrap font-display font-medium leading-none"
            style={{ fontSize: "calc(var(--c) * 0.07)", padding: "calc(var(--c) * 0.06) calc(var(--c) * 0.1)", borderRadius: 999, background: "#fbf1ea", color: "#1f1e1e" }}
          >
            {finaleLabel}
          </span>
        </div>
      </div>

      {/* the next section's scene: rises from below as a hill, flattens, and becomes the screen */}
      <div ref={rise} className="absolute inset-0 z-30 will-change-transform" style={{ borderRadius: "inherit" }}>
        <div ref={gwin} className="tk-gwin" style={{ position: "absolute", left: 0, top: 0, transform: "none", borderRadius: "inherit", overflow: "hidden" }}>
          <div ref={inner} className="absolute inset-0 will-change-transform">
            <Garden embedded ctl={gctl} />
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}

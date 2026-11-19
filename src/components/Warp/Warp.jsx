import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { projects } from "../Projects/projectsData.js";
import * as snd from "./warpSound.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createWarpEngine } from "./warpEngine.js";
import { startFlow } from "./flowField.js";
import WarpProjects from "./WarpProjects.jsx";
import { IS_MOBILE } from "../../lib/perf.js";
import { perf } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/**
 * <Warp /> — pinned, scroll-driven hero:
 *   cursor grows → fills the screen with warp streaks → headline swaps → cursor returns with stickers.
 *
 * Props (all optional)
 *   phrases   three headline blocks, each an array of lines
 *   scrollLength   how many viewport-heights the pinned scroll lasts (default 8)
 *   brand / showNav   small HUD nav on top (off by default so it doesn't fight your own nav)
 *   place / temp   the little HUD readout bottom-left
 */
const DEFAULT_PHRASES = [
  ["INNOVATE", "WITH", "PURPOSE"],
  ["INNOVATE", "WITH A", "HUMAN TOUCH"],
  ["FUTURE-FIRST", "ALWAYS"],
];

const WIDE = { fontFamily: "'Archivo', 'Inter Tight', Arial, sans-serif", fontStretch: "125%", fontWeight: 800 };
const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace" };

/* splits a line into words (never broken across lines) and letters (each one can react to the pointer) */
function Split({ text, i0 = 0 }) {
  let k = i0;
  const words = text.split(" ");
  return words.map((w, wi) => (
    <Fragment key={wi}>
      <span className="wp-w">
        {w.split("").map((c) => {
          const i = k++;
          return <span key={i} className="wp-ch" style={{ "--i": i }}>{c}</span>;
        })}
      </span>
      {wi < words.length - 1 ? " " : null}
    </Fragment>
  ));
}

const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, "0");

const NARROW = typeof window !== "undefined" && window.innerWidth < 768;

function initialState() {
  return {
    cs: 1, // cursor scale
    cr: 0, // cursor rotation (deg)
    // desktop: parked on the right, tucked behind the "BUILT" word. Phones: the headline wraps to 4 lines and fills that spot, so the
    // cursor waits in the empty space above the text instead (and glides down to the centre as it swells).
    cx: NARROW ? 0.2 : 0.245, // cursor offset, fraction of width
    cy: NARROW ? -0.3 : 0.065, // cursor offset, fraction of height
    tilt: 0, // 3D extrusion amount
    cAlpha: 1,
    cMix: 0, // 0 bright blue … 1 deep blue
    bg: 0, // 0 dark, 1 navy, 2 black
    inside: 0, // streaks clipped inside the cursor
    outside: 0, // streaks across the whole screen
    density: 0.3,
    hue: 0, // 0 cool streaks … 1 + magenta/violet
    dots: 0, // halftone dot grid + stickers
    follow: 0, // cursor follows the pointer
    drift: 0.04, // idle streak speed
    mx: 0,
    my: 0,
    px: 0,
    py: 0,
  };
}

export default function Warp({
  phrases = DEFAULT_PHRASES,
  scrollLength = 13.6,
  brand = "PORTFOLIO",
  showNav = false,
  place = "IN",
  temp = "24°C",
}) {
  const wrap = useRef(null);
  const root = useRef(null);
  const canvas = useRef(null);
  const flow = useRef(null);
  useEffect(() => (flow.current ? startFlow(flow.current) : undefined), []);
  const limeRef = useRef(null);
  const hlRef = useRef(null);   // the headline (letters react to the pointer, the block drifts for depth)
  const pRef = useRef(null);    // the intro paragraph (drifts less than the headline)
  const spotRef = useRef(null); // the pointer-lit layer of the grid
  const jumpRef = useRef(null); // (i) => scroll to project i, set by the scroll timeline
  const builtRef = useRef(null); // the word "built" in the intro headline: the cursor starts hidden right behind it
  const coordRef = useRef(null);
  const clockRef = useRef(null);
  const state = useRef(initialState());
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("warp-sound") === "off";
    } catch {
      return false;
    }
  });
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    snd.setMuted(muted);
  }, [muted]);
  useEffect(() => {
    snd.setLockListener(setLocked);
    const go = () => snd.unlock(); // browsers only allow audio after a click / key / tap
    const evs = ["pointerdown", "keydown", "touchend", "click"];
    evs.forEach((e) => window.addEventListener(e, go, { passive: true }));
    return () => {
      evs.forEach((e) => window.removeEventListener(e, go));
      snd.setLockListener(null);
      snd.stop();
    };
  }, []);

  /* ---------------- HUD: clock + pointer ---------------- */
  useEffect(() => {
    const tick = () => {
      if (!clockRef.current) return;
      const d = new Date();
      const off = -d.getTimezoneOffset() / 60;
      const sign = off >= 0 ? "+" : "-";
      const abs = Math.abs(off);
      const hh = Math.floor(abs);
      const mm = Math.round((abs - hh) * 60);
      const tz = `GMT${sign}${hh}${mm ? ":" + String(mm).padStart(2, "0") : ""}`;
      const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      clockRef.current.textContent = `${tz} ${place} ${t} ${temp}`;
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [place, temp]);

  /* ---------------- engine + scroll timeline ---------------- */
  useLayoutEffect(() => {
    const S = state.current;
    const el = root.current;
    const engine = createWarpEngine(canvas.current, S);

    /* where the cursor starts: dead centre on the word "built", wherever that lands on this screen (laptop, tablet, phone).
       Measured from layout offsets (not getBoundingClientRect) so the headline's entrance transforms can't skew it. */
    const anchor = () => {
      const b = builtRef.current;
      if (!b || !el.clientWidth || !el.clientHeight) return null;
      let x = 0, y = 0, n = b;
      while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      if (n !== el) return null;
      x += b.offsetWidth / 2;
      y += b.offsetHeight / 2;
      return { cx: x / el.clientWidth - 0.5, cy: y / el.clientHeight - 0.5 };
    };
    /* where "built" is on screen RIGHT NOW (the headline rises / scales / drifts in while the section arrives, so its resting spot is not
       where the word is yet). Uses the headline block's own transform (rect vs layout size) to carry the layout position of "built" along,
       so the cursor sticks to the word through the entrance and is not wobbled by the per-letter hover lift. */
    const layoutPos = (node) => {
      let x = 0, y = 0, n = node;
      while (n && n !== el) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return n === el ? { x, y } : null;
    };
    const liveAnchor = () => {
      const b = builtRef.current, h = hlRef.current;
      if (!b || !h || !el.clientWidth || !el.clientHeight || !h.offsetWidth || !h.offsetHeight) return null;
      const pb = layoutPos(b), ph = layoutPos(h);
      if (!pb || !ph) return null;
      const er = el.getBoundingClientRect(), hr = h.getBoundingClientRect();
      if (!er.width || !er.height) return null;
      const kx = er.width / el.clientWidth, ky = er.height / el.clientHeight;
      const sx = hr.width / h.offsetWidth, sy = hr.height / h.offsetHeight;
      const bx = pb.x + b.offsetWidth / 2 - ph.x, by = pb.y + b.offsetHeight / 2 - ph.y;
      const x = (hr.left + bx * sx - er.left) / kx, y = (hr.top + by * sy - er.top) / ky;
      return { cx: x / el.clientWidth - 0.5, cy: y / el.clientHeight - 0.5 };
    };
    const a0 = anchor();
    if (a0) { S.cx = a0.cx; S.cy = a0.cy; }
    let lastA = a0 || { cx: 0, cy: 0 };
    let active = true;
    /* the scroll timeline (set below). While it is still at its very start the cursor is *held* on "built" and re-measured live:
       the headline block is bottom-anchored, so when fonts load / the paragraph re-wraps / the viewport changes, "built" moves, and a
       one-off measurement would leave the cursor floating above it until the (scroll-idle-deferred) ScrollTrigger refresh fixed it. */
    const tlRef = { current: null };
    /* the cursor stays glued to "built" for the first HOLD of the pinned timeline (until the headline itself starts to leave), whatever the scroll speed */
    const HOLD = 0.55;

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas.current);
    engine.resize();

    /* pointer → engine + lime square + coordinates */
    const lime = { x: 0, y: 0, tx: 0, ty: 0 };
    const rect = () => el.getBoundingClientRect();
    const r0 = rect();
    lime.x = lime.tx = S.px = r0.width / 2;
    lime.y = lime.ty = S.py = r0.height / 2;

    const fine = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
    const chars = Array.from(el.querySelectorAll(".wp-ch")).map((n) => ({ n, f: 0, ty: 0, on: false }));
    const par = { x: 0, y: 0 };
    const introEl = el.querySelector("[data-intro]");
    let moved = false, fxFrame = 0;
    /* pointer -> section coordinates. Always clamped to the section: when the section is far above / below the viewport (fast scrolling)
       the raw offset is thousands of px, which used to fling the headline / paragraph parallax (and the lit patch) far off their resting spot. */
    const ptr = { x: 0, y: 0 };
    const applyPtr = () => {
      if (!active) return;
      const r = rect();
      if (!r.width || !r.height) return;
      const x = Math.min(r.width, Math.max(0, ptr.x - r.left));
      const y = Math.min(r.height, Math.max(0, ptr.y - r.top));
      S.px = x;
      S.py = y;
      S.mx = (x / r.width) * 2 - 1;
      S.my = (y / r.height) * 2 - 1;
      lime.tx = x;
      lime.ty = y;
      if (coordRef.current) {
        coordRef.current.textContent = `${pad4(x)} X ${pad4(y)} Y`;
      }
    };
    const onMove = (e) => {
      moved = true;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      applyPtr();
    };
    const onScrollPtr = () => { if (moved) applyPtr(); };
    window.addEventListener("scroll", onScrollPtr, { passive: true });
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    /* click / tap: a pair of light rings spreads from the pointer */
    const onDown = (e) => {
      if (!introEl || +gsap.getProperty(introEl, "opacity") < 0.05) return;
      const r = rect();
      [0, 0.12].forEach((d, k) => {
        const ring = document.createElement("span");
        ring.className = "wp-ripple";
        ring.style.left = e.clientX - r.left + "px";
        ring.style.top = e.clientY - r.top + "px";
        el.appendChild(ring);
        gsap.fromTo(ring, { scale: 0.08, autoAlpha: k ? 0.55 : 0.95 }, { scale: k ? 0.7 : 1, autoAlpha: 0, duration: 1.25, delay: d, ease: "power3.out", onComplete: () => ring.remove() });
      });
    };
    el.addEventListener("pointerdown", onDown);

    /* one ticker drives everything */
    const flag = { on: false }; // true while the section is sliding in (cheap: half frame rate)
    let fr = 0, wacc = 0;
    const tick = (time, deltaMs) => {
      if (!active) return;
      const tlm = tlRef.current;
      if (!tlm || tlm.time() < HOLD) {
        const a = anchor();   // the headline's resting spot: what the timeline's start value is re-measured against
        if (a) {
          if (tlm && (Math.abs(a.cx - lastA.cx) > 0.002 || Math.abs(a.cy - lastA.cy) > 0.002)) tlm.invalidate();
          lastA = a;
        }
        // before the pin: follow where "built" actually is on screen (the headline is still rising in). Once the pinned scroll has begun: sit on its resting spot.
        const L = (!tlm || tlm.progress() < 0.02) ? (liveAnchor() || a) : a;
        if (L) { S.cx = L.cx; S.cy = L.cy; }
      }
      lime.x += (lime.tx - lime.x) * 0.22;
      lime.y += (lime.ty - lime.y) * 0.22;
      if (limeRef.current) {
        limeRef.current.style.transform = `translate3d(${lime.x - 11}px, ${lime.y - 11}px, 0)`;
      }
      /* ---- the intro reacts to the pointer: a lit patch of the grid, letters that lift toward the cursor, a gentle depth drift ---- */
      if (fine && moved && introEl) {
        const introOp = +gsap.getProperty(introEl, "opacity");
        if (introOp > 0.05) {
          if (spotRef.current) {
            spotRef.current.style.setProperty("--mx", lime.x.toFixed(1) + "px");
            spotRef.current.style.setProperty("--my", lime.y.toFixed(1) + "px");
          }
          par.x += (S.mx - par.x) * 0.07;
          par.y += (S.my - par.y) * 0.07;
          if (hlRef.current) hlRef.current.style.translate = `${(-par.x * 12).toFixed(2)}px ${(-par.y * 7).toFixed(2)}px`;
          if (pRef.current) pRef.current.style.translate = `${(-par.x * 5).toFixed(2)}px ${(-par.y * 3).toFixed(2)}px`;
          if ((fxFrame++ & 1) === 0) {
            const sr = el.getBoundingClientRect();
            const px = sr.left + lime.x, py = sr.top + lime.y;
            const R = Math.max(150, window.innerWidth * 0.13);
            const rects = chars.map((c) => c.n.getBoundingClientRect());   // all reads first, then all writes: no layout thrash
            for (let ci = 0; ci < chars.length; ci++) {
              const c = chars[ci], r = rects[ci];
              const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2 + c.ty);
              const t = Math.max(0, 1 - Math.hypot(dx, dy) / R);
              c.f += (t * t * (3 - 2 * t) - c.f) * 0.3;
              if (c.f > 0.004) {
                c.on = true;
                c.ty = -c.f * 18;
                c.n.style.transform = `translate3d(0,${c.ty.toFixed(2)}px,0) scale(${(1 + c.f * 0.1).toFixed(3)})`;
                c.n.style.setProperty("--f", c.f.toFixed(3));
              } else if (c.on) {
                c.on = false; c.ty = 0; c.f = 0;
                c.n.style.transform = ""; c.n.style.removeProperty("--f");
              }
            }
          }
        }
      }
      if (flag.on && fr++ % 2) return;
      wacc += deltaMs;
      // phones: the streak canvas sits under heavy DOM layers, so every canvas update costs a re-composite: run it at ~20fps there
      const cap = IS_MOBILE ? 48 : perf.frameMs;
      if (cap && wacc < cap - 2) return;
      engine.render(wacc / 1000, time);
      wacc = 0;
    };
    gsap.ticker.add(tick);

    const io = new IntersectionObserver(([en]) => (active = en.isIntersecting), { rootMargin: "100px" });
    io.observe(el);

    /* ---------------- the scroll story ---------------- */
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const blocks = q("[data-phrase]");
      const lines = blocks.map((b) => Array.from(b.querySelectorAll("[data-line]")));
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let scrollK = 1;
        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + window.innerHeight * scrollLength * scrollK,
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        });
        tlRef.current = tl;
        const to = (vars, at, dur) => tl.to(S, { ...vars, duration: dur }, at);

        /* ---- ENTRY: as this section slides in under the white screen, a dark disc blooms out of the seam with a glowing rim,
           a hyperspace burst tears past, and the intro caption slams in. Scrubbed with the scroll. ---- */
        // phones skip the expanding clip-path disc, the 250vmax glowing rim and the two 120vmax masked spoke layers: each one forces a
        // full-screen repaint (or a giant GPU layer) on every scroll frame. They get a plain cross-fade instead.
        const rim = null; /* the expanding circle + rim + spoke bursts are replaced by the horizontal PushTransition slide */
        const b1 = null;
        const b2 = null;
        const R = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.06;
        const enter = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: wrap.current, start: "top bottom", end: "top top", scrub: 0.5, invalidateOnRefresh: true, onUpdate: (self) => (flag.on = self.progress > 0 && self.progress < 1), onLeave: () => (flag.on = false), onLeaveBack: () => (flag.on = false) },
        });
        // phones: a plain fade (never a transform on `el`: this element is the pinned one, and a y offset measured at pin time leaves the whole
        // pinned screen 36px too high, with the page background showing as a strip along the bottom edge)
        if (IS_MOBILE) enter.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, ease: "power2.out", duration: 0.7 }, 0);
        if (rim) {
          enter.fromTo(rim, { scale: 0, autoAlpha: 1 }, { scale: () => R() / (1.28 * Math.max(window.innerWidth, window.innerHeight)), ease: "power2.in", duration: 1 }, 0);
          enter.to(rim, { autoAlpha: 0, duration: 0.18 }, 0.82);
        }
        if (b1) {
          enter.fromTo(b1, { scale: 0.25, rotation: 0, autoAlpha: 0 }, { scale: 3.4, rotation: 38, autoAlpha: 1, duration: 0.75, ease: "power2.in" }, 0.15);
          enter.to(b1, { autoAlpha: 0, duration: 0.25 }, 0.8);
        }
        if (b2) {
          enter.fromTo(b2, { scale: 0.15, rotation: 0, autoAlpha: 0 }, { scale: 4.2, rotation: -55, autoAlpha: 0.9, duration: 0.8, ease: "power3.in" }, 0.1);
          enter.to(b2, { autoAlpha: 0, duration: 0.25 }, 0.8);
        }
        /* the intro (caption, headline, paragraph) and the arrow arrive already in their resting layout: no rise / scale / fade entrance,
           so the arrow is never out of step with the headline and the paragraph is always visible */
        gsap.set(q("[data-i]"), { clearProps: "transform,opacity,visibility,scale" });
        gsap.set(S, { cAlpha: 1 });
        /* the cursor is parked behind "built" at the spot where the headline finally rests, so it only fades in as the lines land
           (otherwise it sits ~100px off the still-rising text while the section slides in) */


        /* 1-4 · the cursor swells, tilts, swallows the screen, then the streaks take over */
        /* the start values are functions, so they are re-measured on every refresh (resize, rotate, fonts loading) */
        tl.fromTo(
          S,
          { cx: () => (anchor() || { cx: S.cx }).cx, cy: () => (anchor() || { cy: S.cy }).cy },
          { cs: 3.4, cr: 16, tilt: 1, cx: 0.17, cy: -0.02, density: 0.2, ease: "power1.inOut", duration: 1.6 - HOLD },
          HOLD
        );
        to({ cs: 9, cr: 44, cx: 0.05, cy: -0.03, inside: 1, density: 0.4, tilt: 0.4, ease: "power1.inOut" }, 1.5, 1.5);
        to({ cs: 36, cr: 68, cx: 0, cy: 0, density: 0.6, cMix: 1, tilt: 0, ease: "power2.in" }, 2.9, 1.3);
        to({ cAlpha: 0, inside: 0, outside: 1, bg: 1, density: 0.75, hue: 0.4 }, 4.1, 1.0);

        /* intro caption leaves as the blue floods the screen */
        const intro = q("[data-intro]")[0];
        const ibg = q("[data-introbg]")[0];
        if (ibg) tl.to(ibg, { autoAlpha: 0, duration: 1.15, ease: "power2.inOut" }, 0.55);
        const iau = q("[data-introaur]")[0];
        if (iau) tl.to(iau, { autoAlpha: 0, duration: 1.15, ease: "power2.inOut" }, 0.55);
        const extras = q("[data-introx]");
        if (extras.length) tl.to(extras, { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" }, 0.55);
        if (intro) tl.to(intro, { autoAlpha: 0, y: -46, ...(IS_MOBILE ? {} : { filter: "blur(10px)" }), duration: 1.15, ease: "power2.inOut" }, 0.55);

        /* mid caption: lives on the blue while the cursor swallows the screen, with a counting percentage */
        const mid = q("[data-mid]")[0];
        const ms = q("[data-m]");
        const cnt = q("[data-count]")[0];
        if (mid) {
          const nf0 = { immediateRender: false };
          // pin the resting (hidden) state up front so nothing can flash before its cue, whatever the scroll jumps do
          gsap.set(mid, { autoAlpha: 1 });
          gsap.set(ms, { y: 38, autoAlpha: 0, scale: 0.96, ...(IS_MOBILE ? {} : { filter: "blur(14px)" }) });
          tl.to(ms, { y: 0, autoAlpha: 1, scale: 1, ...(IS_MOBILE ? {} : { filter: "blur(0px)" }), duration: 1.4, stagger: 0.18, ease: "power2.out" }, 2.0);
          const c = { v: 0 };
          tl.to(c, { v: 100, duration: 2.5, ease: "none", onUpdate: () => {
            if (cnt) cnt.textContent = String(Math.round(c.v)).padStart(2, "0");
            snd.update(c.v);
          } }, 2.2);
          tl.to(ms, { y: -44, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: "power2.in" }, 4.3);
          tl.to(mid, { autoAlpha: 0, duration: 0.3, ease: "none" }, 5.0);
        }

        /* 5 · the three projects arrive one by one over the streaks */
        const slides = q("[data-slide]");
        const rail = q("[data-rail]")[0];
        const dots = q("[data-dot]");
        const prog = q("[data-prog]")[0];
        const wipe = IS_MOBILE ? null : q("[data-wipe]")[0];
        const A = 5.0;
        const T0 = A + 0.5;
        const STEP = 3.4;
        const END = T0 + (slides.length - 1) * STEP + 2.1;
        to({ bg: 2, density: 0.9, hue: 0.8 }, A, 1.0);
        const nf = { immediateRender: false };
        if (rail) {
          tl.fromTo(rail, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "none", ...nf }, T0);
          tl.fromTo(prog, { scaleY: 0 }, { scaleY: 1, duration: END - T0, ease: "none", ...nf }, T0);
        }
        slides.forEach((s, i) => {
          const T = T0 + i * STEP;
          const last = i === slides.length - 1;
          const ts = s.querySelectorAll("[data-t]");
          const st = s.querySelector("[data-stage]");
          const gh = s.querySelector("[data-ghost]");
          const dir = s.classList.contains("side-left") ? 1 : -1;
          // 1% opacity a beat early: the browser paints + rasterises the heavy 3D device now, instead of in the middle of the reveal
          tl.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 0.01, duration: 0.05, ease: "none", ...nf }, Math.max(0.01, T - 1.4));
          tl.fromTo(s, { autoAlpha: 0.01 }, { autoAlpha: 1, duration: 0.5, ease: "none", ...nf }, T);
          tl.fromTo(ts, { y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", ...nf }, T + 0.1);
          tl.fromTo(st, { x: dir * 140, scale: 0.94 }, { x: 0, scale: 1, duration: 1.1, ease: "power3.out", ...nf }, T);
          tl.fromTo(gh, { y: 140, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: "power3.out", ...nf }, T);
          tl.fromTo(s, { "--p": 0 }, { "--p": 1, duration: 1.4, ease: "power2.out", ...nf }, T + 0.1);
          if (IS_MOBILE) {
            // phones: the device subtree is pinned to --p:1 in CSS (a changing inherited variable re-styles every one of its ~300 nodes
            // each frame). The entrance is done with plain transforms on one or two elements instead, which never touch style/layout.
            const dev = s.querySelector(".wp-device");
            const lid = s.querySelector(".pj-mb-lid");
            if (dev) tl.fromTo(dev, { y: 56, scale: 0.94, force3D: true }, { y: 0, scale: 1, duration: 1.3, ease: "power2.out", ...nf }, T + 0.1);
            if (lid) {
              gsap.set(lid, { x: 0, y: -3, z: -250, rotationX: -90, transformOrigin: "50% 100%", force3D: true });
              tl.to(lid, { rotationX: 6, duration: 1.4, ease: "power2.out" }, T + 0.1);
            }
          }
          if (dots[i]) {
            tl.fromTo(dots[i], { "--on": 0 }, { "--on": 1, duration: 0.5, ease: "none", ...nf }, T + 0.1);
          }
          if (!last) {
            if (wipe) {
              // a soft light bar sweeps across as the next project takes over
              tl.fromTo(wipe, { xPercent: -140, skewX: -18, autoAlpha: 0 }, { xPercent: 240, duration: 1.15, ease: "power2.inOut", ...nf }, T + 2.35);
              tl.fromTo(wipe, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: "none", ...nf }, T + 2.4);
              tl.to(wipe, { autoAlpha: 0, duration: 0.4, ease: "none" }, T + 3.1);
            }
            if (dots[i]) tl.to(dots[i], { "--on": 0, duration: 0.5, ease: "none" }, T + 2.7);
            tl.to(ts, { y: -34, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: "power2.in" }, T + 2.55);
            tl.to(st, { x: -dir * 120, scale: 0.95, duration: 0.7, ease: "power2.in" }, T + 2.55);
            tl.to(gh, { y: -100, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, T + 2.6);
            tl.to(s, { autoAlpha: 0, duration: 0.45, ease: "none" }, T + 2.85);
          }
        });
        const cleanups = [];
        /* 6 · the hand-off: the last project simply holds (the progress rail steps aside). The laptop-screen flight into the tech page is gone:
           the tech section now rises from the bottom as a card over this pinned scene (see .ts in techSwitch.css), during the final screen of this pin. */
        const END_HOLD = 2.4;
        if (rail) tl.to(rail, { autoAlpha: 0, duration: 0.6, ease: "none" }, END);
        tl.to({}, { duration: END_HOLD }, END);
        scrollK = (END + END_HOLD) / (END + 4);            // the timeline is shorter than before: shorten the pin by the same ratio so the scrub speed is unchanged
        if (tl.scrollTrigger) tl.scrollTrigger.refresh();
        /* the project chips on the intro jump the scroll straight to a project (the scrub maps scroll position to timeline time linearly) */
        jumpRef.current = (i) => {
          const st = tl.scrollTrigger;
          if (!st) return;
          const y = st.start + ((T0 + i * STEP + 1.5) / tl.duration()) * (st.end - st.start);
          if (window.__lenis) window.__lenis.scrollTo(y, { duration: 3.2 });
          else window.scrollTo({ top: y, behavior: "smooth" });
        };
        return () => { jumpRef.current = null; cleanups.forEach((f) => f()); if (tl.scrollTrigger) tl.scrollTrigger.kill(); };
      });

      /* reduced motion: no pin, just the resting frame */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        Object.assign(S, { cs: 1.15, cy: 0.1, dots: 1, density: 0.1, follow: 0 });
      });
    }, el);

    return () => {
      active = false;
      gsap.ticker.remove(tick);
      if (fine) window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScrollPtr);
      el.removeEventListener("pointerdown", onDown);
      ro.disconnect();
      io.disconnect();
      ctx.revert();
    };
  }, [scrollLength]);

  const gx = ["3.85%", "34.65%", "65.4%", "96.2%"];
  const gy = ["34.5%", "69%"];

  return (
    <div ref={wrap} data-warp-wrap className="relative w-full" style={{ background: "linear-gradient(180deg, #e8ecf8 0%, #f5f4ef 100%)" }}>
    <section
      ref={root}
      className="relative h-screen w-full select-none overflow-hidden text-white"
      style={{ background: "#000", cursor: "none" }}
      aria-label="Selected projects"
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

      {/* intro aurora: slow drifting colour behind the threads, a rotating light sheen, orbiting rings, a soft vignette */}
      <div data-introaur className="wp-aur pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <i className="wa wa1" /><i className="wa wa2" /><i className="wa wa3" /><i className="wa wa4" />
        <i className="wa-sheen" /><i className="wa-ring wr1" /><i className="wa-ring wr2" />
        <span className="wa-dust">{Array.from({ length: 22 }, (_, k) => <b key={k} style={{ "--x": `${(k * 37) % 100}%`, "--d": `${11 + (k * 5) % 12}s`, "--dl": `${-((k * 7) % 16)}s`, "--s": `${1 + (k % 3)}px` }} />)}</span>
        <i className="wa-vig" />
      </div>

      {/* intro aurora: slow drifting colour behind the threads, a rotating light sheen, orbiting rings, a soft vignette */}
      <div data-introaur className="wp-aur pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        <i className="wa wa1" /><i className="wa wa2" /><i className="wa wa3" /><i className="wa wa4" />
        <i className="wa-sheen" /><i className="wa-ring wr1" /><i className="wa-ring wr2" />
        <span className="wa-dust">{Array.from({ length: 22 }, (_, k) => <b key={k} style={{ "--x": `${(k * 37) % 100}%`, "--d": `${11 + (k * 5) % 12}s`, "--dl": `${-((k * 7) % 16)}s`, "--s": `${1 + (k % 3)}px` }} />)}</span>
        <i className="wa-vig" />
      </div>


      {/* intro backdrop: a current of fine light threads that parts around the pointer */}
      <canvas ref={flow} data-introbg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" aria-hidden="true" />

      {/* pointer-lit layer: the grid glows brighter around the cursor (desktop) */}
      <div ref={spotRef} className="wp-spot pointer-events-none absolute inset-0 z-[1] max-md:hidden" aria-hidden="true">
        <div className="wp-spot-plus">
          {gx.flatMap((x) => gy.map((y) => (
            <span key={x + y} className="absolute text-[15px] leading-none" style={{ left: x, top: y, transform: "translate(-50%,-52%)", color: "#cfe0ff", ...MONO }}>+</span>
          )))}
        </div>
      </div>

      {/* entry effects: hyperspace spokes + glowing rim of the expanding disc */}
      <div
        data-burst1
        className="pointer-events-none absolute left-1/2 top-[46%] z-[3] h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          visibility: "hidden",
          willChange: "transform, opacity",
          background: "repeating-conic-gradient(from 0deg at 50% 50%, rgba(170,205,255,.95) 0deg .3deg, transparent .3deg 2.1deg)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 6%, #000 38%)",
          maskImage: "radial-gradient(circle at 50% 50%, transparent 6%, #000 38%)",
        }}
      />
      <div
        data-burst2
        className="pointer-events-none absolute left-1/2 top-[46%] z-[3] h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2"
        style={{
          visibility: "hidden",
          willChange: "transform, opacity",
          background: "repeating-conic-gradient(from 7deg at 50% 50%, rgba(200,150,255,.85) 0deg .22deg, transparent .22deg 3.3deg)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, transparent 10%, #000 46%)",
          maskImage: "radial-gradient(circle at 50% 50%, transparent 10%, #000 46%)",
        }}
      />
      <div
        data-rim
        className="pointer-events-none absolute z-[6]"
        style={{
          visibility: "hidden",
          left: "50%",
          top: 0,
          width: "256vmax",
          height: "256vmax",
          marginLeft: "-128vmax",
          marginTop: "-128vmax",
          borderRadius: "50%",
          willChange: "transform, opacity",
          background:
            "radial-gradient(closest-side, transparent 96%, rgba(90,140,255,.35) 97.8%, rgba(190,215,255,.95) 99.3%, rgba(255,255,255,.95) 99.8%, transparent 100%)",
        }}
      />

      {/* hairline grid + plus marks */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {gx.map((x) => (
          <span key={x} className="absolute top-0 h-full w-px bg-white/[0.11]" style={{ left: x }} />
        ))}
        {gy.map((y) => (
          <span key={y} className="absolute left-0 h-px w-full bg-white/[0.11]" style={{ top: y }} />
        ))}
        {gx.flatMap((x) =>
          gy.map((y) => (
            <span
              key={x + y}
              className="absolute text-[15px] leading-none text-white/40"
              style={{ left: x, top: y, transform: "translate(-50%,-52%)", ...MONO }}
            >
              +
            </span>
          ))
        )}
      </div>

      <div data-introx className="wp-status pointer-events-none absolute right-[4.4vw] top-[5vh] z-[5] flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] text-white/75 max-md:hidden" style={MONO}>
        <span className="wp-pulse" />
        Open to AI &amp; ML roles
      </div>

      <div
        data-intro
        className="pointer-events-none absolute left-[5.4vw] right-[8vw] bottom-[17vh] z-[4] max-md:bottom-[20vh]"
      >
        <h2
          data-i
          ref={hlRef}
          aria-label="Things I have designed & built"
          className="wp-hl m-0 uppercase tracking-[-0.01em]"
          style={{ ...WIDE, fontSize: "clamp(2.2rem, 6vw, 8rem)", lineHeight: 0.96 }}
        >
          <span aria-hidden="true"><Split text="Things I have" /></span>
          <br />
          <span aria-hidden="true">
            <Split text="designed &" i0={13} />{" "}
            <span ref={builtRef} className="wp-built" style={{ color: "#8db4ff" }}><Split text="built" i0={22} /></span>
          </span>
        </h2>
        <p data-i ref={pRef} className="mt-6 max-w-[620px] text-pretty text-[clamp(14px,1.15vw,18px)] leading-[1.65] text-white/70" style={{ fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}>
          Every build starts with a question. The interesting part is everything that follows.<br /><br />Explore three projects through the problems they set out to solve, the decisions behind their design, and the outcomes they produced.
        </p>
        <div data-i className="mt-6 flex items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-white/60" style={MONO}>
          <span className="relative block h-px w-14 overflow-hidden bg-white/25">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-[#8db4ff]" style={{ animation: "wpScrollHint 1.8s ease-in-out infinite" }} />
          </span>
        </div>
      </div>
      <div
        data-mid
        className="pointer-events-none absolute inset-0 z-[4] grid place-items-center px-[6vw] text-center"
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <div>
          <div data-m className="mb-6 text-[12px] uppercase tracking-[0.26em] text-white/85" style={MONO}>
            ( Step inside )
          </div>
          <h2
            data-m
            className="m-0 uppercase tracking-[-0.01em]"
            style={{ ...WIDE, fontSize: "clamp(2.2rem, 6vw, 8rem)", lineHeight: 0.98, textShadow: "0 6px 40px rgba(10,30,90,.45)" }}
          >
            Step inside
            <br />
            the work
          </h2>
          <div data-m className="mt-8 flex items-baseline justify-center gap-4 text-white" style={MONO}>
            <span className="text-[clamp(28px,3.6vw,56px)] font-light tabular-nums" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
              <span data-count>00</span>%
            </span>
            <span className="text-[12px] uppercase tracking-[0.22em] text-white/80">Loading projects</span>
          </div>
        </div>
      </div>

      <style>{`
@keyframes wpScrollHint{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}
@keyframes wpShimmer{0%,100%{color:#8db4ff;text-shadow:none}42%{color:#e4eeff;text-shadow:0 0 28px rgba(141,180,255,.85)}}
@keyframes wpPulse{0%{box-shadow:0 0 0 0 rgba(120,255,170,.55)}70%,100%{box-shadow:0 0 0 9px rgba(120,255,170,0)}}
@keyframes wpFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.wp-w{display:inline-block;white-space:nowrap}
.wp-ch{display:inline-block;color:color-mix(in srgb,#8db4ff calc(var(--f,0) * 100%),#fff);will-change:transform}
/* the whole intro headline carries the blue: each letter drifts from white (start of the line) to periwinkle (end), a soft light wave runs through it, and hover still tints toward cyan */
.wp-hl .wp-ch{--c0:color-mix(in srgb,#8db4ff calc(var(--i) * 3.3%),#fff);color:color-mix(in srgb,#79e4ff calc(var(--f,0) * 100%),var(--c0));text-shadow:0 0 .55em rgba(110,150,255,calc(var(--i) * .011));animation:wpWaveHl 5.2s ease-in-out infinite;animation-delay:calc(var(--i) * .13s)}
@keyframes wpWaveHl{0%,100%{color:color-mix(in srgb,#79e4ff calc(var(--f,0) * 100%),var(--c0))}38%{color:color-mix(in srgb,#79e4ff calc(var(--f,0) * 100%),#e9f1ff);text-shadow:0 0 .5em rgba(141,180,255,.8)}}
.wp-built .wp-ch{animation:wpShimmer 4.2s ease-in-out infinite;animation-delay:calc(var(--i) * .17s)}
.wp-status{animation:wpFadeUp 1s .5s both;padding:.7em 1.1em;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.04);backdrop-filter:blur(8px)}
.wp-pulse{width:7px;height:7px;border-radius:50%;background:#78ffaa;animation:wpPulse 2s ease-out infinite}
.wp-aur{--mx:50%;--my:50%}
.wa{position:absolute;border-radius:50%;mix-blend-mode:screen;filter:blur(30px);will-change:transform}
.wa1{width:62vmax;aspect-ratio:1;left:-18vmax;top:-26vmax;background:radial-gradient(closest-side,rgba(80,120,255,.34),transparent 70%);animation:waD1 22s ease-in-out infinite alternate}
.wa2{width:56vmax;aspect-ratio:1;right:-20vmax;bottom:-28vmax;background:radial-gradient(closest-side,rgba(150,100,255,.30),transparent 70%);animation:waD2 27s ease-in-out infinite alternate}
.wa3{width:36vmax;aspect-ratio:1;left:38%;top:-10vmax;background:radial-gradient(closest-side,rgba(70,210,255,.20),transparent 70%);animation:waD3 18s ease-in-out infinite alternate}
.wa4{width:30vmax;aspect-ratio:1;left:-8vmax;bottom:-14vmax;background:radial-gradient(closest-side,rgba(110,150,255,.22),transparent 70%);animation:waD2 20s ease-in-out infinite alternate-reverse}
@keyframes waD1{to{transform:translate3d(18vmax,12vmax,0) scale(1.15)}}
@keyframes waD2{to{transform:translate3d(-20vmax,-10vmax,0) scale(1.12)}}
@keyframes waD3{from{transform:translate3d(-16vmax,0,0) scale(.9)}to{transform:translate3d(18vmax,10vmax,0) scale(1.2)}}
.wa-sheen{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;background:conic-gradient(from 0deg,transparent 0 78%,rgba(141,180,255,.10) 88%,transparent 96%);animation:waSpin 38s linear infinite}
@keyframes waSpin{to{transform:rotate(360deg)}}
.wa-ring{position:absolute;left:62%;top:44%;border-radius:50%;border:1px solid rgba(141,180,255,.16);translate:-50% -50%}
.wr1{width:46vmax;aspect-ratio:1;animation:waPulse 9s ease-in-out infinite}
.wr2{width:68vmax;aspect-ratio:1;border-color:rgba(160,130,255,.10);animation:waPulse 12s ease-in-out -4s infinite}
@keyframes waPulse{50%{transform:scale(1.07);opacity:.45}}
.wa-dust{position:absolute;inset:0}
.wa-dust b{position:absolute;left:var(--x);bottom:-6px;width:var(--s);height:var(--s);border-radius:50%;background:#cfe0ff;box-shadow:0 0 8px rgba(141,180,255,.9);opacity:0;animation:waRise var(--d) linear var(--dl) infinite}
@keyframes waRise{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:.7}85%{opacity:.35}100%{transform:translate3d(28px,-105vh,0);opacity:0}}
.wa-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.6) 100%)}
@media (max-width:768px){.wa{filter:none}.wa-sheen,.wa-ring,.wa4{display:none}.wa-dust b:nth-child(n+9){display:none}}
@media (prefers-reduced-motion:reduce){.wa,.wa-sheen,.wa-ring,.wa-dust b{animation:none}}
.wp-spot{--mx:50%;--my:50%;background:radial-gradient(560px circle at var(--mx) var(--my),rgba(141,180,255,.10),transparent 62%)}
.wp-spot::before{content:"";position:absolute;inset:0;
  background-image:linear-gradient(#b4cdff,#b4cdff),linear-gradient(#b4cdff,#b4cdff),linear-gradient(#b4cdff,#b4cdff),linear-gradient(#b4cdff,#b4cdff),linear-gradient(#b4cdff,#b4cdff),linear-gradient(#b4cdff,#b4cdff);
  background-size:1px 100%,1px 100%,1px 100%,1px 100%,100% 1px,100% 1px;
  background-position:3.85% 0,34.65% 0,65.4% 0,96.2% 0,0 34.5%,0 69%;background-repeat:no-repeat;opacity:.55;
  -webkit-mask-image:radial-gradient(320px circle at var(--mx) var(--my),#000,transparent 72%);mask-image:radial-gradient(320px circle at var(--mx) var(--my),#000,transparent 72%)}
.wp-spot-plus{position:absolute;inset:0;-webkit-mask-image:radial-gradient(260px circle at var(--mx) var(--my),#000,transparent 75%);mask-image:radial-gradient(260px circle at var(--mx) var(--my),#000,transparent 75%)}
.wp-ripple{position:absolute;z-index:5;width:460px;height:460px;margin:-230px 0 0 -230px;border-radius:50%;pointer-events:none;border:1.5px solid rgba(141,180,255,.9);box-shadow:0 0 44px rgba(141,180,255,.35),inset 0 0 44px rgba(141,180,255,.16)}
@media (prefers-reduced-motion:reduce){.wp-built .wp-ch,.wp-hl .wp-ch,.wp-pulse{animation:none}}
`}</style>

      <WarpProjects />

      {/* HUD */}
      {showNav && (
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-between px-[4.4vw] pt-6 text-[13px] uppercase"
          style={MONO}
        >
          <span style={{ ...WIDE, fontStretch: "125%", fontSize: 15 }}>{brand}</span>
          <span className="flex gap-10 text-white/90">
            <span>Work</span>
            <span>Contact</span>
            <span>Theme[A]</span>
            <span>Sound[/]</span>
          </span>
        </div>
      )}
      <div
        className="wp-hud pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 items-center px-[4.4vw] pb-7 text-[13px] uppercase tracking-wide text-white/90"
        style={MONO}
      >
        <span ref={clockRef} />
        <span ref={coordRef} className="text-center">
          0000 X 0000 Y
        </span>
        <svg viewBox="0 0 60 30" className="ml-auto h-[26px] w-[54px]" fill="none" stroke="currentColor" strokeWidth="1.4">
          <ellipse cx="30" cy="15" rx="28" ry="13" />
          <ellipse cx="30" cy="15" rx="12" ry="13" />
          <path d="M2 15h56M30 2v26" />
        </svg>
      </div>

      <button
        type="button"
        onClick={() => {
          const m = !muted;
          setMuted(m);
          try {
            localStorage.setItem("warp-sound", m ? "off" : "on");
          } catch {
            /* private mode */
          }
          if (!m) snd.unlock();
        }}
        aria-pressed={!muted}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        className="wp-sound absolute bottom-[68px] left-[4.4vw] z-[6] cursor-pointer bg-transparent text-[12px] uppercase tracking-[0.18em] text-white/80 transition-opacity hover:text-white"
        style={MONO}
      >
      </button>

      {/* the lime square that chases the pointer */}
      <span
        ref={limeRef}
        className="pointer-events-none absolute left-0 top-0 h-[22px] w-[22px]"
        style={{ background: "var(--color-lime, #d7ff3b)", willChange: "transform", transition: "scale .3s cubic-bezier(.2,.8,.2,1)" }}
        aria-hidden="true"
      />
    </section>
    </div>
  );
}

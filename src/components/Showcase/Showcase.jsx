import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import "./showcase.css";
import { capDpr } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Scroll-pinned showcase:
  1. A paragraph with 5 inline "slots" (thumbnails sit on them).
  2. Scrolling: the paragraph drifts up + fades, the thumbnails detach, tumble down and
     settle into the 5 clips of the timeline panel that rises from the bottom.
  Edit the copy / images in content.js -> showcase.
*/

// per-item flight: start delay (0-1 of the scroll), sideways drift (fraction of vw), drop, tilt, mid-flight scale
const FLIGHT = [
  { delay: 0.2, ox: -0.07, oy: 0.03, rot: -16, bump: 1.3 },
  { delay: 0.09, ox: 0.035, oy: 0.07, rot: 9, bump: 1.22 },
  { delay: 0.02, ox: -0.045, oy: 0.05, rot: -9, bump: 1.28 },
  { delay: 0.13, ox: 0.06, oy: 0.04, rot: 12, bump: 1.18 },
  { delay: 0.06, ox: 0.02, oy: 0.06, rot: -7, bump: 1.24 },
];
const FLIGHT_DUR = 0.64;

const TICKS = Array.from({ length: 40 }, (_, i) => i);
const LABELS = [
  ["0s", 0],
  ["1s", 1],
  ["2s", 2],
  ["4s", 4],
  ["5s", 5],
  ["6s", 6],
  ["7s", 7],
];

// layout offset of el inside `root` (ignores transforms, so safe to call mid-animation)
const offsetIn = (el, root) => {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return { x, y };
};

export default function Showcase() {
  const root = useRef(null);
  const bg = useRef(null);
  const flow = useRef(null);
  const para = useRef(null);
  const layer = useRef(null);
  const box = useRef(null);
  const slots = useRef([]);
  const cells = useRef([]);
  const items = useRef([]);
  const inners = useRef([]);
  const { showcase } = content;

  useLayoutEffect(() => {
    let ctx;
    let lastW = window.innerWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      ctx = gsap.context(() => {
        const H = root.current.clientHeight;
        const W = root.current.clientWidth;
        const sr = root.current.getBoundingClientRect();
        const L = H * 0.3; // how far the paragraph + item layer drift up

        const cellEls = cells.current;
        const cw = cellEls[0].offsetWidth;

        // final (cell) + start (slot) geometry, in root coordinates
        const geo = items.current.map((_, i) => {
          const c = offsetIn(cellEls[i], root.current);
          const s = slots.current[i].getBoundingClientRect();
          return {
            ex: c.x,
            ey: c.y,
            sx: s.left - sr.left + s.width / 2 - cw / 2,
            sy: s.top - sr.top + s.height / 2 - cw / 2,
            ss: s.width / cw,
          };
        });

        items.current.forEach((el) => gsap.set(el, { width: cw, height: cw }));

        const b = offsetIn(box.current, root.current);
        const boxY0 = H - b.y + 90;

        const tl = gsap.timeline({
          defaults: { overwrite: false },
          scrollTrigger: reduce
            ? undefined
            : {
                trigger: root.current,
                start: "top top",
                end: () => "+=" + H * 2.8,
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
              },
        });

        // paragraph + the item layer drift up together so thumbnails stay glued to their slots until they detach
        tl.fromTo([para.current, layer.current], { y: 0 }, { y: -L, ease: "power2.inOut", duration: 0.8 }, 0.04);
        tl.fromTo(para.current, { opacity: 1 }, { opacity: 0, ease: "power1.in", duration: 0.38 }, 0.2);

        // timeline panel rises from below
        tl.fromTo(box.current, { y: boxY0 }, { y: 0, ease: "power2.inOut", duration: 0.82 }, 0.08);

        items.current.forEach((el, i) => {
          const g = geo[i];
          const f = FLIGHT[i % FLIGHT.length];
          // main path: slot -> clip (layer is shifted by -L at the end, so compensate)
          tl.fromTo(
            el,
            { x: g.sx, y: g.sy, scale: g.ss },
            { x: g.ex, y: g.ey + L, scale: 1, ease: "power2.inOut", duration: FLIGHT_DUR },
            f.delay
          );
          // flourish: drift + tilt + grow mid-flight, then settle back to 0 exactly on the clip
          tl.to(
            inners.current[i],
            {
              keyframes: [
                { x: f.ox * W, y: f.oy * H, rotation: f.rot, scale: f.bump, duration: FLIGHT_DUR * 0.5, ease: "sine.out" },
                { x: 0, y: 0, rotation: 0, scale: 1, duration: FLIGHT_DUR * 0.5, ease: "sine.inOut" },
              ],
            },
            f.delay
          );
        });

        // make the whole thing exactly 1 long so scrub maps 0..1 to the pinned distance
        tl.set({}, {}, 1);
        if (reduce) tl.progress(1);
      }, root);
    };

    build();

    // web fonts shift the paragraph, so re-measure the slots once they're loaded
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      ctx.revert();
      build();
      ScrollTrigger.refresh();
    });

    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (window.innerWidth === lastW) return; // ignore mobile URL-bar height jitter
        lastW = window.innerWidth;
        ctx.revert();
        build();
        ScrollTrigger.refresh();
      }, 220);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, []);

  const parts = showcase.parts;
  let slotIdx = -1;

  // generative flow-field "ink" drawn live behind the text; the pointer bends and swirls it
  useEffect(() => {
    const cv = flow.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, running = false, t = 0, last = 0;
    const m = { x: -999, y: -999, vx: 0, vy: 0 };
    const N = window.innerWidth < 700 ? 420 : 900;
    const P = Array.from({ length: N }, () => ({ x: 0, y: 0, px: 0, py: 0, life: 0, sp: 0, c: 0 }));
    const size = () => {
      const dpr = capDpr(1.5, 1.25);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      P.forEach((p) => spawn(p, true));
    };
    const spawn = (p, any) => {
      p.x = p.px = Math.random() * W; p.y = p.py = Math.random() * H;
      p.life = 80 + Math.random() * 220; p.sp = 0.7 + Math.random() * 1.4; p.c = Math.random() < 0.13 ? 1 : 0;
    };
    // cheap smooth "noise": layered sines give a calm, organic flow
    const ang = (x, y) => {
      const k = 0.0032;
      return (Math.sin(x * k * 1.3 + t) + Math.cos(y * k * 1.7 - t * 0.8) + Math.sin((x + y) * k * 0.9 + t * 0.5) * 0.8 + Math.cos((x - y) * k * 1.4 - t * 0.6) * 0.6) * 1.15;
    };
    const step = () => {
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      for (const c of [0, 1]) {
        ctx.beginPath();
        ctx.strokeStyle = c ? "rgba(47,95,224,0.55)" : "rgba(17,17,17,0.32)";
        ctx.lineWidth = c ? 1.2 : 0.9;
        for (let i = 0; i < N; i++) {
          const p = P[i];
          if (p.c !== c) continue;
          let a = ang(p.x, p.y);
          const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
          if (d2 < 52000) {                      // swirl around the pointer and get pushed by its motion
            const f = 1 - d2 / 52000;
            a += f * f * 4.2 * (dx > 0 ? 1 : -1) + Math.atan2(dy, dx) * f * 0.6;
            p.x += m.vx * f * 0.06; p.y += m.vy * f * 0.06;
          }
          p.px = p.x; p.py = p.y;
          p.x += Math.cos(a) * p.sp; p.y += Math.sin(a) * p.sp;
          ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y);
          if (--p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) spawn(p);
        }
        ctx.stroke();
      }
      m.vx *= 0.9; m.vy *= 0.9;
    };
    const loop = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(now - last, 50); last = now;
      t += dt * 0.00022;
      step();
    };
    const start = () => { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      m.vx = x - m.x; m.vy = y - m.y; if (m.x < -900) { m.vx = m.vy = 0; }
      m.x = x; m.y = y;
    };
    size();
    if (reduce) { for (let i = 0; i < 260; i++) { t += 0.002; step(); } }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.05 });
    io.observe(cv);
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { stop(); io.disconnect(); window.removeEventListener("resize", size); window.removeEventListener("pointermove", onMove); };
  }, []);

  // soft light on the paper that follows the pointer
  useEffect(() => {
    const spot = bg.current?.querySelector(".sc-spot");
    if (!spot) return;
    const pos = { x: 50, y: 50 };
    const set = () => { spot.style.setProperty("--mx", pos.x + "%"); spot.style.setProperty("--my", pos.y + "%"); };
    const mx = gsap.quickTo(pos, "x", { duration: 0.9, ease: "power3.out", onUpdate: set });
    const my = gsap.quickTo(pos, "y", { duration: 0.9, ease: "power3.out", onUpdate: set });
    const on = (e) => { mx((e.clientX / window.innerWidth) * 100); my((e.clientY / window.innerHeight) * 100); };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  return (
    <section ref={root} className="relative h-screen min-h-[560px] w-full overflow-hidden bg-[#f3f0e8] text-[#111]">
      <div className="sc-bg" ref={bg} aria-hidden="true">
        <i className="sc-lines" />
        <i className="sc-grain" />
        <i className="sc-spot" />
        <div className="sc-melt"><canvas ref={flow} className="sc-flow" /></div>
        <i className="sc-cross" style={{ left: "12.5vw", top: "8vh" }} />
        <i className="sc-cross" style={{ right: "12.5vw", bottom: "8vh" }} />
        <span className="sc-tag" style={{ left: "3vw", bottom: "4vh" }}>(02) — Showcase</span>
        <span className="sc-tag" style={{ right: "3vw", top: "4vh" }}>Scroll ↓</span>
      </div>
      {/* ---------------- paragraph ---------------- */}
      <div ref={para} className="absolute inset-0 flex items-center justify-center px-[6vw]">
        <p className="indent-0 text-center font-display text-[7.4vw] font-normal leading-[1.02] tracking-[-0.045em] md:max-w-[78vw] md:text-[4.4vw] md:leading-[0.98]">
          {parts.map((p, i) =>
            p === null ? (
              <span
                key={i}
                ref={(el) => (slots.current[++slotIdx] = el)}
                aria-hidden="true"
                className="mx-[0.09em] inline-block h-[1.05em] w-[1.05em] align-middle"
                style={{ marginTop: "-0.12em" }}
              />
            ) : (
              <span key={i}>{p} </span>
            )
          )}
        </p>
      </div>

      {/* ---------------- timeline panel ---------------- */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          ref={box}
          className="w-[91vw] max-w-[1820px] bg-[#141414] will-change-transform [container-type:inline-size]"
          style={{ boxShadow: "0 70px 120px -50px rgba(0,0,0,0.38), 0 20px 50px -30px rgba(0,0,0,0.3)", borderRadius: "calc(91vw * 0.033)" }}
        >
          <div style={{ padding: "1.75cqw" }}>
            {/* controls */}
            <div className="flex items-center text-[#9a9a9a]" style={{ gap: "1.6cqw", height: "3.2cqw" }}>
              <span className="flex items-center justify-center rounded-[0.9cqw] bg-[#2a2a2a] text-white" style={{ width: "3.2cqw", height: "3.2cqw" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1.2cqw", height: "1.2cqw" }}>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              </span>
              <span className="font-display tabular-nums" style={{ fontSize: "1.15cqw" }}>
                <span className="text-[#e8e8e8]">00:01.25</span> / 00:12
              </span>
              <span className="bg-[#2f2f2f]" style={{ width: "0.08cqw", height: "2cqw" }} />
              <span className="flex items-center font-display" style={{ gap: "0.6cqw", fontSize: "1.1cqw" }}>
                Dur
                <span className="rounded-[0.7cqw] bg-[#2a2a2a] text-[#e8e8e8]" style={{ padding: "0.7cqw 0.8cqw" }}>5s</span>
                sec
              </span>
            </div>

            {/* ruler */}
            <div className="relative" style={{ height: "2.6cqw", marginTop: "1.2cqw" }}>
              <div className="absolute rounded-[0.45cqw] bg-[#3a3a3a]" style={{ left: "10.3cqw", width: "37cqw", top: "0.1cqw", height: "2.1cqw" }}>
                <span className="absolute bg-white" style={{ left: 0, top: "0.15cqw", bottom: "0.15cqw", width: "0.1cqw" }} />
                <span className="absolute bg-white" style={{ right: 0, top: "0.15cqw", bottom: "0.15cqw", width: "0.1cqw" }} />
              </div>
              {TICKS.map((t) => (
                <span key={t} className="absolute bg-[#4a4a4a]" style={{ left: `${5.3 + t * 2.47}cqw`, top: "0.9cqw", width: "0.07cqw", height: "0.6cqw" }} />
              ))}
              {LABELS.map(([l, n]) => (
                <span
                  key={l}
                  className="absolute font-display text-[#bdbdbd]"
                  style={{ left: `${3.6 + n * 16}cqw`, top: "0.35cqw", fontSize: "0.95cqw", transform: "translateX(-50%)" }}
                >
                  {l}
                </span>
              ))}
            </div>

            {/* clip cells (the thumbnails land here) */}
            <div className="grid grid-cols-5" style={{ gap: "1.4cqw", marginTop: "1.2cqw" }}>
              {showcase.images.map((_, i) => (
                <div key={i} ref={(el) => (cells.current[i] = el)} className="aspect-square bg-[#1d1d1d]" style={{ borderRadius: "29%" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- flying thumbnails ---------------- */}
      <div ref={layer} className="pointer-events-none absolute inset-0 will-change-transform" aria-hidden="true">
        {showcase.images.map((src, i) => (
          <div key={i} ref={(el) => (items.current[i] = el)} className="absolute left-0 top-0 will-change-transform">
            <div ref={(el) => (inners.current[i] = el)} className="h-full w-full will-change-transform">
              <img decoding="async" src={src} alt="" draggable="false" className="block h-full w-full object-cover" style={{ borderRadius: "29%" }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

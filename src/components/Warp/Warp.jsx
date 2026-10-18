import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as snd from "./warpSound.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createWarpEngine } from "./warpEngine.js";
import WarpProjects from "./WarpProjects.jsx";

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

const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, "0");

function initialState() {
  return {
    cs: 1, // cursor scale
    cr: 0, // cursor rotation (deg)
    cx: 0.27, // cursor offset, fraction of width (starts parked on the right, beside the intro text)
    cy: -0.03, // cursor offset, fraction of height
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
  scrollLength = 11,
  brand = "PORTFOLIO",
  showNav = false,
  place = "IN",
  temp = "24°C",
}) {
  const wrap = useRef(null);
  const root = useRef(null);
  const canvas = useRef(null);
  const limeRef = useRef(null);
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
    let active = true;

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas.current);
    engine.resize();

    /* pointer → engine + lime square + coordinates */
    const lime = { x: 0, y: 0, tx: 0, ty: 0 };
    const rect = () => el.getBoundingClientRect();
    const r0 = rect();
    lime.x = lime.tx = S.px = r0.width / 2;
    lime.y = lime.ty = S.py = r0.height / 2;

    const onMove = (e) => {
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
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
    window.addEventListener("pointermove", onMove, { passive: true });

    /* one ticker drives everything */
    const flag = { on: false }; // true while the section is sliding in (cheap: half frame rate)
    let fr = 0;
    const tick = (time, deltaMs) => {
      if (!active) return;
      lime.x += (lime.tx - lime.x) * 0.22;
      lime.y += (lime.ty - lime.y) * 0.22;
      if (limeRef.current) {
        limeRef.current.style.transform = `translate3d(${lime.x - 11}px, ${lime.y - 11}px, 0)`;
      }
      if (flag.on && fr++ % 2) return;
      engine.render(deltaMs / 1000, time);
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
        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + window.innerHeight * scrollLength,
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
        });
        const to = (vars, at, dur) => tl.to(S, { ...vars, duration: dur }, at);

        /* ---- ENTRY: as this section slides in under the white screen, a dark disc blooms out of the seam with a glowing rim,
           a hyperspace burst tears past, and the intro caption slams in. Scrubbed with the scroll. ---- */
        const rim = q("[data-rim]")[0];
        const b1 = q("[data-burst1]")[0];
        const b2 = q("[data-burst2]")[0];
        const R = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.06;
        const enter = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: wrap.current, start: "top bottom", end: "top top", scrub: 0.5, invalidateOnRefresh: true, onUpdate: (self) => (flag.on = self.progress > 0 && self.progress < 1), onLeave: () => (flag.on = false), onLeaveBack: () => (flag.on = false) },
        });
        enter.fromTo(el, { clipPath: () => "circle(0px at 50% 0px)" }, { clipPath: () => `circle(${R()}px at 50% 0px)`, ease: "power2.in", duration: 1 }, 0);
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
        enter.fromTo(q("[data-i]"), { y: 110, autoAlpha: 0, scale: 1.12 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.07, duration: 0.3, ease: "power3.out" }, 0.62);

        /* 1-4 · the cursor swells, tilts, swallows the screen, then the streaks take over */
        to({ cs: 3.4, cr: 16, tilt: 1, cx: 0.17, cy: -0.02, density: 0.2, ease: "power1.inOut" }, 0, 1.6);
        to({ cs: 9, cr: 44, cx: 0.05, cy: -0.03, inside: 1, density: 0.4, tilt: 0.4, ease: "power1.inOut" }, 1.5, 1.5);
        to({ cs: 36, cr: 68, cx: 0, cy: 0, density: 0.6, cMix: 1, tilt: 0, ease: "power2.in" }, 2.9, 1.3);
        to({ cAlpha: 0, inside: 0, outside: 1, bg: 1, density: 0.75, hue: 0.4 }, 4.1, 1.0);

        /* intro caption leaves as the blue floods the screen */
        const intro = q("[data-intro]")[0];
        if (intro) tl.to(intro, { autoAlpha: 0, y: -46, filter: "blur(10px)", duration: 1.15, ease: "power2.inOut" }, 0.55);

        /* mid caption: lives on the blue while the cursor swallows the screen, with a counting percentage */
        const mid = q("[data-mid]")[0];
        const ms = q("[data-m]");
        const cnt = q("[data-count]")[0];
        if (mid) {
          const nf0 = { immediateRender: false };
          // pin the resting (hidden) state up front so nothing can flash before its cue, whatever the scroll jumps do
          gsap.set(mid, { autoAlpha: 1 });
          gsap.set(ms, { y: 38, autoAlpha: 0, scale: 0.96, filter: "blur(14px)" });
          tl.to(ms, { y: 0, autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.4, stagger: 0.18, ease: "power2.out" }, 2.0);
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
          tl.fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "none", ...nf }, T);
          tl.fromTo(ts, { y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08, ease: "power3.out", ...nf }, T + 0.1);
          tl.fromTo(st, { x: dir * 140, scale: 0.94 }, { x: 0, scale: 1, duration: 1.1, ease: "power3.out", ...nf }, T);
          tl.fromTo(gh, { y: 140, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: "power3.out", ...nf }, T);
          tl.fromTo(s, { "--p": 0 }, { "--p": 1, duration: 1.4, ease: "power2.out", ...nf }, T + 0.1);
          if (dots[i]) {
            tl.fromTo(dots[i], { "--on": 0 }, { "--on": 1, duration: 0.5, ease: "none", ...nf }, T + 0.1);
          }
          if (!last) {
            if (dots[i]) tl.to(dots[i], { "--on": 0, duration: 0.5, ease: "none" }, T + 2.7);
            tl.to(ts, { y: -34, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: "power2.in" }, T + 2.55);
            tl.to(st, { x: -dir * 120, scale: 0.95, duration: 0.7, ease: "power2.in" }, T + 2.55);
            tl.to(gh, { y: -100, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, T + 2.6);
            tl.to(s, { autoAlpha: 0, duration: 0.45, ease: "none" }, T + 2.85);
          }
        });
        tl.to({}, { duration: 0.6 }, END);
        return () => tl.scrollTrigger && tl.scrollTrigger.kill();
      });

      /* reduced motion: no pin, just the resting frame */
      mm.add("(prefers-reduced-motion: reduce)", () => {
        Object.assign(S, { cs: 1.15, cy: 0.1, dots: 1, density: 0.1, follow: 0 });
      });
    }, el);

    return () => {
      active = false;
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      ctx.revert();
    };
  }, [scrollLength]);

  const gx = ["3.85%", "34.65%", "65.4%", "96.2%"];
  const gy = ["34.5%", "69%"];

  return (
    <div ref={wrap} className="relative w-full" style={{ background: "linear-gradient(180deg, #e8ecf8 0%, #f5f4ef 100%)" }}>
    <section
      ref={root}
      className="relative h-screen w-full select-none overflow-hidden text-white"
      style={{ background: "#101211", cursor: "none" }}
      aria-label="Selected projects"
    >
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />

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

      <div
        data-intro
        className="pointer-events-none absolute left-[5.4vw] right-[8vw] bottom-[17vh] z-[4] max-md:bottom-[20vh]"
      >
        <div data-i className="mb-5 flex items-center gap-3 text-[12px] uppercase tracking-[0.18em] text-white/70" style={MONO}>
          <span className="h-[7px] w-[7px] rounded-full bg-[#8db4ff]" style={{ boxShadow: "0 0 0 4px rgba(141,180,255,.22)" }} />
          Portfolio / Selected work (03)
        </div>
        <h2
          data-i
          className="m-0 uppercase tracking-[-0.01em]"
          style={{ ...WIDE, fontSize: "clamp(2.2rem, 6vw, 8rem)", lineHeight: 0.96 }}
        >
          Things I have
          <br />
          designed &amp; <span style={{ color: "#8db4ff" }}>built</span>
        </h2>
        <p data-i className="mt-6 max-w-[520px] text-[clamp(14px,1.15vw,18px)] leading-[1.65] text-white/70" style={{ fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif" }}>
          Three projects across education, mobile and machine learning, each taken from idea to a shipped product. Scroll to walk through them.
        </p>
        <div data-i className="mt-7 flex items-center gap-3 text-[12px] uppercase tracking-[0.2em] text-white/60" style={MONO}>
          <span className="relative block h-px w-14 overflow-hidden bg-white/25">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-[#8db4ff]" style={{ animation: "wpScrollHint 1.8s ease-in-out infinite" }} />
          </span>
          Scroll
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
            style={{ ...WIDE, fontSize: "clamp(2.2rem, 6.4vw, 8.5rem)", lineHeight: 0.98, textShadow: "0 6px 40px rgba(10,30,90,.45)" }}
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

      <style>{`@keyframes wpScrollHint{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>

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
        className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 items-center px-[4.4vw] pb-7 text-[13px] uppercase tracking-wide text-white/90"
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
        className="absolute bottom-[68px] left-[4.4vw] z-[6] cursor-pointer bg-transparent text-[12px] uppercase tracking-[0.18em] text-white/80 transition-opacity hover:text-white"
        style={MONO}
      >
        Sound [{muted ? "off" : locked ? "click anywhere" : "on"}]
      </button>

      {/* the lime square that chases the pointer */}
      <span
        ref={limeRef}
        className="pointer-events-none absolute left-0 top-0 h-[22px] w-[22px]"
        style={{ background: "var(--color-lime, #d7ff3b)", willChange: "transform" }}
        aria-hidden="true"
      />
    </section>
    </div>
  );
}

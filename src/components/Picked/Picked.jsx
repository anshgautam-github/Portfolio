import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import "./picked.css";
import { capDpr, skipFrame, IS_MOBILE } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Pinned "A few things I've picked up" sequence (scroll-scrubbed):
   1. heading fades from faint to fully visible while the wide cover panel settles
   2. the panel breaks into three pieces
   3. the pieces turn over one after another and open into three upright info cards
  Copy lives in content.js -> picked. Set picked.cover to your own wide image to replace the built-in artwork.
*/

const PER = 0.45; // pinned scroll distance per timeline unit, in viewport heights
const T = 8.6; // timeline length

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CODE_L = [
  "layout.measure(node, {",
  "  width: viewport.w,",
  "  gap: tokens.space[3],",
  "})",
  "",
  "function settle(card, t) {",
  "  const k = ease(t, 0.82)",
  "  return card.pos.lerp(k)",
  "}",
  "",
  "const frames = timeline.map(",
  "  (s, i) => build(s, i * 0.4)",
  ")",
  "if (frames.length > 3) split()",
  "",
  "export default function Scene()",
];
const CODE_R = [
  "SCENE: [████░░░░░░░░]",
  "       [███░░░░░░░░░]",
  "",
  "// compose the layers",
  "  base = 0.85",
  "  mix  = 1 + (depth ** 2 / 10000)",
  "  return base * (1 - exp(-mix))",
  "",
  "load[+++ | | ---] warming up ...",
  "LAYERS = ['sky', 'hills', 'type']",
  "",
  "@cache",
  "def compose(layers, opts):",
  "    out = []",
  "    for l in layers: draw(l)",
  "        out.append(l.render())",
];

function Cover({ index, src }) {
  return (
    <div
      className="absolute top-0 bg-black"
      style={{ left: `calc(var(--c) * ${-index})`, width: "calc(var(--c) * 3)", height: "calc(var(--c) * 1.41)" }}
    >
      {src ? (
        <img decoding="async" src={src} alt="" draggable="false" className="h-full w-full select-none object-cover" />
      ) : (
        <>
          <pre
            className="absolute left-[-1%] top-[-1%] m-0 font-mono leading-[1.45] text-white/35"
            style={{ fontSize: "calc(var(--c) * 0.058)" }}
          >
            {CODE_L.join("\n")}
          </pre>
          <pre
            className="absolute right-[-1%] top-[-1%] m-0 font-mono leading-[1.45] text-white/35"
            style={{ fontSize: "calc(var(--c) * 0.058)" }}
          >
            {CODE_R.join("\n")}
          </pre>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 141" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M92 141 C96 116, 124 110, 150 110 S204 116, 208 141 Z" fill="#fff" />
            <path d="M126 141 C130 126, 140 120, 150 120 S170 126, 174 141 Z" fill="#000" />
            <circle cx="150" cy="76" r="47" fill="#fff" />
            <g fill="none" stroke="#000" strokeWidth="1.3" strokeLinecap="round">
              <path d="M118 62 C134 46, 166 46, 184 64" />
              <path d="M122 78 C136 70, 150 70, 160 76" />
              <path d="M146 86 C150 92, 158 92, 164 88" />
              <path d="M112 90 C124 104, 144 112, 160 108" />
            </g>
            <circle cx="136" cy="78" r="3" fill="#000" />
            <circle cx="166" cy="76" r="3" fill="#000" />
          </svg>
        </>
      )}
    </div>
  );
}

function Face({ d }) {
  const pad = "calc(var(--c) * 0.075)";
  return (
    <div className="relative flex h-full w-full flex-col text-[#151515]" style={{ padding: pad }}>
      <div className="font-display font-medium tracking-[0.04em] text-black/55" style={{ fontSize: "calc(var(--c) * 0.04)" }}>
        {d.no}
      </div>
      <h3
        className="whitespace-pre-line font-display font-bold uppercase"
        style={{ fontSize: "calc(var(--c) * 0.082)", lineHeight: 1.02, letterSpacing: "-0.02em", marginTop: "calc(var(--c) * 0.06)" }}
      >
        {d.title}
      </h3>

      {d.entries && (
        <div style={{ marginTop: "calc(var(--c) * 0.045)" }}>
          {d.entries.map((e, i) => (
            <div key={e.n} style={{ paddingTop: i ? "calc(var(--c) * 0.05)" : 0, marginTop: i ? "calc(var(--c) * 0.05)" : 0, borderTop: i ? "1px solid rgba(0,0,0,0.18)" : 0 }}>
              <div className="font-display text-black/50" style={{ fontSize: "calc(var(--c) * 0.034)" }}>{e.n}</div>
              <div className="font-display font-bold uppercase leading-[1.05]" style={{ fontSize: "calc(var(--c) * 0.05)", letterSpacing: "-0.01em" }}>{e.role}</div>
              <div className="font-display text-black/55" style={{ fontSize: "calc(var(--c) * 0.034)", marginTop: "calc(var(--c) * 0.012)" }}>{e.meta}</div>
              <p className="font-display leading-[1.35] text-black/70" style={{ fontSize: "calc(var(--c) * 0.037)", marginTop: "calc(var(--c) * 0.03)" }}>{e.text}</p>
            </div>
          ))}
        </div>
      )}

      {d.lines && (
        <div style={{ marginTop: "calc(var(--c) * 0.2)" }}>
          {d.lines.map((l) => (
            <p key={l.t} className={`font-display leading-[1.25] ${l.strong ? "font-medium text-black/80" : "text-black/55"}`} style={{ fontSize: "calc(var(--c) * 0.047)", marginTop: "calc(var(--c) * 0.012)" }}>
              {l.t}
            </p>
          ))}
        </div>
      )}

      {d.big && (
        <div className="mt-auto">
          <div className="font-display tracking-[0.12em] text-black/55" style={{ fontSize: "calc(var(--c) * 0.04)" }}>{d.big.label}</div>
          <div className="flex items-baseline font-display font-bold" style={{ gap: "calc(var(--c) * 0.02)" }}>
            <span style={{ fontSize: "calc(var(--c) * 0.2)", letterSpacing: "-0.05em", lineHeight: 0.95 }}>{d.big.value}</span>
            <span className="font-medium text-black/55" style={{ fontSize: "calc(var(--c) * 0.07)" }}>{d.big.suffix}</span>
          </div>
        </div>
      )}

      {d.list && (
        <div className="mt-auto">
          {d.list.map((t) => (
            <div key={t} className="font-display text-black/80" style={{ fontSize: "calc(var(--c) * 0.043)", lineHeight: 1.2, padding: "calc(var(--c) * 0.026) 0", borderBottom: "1px solid rgba(0,0,0,0.2)" }}>
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Picked() {
  const root = useRef(null);
  const deck = useRef(null);
  const head = useRef(null);
  const cards = useRef([]);
  const dots = useRef(null);
  const { title, cover, cards: data } = content.picked;

  useLayoutEffect(() => {
    let ctx;
    let lastW = window.innerWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      ctx = gsap.context(() => {
        const W = root.current.clientWidth;
        const H = root.current.clientHeight;
        const els = cards.current;
        const c = els[0].offsetWidth;
        const R = c * 0.075;
        const rr = R + "px";
        // per-card corner radii while the cards still form one wide panel (tl tr br bl)
        const joined = [
          `${rr} 0px 0px ${rr}`,
          "0px 0px 0px 0px",
          `0px ${rr} ${rr} 0px`,
        ];
        const full = `${rr} ${rr} ${rr} ${rr}`;
        const sp = Math.min(1.05 * c, (W * 0.9 - c) / 2); // final spacing (cards sit side by side, upright)
        const gap = Math.min(1.04 * c, (W * 0.94 - c) / 2); // spacing once the panel has broken apart
        const rot = [0, 0, 0];             // cards open straight, not tilted
        const yEnd = [0, 0, 0];

        els.forEach((el, i) => {
          const back = el.querySelector("[data-back]");
          gsap.set(el, { xPercent: -50, yPercent: -50, x: (i - 1) * (c - 0.6), y: 0, rotation: 0, rotationY: 0, transformPerspective: 1700, transformOrigin: "50% 50%" });
          gsap.set(back, { borderRadius: joined[i] });
        });

        const tl = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          scrollTrigger: reduce
            ? undefined
            : {
                trigger: root.current,
                start: "top top",
                end: () => "+=" + T * H * PER,
                pin: true,
                scrub: 0.4,
                anticipatePin: 1,
              },
        });

        // 1 · heading clears up, panel settles
        tl.fromTo(head.current, { opacity: 0.08, y: 26, ...(IS_MOBILE ? {} : { filter: "blur(8px)" }) }, { opacity: 1, y: 0, ...(IS_MOBILE ? {} : { filter: "blur(0px)" }), ease: "power2.out", duration: 1.5 }, 0.1);
        tl.fromTo(deck.current, { y: H * 0.08, scale: 1.04 }, { y: 0, scale: 1, ease: "power3.out", duration: 1.5 }, 0);
        tl.set(head.current, { clearProps: "filter" }, 1.7);

        // 2 · the panel breaks into three pieces
        els.forEach((el, i) => {
          const back = el.querySelector("[data-back]");
          tl.to(el, { x: (i - 1) * gap, duration: 1.0, ease: "power3.inOut" }, 2.4);
          tl.to(back, { borderRadius: full, duration: 0.7, ease: "power2.out" }, 2.4);
        });

        // 3 · the pieces turn over one after another and settle into a fan
        const delay = [0, 0.35, 0.7];
        els.forEach((el, i) => {
          const at = 3.8 + delay[i];
          tl.to(el, { rotationY: 180, duration: 2.0, ease: "power2.inOut" }, at);
          tl.to(el, { rotation: rot[i], y: yEnd[i], x: (i - 1) * sp, duration: 2.0, ease: "power2.inOut" }, at);
        });

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

    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      ctx.revert();
      build();
      ScrollTrigger.refresh();
    });

    return () => {
      alive = false;
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, []);

  // living dot-matrix on the paper: a slow wave rolls through it, the pointer pushes and lights dots, clicks send a ripple
  useEffect(() => {
    const cv = dots.current;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, cols = 0, rows = 0, raf = 0, running = false, last = 0, t = 0;
    const GAP = window.innerWidth < 700 ? 22 : 30;
    const m = { x: -999, y: -999 };
    const ripples = [];
    const size = () => {
      const dpr = capDpr(1.5, 1.25);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / GAP) + 2; rows = Math.ceil(H / GAP) + 2;
      if (!running) draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ox = (W - (cols - 1) * GAP) / 2, oy = (H - (rows - 1) * GAP) / 2;
      const cx = W / 2, cy = H * 0.57;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        ctx.fillStyle = pass ? "#2f5fe0" : "rgba(17,17,17,0.42)";
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            let x = ox + i * GAP, y = oy + j * GAP;
            // two slow travelling waves
            const w = Math.sin(i * 0.33 + j * 0.21 - t * 1.1) * 0.5 + Math.sin(i * 0.12 - j * 0.3 + t * 0.7) * 0.5;
            let a = 0.5 + 0.5 * w;                       // 0..1
            let r = 0.9 + a * 1.5;
            let hot = 0;
            const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
            if (d < 190) { const f = 1 - d / 190; r += f * f * 3.4; hot = Math.max(hot, f); x += (dx / (d || 1)) * f * f * 9; y += (dy / (d || 1)) * f * f * 9; }
            for (const rp of ripples) {
              const rd = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rp.r);
              if (rd < 46) { const f = (1 - rd / 46) * rp.a; r += f * 3.2; hot = Math.max(hot, f); }
            }
            // keep the middle (where the cards live) quieter
            const q = Math.min(1, Math.hypot((x - cx) / (W * 0.34), (y - cy) / (H * 0.34)));
            r *= 0.55 + 0.45 * q;
            const isHot = hot > 0.18;
            if ((pass === 1) !== isHot) continue;
            ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.283);
          }
        }
        ctx.fill();
      }
    };
    const loop = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (skipFrame(now, last)) return;
      const dt = Math.min(now - last, 50) / 1000; last = now;
      t += dt;
      for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.r += dt * 520; r.a -= dt * 0.55; if (r.a <= 0) ripples.splice(i, 1); }
      draw();
    };
    const start = () => { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const onMove = (e) => { const r = cv.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; };
    const onDown = (e) => { const r = cv.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, a: 1 }); };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.02 });
    io.observe(cv);
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    size();
    return () => { stop(); io.disconnect(); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); };
  }, []);

  return (
    <section
      ref={root}
      className="relative h-screen min-h-[560px] w-full select-none overflow-hidden bg-[#f3f0e8] text-[#151515] [--c:min(42vw,28vh)] md:[--c:min(21vw,37vh)]"
    >
      <div className="pk-bg" aria-hidden="true">
        <div className="pk-melt"><canvas ref={dots} className="pk-dots" /></div>
        <i className="pk-vig" />
        <i className="pk-grain" />
      </div>

      <h2
        ref={head}
        className="pointer-events-none absolute inset-x-0 top-[11%] z-10 px-6 text-center font-display text-[7.4vw] font-semibold leading-[1.05] tracking-[-0.035em] md:top-[12%] md:text-[4.4vw]"
      >
        {title}
      </h2>

      <div ref={deck} className="absolute left-1/2 top-[57%] z-20 h-0 w-0">
        {data.map((d, i) => (
          <div
            key={d.no}
            ref={(el) => (cards.current[i] = el)}
            data-card
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: "var(--c)", height: "calc(var(--c) * 1.41)", transformStyle: "preserve-3d", zIndex: i === 1 ? 2 : 1 }}
          >
            {/* back: one third of the cover artwork */}
            <div
              data-back
              className="absolute inset-0 overflow-hidden bg-black"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
            >
              <Cover index={i} src={cover} />
            </div>
            {/* front: info card */}
            <div
              data-front
              className="absolute inset-0 overflow-hidden"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                borderRadius: "calc(var(--c) * 0.075)",
                background: d.bg,
                boxShadow: "0 40px 70px -28px rgba(0,0,0,0.28), 0 10px 24px -12px rgba(0,0,0,0.18)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-[0.3] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
              <Face d={d} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

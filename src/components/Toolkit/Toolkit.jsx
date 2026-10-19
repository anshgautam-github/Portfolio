import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import "./toolkit.css";
import { capDpr, skipFrame, IS_MOBILE } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Pinned "Toolkit" scroll sequence (all scroll-scrubbed):
   1. one card -> next cards rise from below and the stack fans out (1 -> 7 cards)
   2. the last card arrives while the whole fan squeezes into a tight stack
   3. the stack collapses to one pile and flips edge-on (rotateY) and leaves
   4. subtitle swaps, "Art Direction" cards fan in, squeeze, a gradient card lands on top
   5. a cream panel rises inside the card, the card grows, then fills the whole screen
  Copy / colours live in content.js -> toolkit.
*/

const PER = 0.4;  // pinned scroll distance per timeline unit, in viewport heights
const T = 18.6; // timeline length in units

function Pill({ children, style, className = "" }) {
  return (
    <span
      className={`inline-block whitespace-nowrap font-display font-medium leading-none ${className}`}
      style={{ fontSize: "calc(var(--c) * 0.052)", padding: "calc(var(--c) * 0.05) calc(var(--c) * 0.075)", borderRadius: 999, ...style }}
    >
      {children}
    </span>
  );
}

function Card({ d, cardRef }) {
  return (
    <div
      ref={cardRef}
      data-card
      className="absolute left-0 top-0 cursor-pointer will-change-transform"
      style={{ width: "var(--c)", height: "calc(var(--c) * 1.41)" }}
    >
      <div
        data-face
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ background: d.bg, borderRadius: "calc(var(--c) * 0.075)" }}
      >
        {d.learning && (
          <Pill style={{ border: `calc(var(--c) * 0.007) solid ${d.fg}`, color: d.fg, marginBottom: "calc(var(--c) * 0.05)" }}>Currently learning</Pill>
        )}
        <span
          className="block whitespace-pre-line font-display font-extrabold"
          style={{ fontSize: "calc(var(--c) * 0.2)", lineHeight: 0.98, letterSpacing: "-0.035em", color: d.fg }}
        >
          {d.letters ? [...d.name].map((ch, i) => <span key={i} style={{ color: d.letters[i] }}>{ch}</span>) : d.name}
        </span>
        <Pill style={{ background: d.tagBg, color: d.tagFg, marginTop: "calc(var(--c) * 0.06)" }}>{d.tag}</Pill>
      </div>
    </div>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/* ───────── backdrop: a skill-radar chart (six domains, rings, sweeping scanner) so the section reads as "skills" at a glance ───────── */
const RADAR = [
  { k: "Front-end", v: 0.9 },
  { k: "Back-end", v: 0.82 },
  { k: "AI / ML", v: 0.78 },
  { k: "Cloud", v: 0.66 },
  { k: "Databases", v: 0.72 },
  { k: "Design", v: 0.6 },
];
const R_MAX = 410;
const rpt = (i, r) => {
  const a = ((-60 + i * 60) * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

function SkillRadar() {
  const poly = RADAR.map((a, i) => rpt(i, a.v * R_MAX).map((n) => n.toFixed(1)).join(",")).join(" ");
  const sweepEnd = [Math.cos((-38 * Math.PI) / 180) * R_MAX, Math.sin((-38 * Math.PI) / 180) * R_MAX];
  return (
    <svg className="tk-radar" viewBox="-500 -500 1000 1000" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="tk-r-fill" cx="0" cy="0" r={R_MAX} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d7ff3b" stopOpacity="0.02" />
          <stop offset="1" stopColor="#d7ff3b" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="tk-r-sweep" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#d7ff3b" stopOpacity="0.16" />
          <stop offset="1" stopColor="#d7ff3b" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* rotating measuring ticks */}
      <g>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="140s" repeatCount="indefinite" />}
        <circle r="478" stroke="rgba(245,232,225,.22)" strokeWidth="14" strokeDasharray="1.6 19.6" />
      </g>
      <g>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="90s" repeatCount="indefinite" />}
        <circle r="446" stroke="rgba(215,255,59,.22)" strokeWidth="1.2" strokeDasharray="3 9" />
      </g>

      {/* level rings */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={f} r={R_MAX * f} stroke={`rgba(245,232,225,${i === 3 ? 0.3 : 0.14})`} strokeWidth="1.4" strokeDasharray={i === 3 ? "none" : "4 9"} />
      ))}
      {[25, 50, 75, 100].map((n, i) => (
        <text key={n} x={R_MAX * ((i + 1) / 4) - 8} y="-10" textAnchor="end" className="tk-r-lvl">
          {n}
        </text>
      ))}

      {/* spokes + labels */}
      {RADAR.map((a, i) => {
        const [x, y] = rpt(i, R_MAX);
        const [lx, ly] = rpt(i, R_MAX + 52);
        const anchor = Math.abs(lx) < 20 ? "middle" : lx > 0 ? "start" : "end";
        return (
          <g key={a.k}>
            <line x1="0" y1="0" x2={x} y2={y} stroke="rgba(245,232,225,.13)" strokeWidth="1.4" />
            <text x={lx} y={ly + 6} textAnchor={anchor} className="tk-r-ax">
              {a.k}
            </text>
          </g>
        );
      })}

      {/* scanner */}
      <g>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="9s" repeatCount="indefinite" />}
        <path d={`M0 0 L${sweepEnd[0].toFixed(1)} ${sweepEnd[1].toFixed(1)} A${R_MAX} ${R_MAX} 0 0 1 ${R_MAX} 0 Z`} fill="url(#tk-r-sweep)" />
        <line x1="0" y1="0" x2={R_MAX} y2="0" stroke="rgba(215,255,59,.55)" strokeWidth="1.6" />
      </g>

      {/* the skill shape */}
      <g>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="scale" values="1;1.035;1" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" dur="6s" repeatCount="indefinite" />}
        <polygon points={poly} fill="url(#tk-r-fill)" stroke="rgba(215,255,59,.7)" strokeWidth="2.2" strokeLinejoin="round" />
        {RADAR.map((a, i) => {
          const [x, y] = rpt(i, a.v * R_MAX);
          return (
            <g key={a.k}>
              <circle cx={x} cy={y} r="15" fill="rgba(215,255,59,.16)" />
              <circle cx={x} cy={y} r="6" fill="#d7ff3b" />
            </g>
          );
        })}
      </g>

      {/* centre hub (sits behind the card) */}
      <circle r="5" fill="rgba(245,232,225,.5)" />
    </svg>
  );
}

export default function Toolkit() {
  const root = useRef(null);
  const deckA = useRef(null);
  const deckB = useRef(null);
  const cardsA = useRef([]);
  const cardsB = useRef([]);
  const finalCard = useRef(null);
  const wave = useRef(null);
  const sub1 = useRef(null);
  const sub2 = useRef(null);
  const ticks = useRef(null);
  const fill = useRef(null);
  const picked = useRef(null);
  const play = useRef(null);
  const spot = useRef(null);
  const lastP = useRef(0);
  const closePick = useRef(() => {});
  const { title, scenes, endColor, mark, finaleLabel } = content.toolkit;
  const [sceneA, sceneB] = scenes;

  useLayoutEffect(() => {
    let ctx;
    let lastW = window.innerWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const build = () => {
      ctx = gsap.context(() => {
        const W = root.current.clientWidth;
        const H = root.current.clientHeight;
        const A = cardsA.current;
        const B = cardsB.current;
        const c = A[0].offsetWidth;
        const ch = A[0].offsetHeight;
        const yOff = H * 0.4 + ch; // fully below the screen

        // ---------- layouts ----------
        const sp = (n) => (n > 1 ? Math.min(0.565 * c, (W * 0.9 - c) / (n - 1)) : 0);
        const L = (n, i) => {
          const d = i - (n - 1) / 2;
          return { x: d * sp(n), y: 0.0225 * c * d * d, rotation: d * 3.3 };
        };
        const S = (i) => ({ x: (i - 3.5) * 0.171 * c, y: 0, rotation: 0 });
        const Z = { x: 0, y: 0, rotation: 0 };

        gsap.set([...A, ...B], { xPercent: -50, yPercent: -50, x: 0, y: 0, rotation: 0 });
        gsap.set(A[0], L(1, 0));
        gsap.set([deckA.current], { transformPerspective: 1500, transformOrigin: "50% 50%" });

        const tl = gsap.timeline({
          defaults: { ease: "power3.inOut", duration: 0.85 },
          scrollTrigger: reduce
            ? undefined
            : {
                trigger: root.current,
                start: "top top",
                end: () => "+=" + T * H * PER,
                pin: true,
                scrub: IS_MOBILE ? true : 0.3,
                anticipatePin: 1,
                onUpdate: (self) => {
                  if (picked.current && Math.abs(self.progress - lastP.current) > 0.003) closePick.current();
                  lastP.current = self.progress;
                  if (fill.current) fill.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
                },
              },
        });

        const move = (el, from, to, at, extra = {}) =>
          tl.fromTo(el, { ...from }, { ...to, immediateRender: false, ...extra }, at);

        // arrival of card k (1-based) into a fan of k+1 cards
        const arrive = (cards, k, at, dur = 0.85) => {
          for (let i = 0; i < k; i++) move(cards[i], L(k, i), L(k + 1, i), at, { duration: dur });
          const t = L(k + 1, k);
          tl.fromTo(cards[k], { x: t.x, y: yOff, rotation: t.rotation + 9 }, { y: t.y, rotation: t.rotation, ease: "power3.out", duration: dur }, at);
        };

        /* ============ scene A: Toolkit ============ */
        for (let k = 1; k <= 5; k++) arrive(A, k, 0.05 + (k - 1) * 0.85);
        arrive(A, 6, 0.05 + 5 * 0.85); // 7th card (index 6) fan complete  -> ends 5.4

        // 8th card (Shopify) lands at the far end of the fan, then everything pulls together
        arrive(A, 7, 5.4, 0.9); // ends 6.3
        for (let i = 0; i < 8; i++) move(A[i], L(8, i), S(i), 6.35, { duration: 0.65 });

        for (let i = 0; i < 8; i++) move(A[i], S(i), Z, 7.0, { duration: 0.9 });
        // the pile turns edge-on, then the same turn carries on as the Figma card
        tl.fromTo(deckA.current, { rotationY: 0 }, { rotationY: -90, ease: "power2.in", duration: 0.8, immediateRender: false }, 8.0);
        tl.set(deckA.current, { autoAlpha: 0 }, 8.8);

        // subtitle swap
        tl.fromTo(sub1.current, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -c * 0.1, ease: "power2.in", duration: 0.6, immediateRender: false }, 8.0);
        tl.fromTo(sub2.current, { autoAlpha: 0, y: c * 0.1 }, { autoAlpha: 1, y: 0, ease: "power3.out", duration: 0.7 }, 8.85);

        /* ============ scene B: Art Direction ============ */
        gsap.set(B[0], { autoAlpha: 0 });
        gsap.set(deckB.current, { transformPerspective: 1500, transformOrigin: "50% 50%", rotationY: 90 });
        tl.set(B[0], { autoAlpha: 1 }, 8.8);
        tl.fromTo(deckB.current, { rotationY: 90 }, { rotationY: 0, ease: "power2.out", duration: 0.9, immediateRender: false }, 8.8);
        for (let k = 1; k <= 3; k++) arrive(B, k, 10.2 + (k - 1) * 0.85);

        // gradient card rises into the last spot of the fan, same as the other cards
        gsap.set(B[4], { autoAlpha: 0 });
        tl.set(B[4], { autoAlpha: 1 }, 12.95);
        arrive(B, 4, 13.0, 0.9);

        // everything clubs together behind it (Photoshop peeks out underneath)
        for (let i = 0; i < 4; i++) move(B[i], L(5, i), { x: 0, y: i === 1 ? c * 0.058 : 0, rotation: 0 }, 14.0, { duration: 0.75 });
        tl.to(B[4], { x: 0, y: 0, rotation: 0, ease: "power3.inOut", duration: 0.75 }, 14.0);

        /* ============ finale: cream rises, card grows, fills the screen ============ */
        const fin = B[4];
        gsap.set(fin, { "--r": (c * 0.075).toFixed(2) + "px" });
        gsap.set(wave.current, { y: 150 });
        tl.to(wave.current, { y: -16, ease: "power2.inOut", duration: 1.2 }, 14.9);
        tl.to(fin, { y: -c * 0.1, ease: "power2.inOut", duration: 1.2 }, 14.9);
        // the cream-filled card simply scales up until it covers the whole screen (no layout changes)
        const cover = Math.max(W / c, H / ch) * 1.3;
        tl.to(fin, { scale: cover, y: -H * 0.1, ease: "power3.inOut", duration: 1.9, force3D: true }, 16.1);
        tl.to(ticks.current, { autoAlpha: 0, duration: 0.5, ease: "power1.in" }, 16.2);

        tl.set({}, {}, T);
        if (reduce) tl.progress(5.4 / T);
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

  // click a card: it flips, straightens and lifts forward while the others dim; click again / elsewhere / Esc / scroll to put it back
  useEffect(() => {
    const el = root.current;
    const cards = () => el.querySelectorAll("[data-card]");
    const reset = (dur = 0.6) => {
      const cur = picked.current;
      if (!cur) return;
      picked.current = null;
      cards().forEach((card) => {
        gsap.to(card.firstChild, { scale: 1, y: 0, rotation: 0, rotationY: 0, opacity: 1, boxShadow: "0 0 0 rgba(0,0,0,0)", duration: dur, ease: "power3.inOut", overwrite: true });
      });
      gsap.set(cur, { zIndex: "", delay: dur });
    };
    closePick.current = reset;
    const onClick = (e) => {
      const card = e.target.closest("[data-card]");
      if (!card || !el.contains(card)) return reset();
      if (picked.current === card) return reset();
      if (picked.current) reset(0.25);
      picked.current = card;
      const rot = gsap.getProperty(card, "rotation") || 0;
      const c = card.offsetWidth;
      gsap.killTweensOf(card, "zIndex");
      gsap.set(card, { zIndex: 50 });
      cards().forEach((o) => {
        const f = o.firstChild;
        if (o === card) {
          gsap.set(f, { transformPerspective: 1400 });
          gsap
            .timeline({ defaults: { overwrite: "auto" } })
            .fromTo(f, { rotationY: 0 }, { rotationY: 360, duration: 1.0, ease: "power3.inOut" }, 0)
            .to(f, { rotation: -rot, y: -c * 0.1, scale: 1.24, boxShadow: "0 40px 90px rgba(0,0,0,0.55)", duration: 0.9, ease: "power3.out" }, 0)
            .set(f, { rotationY: 0 });
        } else {
          gsap.to(f, { opacity: 0.28, scale: 0.94, duration: 0.6, ease: "power2.out", overwrite: true });
        }
      });
    };
    // hover: card rises and comes forward a little
    const onOver = (e) => {
      const card = e.target.closest("[data-card]");
      if (!card || !el.contains(card) || picked.current) return;
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;
      gsap.set(card, { zIndex: 10 });
      gsap.to(card.firstChild, { y: -card.offsetWidth * 0.06, scale: 1.04, duration: 0.4, ease: "power3.out", overwrite: "auto" });
    };
    const onOut = (e) => {
      const card = e.target.closest("[data-card]");
      if (!card || !el.contains(card) || picked.current === card) return;
      if (e.relatedTarget && card.contains(e.relatedTarget)) return;
      gsap.set(card, { zIndex: "" });
      if (!picked.current) gsap.to(card.firstChild, { y: 0, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
    };
    el.addEventListener("pointerover", onOver);
    el.addEventListener("pointerout", onOut);
    const onKey = (e) => e.key === "Escape" && reset();
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("pointerover", onOver);
      el.removeEventListener("pointerout", onOut);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // playable background: every tool is a bubble you can push, fling and collide; a soft light follows the pointer
  useEffect(() => {
    const cv = play.current;
    const ctx = cv.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, running = false, last = 0;
    const m = { x: -999, y: -999, px: -999, py: -999, vx: 0, vy: 0 };
    let grab = null;
    const items = [...sceneA.cards, ...sceneB.cards].map((d) => ({ d, label: d.name.replace(/\n/g, ""), x: 0, y: 0, vx: 0, vy: 0, r: 40, ph: Math.random() * 6.28, seeded: false }));
    const radius = () => Math.max(30, Math.min(W, H) * 0.052);
    const size = () => {
      const dpr = capDpr(1.5, 1.25);
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = radius();
      items.forEach((b, i) => {
        b.r = base * (0.85 + ((i * 37) % 10) / 22);
        if (!b.seeded) { // start on the sides / above and below the card stack so they are visible
          const side = i % 2 ? 1 : -1;
          b.x = W / 2 + side * W * (0.2 + ((i * 53) % 25) / 100);
          b.y = H * (0.2 + ((i * 29) % 70) / 100);
          b.vx = (Math.random() - 0.5) * 40; b.vy = (Math.random() - 0.5) * 40; b.seeded = true;
        }
        b.x = Math.min(Math.max(b.x, b.r), W - b.r); b.y = Math.min(Math.max(b.y, b.r), H - b.r);
      });
      if (!running) draw();
    };
    const step = (dt) => {
      m.vx *= 0.85; m.vy *= 0.85;
      for (const b of items) {
        if (grab && grab.b === b) {
          b.vx = (m.x - grab.ox - b.x) * 14; b.vy = (m.y - grab.oy - b.y) * 14;
        } else {
          // gentle drift so the field is never still
          b.vx += Math.cos(b.ph + performance.now() * 0.0004) * 6 * dt;
          b.vy += Math.sin(b.ph * 1.7 + performance.now() * 0.0003) * 6 * dt;
          // the pointer pushes bubbles away and swipes impart speed
          const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy), R = b.r + 120;
          if (d < R && d > 0.1) {
            const f = (1 - d / R);
            b.vx += (dx / d) * f * f * 1500 * dt + m.vx * f * 0.35;
            b.vy += (dy / d) * f * f * 1500 * dt + m.vy * f * 0.35;
          }
          const damp = Math.pow(0.55, dt);
          b.vx *= damp; b.vy *= damp;
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.8; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.8; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy) * 0.8; }
      }
      // bubble-bubble collisions (equal-ish mass elastic bounce)
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d < min && d > 0.01) {
          const nx = dx / d, ny = dy / d, o = (min - d) / 2;
          a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const k = -rv * 0.9; a.vx -= nx * k; a.vy -= ny * k; b.vx += nx * k; b.vy += ny * k; }
        }
      }
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const b of items) {
        const sp = Math.min(1, Math.hypot(b.vx, b.vy) / 500);
        const sx = 1 + sp * 0.12, sy = 1 - sp * 0.1, a = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath(); ctx.arc(4, 7, b.r, 0, 6.283); ctx.fill();
        ctx.rotate(a); ctx.scale(sx, sy); ctx.rotate(-a);
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = b.d.bg;
        ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.d.fg;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        let fs = b.r * 0.42;
        ctx.font = `800 ${fs}px "Inter Tight", Arial, sans-serif`;
        const w = ctx.measureText(b.label).width;
        if (w > b.r * 1.6) { fs *= (b.r * 1.6) / w; ctx.font = `800 ${fs}px "Inter Tight", Arial, sans-serif`; }
        ctx.fillText(b.label, 0, 1);
        ctx.restore();
      }
    };
    const loop = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (skipFrame(now, last)) return;
      const dt = Math.min((now - last) / 1000, 0.033); last = now;
      step(dt); draw();
    };
    const start = () => { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const sp = spot.current;
    const onMove = (e) => {
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      m.vx = (x - m.x) * 22; m.vy = (y - m.y) * 22;
      if (m.x < -900) { m.vx = m.vy = 0; }
      m.x = x; m.y = y;
      if (!IS_MOBILE) { sp.style.setProperty("--mx", (x / W) * 100 + "%"); } if (!IS_MOBILE) sp.style.setProperty("--my", (y / H) * 100 + "%");
    };
    const onDown = (e) => {
      if (e.target.closest?.("[data-card]")) return;
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let hit = null;
      for (const b of items) if (Math.hypot(b.x - x, b.y - y) < b.r && (!hit || b.r < hit.r)) hit = b;
      if (hit) { grab = { b: hit, ox: x - hit.x, oy: y - hit.y }; document.body.style.userSelect = "none"; }
      else { // pop: a shockwave that scatters everything nearby
        for (const b of items) { const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1; if (d < 380) { const f = 1 - d / 380; b.vx += (dx / d) * f * 900; b.vy += (dy / d) * f * 900; } }
      }
    };
    const onUp = () => { grab = null; document.body.style.userSelect = ""; };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.02 });
    io.observe(cv);
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    size();
    return () => { stop(); io.disconnect(); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointerup", onUp); document.body.style.userSelect = ""; };
  }, []);

  const tickW = ["0.8vw", "0.8vw", "1.9vw", "3.3vw", "1.9vw", "0.8vw"];

  return (
    <section
      ref={root}
      className="relative h-screen min-h-[560px] w-full overflow-hidden bg-[#1f1e1e] text-[#f5e8e1] [--c:min(46vw,27vh)] md:[--c:min(17.25vw,29.5vh)]"
    >
      {/* ---------------- playable background ---------------- */}
      <div className="tk-bg" aria-hidden="true">
        <i className="tk-dots" />
        <SkillRadar />
        <i className="tk-spot" ref={spot} />
        <span className="tk-hud tk-hud--l">{"\u25c6 Skill matrix"}</span>
        <span className="tk-hud tk-hud--r">6 domains {"\u00b7"} always levelling up</span>
      </div>
      <canvas ref={play} className="tk-play absolute inset-0 z-[1]" aria-hidden="true" />
      <span className="tk-hint" aria-hidden="true">Drag the bubbles · click empty space to pop</span>

      {/* ---------------- heading ---------------- */}
      <div className="pointer-events-none absolute inset-x-0 top-[9%] z-10 text-center md:top-[11.5%]">
        <h2 className="font-display text-[14vw] font-semibold leading-none tracking-[-0.035em] md:text-[5.9vw]">{title}</h2>
        <div className="relative mt-[2.2vw] h-[7vw] max-md:mt-3 md:h-[3vw]">
          <p ref={sub1} className="absolute inset-x-0 top-0 font-display text-[5vw] font-normal leading-none tracking-[-0.02em] md:text-[2.1vw]">
            {sceneA.subtitle}
          </p>
          <p ref={sub2} className="absolute inset-x-0 top-0 font-display text-[5vw] font-normal leading-none tracking-[-0.02em] opacity-0 md:text-[2.1vw]">
            {sceneB.subtitle}
          </p>
        </div>
      </div>

      {/* ---------------- deck A (toolkit) ---------------- */}
      <div ref={deckA} className="absolute left-1/2 top-[60%] z-20 h-0 w-0">
        {sceneA.cards.map((d, i) => (
          <Card key={d.name} d={d} cardRef={(el) => (cardsA.current[i] = el)} />
        ))}
      </div>

      {/* ---------------- deck B (art direction + finale card) ---------------- */}
      <div ref={deckB} className="absolute left-1/2 top-[60%] z-20 h-0 w-0">
        {sceneB.cards.map((d, i) => (
          <Card key={d.name} d={d} cardRef={(el) => (cardsB.current[i] = el)} />
        ))}

        {/* gradient "transition" card; the cream panel rises inside it and then it fills the screen */}
        <div
          ref={(el) => (cardsB.current[sceneB.cards.length] = el)}
          className="absolute left-0 top-0 will-change-transform"
          style={{ width: "var(--c)", height: "calc(var(--c) * 1.41)", "--r": "calc(var(--c) * 0.075)", borderRadius: "var(--r)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              borderRadius: "var(--r)",
              background:
                "radial-gradient(75% 55% at 12% 22%, #a63f3b 0%, transparent 60%), radial-gradient(95% 50% at 70% 85%, #6d4cc7 0%, transparent 70%), linear-gradient(180deg, #ee6f4e 0%, #e98660 34%, #8a60d3 62%, #a384e6 100%)",
            }}
          />
          {!IS_MOBILE && <div className="absolute inset-0 opacity-[0.28] mix-blend-overlay" style={{ borderRadius: "var(--r)", backgroundImage: GRAIN }} />}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-extrabold text-[#fbf1ea]" style={{ fontSize: "calc(var(--c) * 0.42)", lineHeight: 0.8, letterSpacing: "-0.09em" }}>
              {mark}
            </span>
            <Pill style={{ background: "#fbf1ea", color: "#1f1e1e", marginTop: "calc(var(--c) * 0.1)" }}>{finaleLabel}</Pill>
          </div>
          {/* cream panel with a wavy top edge */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 140"
            preserveAspectRatio="none"
            style={{ clipPath: "inset(0 round var(--r))", WebkitClipPath: "inset(0 round var(--r))" }}
            aria-hidden="true"
          >
            <g ref={wave}>
              <path d="M0 6 C 16 -3, 34 13, 52 5 S 86 -1, 100 7 L100 400 L0 400 Z" fill={endColor} />
            </g>
          </svg>
        </div>
      </div>

      {/* ---------------- progress ticks ---------------- */}
      <div ref={ticks} className="pointer-events-none absolute bottom-[4.5vh] left-[2vw] z-30 flex flex-col" style={{ gap: "1.2vw" }} aria-hidden="true">
        {tickW.map((w, i) => (
          <span key={i} className="relative block h-[2px] bg-white/35" style={{ width: w }}>
            {i === 3 && <span ref={fill} className="absolute inset-0 origin-left bg-white" style={{ transform: "scaleX(0)" }} />}
          </span>
        ))}
      </div>
    </section>
  );
}

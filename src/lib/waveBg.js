import gsap from "gsap";
import { capDpr, skipFrame, IS_MOBILE } from "./perf.js";

/*
  A calm, hand-made-feeling backdrop: a stack of silk-like wave lines (they echo the wavy ribbon of the Finale) with paper stars floating over it.
    - the lines swell and ripple on their own; the pointer is a stone in the water: lines part around it, and the faster you move the more they stir
    - a click drops a pebble: a ripple travels outward through the lines, and every star nearby is thrown off, spinning
    - stars drift up with a slight sway, turn slowly, slide against the pointer for depth, and are blown aside as it passes
    - scrolling the page pushes the waves along; with no pointer (touch, idle) the pointer wanders on its own
  `front` puts the canvas above the host's content and fades it with alpha() (used for the flat colour after the Bloom).
  Sleeps off screen, shares the global frame budget, and is never created under reduced motion.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

const THEMES = {
  blue: { line: "238,243,255", lineA: 0.15, fillA: 0.05, glow: ["255,255,255", 0.13], stars: [["238,243,255", 1], ["238,243,255", 1], ["238,243,255", 0], ["78,227,154", 1], ["255,143,158", 1], ["238,243,255", 0]], starA: 0.9 },
  aurora: { line: "226,236,255", lineA: 0.2, fillA: 0.075, glow: ["170,190,255", 0.2], stars: [["238,243,255", 1]], starA: 0.9 },
  light: { line: "63,114,238", lineA: 0.13, fillA: 0.045, glow: ["143,123,255", 0.11], stars: [["63,114,238", 1], ["143,123,255", 1], ["5,5,5", 0], ["78,227,154", 1], ["5,5,5", 0]], starA: 0.5 },
};

function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.46 : r; ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}

export default function initWaveBg(host, { theme = "blue", front = false, alpha = () => 1 } = {}) {
  if (!host) return () => {};
  const T = THEMES[theme] || THEMES.blue;
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = `position:absolute;inset:0;width:100%;height:100%;z-index:${front ? 2 : -1};pointer-events:none;display:block`;
  const prevIso = host.style.isolation;
  host.style.isolation = "isolate";
  if (front) host.appendChild(cv); else host.insertBefore(cv, host.firstChild);
  const ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1, live = false, sc = 1, N = 12, cols = 0;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, hx: 0, hy: 0, psx: 0, psy: 0, gust: 0, last: -99 };
  const lines = [], ys = [], stars = [], ripples = [];
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const measure = () => {
    W = host.clientWidth; H = host.clientHeight; dpr = capDpr(1.6, 1.15);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sc = clamp(Math.min(W, H * 1.5) / 900, 0.6, 1.4);
    N = IS_MOBILE ? 9 : clamp(Math.round(H / 60), 10, 18); cols = Math.ceil(W / 16) + 2;
    lines.length = 0; ys.length = 0;
    for (let i = 0; i < N; i++) { lines.push({ base: H * (0.06 + 0.88 * (i / (N - 1))), amp: (12 + rnd() * 24) * sc, f1: 0.0028 + rnd() * 0.0022, f2: 0.007 + rnd() * 0.004, ph: rnd() * TAU, sp: 0.25 + rnd() * 0.3 }); ys.push(new Float32Array(cols)); }
    const want = 0;   // paper stars switched off: just the silk wave lines (set back to (IS_MOBILE ? 7 : 15) * (theme === "light" ? 0.8 : 1) | 0 to bring them back)
    stars.length = 0;
    for (let i = 0; i < want; i++) { const d = 0.4 + rnd() * 1; const c = T.stars[(rnd() * T.stars.length) | 0]; stars.push({ x: rnd() * W, y: rnd() * H, r: (7 + rnd() * 15) * sc * (0.7 + d * 0.4), d, rot: rnd() * TAU, vr: (rnd() - 0.5) * 0.5, dx: (rnd() - 0.5) * 8, dy: -(5 + rnd() * 11), ph: rnd() * TAU, c: c[0], solid: c[1], wx: 0, wy: 0, spin: 0 }); }
    if (!ptr.sx) { ptr.x = ptr.sx = ptr.hx = W * 0.6; ptr.y = ptr.sy = ptr.hy = H * 0.5; }
  };

  const local = (e) => { const r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  const onMove = (e) => { const [x, y, r] = local(e); if (x < 0 || y < 0 || x > r.width || y > r.height) return; ptr.x = x; ptr.y = y; ptr.last = gsap.ticker.time; };
  const onDown = (e) => {
    const [x, y, r] = local(e); if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    const t = gsap.ticker.time; ptr.x = x; ptr.y = y; ptr.last = t;
    if (ripples.length < 4) ripples.push({ x, y, t0: t });
    for (const s of stars) { const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy) || 1; if (d < 320 * sc) { const f = 1 - d / (320 * sc); s.wx += (dx / d) * 620 * f; s.wy += (dy / d) * 620 * f; s.spin += (rnd() < 0.5 ? -1 : 1) * (4 + 6 * f); } }
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  const io = new IntersectionObserver((es) => { live = es[0].isIntersecting; }, { rootMargin: "100px 0px" });
  io.observe(host);

  const tick = (_, dtMs) => {
    if (!live) return;
    const now = performance.now(); if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const a = alpha();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (a <= 0.01) return;
    const t = gsap.ticker.time, dt = Math.min(0.05, dtMs / 1000 || 0.016);
    const scr = -host.getBoundingClientRect().top * 0.0016;

    const idle = t - ptr.last > 2.4;
    const tx = idle ? W * (0.55 + 0.3 * Math.sin(t * 0.25)) : ptr.x, ty = idle ? H * (0.5 + 0.25 * Math.sin(t * 0.33 + 1.1)) : ptr.y;
    ptr.sx += (tx - ptr.sx) * 0.12; ptr.sy += (ty - ptr.sy) * 0.12; ptr.hx += (tx - ptr.hx) * 0.035; ptr.hy += (ty - ptr.hy) * 0.035;
    const sx = ptr.sx, sy = ptr.sy, pvx = (sx - ptr.psx) / Math.max(dt, 0.008), pvy = (sy - ptr.psy) / Math.max(dt, 0.008); ptr.psx = sx; ptr.psy = sy;
    ptr.gust += (clamp(Math.hypot(pvx, pvy) / 1400) - ptr.gust) * 0.08;
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 2.4) ripples.splice(i, 1);
    ctx.globalAlpha = a;

    // light on the water
    const [gc, ga] = T.glow, M = Math.max(W, H);
    for (const [x, y, r, k] of [[ptr.hx, ptr.hy, M * 0.42, 1], [W * (0.3 + 0.12 * Math.sin(t * 0.13)), H * (0.6 + 0.15 * Math.cos(t * 0.17)), M * 0.38, 0.6]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${gc},${ga * k})`); g.addColorStop(1, `rgba(${gc},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    // wave lines
    const PW = 150 * sc, PH = 170 * sc, stir = 1 + ptr.gust * 1.1;
    for (let i = 0; i < N; i++) {
      const L = lines[i], arr = ys[i], sgn = L.base < sy ? -1 : 1, wy = Math.exp(-((L.base - sy) ** 2) / (2 * PH * PH));
      for (let c = 0; c < cols; c++) {
        const x = c * 16;
        let y = L.base + L.amp * stir * Math.sin(x * L.f1 + t * L.sp + L.ph + scr * 6) + L.amp * 0.5 * Math.sin(x * L.f2 - t * L.sp * 1.4 + L.ph * 2);
        y += sgn * 50 * sc * Math.exp(-((x - sx) ** 2) / (2 * PW * PW)) * wy * (0.7 + ptr.gust);
        for (let k = 0; k < ripples.length; k++) { const r = ripples[k], age = t - r.t0, q = (Math.hypot(x - r.x, L.base - r.y) - age * 380 * sc) / (64 * sc); y += 28 * sc * Math.exp(-q * q) * Math.sin(q * 2.4) * (1 - age / 2.4); }
        arr[c] = y;
      }
    }
    ctx.lineJoin = "round";
    for (let i = 0; i < N - 1; i += 2) {
      const p = new Path2D(), A = ys[i], B = ys[i + 1];
      p.moveTo(0, A[0]); for (let c = 1; c < cols; c++) p.lineTo(c * 16, A[c]); for (let c = cols - 1; c >= 0; c--) p.lineTo(c * 16, B[c]); p.closePath();
      ctx.fillStyle = `rgba(${T.line},${T.fillA})`; ctx.fill(p);
    }
    const paths = [];
    for (let i = 0; i < N; i++) { const p = new Path2D(), A = ys[i]; p.moveTo(0, A[0]); for (let c = 1; c < cols; c++) p.lineTo(c * 16, A[c]); paths.push(p); ctx.strokeStyle = `rgba(${T.line},${T.lineA + (i % 4 === 0 ? 0.06 : 0)})`; ctx.lineWidth = i % 4 === 0 ? 1.3 : 0.9; ctx.stroke(p); }
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 300 * sc); g.addColorStop(0, `rgba(${T.line},.75)`); g.addColorStop(0.6, `rgba(${T.line},.3)`); g.addColorStop(1, `rgba(${T.line},0)`);
    ctx.strokeStyle = g; ctx.lineWidth = 1.5; for (const p of paths) ctx.stroke(p);

    // paper stars
    const R = 190 * sc, px = (sx / W - 0.5), py = (sy / H - 0.5);
    for (const s of stars) {
      const dx = s.x - sx, dy = s.y - sy, d = Math.hypot(dx, dy) || 1;
      if (d < R) { const f = (1 - d / R) ** 2; s.wx += ((dx / d) * 420 * f + pvx * 0.05 * f) * dt * 6; s.wy += ((dy / d) * 420 * f + pvy * 0.05 * f) * dt * 6; s.spin += (dx > 0 ? 1 : -1) * f * 5 * dt; }
      s.wx *= 0.95; s.wy *= 0.95; s.spin *= 0.95;
      s.x += (s.dx + Math.sin(t * 0.5 + s.ph) * 6 + s.wx) * dt; s.y += (s.dy + s.wy) * dt; s.rot += (s.vr + s.spin) * dt;
      if (s.y < -40) { s.y = H + 40; s.x = rnd() * W; } else if (s.y > H + 40) s.y = -40; if (s.x < -40) s.x = W + 40; else if (s.x > W + 40) s.x = -40;
      const x = s.x - px * s.d * 34, y = s.y - py * s.d * 24;
      star(ctx, x, y, s.r, s.rot);
      if (s.solid) { ctx.fillStyle = `rgba(${s.c},${T.starA})`; ctx.fill(); } else { ctx.strokeStyle = `rgba(${s.c},${T.starA})`; ctx.lineWidth = 1.6; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  };
  gsap.ticker.add(tick);
  const onResize = () => measure();
  window.addEventListener("resize", onResize);
  measure();

  return () => {
    gsap.ticker.remove(tick); io.disconnect();
    window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown);
    cv.remove(); host.style.isolation = prevIso;
  };
}

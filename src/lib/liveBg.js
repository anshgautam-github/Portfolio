import gsap from "gsap";
import { capDpr, skipFrame, IS_MOBILE } from "./perf.js";

/*
  A living backdrop for a flat-coloured section (canvas, sits between the section's background and its content).
  Built in layers, back to front, so it reads like a printed poster that's quietly alive rather than a tech demo:
    1. ink wash   - big soft shapes that slowly breathe (a deep shadow low-left, a pool of light top-right), so the flat blue has depth
    2. spotlight  - a warm pool of light that trails the pointer a beat behind it
    3. dot grid   - halftone dots that swell and slide away from the pointer, and get shoved by click ripples
    4. wind lines - long, thin flow lines that curl around the pointer and speed up when you scroll
    5. doodles    - hand-drawn marks (plus, asterisk, squiggle, loop, arrow...) that float on springs, spin when pushed,
                    and drift at different depths as the section scrolls past
    6. ripples    - a ring trail behind a moving pointer; a click sends a ring + sparks
    7. film grain - fine noise that flickers a little, so the colour never looks like a flat vector fill
  With no pointer (touch, idle) the pointer wanders on its own. It sleeps off screen, is capped to the shared frame budget,
  and is not created at all under reduced motion.
  theme "blue" = landing-blue scenes; "light" = pale sections.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;

const THEMES = {
  blue: {
    wash: [["22,34,140", 0.55], ["150,185,255", 0.42], ["143,123,255", 0.34]],
    glow: "214,226,255", glowA: 0.3,
    dot: "238,243,255", dotA: 0.2,
    stream: "238,243,255", streamA: 0.5,
    ring: "238,243,255", spark: ["238,243,255", "78,227,154", "143,123,255", "255,143,158"],
    ink: ["238,243,255", "238,243,255", "78,227,154", "255,143,158", "195,184,255"],
    grain: 0.075,
  },
  light: {
    wash: [["63,114,238", 0.14], ["143,123,255", 0.12], ["78,227,154", 0.08]],
    glow: "255,255,255", glowA: 0.35,
    dot: "5,5,5", dotA: 0.13,
    stream: "63,114,238", streamA: 0.42,
    ring: "63,114,238", spark: ["63,114,238", "143,123,255", "5,5,5"],
    ink: ["5,5,5", "63,114,238", "143,123,255"],
    grain: 0.05,
  },
};

const KINDS = ["plus", "star", "squig", "loop", "arrow", "burst", "tri", "dot", "plus", "squig", "star", "dot"];

export default function initLiveBg(host, { theme = "blue" } = {}) {
  if (!host) return () => {};
  const T = THEMES[theme] || THEMES.blue;
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block";
  const prevIso = host.style.isolation;
  host.style.isolation = "isolate";
  host.insertBefore(cv, host.firstChild);
  const ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1, live = false, step = 48, sc = 1;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, hx: 0, hy: 0, gx: 0, gy: 0, last: -99, rx: -999, ry: -999, rt: 0, spd: 0, px: 0, py: 0 };
  const parts = [], rings = [], sparks = [], doodles = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const TRAIL = 20;

  /* a small tile of noise, tiled over the whole canvas for grain */
  const tile = document.createElement("canvas");
  tile.width = tile.height = 160;
  {
    const g = tile.getContext("2d"), id = g.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) { const v = rnd() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }
  let grainPat = null, gox = 0, goy = 0, gframe = 0;

  const spawn = (p, fresh) => {
    p.x = rnd() * W; p.y = fresh ? rnd() * H : (rnd() < 0.5 ? -10 : H + 10); if (!fresh && rnd() < 0.5) { p.x = rnd() < 0.5 ? -10 : W + 10; p.y = rnd() * H; }
    p.v = 30 + rnd() * 46; p.life = 0; p.max = 6 + rnd() * 8; p.xs = new Float32Array(TRAIL).fill(p.x); p.ys = new Float32Array(TRAIL).fill(p.y);
    p.w = 0.7 + rnd() * 0.9;
  };

  const makeDoodles = () => {
    doodles.length = 0;
    const n = IS_MOBILE ? 8 : 15;
    seed = 7;
    for (let i = 0; i < n; i++) {
      const kind = KINDS[i % KINDS.length];
      // jittered grid so they spread out but never line up
      const cols = IS_MOBILE ? 4 : 5, cx = (i % cols + 0.5) / cols, cy = (Math.floor(i / cols) + 0.5) / Math.ceil(n / cols);
      const hx = clamp(cx + (rnd() - 0.5) * 0.14, 0.04, 0.96) * W, hy = clamp(cy + (rnd() - 0.5) * 0.16, 0.05, 0.95) * H;
      const big = kind === "squig" ? 1.5 : kind === "dot" ? 0.5 : 1;
      doodles.push({
        kind, hx, hy, x: hx, y: hy, vx: 0, vy: 0, rot: (rnd() - 0.5) * 1.4, base: 0, vr: 0,
        size: (15 + rnd() * 17) * big, depth: 0.25 + rnd() * 0.95, ph: rnd() * TAU, ph2: rnd() * TAU,
        col: T.ink[(rnd() * T.ink.length) | 0], a: 0.4 + rnd() * 0.25,
        j: Array.from({ length: 10 }, () => (rnd() - 0.5) * 0.22), lw: 1.8 + rnd() * 1.2,
      });
      doodles[i].base = doodles[i].rot;
    }
  };

  const measure = () => {
    W = host.clientWidth; H = host.clientHeight; dpr = capDpr(1.75, 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    step = clamp(W / 24, 40, 64); sc = clamp(Math.min(W, H * 1.4) / 900, 0.6, 1.4);
    const want = (theme === "blue" ? 56 : 36) * (IS_MOBILE ? 0.45 : 1) | 0;
    while (parts.length < want) { const p = {}; spawn(p, true); parts.push(p); }
    parts.length = want;
    if (!ptr.sx) { ptr.x = ptr.sx = ptr.hx = ptr.gx = ptr.px = W * 0.6; ptr.y = ptr.sy = ptr.hy = ptr.gy = ptr.py = H * 0.5; }
    grainPat = ctx.createPattern(tile, "repeat");
    makeDoodles();
  };

  const toLocal = (e) => { const r = host.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  const onMove = (e) => {
    const [x, y, r] = toLocal(e);
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    ptr.x = x; ptr.y = y; const t = gsap.ticker.time; ptr.last = t;
    if (t - ptr.rt > 0.22 && Math.hypot(x - ptr.rx, y - ptr.ry) > 90 && rings.length < 9) { rings.push({ x, y, t0: t, big: 0 }); ptr.rx = x; ptr.ry = y; ptr.rt = t; }
  };
  const onDown = (e) => {
    const [x, y, r] = toLocal(e);
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    const t = gsap.ticker.time; ptr.x = x; ptr.y = y; ptr.last = t;
    if (rings.length < 9) rings.push({ x, y, t0: t, big: 1 });
    for (let i = 0; i < 16 && sparks.length < 44; i++) { const a = rnd() * TAU, v = 90 + rnd() * 240; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t, c: T.spark[(rnd() * T.spark.length) | 0], r: 1.4 + rnd() * 2.4 }); }
    // a click is a shove: doodles nearby get kicked and spin
    for (const d of doodles) {
      const dx = d.x - x, dy = d.y - y, dist = Math.hypot(dx, dy) || 1, f = clamp(1 - dist / (380 * sc));
      if (f > 0) { d.vx += (dx / dist) * f * 700; d.vy += (dy / dist) * f * 700; d.vr += (rnd() - 0.5) * f * 14; }
    }
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });

  const io = new IntersectionObserver((es) => { live = es[0].isIntersecting; }, { rootMargin: "120px 0px" });
  io.observe(host);

  /* an organic blob: ring of points whose radius wobbles over time, joined with smooth curves */
  const blob = (cx, cy, r, t, ph, rgb, a) => {
    const N = 9, pts = [];
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * TAU, rr = r * (1 + 0.17 * Math.sin(t * 0.31 + i * 1.7 + ph) + 0.1 * Math.sin(t * 0.52 + i * 2.9 + ph * 2));
      pts.push([cx + Math.cos(ang) * rr * 1.18, cy + Math.sin(ang) * rr * 0.86]);
    }
    const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r * 1.25);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.55, `rgba(${rgb},${a * 0.55})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    const m0 = [(pts[N - 1][0] + pts[0][0]) / 2, (pts[N - 1][1] + pts[0][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < N; i++) { const p = pts[i], n = pts[(i + 1) % N]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + n[0]) / 2, (p[1] + n[1]) / 2); }
    ctx.closePath(); ctx.fill();
  };

  /* hand-drawn marks, drawn in a unit space (about -1..1) with a per-doodle wobble so no two lines are quite straight */
  const drawMark = (d, t) => {
    const j = d.j;
    ctx.beginPath();
    switch (d.kind) {
      case "plus": ctx.moveTo(-1, j[0]); ctx.lineTo(1, j[1] * 0.5); ctx.moveTo(j[2], -1); ctx.lineTo(j[3] * 0.5, 1); break;
      case "star":
        for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI + j[k] * 0.6; ctx.moveTo(-Math.cos(a), -Math.sin(a)); ctx.lineTo(Math.cos(a + j[k + 3] * 0.3), Math.sin(a + j[k + 3] * 0.3)); }
        break;
      case "squig": { const w = 0.26 + 0.05 * Math.sin(t * 1.3 + d.ph); for (let k = 0; k <= 28; k++) { const x = -1.5 + (k / 28) * 3, y = Math.sin((k / 28) * TAU * 1.6 + d.ph2 + t * 0.9) * w; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } break; }
      case "loop": for (let a = 0; a <= TAU * 1.12; a += 0.18) { const r = 1 - a * 0.045 + 0.07 * Math.sin(a * 3 + j[0] * 9); const x = Math.cos(a) * r, y = Math.sin(a) * r; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } break;
      case "arrow": ctx.moveTo(-1.3, 0.5); ctx.quadraticCurveTo(-0.1 + j[0], -1 + j[1], 1.3, 0.1); ctx.moveTo(0.7, -0.35 + j[2]); ctx.lineTo(1.3, 0.1); ctx.lineTo(0.65, 0.55 + j[3]); break;
      case "burst": for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + j[k] * 0.5, r0 = 0.45, r1 = k % 2 ? 0.85 : 1.1; ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } break;
      case "tri": ctx.moveTo(-0.95, 0.75 + j[0]); ctx.lineTo(0.05 + j[1], -0.95); ctx.lineTo(1, 0.8 + j[2]); ctx.lineTo(-0.9 + j[3], 0.7); break;
      default: { const N = 9; for (let k = 0; k <= N; k++) { const a = (k / N) * TAU, r = 0.7 + j[k % 10] * 0.9; const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }
    }
  };

  let lastY = window.scrollY, sv = 0;
  const tick = (_, dtMs) => {
    if (!live) return;
    const now = performance.now();
    if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const t = gsap.ticker.time, dt = Math.min(0.05, dtMs / 1000 || 0.016);
    const r0 = host.getBoundingClientRect(), scr = -r0.top * 0.0012;   // scroll phase
    const y = window.scrollY; sv += (clamp(Math.abs(y - lastY) / 60) - sv) * 0.12; lastY = y;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    const idle = t - ptr.last > 2.4;
    const tx = idle ? W * (0.55 + 0.3 * Math.sin(t * 0.27)) : ptr.x, ty = idle ? H * (0.5 + 0.24 * Math.sin(t * 0.35 + 1.2)) : ptr.y;
    ptr.sx += (tx - ptr.sx) * 0.13; ptr.sy += (ty - ptr.sy) * 0.13;
    ptr.hx += (tx - ptr.hx) * 0.04; ptr.hy += (ty - ptr.hy) * 0.04;
    ptr.gx += (tx - ptr.gx) * 0.07; ptr.gy += (ty - ptr.gy) * 0.07;
    const sx = ptr.sx, sy = ptr.sy, M = Math.max(W, H);
    ptr.spd += (clamp(Math.hypot(sx - ptr.px, sy - ptr.py) / 40) - ptr.spd) * 0.15; ptr.px = sx; ptr.py = sy;

    /* 1. ink wash: shadow low-left, light top-right, a violet pool that follows the pointer lazily */
    const W0 = T.wash;
    blob(W * (0.2 + 0.07 * Math.sin(t * 0.13)), H * (0.78 + 0.07 * Math.cos(t * 0.17)), M * 0.46, t, 0, W0[0][0], W0[0][1]);
    blob(W * (0.82 + 0.06 * Math.cos(t * 0.15 + 2)), H * (0.2 + 0.08 * Math.sin(t * 0.19 + 1)), M * 0.42, t, 2.1, W0[1][0], W0[1][1]);
    blob(ptr.hx, ptr.hy, M * 0.3, t, 4.2, W0[2][0], W0[2][1]);

    /* 2. spotlight */
    {
      const R = M * (0.2 + ptr.spd * 0.05), g = ctx.createRadialGradient(ptr.gx, ptr.gy, 0, ptr.gx, ptr.gy, R);
      g.addColorStop(0, `rgba(${T.glow},${(T.glowA + ptr.spd * 0.12).toFixed(3)})`); g.addColorStop(1, `rgba(${T.glow},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }

    /* 3. halftone dots: bulge from the pointer, rolling diagonal wave, shoved outward by ripples */
    const R = 170 * sc, ox = (step * 0.5) - ((sx - W / 2) / W) * 12, oy = (step * 0.5) - ((sy - H / 2) / H) * 9;
    const nr = rings.length;
    for (let gy = -1; gy * step < H + step; gy++) for (let gx = -1; gx * step < W + step; gx++) {
      let x = gx * step + ox, y = gy * step + oy;
      const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy), k = d < R ? (1 - d / R) : 0, kk = k * k;
      if (kk > 0) { const push = kk * 34 * sc / (d || 1); x += dx * push; y += dy * push; }
      let rip = 0;
      for (let i = 0; i < nr; i++) {
        const r = rings[i], age = t - r.t0, life = r.big ? 1.6 : 1.2, rr = age * (r.big ? 360 : 190) * sc;
        const rx = x - r.x, ry = y - r.y, rd = Math.hypot(rx, ry) || 1, e = Math.abs(rd - rr);
        if (e < 46 * sc) { const f = (1 - e / (46 * sc)) * (1 - age / life) * (r.big ? 1 : 0.5); x += (rx / rd) * f * 16 * sc; y += (ry / rd) * f * 16 * sc; rip += f; }
      }
      const wv = 0.5 + 0.5 * Math.sin(t * 0.8 + gx * 0.42 + gy * 0.31 + scr * 6 + Math.sin(t * 0.21 + gy * 0.2) * 1.5);
      ctx.fillStyle = `rgba(${T.dot},${(T.dotA * (0.4 + wv * 0.6) + kk * 0.5 + rip * 0.35).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, (0.9 + wv * 0.6 + kk * 2.8 + rip * 1.6) * sc, 0, TAU); ctx.fill();
    }

    /* 4. wind lines: long thin trails, older half fainter; faster when you scroll */
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const PR = 220 * sc, speedUp = 1 + sv * 2.2;
    for (const p of parts) {
      p.life += dt; if (p.life > p.max || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { spawn(p, false); continue; }
      const a = Math.sin(p.x * 0.0036 + t * 0.24 + scr * 5) * 1.6 + Math.cos(p.y * 0.0047 - t * 0.19) * 1.6 + Math.sin((p.x + p.y) * 0.002 + t * 0.11) * 1.1;
      let vx = Math.cos(a) * p.v * speedUp, vy = Math.sin(a) * p.v * speedUp;
      const dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy) || 1;
      if (d < PR) { const f = (1 - d / PR); vx += (-dy / d) * f * 190 + (dx / d) * f * 70; vy += (dx / d) * f * 190 + (dy / d) * f * 70; }
      p.x += vx * dt; p.y += vy * dt;
      for (let i = TRAIL - 1; i > 0; i--) { p.xs[i] = p.xs[i - 1]; p.ys[i] = p.ys[i - 1]; }
      p.xs[0] = p.x; p.ys[0] = p.y;
      const env = Math.min(p.life / 0.8, 1, (p.max - p.life) / 1.2), boost = d < PR ? 1 + (1 - d / PR) * 0.9 : 1, A = T.streamA * env * 0.5 * boost;
      ctx.lineWidth = p.w * sc;
      const H2 = TRAIL >> 1;
      ctx.strokeStyle = `rgba(${T.stream},${A.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(p.xs[0], p.ys[0]); for (let i = 1; i <= H2; i++) ctx.lineTo(p.xs[i], p.ys[i]); ctx.stroke();
      ctx.strokeStyle = `rgba(${T.stream},${(A * 0.4).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(p.xs[H2], p.ys[H2]); for (let i = H2 + 1; i < TRAIL; i++) ctx.lineTo(p.xs[i], p.ys[i]); ctx.stroke();
    }

    /* 5. doodles: float on springs, get pushed + spun by the pointer, parallax with scroll */
    const damp = Math.pow(0.02, dt);
    for (const d of doodles) {
      const hx = d.hx + Math.sin(t * 0.33 + d.ph) * 20 * sc, hy = d.hy + Math.cos(t * 0.27 + d.ph2) * 16 * sc + r0.top * (d.depth - 0.55) * 0.3;
      d.vx += (hx - d.x) * 3.2 * dt; d.vy += (hy - d.y) * 3.2 * dt;
      const dx = d.x - sx, dy = d.y - sy, dist = Math.hypot(dx, dy) || 1, near = clamp(1 - dist / (230 * sc));
      if (near > 0) { const f = near * near * (900 + ptr.spd * 1400) * dt; d.vx += (dx / dist) * f; d.vy += (dy / dist) * f; d.vr += (dx > 0 ? 1 : -1) * near * 9 * dt * (1 + ptr.spd * 3); }
      d.vy += sv * (d.depth - 0.5) * 60 * dt;
      d.vx *= damp; d.vy *= damp;
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vr += (d.base - d.rot) * 2.4 * dt; d.vr *= Math.pow(0.08, dt); d.rot += d.vr * dt;
      const pulse = 1 + 0.06 * Math.sin(t * 1.1 + d.ph) + near * 0.35;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.scale(d.size * pulse * sc, d.size * pulse * sc);
      const al = clamp(d.a + near * 0.35, 0, 0.95);
      if (d.kind === "dot") { ctx.fillStyle = `rgba(${d.col},${al.toFixed(3)})`; drawMark(d, t); ctx.fill(); }
      else { ctx.strokeStyle = `rgba(${d.col},${al.toFixed(3)})`; ctx.lineWidth = d.lw / (d.size * pulse * sc); drawMark(d, t); ctx.stroke(); }
      ctx.restore();
    }

    /* 6. ripples + sparks */
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], age = t - r.t0, life = r.big ? 1.6 : 1.2;
      if (age > life) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(${T.ring},${((1 - age / life) * (r.big ? 0.5 : 0.28)).toFixed(3)})`; ctx.lineWidth = r.big ? 1.6 : 1.1;
      ctx.beginPath(); ctx.arc(r.x, r.y, age * (r.big ? 360 : 190) * sc, 0, TAU); ctx.stroke();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], age = t - s.t0;
      if (age > 1) { sparks.splice(i, 1); continue; }
      s.vx *= 0.96; s.vy *= 0.96; s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.fillStyle = `rgba(${s.c},${(1 - age).toFixed(3)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (1 - age * 0.5) * sc, 0, TAU); ctx.fill();
    }

    /* the pointer itself */
    ctx.fillStyle = `rgba(${T.ring},.85)`; ctx.beginPath(); ctx.arc(sx, sy, 3 * sc, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${T.ring},.35)`; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(sx, sy, (12 + Math.sin(t * 2.2) * 2.5 + ptr.spd * 8) * sc, 0, TAU); ctx.stroke();

    /* 7. film grain: same tile, hopped to a new offset every couple of frames */
    if (grainPat) {
      if ((gframe++ & 1) === 0) { gox = (rnd() * 160) | 0; goy = (rnd() * 160) | 0; }
      ctx.save(); ctx.globalAlpha = T.grain; ctx.globalCompositeOperation = "overlay"; ctx.translate(-gox, -goy); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + 160, H + 160); ctx.restore();
    }
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

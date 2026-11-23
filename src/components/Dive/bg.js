import gsap from "gsap";
import { capDpr, skipFrame } from "../../lib/perf.js";

/*
  The living backdrop of the Dive's first screen (canvas, behind the character):
    - a lattice of small crosses that swell, turn into an x and go blue near the pointer, and breathe in a slow wave when nothing moves
    - soft clouds drift across the sky; the pointer is a gust that parts them, and they ease back
    - a soft blue glow that follows the pointer with a lagging violet halo; with no pointer it wanders on its own (so touch screens feel alive too)
    - a click / tap sends a shock-wave through the crosses
  It fades out as the camera dives (progress), and sleeps whenever the section is off screen.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const INK = [5, 5, 5], BLUE = [63, 114, 238];
// one soft cloud, painted once into an offscreen sprite: a cluster of puffs with a cool shaded underside and a flat-ish base
function makeCloud(seedN) {
  const w = 560, h = 236, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  let s = seedN * 977; const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const n = 8 + seedN, puffs = [];
  for (let i = 0; i < n; i++) { const u = i / (n - 1), bell = Math.sin(u * Math.PI); puffs.push({ x: w * (0.1 + 0.8 * u) + (r() - 0.5) * 30, rad: h * (0.2 + 0.26 * bell + r() * 0.1), dy: (r() - 0.5) * 24 }); }
  const draw = (col, dy, a) => puffs.forEach((p) => { const y = h * 0.62 - p.rad * 0.35 + p.dy + dy, gr = g.createRadialGradient(p.x, y, 0, p.x, y, p.rad); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.6, `rgba(${col},${a * 0.55})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(p.x - p.rad, y - p.rad, p.rad * 2, p.rad * 2); });
  draw("130,160,215", 16, 0.5); draw("255,255,255", 0, 0.95);
  g.globalCompositeOperation = "destination-out"; const base = g.createLinearGradient(0, h * 0.66, 0, h * 0.92); base.addColorStop(0, "rgba(0,0,0,0)"); base.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = base; g.fillRect(0, h * 0.66, w, h);
  return c;
}

export default function initBg(stage, getP, isLive) {
  const cv = stage.querySelector("[data-dv-bg]");
  if (!cv) return () => {};
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, step = 64, sc = 1;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, hx: 0, hy: 0, psx: 0, psy: 0, last: -99, inside: false };
  const clouds = [], waves = [], sprites = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight; dpr = capDpr(1.75, 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    step = clamp(W / 22, 44, 84); sc = clamp(Math.min(W, H) / 800, 0.6, 1.5);
    sprites.length = 0; for (let i = 0; i < 4; i++) sprites.push(makeCloud(i + 1));
    const want = W < 768 ? 6 : 10; clouds.length = 0;
    for (let i = 0; i < want; i++) { const d = 0.45 + rnd() * 0.75, w = (300 + rnd() * 340) * d * sc * 1.1; clouds.push({ sp: sprites[i % 4], d, w, h: w * 0.42, x: rnd() * (W + w) - w * 0.5, y: H * (0.04 + rnd() * 0.8) - w * 0.2, v: 5 + d * 9, a: 0.2 + d * 0.34, ox: 0, oy: 0, vx: 0, vy: 0, ph: rnd() * 6.283 }); }
    if (!ptr.sx) { ptr.x = ptr.sx = ptr.hx = W * 0.5; ptr.y = ptr.sy = ptr.hy = H * 0.5; }
  };

  const rect = () => stage.getBoundingClientRect();
  const onMove = (e) => {
    const r = rect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = ptr.x >= 0 && ptr.y >= 0 && ptr.x <= r.width && ptr.y <= r.height;
    if (ptr.inside) ptr.last = gsap.ticker.time;
  };
  const onDown = (e) => {
    const r = rect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height || getP() > 0.2) return;
    ptr.x = x; ptr.y = y; ptr.last = gsap.ticker.time;
    if (waves.length < 6) waves.push({ x, y, t0: gsap.ticker.time });
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });

  let lastT = 0;
  const tick = (_, dtMs) => {
    if (!isLive()) return;
    const now = performance.now();
    if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const p = getP(), fade = 1 - seg(p, 0.1, 0.3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (fade <= 0.01) return;
    const t = gsap.ticker.time, dt = Math.min(0.05, dtMs / 1000 || 0.016);
    lastT = t;

    // pointer targets: the real one, or a slow wander when idle
    const idle = t - ptr.last > 2.4;
    const tx = idle ? W * (0.5 + 0.3 * Math.sin(t * 0.23)) : ptr.x, ty = idle ? H * (0.5 + 0.22 * Math.sin(t * 0.31 + 1)) : ptr.y;
    ptr.sx += (tx - ptr.sx) * 0.12; ptr.sy += (ty - ptr.sy) * 0.12;
    ptr.hx += (tx - ptr.hx) * 0.045; ptr.hy += (ty - ptr.hy) * 0.045;
    const sx = ptr.sx, sy = ptr.sy;
    ctx.globalAlpha = fade;

    // glow + lagging halo
    let g = ctx.createRadialGradient(ptr.hx, ptr.hy, 0, ptr.hx, ptr.hy, 560 * sc);
    g.addColorStop(0, "rgba(143,123,255,.16)"); g.addColorStop(1, "rgba(143,123,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 380 * sc);
    g.addColorStop(0, idle ? "rgba(63,114,238,.2)" : "rgba(63,114,238,.28)"); g.addColorStop(1, "rgba(63,114,238,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // lattice of crosses
    const R = 230 * sc, ox = ((sx - W / 2) / W) * -14 + 0.5 * step, oy = (-p * 160 + ((sy - H / 2) / H) * -10) % step + 0.5 * step;
    for (let i = waves.length - 1; i >= 0; i--) if (t - waves[i].t0 > 1.5) waves.splice(i, 1);
    ctx.lineCap = "round"; ctx.lineWidth = 1.3;
    for (let gy = -1; gy * step < H + step; gy++) for (let gx = -1; gx * step < W + step; gx++) {
      const x = gx * step + ox, y = gy * step + oy, dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy);
      let f = 0.14 * (0.5 + 0.5 * Math.sin(t * 0.8 + (gx + gy) * 0.38)) + Math.pow(Math.max(0, 1 - d / R), 2) * 1.1;
      for (const w of waves) { const age = t - w.t0, wd = Math.hypot(x - w.x, y - w.y), band = 1 - Math.abs(wd - age * 560) / 70; if (band > 0) f += band * (1 - age / 1.5) * 1.2; }
      f = Math.min(f, 1.4);
      const s = (2.6 + f * 6.2) * sc, k = clamp(f * 1.4), rot = Math.min(f, 1) * 0.785;
      ctx.strokeStyle = `rgba(${lerp(INK[0], BLUE[0], k) | 0},${lerp(INK[1], BLUE[1], k) | 0},${lerp(INK[2], BLUE[2], k) | 0},${(0.16 + Math.min(f, 1) * 0.72).toFixed(3)})`;
      const c = Math.cos(rot) * s, sn = Math.sin(rot) * s;
      ctx.beginPath(); ctx.moveTo(x - c, y - sn); ctx.lineTo(x + c, y + sn); ctx.moveTo(x + sn, y - c); ctx.lineTo(x - sn, y + c); ctx.stroke();
    }

    // clouds: drift on their own; the pointer is a gust, so they part around it and ease back
    const pvx = (sx - ptr.psx) / Math.max(dt, 0.008), pvy = (sy - ptr.psy) / Math.max(dt, 0.008); ptr.psx = sx; ptr.psy = sy;
    for (const c of clouds) {
      c.x += c.v * dt; if (c.x > W + c.w) c.x = -c.w * 1.1;
      const cx = c.x + c.ox + c.w / 2, cy = c.y + c.oy + c.h / 2 + Math.sin(t * 0.3 + c.ph) * 5 * c.d;
      const dx = cx - sx, dy = cy - sy, d = Math.hypot(dx, dy) || 1, Rr = (230 + c.w * 0.32) * sc;
      if (d < Rr) { const f = (1 - d / Rr) ** 2; c.vx += ((dx / d) * 520 * f + pvx * 0.05 * f) * dt * c.d; c.vy += ((dy / d) * 380 * f + pvy * 0.05 * f) * dt * c.d; }
      c.vx += -c.ox * 2.6 * dt; c.vy += -c.oy * 2.6 * dt; c.vx *= 0.93; c.vy *= 0.93; c.ox += c.vx * dt; c.oy += c.vy * dt;
      ctx.globalAlpha = fade * c.a; ctx.drawImage(c.sp, c.x + c.ox, c.y + c.oy + Math.sin(t * 0.3 + c.ph) * 5 * c.d, c.w, c.h);
    }
    ctx.globalAlpha = fade;
    ctx.globalAlpha = 1;
  };
  gsap.ticker.add(tick);
  const onResize = () => measure();
  window.addEventListener("resize", onResize);
  measure();

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown);
    void lastT;
  };
}


/*
  The night on the far side of the eye (canvas behind the book and the copy). Deliberately quiet:
    - a fine dot lattice (the hero's cross grid, calmer) that fades out away from the book and warms up near the pointer
    - two hairline orbits around the card
    - a sparse field of pin-sharp stars in two depths, with a slow, shallow twinkle and a little parallax
    - a soft light that trails the pointer
  Base colour, spotlight, vignette and film grain live in dive.css, so there is nothing here to repaint except the points.
*/
export function initNightBg(night, getP, isLive) {
  const cv = night.querySelector("[data-dv-nbg]");
  if (!cv) return () => {};
  const ctx = cv.getContext("2d"), TAU = 6.283;
  let W = 0, H = 0, dpr = 1, sc = 1, step = 36;
  const layers = [[], []], DEP = [6, 16];
  const ptr = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, hx: 0.5, hy: 0.5, last: -99 };
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const TINT = ["236,241,255", "236,241,255", "236,241,255", "176,198,255"];

  const measure = () => {
    W = night.clientWidth; H = night.clientHeight; dpr = capDpr(1.5, 1.1); sc = clamp(Math.min(W, H * 1.5) / 900, 0.7, 1.3);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    step = clamp(W / 40, 28, 44);
    const k = W < 768 ? 0.55 : 1, want = [46, 22];
    layers.forEach((L, i) => { const n = (want[i] * k) | 0; while (L.length < n) L.push({ x: rnd() * W, y: rnd() * H, r: 0.55 + i * 0.35 + rnd() * 0.45, ph: rnd() * TAU, sp: 0.35 + rnd() * 0.9, a: 0.35 + rnd() * 0.5, c: TINT[(rnd() * TINT.length) | 0], glow: i === 1 && rnd() < 0.22 }); L.length = n; });
  };
  const onMove = (e) => {
    const r = night.getBoundingClientRect(); ptr.x = clamp((e.clientX - r.left) / r.width); ptr.y = clamp((e.clientY - r.top) / r.height); ptr.last = gsap.ticker.time;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const tick = (_, dtMs) => {
    if (!isLive()) return;
    const now = performance.now(); if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const t = gsap.ticker.time, dt = Math.min(0.05, dtMs / 1000 || 0.016), fade = seg(getP(), 0.6, 0.72);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (fade <= 0.01) return;
    const idle = t - ptr.last > 2.4, tx = idle ? 0.5 + 0.28 * Math.sin(t * 0.17) : ptr.x, ty = idle ? 0.5 + 0.2 * Math.sin(t * 0.23 + 1) : ptr.y;
    ptr.sx += (tx - ptr.sx) * 0.09; ptr.sy += (ty - ptr.sy) * 0.09; ptr.hx += (tx - ptr.hx) * 0.03; ptr.hy += (ty - ptr.hy) * 0.03;
    const mx = ptr.sx * W, my = ptr.sy * H, ox = (ptr.sx - 0.5), oy = (ptr.sy - 0.5);
    ctx.globalAlpha = fade;

    // light that trails the pointer: cool, wide, barely there
    { const x = ptr.hx * W, y = ptr.hy * H, r = Math.max(W, H) * 0.34, g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(120,150,235,0.085)"); g.addColorStop(1, "rgba(120,150,235,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    // dot lattice: strongest around the card, gone toward the edges, lifts under the pointer
    {
      const fx = W * 0.3, fy = H * 0.52, R = Math.max(W, H) * 0.62, R2 = 170 * sc, px = -ox * 8, py = -oy * 8;
      for (let gy = -1; gy * step < H + step; gy++) for (let gx = -1; gx * step < W + step; gx++) {
        const x = gx * step + px + step * 0.5, y = gy * step + py + step * 0.5;
        const d = Math.hypot(x - fx, y - fy), base = Math.pow(Math.max(0, 1 - d / R), 1.6), near = Math.pow(Math.max(0, 1 - Math.hypot(x - mx, y - my) / R2), 2);
        const a = 0.03 + base * 0.12 + near * 0.34; if (a < 0.012) continue;
        const sz = (1.1 + near * 1.3) * sc;
        ctx.fillStyle = near > 0.15 ? `rgba(150,176,255,${a.toFixed(3)})` : `rgba(190,205,240,${a.toFixed(3)})`; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }

    // two hairline orbits around the card side
    {
      const cx = W * 0.3, cy = H * 0.54, rx = W * 0.27, ry = H * 0.3, rot = -0.32;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(170,190,240,0.075)"; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(170,190,240,0.04)"; ctx.beginPath(); ctx.ellipse(0, 0, rx * 1.3, ry * 1.3, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // pin-sharp stars
    layers.forEach((L, li) => {
      for (const s of L) {
        s.y -= (1 + li * 1.6) * dt; if (s.y < -4) { s.y = H + 4; s.x = rnd() * W; }
        const x = s.x - ox * DEP[li] * 2, y = s.y - oy * DEP[li] * 2, tw = 0.82 + 0.18 * Math.sin(t * s.sp + s.ph), a = (s.a * tw).toFixed(3);
        if (s.glow) { const g = ctx.createRadialGradient(x, y, 0, x, y, 9 * sc); g.addColorStop(0, `rgba(${s.c},${(s.a * 0.35 * tw).toFixed(3)})`); g.addColorStop(1, `rgba(${s.c},0)`); ctx.fillStyle = g; ctx.fillRect(x - 9 * sc, y - 9 * sc, 18 * sc, 18 * sc); }
        ctx.fillStyle = `rgba(${s.c},${a})`; ctx.beginPath(); ctx.arc(x, y, s.r * sc, 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  };
  gsap.ticker.add(tick);
  const onResize = () => measure(); window.addEventListener("resize", onResize); measure();
  return () => { gsap.ticker.remove(tick); window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onMove); };
}

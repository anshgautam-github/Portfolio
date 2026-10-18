// "Hold to collaborate" — state machine + effects. The 3D world (landscape + hands) is drawn by gl3d.js on one canvas; sparks, petals,
// shock rings and the flash are drawn here on a transparent 2D canvas on top.
import { createGL3D } from "./gl3d.js";
import { capDpr } from "../../lib/perf.js";
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function createScene(glCanvas, fxCanvas) {
  let gl3 = null;
  try { gl3 = createGL3D(glCanvas); } catch (e) { console.warn("[collab] WebGL scene unavailable", e); }
  const ctx = fxCanvas.getContext("2d");
  let W = 0, H = 0, gw = 2, gh = 2, dpr = 1, S = 1, scale = 0.6, last = 0, acc = 0, nfr = 0;
  const st = { p: 0, shown: 0, done: false, hs: 0, flash: 0, shake: 0, t: 0, since: 0, onDone: null, onReset: null, mouse: [0, 0], mouseT: [0, 0] };
  const rings = [], parts = [], petals = [];
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) petals.push(newPetal(true));
  function newPetal(init) { return { x: rnd(), y: init ? rnd() : -0.1, z: 0.35 + rnd() * 1.0, r: rnd() * TAU, vr: (rnd() - 0.5) * 1.6, ph: rnd() * TAU, c: rnd() }; }

  function resize() {
    const r = fxCanvas.getBoundingClientRect();
    dpr = capDpr(2, 1.25);
    W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
    fxCanvas.width = W; fxCanvas.height = H;
    S = Math.max(W / 1750, H / 1050);
    sizeGL();
  }
  function sizeGL() {
    gw = Math.max(2, Math.round(W / dpr * Math.min(dpr, 1.25) * scale)); gh = Math.max(2, Math.round(H / dpr * Math.min(dpr, 1.25) * scale));
    glCanvas.width = gw; glCanvas.height = gh;
  }

  function burst(cx, cy, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, v = (80 + rnd() * 1000) * S;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.9 + rnd() * 1.6, s: (1 + rnd() * 2.6) * dpr, c: rnd(), petal: rnd() < 0.12, r: rnd() * TAU });
    }
    for (let k = 0; k < 3; k++) rings.push({ x: cx, y: cy, t: -k * 0.12 });
  }
  const col = (c, a) => (c > 0.66 ? `rgba(255,200,130,${a})` : c > 0.33 ? `rgba(255,255,255,${a})` : `rgba(255,150,190,${a})`);

  function petal(x, y, size, rot, c, alpha, blur) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
    if (blur) { ctx.shadowColor = "rgba(255,120,170,.8)"; ctx.shadowBlur = blur; }
    const g = ctx.createLinearGradient(-size, 0, size, 0);
    g.addColorStop(0, c > 0.5 ? "#ff7fb0" : "#ff9cc2"); g.addColorStop(0.55, "#ffc4da"); g.addColorStop(1, c > 0.5 ? "#e0457f" : "#f06a9c");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-size, 0); ctx.bezierCurveTo(-size * 0.5, -size * 0.95, size * 0.8, -size * 0.8, size, 0); ctx.bezierCurveTo(size * 0.7, size * 0.7, -size * 0.55, size * 0.85, -size, 0); ctx.fill();
    ctx.restore();
  }

  function frame(dt, holding) {
    dt = Math.min(dt, 0.05); st.t += dt; st.since += dt;
    if (!st.done) {
      if (holding) st.p = Math.min(1, st.p + dt / 2.8); else st.p = Math.max(0, st.p - dt / 1.1);
      st.shown += (st.p - st.shown) * (1 - Math.pow(0.0005, dt));
      if (st.p >= 1) { st.done = true; st.since = 0; st.hs = 0; st.flash = 1; st.shake = 1; burst(W / 2, H * 0.5, 300); st.onDone && st.onDone(); }
    } else {
      st.hs = Math.min(1, st.hs + dt / 1.25);
      st.shown += (1 - st.shown) * (1 - Math.pow(0.0001, dt));
    }
    st.flash = Math.max(0, st.flash - dt * 1.5);
    st.shake = Math.max(0, st.shake - dt * 1.3);
    st.mouse[0] += (st.mouseT[0] - st.mouse[0]) * (1 - Math.pow(0.02, dt)); st.mouse[1] += (st.mouseT[1] - st.mouse[1]) * (1 - Math.pow(0.02, dt));

    const p = st.shown, T = st.t, cx = W / 2, cy = H * 0.5;
    const tension = Math.pow(p, 2.2) * (st.done ? 0 : 1);
    const calm = st.done ? clamp((st.hs - 0.2) / 0.8) : 0;

    // ---- adaptive resolution of the 3D pass
    const now = performance.now();
    if (last) { acc += now - last; nfr++; if (nfr >= 8) { const ms = acc / nfr; if (ms > 20 && scale > 0.35) { scale = Math.max(0.35, scale - 0.1); sizeGL(); } else if (ms < 12 && scale < 0.8) { scale = Math.min(0.8, scale + 0.05); sizeGL(); } acc = 0; nfr = 0; } }
    last = now;

    if (gl3) gl3.draw(gw, gh, { t: T, p, tension, calm, hs: st.hs, shake: st.shake, mouse: st.mouse });

    // ---- 2D overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!gl3) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.6); g.addColorStop(0, "#1a2f66"); g.addColorStop(1, "#02040a"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    // petals drifting through the light; they get pulled to the middle as the hold builds
    for (const q of petals) {
      q.y += dt * 0.045 * q.z; q.x += Math.sin(T * 0.7 + q.ph) * dt * 0.02 + dt * 0.012; q.r += q.vr * dt;
      if (q.y > 1.1) { Object.assign(q, newPetal(false)); q.x = rnd(); }
      const pull = (tension * 0.5 + p * 0.1) * q.z;
      const x = lerp(q.x * W, cx, pull), y = lerp(q.y * H, cy, pull);
      const sz = (3 + 6.5 * q.z * q.z) * dpr * (S * 0.8 + 0.2);
      petal(x, y, sz, q.r + T * 0.3, q.c, 0.5 + 0.35 * (q.z - 0.35), q.z > 1.15 ? 4 : 0);
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.life += dt;
      if (q.life > q.max) { parts.splice(i, 1); continue; }
      q.vx *= Math.pow(0.18, dt); q.vy = q.vy * Math.pow(0.18, dt) + 60 * S * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      const a = 1 - q.life / q.max;
      if (q.petal) { ctx.globalCompositeOperation = "source-over"; petal(q.x, q.y, q.s * 2.0, q.r + q.life * 3, q.c, a, 0); ctx.globalCompositeOperation = "lighter"; continue; }
      ctx.fillStyle = col(q.c, (a * a).toFixed(3));
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (0.6 + a), 0, TAU); ctx.fill();
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt * 0.9;
      if (r.t > 1) { rings.splice(i, 1); continue; }
      if (r.t < 0) continue;
      const rr = easeOut(r.t) * Math.hypot(W, H) * 0.55, a = (1 - r.t) * 0.8;
      ctx.strokeStyle = `rgba(255,224,176,${a.toFixed(3)})`; ctx.lineWidth = (3 + 10 * (1 - r.t)) * dpr;
      ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, TAU); ctx.stroke();
    }
    if (st.flash > 0.001) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.7);
      g.addColorStop(0, `rgba(255,250,236,${st.flash.toFixed(3)})`); g.addColorStop(0.45, `rgba(255,200,130,${(st.flash * 0.7).toFixed(3)})`); g.addColorStop(1, "rgba(255,170,90,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const fh = Math.max(2, H * 0.014 * st.flash);
      const fg = ctx.createLinearGradient(0, 0, W, 0); fg.addColorStop(0, "rgba(140,190,255,0)"); fg.addColorStop(0.5, `rgba(255,244,222,${st.flash.toFixed(3)})`); fg.addColorStop(1, "rgba(140,190,255,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, cy - fh / 2, W, fh);
    }
    ctx.restore();
  }

  function reset() { st.p = 0; st.done = false; st.hs = 0; st.since = 0; parts.length = 0; rings.length = 0; st.onReset && st.onReset(); }
  return { st, frame, resize, reset };
}

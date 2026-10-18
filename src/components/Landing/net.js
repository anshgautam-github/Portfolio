import { capDpr } from "../../lib/perf.js";
/* A small living neural network drawn on a canvas: signals travel layer to layer, nodes light up and ring when a signal
   arrives, the pointer excites and tugs nearby nodes, a click fires a wave from the input layer. Runs only while started. */
const LAYERS = [3, 5, 6, 5, 2];
const IN = ["data", "prompt", "eval"];
const OUT = ["ship", "scale"];

export function createNet(canvas) {
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, raf = 0, running = false, last = 0, t = 0, spawnAt = 0;
  const m = { x: -999, y: -999, in: false };

  const nodes = [];
  LAYERS.forEach((n, l) => { for (let j = 0; j < n; j++) nodes.push({ l, j, n, x: 0, y: 0, bx: 0, by: 0, act: 0, ph: Math.random() * 6.28, jit: (Math.random() - 0.5) * 0.05, out: [] }); });
  const layer = (l) => nodes.filter((n) => n.l === l);
  const edges = [];
  for (let l = 0; l < LAYERS.length - 1; l++) for (const a of layer(l)) for (const b of layer(l + 1)) { const e = { a, b, hot: 0 }; edges.push(e); a.out.push(e); }
  let signals = [];

  const layout = () => {
    nodes.forEach((n) => {
      n.bx = W * (0.16 + (n.l / (LAYERS.length - 1)) * 0.68);
      n.by = H * (0.5 + ((n.j + 0.5) / n.n - 0.5) * (n.n === 2 ? 0.34 : n.n === 3 ? 0.4 : 0.62) + n.jit);
    });
  };
  const size = () => {
    const dpr = capDpr(1.5, 1.25);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    if (!running) draw();
  };

  const fire = (e, spd = 0.7 + Math.random() * 0.5) => { if (signals.length < 110) signals.push({ e, p: 0, spd }); };
  const fireFrom = (n) => { const o = n.out; if (!o.length) return; const k = 1 + (Math.random() < 0.55 ? 1 : 0); for (let i = 0; i < k; i++) fire(o[(Math.random() * o.length) | 0]); };

  const step = (dt) => {
    t += dt;
    nodes.forEach((n) => {
      n.x = n.bx + Math.sin(t * 0.7 + n.ph) * 7;
      n.y = n.by + Math.cos(t * 0.55 + n.ph * 1.3) * 7;
      if (m.in) {
        const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy);
        if (d < 170) { const f = 1 - d / 170; n.act = Math.max(n.act, f * 0.9); n.x += dx * f * 0.14; n.y += dy * f * 0.14; }
      }
      n.act = Math.max(0, n.act - dt * 1.1);
    });
    edges.forEach((e) => (e.hot = Math.max(0, e.hot - dt * 1.6)));
    spawnAt -= dt;
    if (spawnAt <= 0) { spawnAt = 0.16 + Math.random() * 0.22; fire(edges[(Math.random() * layer(0).length * LAYERS[1]) | 0]); }
    signals = signals.filter((s) => {
      s.p += dt * s.spd;
      s.e.hot = 1;
      if (s.p >= 1) { s.e.b.act = 1; if (s.e.b.l < LAYERS.length - 1) fireFrom(s.e.b); return false; }
      return true;
    });
  };

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    // edges
    for (const e of edges) {
      const a = e.a, b = e.b;
      const hot = Math.max(e.hot, (a.act + b.act) * 0.35);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = hot > 0.02 ? `rgba(47,95,224,${0.1 + hot * 0.45})` : "rgba(17,17,17,0.09)";
      ctx.lineWidth = 0.8 + hot * 0.8;
      ctx.stroke();
    }
    // travelling signals (short comet)
    for (const s of signals) {
      const { a, b } = s.e;
      const hx = a.x + (b.x - a.x) * s.p, hy = a.y + (b.y - a.y) * s.p;
      const tp = Math.max(0, s.p - 0.16), tx = a.x + (b.x - a.x) * tp, ty = a.y + (b.y - a.y) * tp;
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "rgba(47,95,224,0)"); g.addColorStop(1, "rgba(47,95,224,0.95)");
      ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = "rgba(47,95,224,0.22)"; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#2f5fe0"; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, 6.283); ctx.fill();
    }
    // nodes
    for (const n of nodes) {
      const r = n.l === LAYERS.length - 1 ? 8.5 : 5.2;
      if (n.act > 0.02) {
        ctx.strokeStyle = `rgba(47,95,224,${n.act * 0.5})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(n.x, n.y, r + (1 - n.act) * 22, 0, 6.283); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, r + n.act * 2.2, 0, 6.283);
      ctx.fillStyle = n.act > 0.05 ? `rgba(${Math.round(243 - n.act * 196)},${Math.round(240 - n.act * 145)},${Math.round(232 - n.act * 8)},1)` : "#f3f0e8";
      ctx.fill();
      ctx.strokeStyle = n.act > 0.05 ? "#2f5fe0" : "rgba(17,17,17,0.55)"; ctx.lineWidth = 1.3; ctx.stroke();
    }
    // labels
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = "rgba(17,17,17,0.55)";
    layer(0).forEach((n, i) => { ctx.textAlign = "right"; ctx.fillText(IN[i] || "", n.x - 14, n.y + 4); });
    layer(LAYERS.length - 1).forEach((n, i) => { ctx.textAlign = "left"; ctx.fillText(OUT[i] || "", n.x + 17, n.y + 4); });
  };

  const loop = (now) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    step(dt); draw();
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    m.x = e.clientX - r.left; m.y = e.clientY - r.top;
    m.in = m.x > -60 && m.x < W + 60 && m.y > -60 && m.y < H + 60;
  };
  const onDown = () => { if (m.in) layer(0).forEach((n) => { n.act = 1; fireFrom(n); fireFrom(n); }); };
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  size();
  if (reduce) { for (let i = 0; i < 90; i++) step(0.05); draw(); }

  return {
    start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown); },
  };
}

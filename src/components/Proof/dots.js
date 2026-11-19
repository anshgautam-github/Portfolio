/* Interactive dot-matrix number: a grid of dots, some lit to spell `text`. The lit dots rise into place from below, then react to the pointer
   (they part around it and glow) and to clicks (a ripple pushes them outward). The loop only runs while the canvas is on screen and moving. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function sample(stops, t) {
  const n = stops.length - 1, f = clamp(t) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * u);
}

export function mountDots(canvas, { text, stops: hexStops, gap = 9, reduce = false, onTouch }) {
  const ctx = canvas.getContext("2d");
  const stops = hexStops.map(hex);
  let W = 0, H = 0, dpr = 1, dots = [], sparks = [], raf = 0, running = false, visible = false, started = false;
  let t0 = 0, calm = 0;
  const ptr = { x: -1e4, y: -1e4, on: false };
  let ripples = [];
  let destroyed = false;

  const build = () => {
    const r = canvas.getBoundingClientRect();
    W = Math.max(10, r.width); H = Math.max(10, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const cols = Math.floor(W / gap), rows = Math.floor(H / gap);
    if (cols < 2 || rows < 2) { dots = []; sparks = []; return; }                 // hidden / collapsed: nothing to draw yet (a zero-size canvas would throw)
    const ox = (W - cols * gap) / 2 + gap / 2, oy = (H - rows * gap) / 2 + gap / 2;
    const m = document.createElement("canvas"); m.width = cols; m.height = rows;
    const mx = m.getContext("2d", { willReadFrequently: true });
    const face = '"Inter Tight","Helvetica Neue",Arial,sans-serif';
    let fs = rows * 0.8;
    mx.font = `800 ${fs}px ${face}`;
    const tw = mx.measureText(text).width;
    if (tw > cols * 0.8) { fs *= (cols * 0.8) / tw; mx.font = `800 ${fs}px ${face}`; }
    const mt = mx.measureText(text);
    mx.textAlign = "center"; mx.fillStyle = "#fff";
    mx.fillText(text, cols / 2, rows / 2 + (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2);
    const px = mx.getImageData(0, 0, cols, rows).data;
    let minX = cols, maxX = 0;
    const on = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (px[(y * cols + x) * 4 + 3] > 120) { on[y * cols + x] = 1; if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
    dots = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const lit = on[y * cols + x] === 1;
      const hx = ox + x * gap, hy = oy + y * gap;
      const u = lit ? (x - minX) / Math.max(1, maxX - minX) : 0;
      dots.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, lit, col: lit ? sample(stops, u) : null, d: lit ? u * 0.6 + Math.random() * 0.25 : Math.random() * 0.5, off: 70 + Math.random() * 150 });
    }
    sparks = dots.filter((d) => !d.lit && Math.random() < 0.012).map((d) => ({ d, ph: Math.random() * 6.28, col: sample(stops, Math.random()) }));
    calm = 0; kick();
  };

  const frame = (now) => {
    raf = 0;
    if (destroyed || !running) return;
    const t = started ? (now - t0) / 1000 : 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const R = 120, R2 = R * R;
    ripples = ripples.filter((r) => now - r.t < 1400);
    let introDone = true;
    const glowAll = clamp(t / 1.2);

    ctx.beginPath();
    const sweepX = ((t * 0.17) % 2.4 - 0.7) * W, sweepW = W * 0.075;    // a slow band of light drifts across the lit dots once the number has formed
    for (const d of dots) {
      let p = 1;
      if (d.lit) { p = reduce ? 1 : easeOut(clamp((t - d.d) / 0.95)); if (p < 1) introDone = false; }
      const rx = d.hx, ry = d.hy + (d.lit ? (1 - p) * d.off : 0);
      let fx = 0, fy = 0;
      if (!ptr.on && !ripples.length && d.vx === 0 && d.vy === 0 && d.x === rx && d.y === ry) continue;   // at rest: nothing to compute
      if (ptr.on) {
        const dx = d.x - ptr.x, dy = d.y - ptr.y, q = dx * dx + dy * dy;
        if (q < R2 && q > 0.01) { const dist = Math.sqrt(q), f = Math.pow(1 - dist / R, 2) * 5.2; fx += (dx / dist) * f; fy += (dy / dist) * f; }
      }
      for (const r of ripples) {
        const age = (now - r.t) / 1000, rad = age * 560, dx = d.x - r.x, dy = d.y - r.y, dist = Math.hypot(dx, dy) || 1, band = 70;
        const e = Math.abs(dist - rad);
        if (e < band) { const f = (1 - e / band) * (1 - age / 1.4) * 7; fx += (dx / dist) * f; fy += (dy / dist) * f; }
      }
      d.vx = (d.vx + fx + (rx - d.x) * 0.09) * 0.8; d.vy = (d.vy + fy + (ry - d.y) * 0.09) * 0.8;
      d.x += d.vx; d.y += d.vy;
      if (Math.abs(d.vx) < 0.002 && Math.abs(d.vy) < 0.002 && Math.abs(rx - d.x) < 0.01 && Math.abs(ry - d.y) < 0.01) { d.x = rx; d.y = ry; d.vx = d.vy = 0; }
    }
    for (const d of dots) if (!d.lit) ctx.rect(d.x - 0.85, d.y - 0.85, 1.7, 1.7);
    ctx.fillStyle = `rgba(255,255,255,${(0.075 * glowAll).toFixed(3)})`;
    ctx.fill();

    for (const s of sparks) {
      const a = (0.25 + 0.35 * Math.sin(t * 1.6 + s.ph)) * glowAll;
      ctx.fillStyle = `rgba(${s.col[0] | 0},${s.col[1] | 0},${s.col[2] | 0},${Math.max(0, a).toFixed(3)})`;
      ctx.fillRect(s.d.x - 1.1, s.d.y - 1.1, 2.2, 2.2);
    }

    for (const d of dots) {
      if (!d.lit) continue;
      let g = 0;
      if (ptr.on) { const dist = Math.hypot(d.x - ptr.x, d.y - ptr.y); g = clamp(1 - dist / (R * 1.25)); }
      if (introDone && !reduce) { const q = (d.hx - sweepX) / sweepW; g = Math.max(g, Math.exp(-q * q) * 0.6); }
      const p = reduce ? 1 : easeOut(clamp((t - d.d) / 0.95));
      if (p <= 0.01) continue;
      const k = g * 0.55, c = d.col;
      ctx.fillStyle = `rgba(${(c[0] + (255 - c[0]) * k) | 0},${(c[1] + (255 - c[1]) * k) | 0},${(c[2] + (255 - c[2]) * k) | 0},${(p * (0.9 + g * 0.1)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 1.75 + g * 1.05, 0, 6.2832); ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  };

  const kick = () => { calm = 0; if (!running && visible && started) { running = true; raf = requestAnimationFrame(frame); } };

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMove = (e) => { const p = local(e); ptr.x = p.x; ptr.y = p.y; if (!ptr.on) { ptr.on = true; onTouch && onTouch(); } kick(); };
  const onLeave = () => { ptr.on = false; ptr.x = ptr.y = -1e4; kick(); };
  const onDown = (e) => { const p = local(e); ripples.push({ x: p.x, y: p.y, t: performance.now() }); ptr.x = p.x; ptr.y = p.y; ptr.on = e.pointerType !== "touch"; onTouch && onTouch(); kick(); };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);

  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); else { running = false; cancelAnimationFrame(raf); raf = 0; } }, { threshold: 0.05 });
  io.observe(canvas);
  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (!destroyed) build(); }, 120); });
  ro.observe(canvas);
  build();

  return {
    start() { if (started) return; started = true; t0 = performance.now(); kick(); },
    destroy() {
      destroyed = true; running = false; cancelAnimationFrame(raf); clearTimeout(rt); io.disconnect(); ro.disconnect();
      canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave); canvas.removeEventListener("pointerdown", onDown);
    },
  };
}

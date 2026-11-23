/* All the art in the Journey is painted here with the canvas 2d api (no image files): sky, hill + maple, sea, pond, shore, the big leaf, koi, flowers.
   Each build*(W, H, dpr) returns an offscreen canvas that the scene blits every frame. Deterministic: same seed, same picture. */

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
export const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mk = (W, H, dpr) => { const c = document.createElement("canvas"); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr); const x = c.getContext("2d"); x.scale(dpr, dpr); return [c, x]; };
const pick = (a, r) => a[Math.floor(r() * a.length)];

export const LEAF_COLORS = ["#d62d1b", "#e8571f", "#f0922b", "#f5b83a", "#a8201a", "#c43a1f"];
const LEAF = typeof Path2D !== "undefined" ? new Path2D("M0 -1 C0.55 -0.5 0.6 0.4 0 1 C-0.6 0.4 -0.55 -0.5 0 -1 Z") : null;

/* optional painted sprites (public/journey/*.png): when present they replace the code-drawn leaf / koi / flower */
export const sprites = { leaves: [], koi: null, flower: null };

export function leaf(ctx, x, y, size, rot, flip, color, alpha = 1) {
  if (sprites.leaves.length) {
    let h = 0; for (let i = 0; i < color.length; i++) h += color.charCodeAt(i);
    const im = sprites.leaves[h % sprites.leaves.length], asp = im.width / im.height;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size * flip, size); ctx.drawImage(im, -asp, -1, asp * 2, 2); ctx.restore();
    return;
  }
  if (!LEAF) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(size * flip, size);
  ctx.fillStyle = color; ctx.fill(LEAF);
  ctx.strokeStyle = "rgba(80,16,8,.5)"; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(0, 1); ctx.stroke();
  ctx.restore();
}

function maple(ctx, x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function cloud(ctx, cx, cy, r, rnd) {
  ctx.fillStyle = "rgba(150,190,238,.28)"; ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.28, r * 1.45, r * 0.34, 0, 0, TAU); ctx.fill();
  const n = Math.round(r / 5) + 12;
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * r, x = cx + Math.cos(a) * d * 1.5, y = cy + Math.sin(a) * d * 0.55, rr = r * (0.2 + rnd() * 0.24);
    const g = ctx.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr);
    g.addColorStop(0, "rgba(255,254,244,1)"); g.addColorStop(0.65, "rgba(255,246,224,.96)"); g.addColorStop(1, "rgba(215,232,250,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
  }
}

function streaks(ctx, W, H, r, n, y0, y1) {
  for (let i = 0; i < n; i++) {
    const px = W * (0.4 + r() * 0.65), py = lerp(y0, y1, r()), len = H * (0.08 + r() * 0.34), th = 2 + r() * H * 0.011;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.72);
    ctx.fillStyle = `rgba(${170 + ((r() * 60) | 0)},${220 + ((r() * 30) | 0)},255,${0.16 + r() * 0.34})`;
    ctx.fillRect(-len / 2, -th / 2, len, th); ctx.fillRect(-len / 3, th * 0.3, len * 0.6, th * 0.8); ctx.fillRect(len * 0.1, -th * 1.1, len * 0.3, th * 0.7);
    ctx.restore();
  }
}

/* sky: twice the screen tall, so the camera can tilt from the clouds up to the open sky */
export function buildSky(W, H, dpr) {
  const [c, x] = mk(W, H * 2, dpr), r = mulberry(7);
  const g = x.createLinearGradient(0, 0, 0, H * 2);
  g.addColorStop(0, "#2a5fe0"); g.addColorStop(0.4, "#3a8cf1"); g.addColorStop(0.8, "#62b9fb"); g.addColorStop(1, "#b9e6ff");
  x.fillStyle = g; x.fillRect(0, 0, W, H * 2);
  streaks(x, W, H, r, 52, 0, H * 1.7);
  cloud(x, W * 0.06, H * 0.3, H * 0.13, r);
  for (let i = 0; i < 9; i++) cloud(x, -W * 0.02 + r() * W * 0.16, H * (1.05 + i * 0.1), H * (0.14 + r() * 0.1), r);
  for (let i = 0; i < 15; i++) cloud(x, (W * i) / 14 + (r() - 0.5) * W * 0.05, H * 2 - H * (0.05 + r() * 0.12), H * (0.1 + r() * 0.13), r);
  cloud(x, W * 0.92, H * 1.78, H * 0.16, r);
  return c;
}

/* hill + a maple tree + rocks, transparent background */
export function buildHill(W, H, dpr) {
  const [c, x] = mk(W, H, dpr), r = mulberry(21), s = H / 900;
  const P = [[0, 0.6 * H], [0.35 * W, 0.6 * H], [0.7 * W, 0.78 * H], [W, 0.98 * H]];
  const bez = (t) => { const u = 1 - t; return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]]; };
  const samples = Array.from({ length: 241 }, (_, i) => bez(i / 240));
  const ridgeY = (xq) => { let b = samples[0], d = 1e9; for (const p of samples) { const dd = Math.abs(p[0] - xq); if (dd < d) { d = dd; b = p; } } return b[1]; };
  const hill = new Path2D(); hill.moveTo(0, P[0][1]); hill.bezierCurveTo(P[1][0], P[1][1], P[2][0], P[2][1], P[3][0], P[3][1]); hill.lineTo(W, H); hill.lineTo(0, H); hill.closePath();
  x.save(); x.clip(hill);
  const g = x.createLinearGradient(0, 0.55 * H, 0, H); g.addColorStop(0, "#c8581c"); g.addColorStop(1, "#7b2a0d"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const cols = ["#e0551e", "#b0361b", "#f08a2d", "#8c2410", "#f5b13a", "#c9461a"];
  for (let i = 0; i < 2600; i++) { const px = r() * W, py = 0.55 * H + r() * 0.5 * H; x.fillStyle = pick(cols, r); x.globalAlpha = 0.55 + r() * 0.4; x.save(); x.translate(px, py); x.rotate(r() * TAU); x.beginPath(); x.ellipse(0, 0, (4 + r() * 12) * s, (2 + r() * 5) * s, 0, 0, TAU); x.fill(); x.restore(); }
  x.globalAlpha = 1; x.restore();
  for (let px = 0; px < W; px += 5) {
    const py = ridgeY(px) + 4 * s; const n = 2 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) { x.strokeStyle = pick(["#d9a74a", "#b9792e", "#e8c06a", "#a45a22"], r); x.lineWidth = (1.2 + r() * 1.4) * s; x.beginPath(); x.moveTo(px + k * 2, py); x.quadraticCurveTo(px + k * 2 + (r() - 0.5) * 8 * s, py - 14 * s, px + k * 2 + (r() - 0.3) * 12 * s, py - (18 + r() * 40) * s); x.stroke(); }
  }
  /* tree */
  const tx = 0.3 * W, ty = ridgeY(tx) + 0.025 * H;
  const limb = (x0, y0, x1, y1, x2, y2, w0, w1) => { for (let k = 0; k < 14; k++) { const t0 = k / 14, t1 = (k + 1) / 14, f = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2]; const a = f(t0), b = f(t1); x.strokeStyle = "#5a3a28"; x.lineCap = "round"; x.lineWidth = lerp(w0, w1, t0); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.strokeStyle = "rgba(140,96,62,.6)"; x.lineWidth = lerp(w0, w1, t0) * 0.28; x.beginPath(); x.moveTo(a[0] - 4 * s, a[1]); x.lineTo(b[0] - 4 * s, b[1]); x.stroke(); } };
  limb(tx, ty, tx + 0.02 * W, ty - 0.12 * H, tx + 0.045 * W, ty - 0.27 * H, 0.052 * W, 0.024 * W);
  limb(tx + 0.03 * W, ty - 0.2 * H, tx - 0.02 * W, ty - 0.3 * H, tx - 0.075 * W, ty - 0.37 * H, 0.022 * W, 0.008 * W);
  limb(tx + 0.035 * W, ty - 0.22 * H, tx + 0.09 * W, ty - 0.27 * H, tx + 0.13 * W, ty - 0.35 * H, 0.02 * W, 0.008 * W);
  const clusters = [[0.28, 0.3, 0.26, 0.24, 1.3], [0.46, 0.36, 0.2, 0.17, 1], [0.14, 0.4, 0.16, 0.17, 0.8], [0.4, 0.2, 0.15, 0.12, 0.9]];
  const pal = [["#8c1d16", "#b52a1a", "#d03a1c"], ["#d3421c", "#e8601f", "#f07d24"], ["#f08a26", "#f6a82f", "#fac646"]];
  for (let pass = 0; pass < 2; pass++) {
    const n = pass ? 2600 : 500;
    for (let i = 0; i < n; i++) {
      const cl = pick(clusters, r), a = r() * TAU, d = Math.sqrt(r()), px = (cl[0] + Math.cos(a) * d * cl[2]) * W, py = (cl[1] + Math.sin(a) * d * cl[3]) * H;
      const light = Math.min(1, Math.max(0, 0.55 - (px / W - 0.28) * 1.6 + (0.3 - py / H) * 0.9 + (r() - 0.5) * 0.5));
      const tier = pass ? (light > 0.62 ? 2 : light > 0.3 ? 1 : 0) : 0;
      x.fillStyle = pass ? pick(pal[tier], r) : "#6e1612"; maple(x, px, py, (pass ? 9 + r() * 12 : 20 + r() * 14) * s, r() * TAU);
    }
  }
  /* rocks */
  for (const [fx, dy, rx] of [[0.1, 0.12, 70], [0.37, 0.1, 62], [0.53, 0.15, 52], [0.74, 0.14, 46]]) {
    const px = fx * W, py = ridgeY(px) + dy * H, rr = rx * s;
    const rg = x.createLinearGradient(px - rr, py - rr, px + rr, py + rr); rg.addColorStop(0, "#f3e6c8"); rg.addColorStop(1, "#b9a27a");
    x.fillStyle = rg; x.beginPath();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, k = 0.84 + r() * 0.2; x.lineTo(px + Math.cos(a) * rr * k, py + Math.sin(a) * rr * 0.55 * k); }
    x.closePath(); x.fill();
  }
  return c;
}

/* green "cell" water: dark blobs on a bright base, the gaps are the light veins; veins get wider and brighter to the right */
function veinPattern(ctx, W, H, cell, r, a = 1) {
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#3aa850"); g.addColorStop(1, "#cde8a4");
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2;
  for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
    const cx = (i + 0.5 + (r() - 0.5) * 0.7) * cell, cy = (j + 0.5 + (r() - 0.5) * 0.7) * cell, xn = Math.min(1, Math.max(0, cx / W));
    const rad = cell * (0.6 - 0.15 * xn), k = 10 + ((r() * 4) | 0), ph = r() * TAU;
    const gg = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
    gg.addColorStop(0, `hsl(${150 - xn * 12},${48 - xn * 8}%,${17 + xn * 9}%)`); gg.addColorStop(1, `hsl(${146 - xn * 10},${50 - xn * 10}%,${24 + xn * 10}%)`);
    ctx.fillStyle = gg; ctx.beginPath();
    for (let m = 0; m < k; m++) { const an = (m / k) * TAU, rr = rad * (0.82 + 0.28 * Math.sin(m * 2.3 + ph) * Math.cos(m * 1.1 + ph)); ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
    ctx.closePath(); ctx.fill();
    if (r() < 0.5) { ctx.fillStyle = `rgba(${r() < 0.5 ? "20,70,40" : "80,140,80"},.22)`; ctx.beginPath(); ctx.arc(cx + (r() - 0.5) * rad, cy + (r() - 0.5) * rad, rad * (0.2 + r() * 0.3), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

export function buildPond(W, H, dpr) {
  const [c, x] = mk(W, H * 1.6, dpr), r = mulberry(33);
  veinPattern(x, W, H * 1.6, Math.max(70, W / 9), r);
  return c;
}

export function buildSea(W, H, dpr) {
  const [c, x] = mk(W, H, dpr), r = mulberry(45), hy = H * 0.68;
  const sg = x.createLinearGradient(0, 0, 0, hy); sg.addColorStop(0, "#3a86ee"); sg.addColorStop(0.6, "#8ccbfb"); sg.addColorStop(1, "#f6f4e6");
  x.fillStyle = sg; x.fillRect(0, 0, W, hy);
  streaks(x, W, H, r, 22, 0, hy * 0.7);
  for (let i = 0; i < 11; i++) cloud(x, (W * i) / 10 + (r() - 0.5) * W * 0.06, hy - H * (0.04 + r() * 0.2), H * (0.1 + r() * 0.12), r);
  const wg = x.createLinearGradient(0, hy, 0, H); wg.addColorStop(0, "#c4e2f0"); wg.addColorStop(0.18, "#74b0c8"); wg.addColorStop(0.6, "#3f7f95"); wg.addColorStop(1, "#2a6272");
  x.fillStyle = wg; x.fillRect(0, hy, W, H - hy);
  const [pc, px] = mk(W, H - hy, 1); veinPattern(px, W, H - hy, Math.max(46, W / 16), r, 1);
  px.globalCompositeOperation = "destination-in"; const mg = px.createLinearGradient(W * 0.3, hy, W, H); mg.addColorStop(0, "rgba(0,0,0,0)"); mg.addColorStop(1, "rgba(0,0,0,.85)"); px.fillStyle = mg; px.fillRect(0, 0, W, H);
  x.globalAlpha = 0.5; x.drawImage(pc, 0, hy, W, H - hy); x.globalAlpha = 1;
  return c;
}

/* the shore: still water on the left, autumn ground + stones on the right */
export function buildShore(W, H, dpr) {
  const [c, x] = mk(W, H, dpr), r = mulberry(57), s = H / 900;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#d98a2c"); g.addColorStop(1, "#a9501a"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { x.fillStyle = pick(["#d3301c", "#e8571f", "#f0922b", "#b02a14", "#f5b83a", "#8c2410"], r); x.globalAlpha = 0.85; maple(x, (0.3 + r() * 0.72) * W, r() * H * 1.05, (14 + r() * 30) * s, r() * TAU); }
  x.globalAlpha = 1;
  const edge = (y) => W * (0.28 + 0.07 * Math.sin(y / H * 5.2) + 0.03 * Math.sin(y / H * 13));
  const water = new Path2D(); water.moveTo(0, 0); for (let y = 0; y <= H; y += 10) water.lineTo(edge(y), y); water.lineTo(0, H); water.closePath();
  x.save(); x.clip(water);
  const wg = x.createLinearGradient(0, 0, W * 0.4, 0); wg.addColorStop(0, "#1b6a3c"); wg.addColorStop(1, "#a7d98e"); x.fillStyle = wg; x.fillRect(0, 0, W, H);
  x.globalAlpha = 0.35; for (let i = 0; i < 24; i++) { x.fillStyle = pick(["#14563a", "#2a7a48", "#86c57a"], r); x.beginPath(); x.ellipse(r() * W * 0.4, r() * H, (30 + r() * 90) * s, (16 + r() * 40) * s, r() * 3, 0, TAU); x.fill(); }
  x.globalAlpha = 1; x.restore();
  x.strokeStyle = "rgba(255,246,214,.55)"; x.lineWidth = 6 * s; x.beginPath(); for (let y = 0; y <= H; y += 10) x.lineTo(edge(y), y); x.stroke();
  for (const [fx, fy, rx] of [[0.3, 0.12, 80], [0.8, 0.3, 90], [0.78, 0.8, 100], [0.93, 0.1, 40], [0.52, 0.06, 36]]) {
    const px = fx * W, py = fy * H, rr = rx * s;
    x.fillStyle = "rgba(60,20,0,.28)"; x.beginPath(); x.ellipse(px + rr * 0.3, py + rr * 0.45, rr * 1.05, rr * 0.5, 0, 0, TAU); x.fill();
    const rg = x.createLinearGradient(px - rr, py - rr, px + rr, py + rr); rg.addColorStop(0, "#e9e6e0"); rg.addColorStop(1, "#9c9a96");
    x.fillStyle = rg; x.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, k = 0.85 + r() * 0.2; x.lineTo(px + Math.cos(a) * rr * k, py + Math.sin(a) * rr * 0.72 * k); } x.closePath(); x.fill();
  }
  return c;
}

export const heroSize = (H) => [H * 0.7, H];

/* the big serrated leaf (tip up). Drawn once, then moved/rotated/scaled by the scene */
export function buildHeroLeaf(W, H, dpr) {
  const [sw, sh] = heroSize(H), [c, x] = mk(sw, sh, dpr), r = mulberry(63), cx = sw / 2;
  const half = (t, ph) => sw * 0.46 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.85) + (((t * 19 + ph) % 1) * 0.05 + 0.005) * sw * (t > 0.08 && t < 0.92 ? 1 : 0);
  const N = 110, path = new Path2D();
  for (let i = 0; i <= N; i++) { const t = i / N; path.lineTo(cx + half(t, 0), sh * (0.07 + 0.86 * t)); }
  for (let i = N; i >= 0; i--) { const t = i / N; path.lineTo(cx - half(t, 0.4), sh * (0.07 + 0.86 * t)); }
  path.closePath();
  x.save(); x.clip(path);
  const g = x.createLinearGradient(cx - sw * 0.5, 0, cx + sw * 0.5, 0); g.addColorStop(0, "#f6b232"); g.addColorStop(0.35, "#f08a24"); g.addColorStop(0.62, "#e0501c"); g.addColorStop(1, "#bf2412");
  x.fillStyle = g; x.fillRect(0, 0, sw, sh);
  for (let i = 0; i < 34; i++) {
    x.fillStyle = pick(["rgba(243,160,42,.6)", "rgba(217,60,24,.55)", "rgba(196,42,20,.5)", "rgba(233,99,31,.55)"], r);
    const px = r() * sw, py = r() * sh, k = 18 + ((r() * 8) | 0), rad = sw * (0.05 + r() * 0.12); x.beginPath();
    for (let m = 0; m < k; m++) { const a = (m / k) * TAU, rr = rad * (0.7 + r() * 0.6); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 1.3); } x.closePath(); x.fill();
  }
  x.strokeStyle = "rgba(110,24,12,.7)"; x.lineCap = "round"; x.lineWidth = sw * 0.012; x.beginPath(); x.moveTo(cx, sh * 0.07); x.lineTo(cx, sh * 0.94); x.stroke();
  x.lineWidth = sw * 0.006; x.strokeStyle = "rgba(110,24,12,.45)";
  for (let i = 1; i < 11; i++) { const y0 = sh * (0.12 + i * 0.075); for (const sgn of [-1, 1]) { x.beginPath(); x.moveTo(cx, y0); x.quadraticCurveTo(cx + sgn * sw * 0.18, y0 - sh * 0.02, cx + sgn * sw * (0.36 - i * 0.012), y0 - sh * 0.065); x.stroke(); } }
  x.restore();
  x.strokeStyle = "#7a2410"; x.lineWidth = sw * 0.014; x.beginPath(); x.moveTo(cx, sh * 0.93); x.lineTo(cx + sw * 0.01, sh * 0.995); x.stroke();
  return c;
}

export function flower(ctx, x, y, size, rot, glow = 1) {
  if (sprites.flower) { const im = sprites.flower; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(im, -size, -size * (im.height / im.width), size * 2, size * 2 * (im.height / im.width)); ctx.restore(); return; }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = `rgba(255,248,220,${0.7 * glow})`; ctx.shadowBlur = size * 0.7;
  ctx.fillStyle = "#fff6e6";
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate((i / 5) * TAU); ctx.beginPath(); ctx.ellipse(0, -size * 0.52, size * 0.34, size * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.shadowBlur = 0; ctx.fillStyle = "#f2b23c"; ctx.beginPath(); ctx.arc(0, 0, size * 0.16, 0, TAU); ctx.fill();
  ctx.restore();
}

export function koi(ctx, x, y, ang, len, t, alpha, ph) {
  if (sprites.koi) {
    const im = sprites.koi, hh = len * (im.height / im.width);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alpha; ctx.transform(1, 0, Math.sin(t * 3 + ph) * 0.1, 1, 0, 0);
    ctx.drawImage(im, -len / 2, -hh / 2, len, hh); ctx.restore(); return;
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = alpha;
  const N = 16, top = [], bot = [], spine = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, px = len * (0.5 - u), py = Math.sin(t * 3 + ph - u * 3.4) * len * 0.09 * u, w = len * 0.14 * Math.sin(Math.PI * (0.1 + 0.82 * (1 - u))) * (1 - u * 0.45);
    spine.push([px, py]); top.push([px, py - w]); bot.push([px, py + w]);
  }
  const end = spine[N], sw = Math.sin(t * 3 + ph - 3.4) * len * 0.1;
  ctx.fillStyle = "rgba(205,225,228,.5)"; ctx.beginPath(); ctx.moveTo(end[0] + len * 0.02, end[1]);
  ctx.quadraticCurveTo(end[0] - len * 0.2, end[1] - len * 0.2 + sw, end[0] - len * 0.3, end[1] - len * 0.22 + sw);
  ctx.quadraticCurveTo(end[0] - len * 0.2, end[1] + sw, end[0] - len * 0.3, end[1] + len * 0.22 + sw); ctx.quadraticCurveTo(end[0] - len * 0.2, end[1] + len * 0.2 + sw, end[0] + len * 0.02, end[1]); ctx.fill();
  ctx.fillStyle = "#d9e7e7"; ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#dd5a24";
  for (const [u, k] of [[0.16, 0.9], [0.4, 1.1], [0.62, 0.8]]) { const i = Math.round(u * N), p = spine[i]; ctx.beginPath(); ctx.ellipse(p[0], p[1] + len * 0.02, len * 0.1 * k, len * 0.07 * k, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "#16161a"; ctx.beginPath(); ctx.ellipse(spine[1][0], spine[1][1], len * 0.07, len * 0.065, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(205,225,228,.6)"; for (const sgn of [-1, 1]) { const p = spine[4]; ctx.beginPath(); ctx.moveTo(p[0], p[1] + sgn * len * 0.1); ctx.lineTo(p[0] - len * 0.14, p[1] + sgn * len * 0.2); ctx.lineTo(p[0] - len * 0.04, p[1] + sgn * len * 0.1); ctx.fill(); }
  ctx.restore();
}

/* paint a loaded image into an offscreen layer the same size as the code-drawn one (cover or contain; ay = vertical anchor 0 top .. 1 bottom) */
export function fromImage(img, w, h, dpr, fit = "cover", ay = 0.5) {
  const [c, x] = mk(w, h, dpr); x.imageSmoothingQuality = "high";
  const s = fit === "contain" ? Math.min(w / img.width, h / img.height) : Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  x.drawImage(img, (w - dw) / 2, (h - dh) * ay, dw, dh);
  return c;
}

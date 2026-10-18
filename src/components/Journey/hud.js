import { earthProj, terrainProj, sm } from "./camera.js";
import { PLACES } from "./coast.js";

const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const NET = ["chennai", "blr", "hyd", "bom", "del", "cal", "cok"];
const GOLD = "255,196,92";
const CY = "120,220,255";

function plus(ctx, x, y, s, a, col = "255,255,255") {
  ctx.strokeStyle = `rgba(${col},${a})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
  ctx.stroke();
}
function ring(ctx, x, y, r, a, col = CY, lw = 1) {
  ctx.strokeStyle = `rgba(${col},${a})`;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.stroke();
}
function label(ctx, txt, x, y, a, o = {}) {
  ctx.font = `${o.size || 11}px ${MONO}`;
  ctx.textAlign = o.align || "left";
  ctx.textBaseline = "middle";
  if (o.bg) {
    const w = ctx.measureText(txt).width + 12;
    const bx = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x - 6;
    ctx.fillStyle = `rgba(4,8,16,${0.55 * a})`;
    ctx.fillRect(bx, y - 10, w, 20);
  }
  ctx.fillStyle = `rgba(${o.col || "255,255,255"},${a})`;
  ctx.fillText(txt, x, y);
}
function brackets(ctx, x, y, w, h, l, a, col = "255,255,255", lw = 1.4) {
  ctx.strokeStyle = `rgba(${col},${a})`;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (const [sx, sy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.moveTo(sx + dx * l, sy); ctx.lineTo(sx, sy); ctx.lineTo(sx, sy + dy * l);
  }
  ctx.stroke();
}
function arc(ctx, a, b, lift, t, alpha, col, centre) {
  let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  if (centre) {
    const dx = mx - centre.x, dy = my - centre.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(lift, Math.hypot(a.x - b.x, a.y - b.y) * 0.5);
    mx += (dx / d) * k; my += (dy / d) * k;
  } else my -= lift;
  ctx.strokeStyle = `rgba(${col},${alpha * 0.55})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 5]);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
  ctx.setLineDash([]);
  const u = t % 1, i = 1 - u;
  const x = i * i * a.x + 2 * i * u * mx + u * u * b.x, y = i * i * a.y + 2 * i * u * my + u * u * b.y;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill();
}

function satellite(ctx, x, y, a, rot, t) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.globalAlpha = a;
  // glow
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 70);
  g.addColorStop(0, "rgba(120,200,255,.35)"); g.addColorStop(1, "rgba(120,200,255,0)");
  ctx.fillStyle = g; ctx.fillRect(-70, -70, 140, 140);
  // panels
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    ctx.fillStyle = "#14294f"; ctx.strokeStyle = "rgba(140,200,255,.8)"; ctx.lineWidth = 1;
    ctx.fillRect(14, -9, 54, 18); ctx.strokeRect(14, -9, 54, 18);
    ctx.strokeStyle = "rgba(140,200,255,.35)";
    ctx.beginPath();
    for (let i = 1; i < 5; i++) { ctx.moveTo(14 + i * 10.8, -9); ctx.lineTo(14 + i * 10.8, 9); }
    ctx.moveTo(14, 0); ctx.lineTo(68, 0);
    ctx.stroke();
    ctx.fillStyle = "#9aa6b8"; ctx.fillRect(8, -1.5, 7, 3);
    ctx.restore();
  }
  // body
  const bg = ctx.createLinearGradient(-9, -11, 9, 11);
  bg.addColorStop(0, "#ffd98a"); bg.addColorStop(1, "#b47a22");
  ctx.fillStyle = bg; ctx.fillRect(-9, -11, 18, 22);
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1; ctx.strokeRect(-9, -11, 18, 22);
  // dish
  ctx.fillStyle = "#e8eef8";
  ctx.beginPath(); ctx.ellipse(0, -15, 8, 3.2, 0, 0, 6.2832); ctx.fill();
  ctx.strokeStyle = "#e8eef8"; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -15); ctx.stroke();
  // blinker
  ctx.fillStyle = Math.sin(t * 6) > 0 ? "#ff5a5a" : "#5a1c1c";
  ctx.beginPath(); ctx.arc(0, 8, 1.8, 0, 6.2832); ctx.fill();
  ctx.restore();
}


const HUBS = [
  ["UK", -0.12, 51.5], ["GERMANY", 13.4, 52.5], ["SPAIN", -3.7, 40.4], ["USA", -74, 40.7], ["USA", -122.4, 37.8],
  ["UAE", 55.3, 25.2], ["SINGAPORE", 103.8, 1.35], ["JAPAN", 139.7, 35.7], ["AUSTRALIA", 151.2, -33.9],
  ["SOUTH AFRICA", 28, -26], ["BRAZIL", -46.6, -23.5], ["CANADA", -79.4, 43.7],
];
const CHN = [80.27, 13.08];
function gc(a, b, u) {
  const R = Math.PI / 180;
  const p = (lo, la) => [Math.cos(la * R) * Math.cos(lo * R), Math.cos(la * R) * Math.sin(lo * R), Math.sin(la * R)];
  const A = p(a[0], a[1]), B = p(b[0], b[1]);
  const d = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
  const sa = Math.sin((1 - u) * d) / Math.sin(d), sb = Math.sin(u * d) / Math.sin(d);
  const v = [A[0] * sa + B[0] * sb, A[1] * sa + B[1] * sb, A[2] * sa + B[2] * sb];
  return { lon: Math.atan2(v[1], v[0]) / R, lat: Math.asin(v[2]) / R, d };
}
function globeNet(ctx, W, H, e, t, u, fade) {
  ctx.save();
  ctx.lineCap = "round";
  const hub = earthProj(e, W, H, CHN[0], CHN[1]);
  HUBS.forEach((h, i) => {
    const N = 48;
    const g0 = gc(CHN, [h[1], h[2]], 0.5);
    const amp = Math.min(0.34, 0.1 + g0.d * 0.1);
    const pts = [];
    for (let k = 0; k <= N; k++) {
      const uu = k / N, g = gc(CHN, [h[1], h[2]], uu);
      const pr = earthProj(e, W, H, g.lon, g.lat, 1 + amp * Math.sin(Math.PI * uu) + 0.004);
      pts.push(pr);
    }
    const head = ((t * 0.16 + i * 0.173) % 1.3);
    // faint full path + bright comet
    for (let k = 1; k <= N; k++) {
      const a = pts[k - 1], b = pts[k];
      if (!a || !b) continue;
      const uu = k / N;
      const dh = head - uu;
      const comet = dh > 0 && dh < 0.28 ? 1 - dh / 0.28 : 0;
      const al = fade * (0.28 + 0.72 * comet) * Math.min(1, Math.min(uu, 1 - uu) * 8);
      ctx.strokeStyle = `rgba(255,${130 + 70 * comet | 0},${45 + 40 * comet | 0},${al})`;
      ctx.lineWidth = (1.1 + 1.4 * comet) * u;
      if (comet > 0.2) { ctx.shadowColor = "rgba(255,140,40,.9)"; ctx.shadowBlur = 10 * u; } else ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    const end = pts[N];
    const gz = earthProj(e, W, H, h[1], h[2]);
    if (end && gz && gz.z > 0.12) {
      const va = fade * Math.min(1, (gz.z - 0.12) * 5);
      ctx.fillStyle = `rgba(255,110,40,${va})`;
      ctx.beginPath(); ctx.arc(gz.x, gz.y, 4.2 * u, 0, 6.2832); ctx.fill();
      const pulse = (t * 0.7 + i * 0.37) % 1;
      ctx.strokeStyle = `rgba(255,140,60,${va * (1 - pulse) * 0.7})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(gz.x, gz.y, (5 + pulse * 16) * u, 0, 6.2832); ctx.stroke();
      label(ctx, h[0], gz.x, gz.y - 22 * u, va, { size: 11 * u, bg: true, align: "center", col: "255,255,255" });
    }
  });
  if (hub) {
    const va = fade * Math.min(1, (hub.z - 0.1) * 5);
    ctx.fillStyle = `rgba(255,196,92,${va})`;
    ctx.beginPath(); ctx.arc(hub.x, hub.y, 5.5 * u, 0, 6.2832); ctx.fill();
    for (let k = 0; k < 2; k++) {
      const pu = (t * 0.6 + k * 0.5) % 1;
      ctx.strokeStyle = `rgba(255,196,92,${va * (1 - pu)})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(hub.x, hub.y, (6 + pu * 26) * u, 0, 6.2832); ctx.stroke();
    }
    label(ctx, "CHENNAI · HOME", hub.x, hub.y - 26 * u, va, { size: 11 * u, bg: true, align: "center", col: GOLD });
  }
  ctx.restore();
}

export function drawHUD(ctx, W, H, S, t) {
  ctx.clearRect(0, 0, W, H);
  const { p, earth, ter } = S;
  const u = Math.max(0.75, Math.min(1.6, H / 900));
  const pad = 22 * u;

  // frame brackets in the corners (always)
  const fa = 0.55 * (1 - sm(0.8, 0.86, p) * 0.6);
  brackets(ctx, pad, pad + 40 * u, W - pad * 2, H - pad * 2 - 40 * u, 22 * u, fa, "255,255,255", 1.2);

  // ============== ORBIT: glowing flight arcs out of Chennai
  if (p < 0.3) {
    const fade = 1 - sm(0.07, 0.2, p);
    if (fade > 0.01) globeNet(ctx, W, H, earth, t, u, fade);
    // India callout
    const ind = earthProj(earth, W, H, PLACES.india.lon, PLACES.india.lat);
    const ia = sm(0.1, 0.17, p) * (1 - sm(0.27, 0.34, p));
    if (ind && ia > 0.01) {
      const r = 34 * u * (1 + 0.04 * Math.sin(t * 3));
      ring(ctx, ind.x, ind.y, r, ia * 0.8, GOLD, 1.4);
      ring(ctx, ind.x, ind.y, r * 1.5, ia * 0.35, GOLD, 1);
      brackets(ctx, ind.x - r * 1.9, ind.y - r * 1.9, r * 3.8, r * 3.8, 12 * u, ia * 0.9, GOLD);
      ctx.strokeStyle = `rgba(${GOLD},${ia * 0.7})`;
      ctx.beginPath(); ctx.moveTo(ind.x + r * 1.9, ind.y - r * 1.9); ctx.lineTo(ind.x + r * 1.9 + 50 * u, ind.y - r * 1.9 - 30 * u); ctx.stroke();
      label(ctx, "INDIA", ind.x + r * 1.9 + 56 * u, ind.y - r * 1.9 - 38 * u, ia, { col: GOLD, size: 12 * u });
      label(ctx, "20.59°N  78.96°E", ind.x + r * 1.9 + 56 * u, ind.y - r * 1.9 - 22 * u, ia * 0.8, { size: 10 * u });
    }
  }

  // ============== MAP: pins, arcs, route, reticle, campus frame
  if (p > 0.29 && p < 0.84) {
    const mf = sm(0.29, 0.34, p) * (1 - sm(0.41, 0.45, p));
    const span = ter.span;
    // reticle
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * mf})`;
    ctx.lineWidth = 1;
    const rr = 26 * u;
    ctx.beginPath();
    ctx.moveTo(cx - rr * 2.2, cy); ctx.lineTo(cx - rr * 0.7, cy);
    ctx.moveTo(cx + rr * 0.7, cy); ctx.lineTo(cx + rr * 2.2, cy);
    ctx.moveTo(cx, cy - rr * 2.2); ctx.lineTo(cx, cy - rr * 0.7);
    ctx.moveTo(cx, cy + rr * 0.7); ctx.lineTo(cx, cy + rr * 2.2);
    ctx.stroke();
    ring(ctx, cx, cy, rr * 0.5, 0.5 * mf, "255,255,255");

    // cities
    const chen = terrainProj(ter, W, H, PLACES.chennai.lon, PLACES.chennai.lat);
    NET.forEach((k, i) => {
      const pl = PLACES[k];
      const a = terrainProj(ter, W, H, pl.lon, pl.lat);
      if (a.x < -50 || a.x > W + 50 || a.y < -50 || a.y > H + 50) return;
      const big = k === "chennai";
      const v = mf * (big ? 1 : 1 - sm(3, 7, 1 / span) * 0 - sm(2.2, 0.6, span));
      if (v < 0.01) return;
      if (!big && span > 2) arc(ctx, chen, a, 70 * u, t * 0.3 + i * 0.2, v * 0.9, GOLD, null);
      plus(ctx, a.x, a.y, (big ? 10 : 6) * u, v, big ? GOLD : "255,255,255");
      ring(ctx, a.x, a.y, (8 + ((t * 12 + i * 4) % 22)) * u, v * (1 - ((t * 12 + i * 4) % 22) / 22) * 0.6, big ? GOLD : CY);
      label(ctx, pl.name.toUpperCase(), a.x + 14 * u, a.y - 8 * u, v * 0.9, { size: 10.5 * u, col: big ? GOLD : "255,255,255" });
    });
    // chennai crosshair
    const ca = sm(0.34, 0.375, p) * (1 - sm(0.425, 0.455, p)) * mf;
    if (ca > 0.01) {
      const s = 46 * u;
      brackets(ctx, chen.x - s, chen.y - s, s * 2, s * 2, 14 * u, ca, GOLD, 1.6);
      label(ctx, "CHENNAI · 13.0827°N 80.2707°E", chen.x + s + 10 * u, chen.y + 4, ca * 0.9, { size: 10.5 * u, col: GOLD, bg: true });
    }
    // route Chennai -> KTR
    const ktr = terrainProj(ter, W, H, PLACES.ktr.lon, PLACES.ktr.lat);
    const ra = 0;
    if (ra > 0.01) {
      ctx.strokeStyle = `rgba(${GOLD},${0.85 * ra})`;
      ctx.lineWidth = 2; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 18;
      ctx.beginPath(); ctx.moveTo(chen.x, chen.y); ctx.lineTo(ktr.x, ktr.y); ctx.stroke();
      ctx.setLineDash([]);
      const mx = (chen.x + ktr.x) / 2, my = (chen.y + ktr.y) / 2;
      label(ctx, "GST ROAD · NH 32 · 38 KM", mx + 16 * u, my - 14 * u, ra * 0.9, { size: 10.5 * u, col: GOLD, bg: true });
    }
    // KTR pin
    const ka = sm(0.36, 0.39, p) * mf;
    if (ka > 0.01 && span > 0.2) {
      plus(ctx, ktr.x, ktr.y, 8 * u, ka, GOLD);
      ring(ctx, ktr.x, ktr.y, (6 + ((t * 14) % 24)) * u, ka * (1 - ((t * 14) % 24) / 24) * 0.8, GOLD);
      label(ctx, "SRM IST · KATTANKULATHUR", ktr.x + 14 * u, ktr.y + 14 * u, ka * 0.9, { size: 10.5 * u, bg: true });
    }
    // campus frame
    const fr = 0;
    if (fr > 0.01) {
      const wdeg = 0.0168, hdeg = 0.0128;
      const a = terrainProj(ter, W, H, PLACES.ktr.lon - 0.0007 / Math.cos(0.2238) - wdeg / 2 / Math.cos(0.2238) * 1.0, PLACES.ktr.lat + hdeg / 2 + 0.0002);
      const b = terrainProj(ter, W, H, PLACES.ktr.lon - 0.0007 / Math.cos(0.2238) + wdeg / 2 / Math.cos(0.2238) * 1.0, PLACES.ktr.lat - hdeg / 2 + 0.0002);
      const w = b.x - a.x, h = b.y - a.y, pm = 14 * u;
      brackets(ctx, a.x - pm, a.y - pm, w + pm * 2, h + pm * 2, 26 * u, fr, GOLD, 2);
      ctx.fillStyle = `rgba(${GOLD},${fr})`;
      ctx.fillRect(a.x - pm, a.y - pm - 26 * u, 190 * u, 22 * u);
      label(ctx, "SRM INSTITUTE  ·  KTR", a.x - pm + 10 * u, a.y - pm - 15 * u, fr, { size: 10.5 * u, col: "10,12,20" });
      label(ctx, "12.8231°N  80.0442°E", a.x + w + pm, a.y + h + pm + 16 * u, fr * 0.9, { size: 10.5 * u, align: "right", col: GOLD });
      // callouts
      const callouts = [
        ["TECH PARK", -0.0042, 0.0034, 1],
        ["UNIVERSITY BLDG", 0.0016, 0.0024, -1],
        ["HOSTELS", 0.0042, -0.0029, -1],
        ["MAIN GATE · GST RD", 0.0098, 0.0001, -1],
      ];
      callouts.forEach(([txt, dx, dy, side], i) => {
        const q = terrainProj(ter, W, H, PLACES.ktr.lon + dx, PLACES.ktr.lat + dy);
        const ca2 = fr * sm(0.62 + i * 0.012, 0.66 + i * 0.012, p);
        ring(ctx, q.x, q.y, 4 * u, ca2, CY, 1.4);
        ctx.strokeStyle = `rgba(${CY},${ca2 * 0.8})`;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + side * 38 * u, q.y - 30 * u); ctx.lineTo(q.x + side * 70 * u, q.y - 30 * u); ctx.stroke();
        label(ctx, txt, q.x + side * 74 * u, q.y - 30 * u, ca2, { size: 9.5 * u, align: side > 0 ? "left" : "right", col: "230,245,255" });
      });
    }
    // scale bar
    const kmPx = (span * 111) / H;
    const nice = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    let len = nice[0];
    for (const n of nice) if (n / kmPx <= 170 * u) len = n;
    const wpx = len / kmPx, sx = W - pad - 20 * u - wpx, sy = H - pad - 36 * u;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * mf})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(sx, sy - 6); ctx.lineTo(sx, sy); ctx.lineTo(sx + wpx, sy); ctx.lineTo(sx + wpx, sy - 6); ctx.stroke();
    label(ctx, len >= 1 ? `${len} KM` : `${len * 1000} M`, sx + wpx / 2, sy - 14 * u, mf * 0.9, { align: "center", size: 10 * u });
  }

  // ============== 3D MODEL CITY labels
  if (S.city && S.labels && p > 0.41) {
    S.labels.forEach(([txt, pos, p0, p1, side], i) => {
      const v = sm(p0, p0 + 0.018, p) * (1 - sm(p1 - 0.02, p1, p));
      if (v < 0.01) return;
      const q = S.city.proj(pos[0], pos[1], pos[2]);
      if (!q) return;
      const x = q.x * W, y = q.y * H;
      if (x < 40 || x > W - 40 || y < 70 || y > H - 50) return;
      const a = v * Math.min(1, q.w / 40);
      ring(ctx, x, y, 5 * u, a, GOLD, 1.5);
      ring(ctx, x, y, (6 + ((t * 14 + i * 3) % 20)) * u, a * (1 - ((t * 14 + i * 3) % 20) / 20) * 0.7, GOLD);
      const lx = x + side * 46 * u, ly = y - 34 * u;
      ctx.strokeStyle = `rgba(${GOLD},${a * 0.85})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.lineTo(lx + side * 26 * u, ly); ctx.stroke();
      label(ctx, txt, lx + side * 32 * u, ly, a, { size: 10.5 * u, align: side > 0 ? "left" : "right", bg: true });
    });
  }
}

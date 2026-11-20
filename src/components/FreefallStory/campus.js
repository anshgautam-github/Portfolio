// campus.js - the last act of the fall: below the clouds the ground is a night city, and it rushes up at you. A full-screen 3D
// aerial of Chennai drawn live (2D canvas, real perspective projection) from OpenStreetMap: the coast, trunk roads and railway of the
// whole region, then every road and building of the SRM Kattankulathur campus, extruded. A column of light stands on SRM and marks
// where you land. Building heights are illustrative (OSM has no heights here): derived from footprint size with a seeded jitter.
// Data (c) OpenStreetMap contributors, ODbL. Files: public/freefall-story/earth/{chennai-city,srm-campus}.json
import { toKm, SRM, CHENNAI } from './map.js';
import { IS_MOBILE } from '../../lib/perf.js';

const T = toKm(SRM.lon, SRM.lat).map((v) => v * 1000);                 // SRM in metres from the map origin
// The SRM main gate stands where the entrance road leaves GST Road (the nearest trunk road to the campus, found from the map data), 563 m
// north-west of the campus centre. You land 42 m inside it, so the world is re-centred there: (0,0) is the landing spot.
const GATE0 = [-396.5, 400.2], TAN = [-0.7104, -0.7038], IN = [0.7038, -0.7104];       // gate position, road direction, direction into the campus (old origin = campus centre)
const OFF = [GATE0[0] + IN[0] * 42, GATE0[1] + IN[1] * 42];
const GATE = [GATE0[0] - OFF[0], GATE0[1] - OFF[1]];
const toM = (lon, lat) => { const [x, y] = toKm(lon, lat); return [x * 1000 - T[0] - OFF[0], y * 1000 - T[1] - OFF[1]]; };
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function pack(flat) {
  const n = flat.length / 2, p = new Float32Array(n * 2);
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { const [x, y] = toM(flat[2 * i], flat[2 * i + 1]); p[2 * i] = x; p[2 * i + 1] = y; sx += x; sy += y; }
  const cx = sx / n, cy = sy / n; let r = 0;
  for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(p[2 * i] - cx, p[2 * i + 1] - cy));
  return { p, n, cx, cy, r };
}

export function createCampus(canvas, base) {
  const ctx = canvas.getContext('2d');
  const S = { state: 0, city: null, roads: [], water: [], blds: [], labels: [] };
  const api = {};

  api.load = () => {
    if (S.state) return; S.state = 1;
    Promise.all([fetch(base + 'earth/chennai-city.json').then((r) => r.json()), fetch(base + 'earth/srm-campus.json').then((r) => r.json())]).then(([c, k]) => {
      S.city = { coast: c.coast.map(pack), water: c.water.map(pack), rail: c.rail.map(pack), road: c.road.map(pack), major: c.major.map(pack) };
      S.roads = k.roads.map(pack); S.water = k.water.map(pack);
      S.blds = k.blds.filter((w) => w.length >= 8).map((w, i) => {
        const b = pack(w); const n = b.n;
        if (n > 3 && b.p[0] === b.p[2 * n - 2] && b.p[1] === b.p[2 * n - 1]) b.n = n - 1;
        let a = 0; for (let j = 0; j < b.n; j++) { const j2 = (j + 1) % b.n; a += b.p[2 * j] * b.p[2 * j2 + 1] - b.p[2 * j2] * b.p[2 * j + 1]; }
        b.ccw = a > 0; b.area = Math.abs(a) / 2;
        b.h = (b.area < 120 ? 4.5 + 3 * hash(i) : Math.min(62, 9 + Math.sqrt(b.area) * 0.62)) * (0.8 + 0.4 * hash(i + 7)) * 1.35;
        b.fl = Math.max(1, Math.round(b.h / 3.4));
        b.pal = Math.floor(hash(i + 3) * 5);
        // the campus's two landmark towers, found by footprint: the University (administration + library) Building is the 3,485 m2 curved block
        // 255 m south of the landing point; the Tech Park twin towers are the two big neighbouring blocks to its north. Both are ~15 storeys.
        if (i === 164) { b.lm = 'ub'; b.h = 62; b.fl = 15; }
        else if (i === 161) { b.lm = 'tp'; b.h = 60; b.fl = 15; }
        else if (i === 162) { b.lm = 'tp'; b.h = 54; b.fl = 13; }
        return b;
      });
      // the nearest trunk road to the campus gets a name
      let best = null;
      for (const w of S.city.major) for (let i = 0; i < w.n; i++) { const d = Math.hypot(w.p[2 * i], w.p[2 * i + 1]); if (d > 150 && (!best || d < best.d)) best = { d, x: w.p[2 * i], y: w.p[2 * i + 1] }; }
      const ch = toM(CHENNAI.lon, CHENNAI.lat), tm = toM(80.1275, 12.9249), po = toM(80.0365, 12.818), gv = toM(80.0603, 12.8442), mm = toM(80.0262, 12.7945);
      let lake = null;                                                      // the biggest pond beside the campus is Potheri Lake
      for (const w of S.water) { const d = Math.hypot(w.cx, w.cy); if (w.r > 120 && d < 1400 && (!lake || w.r > lake.r)) lake = w; }
      S.labels = [
        { n: 'Chennai', s: `${Math.round(Math.hypot(ch[0], ch[1]) / 1000)} km north-east`, x: ch[0], y: ch[1], a0: 2500, a1: 60000 },
        { n: 'Tambaram', s: '', x: tm[0], y: tm[1], a0: 1500, a1: 22000 },
        { n: 'Guduvanchery', s: '', x: gv[0], y: gv[1], a0: 1200, a1: 9000 },
        { n: 'Maraimalai Nagar', s: '', x: mm[0], y: mm[1], a0: 1200, a1: 9000 },
        best && { n: 'GST Road', s: 'NH 32', x: best.x, y: best.y, a0: 250, a1: 4200 },
        { n: 'SRM Arch Gate', s: 'Main entrance', x: GATE[0], y: GATE[1], a0: 40, a1: 1400 },
        { n: 'University Building', s: 'Administration + central library', x: -54 - OFF[0], y: 255 - OFF[1], a0: 90, a1: 1500 },
        { n: 'Tech Park', s: 'Twin towers', x: 84 - OFF[0], y: -265 - OFF[1], a0: 90, a1: 1500 },
        { n: 'Potheri', s: '', x: po[0], y: po[1], a0: 200, a1: 3000 },
        lake && { n: 'Potheri Lake', s: '', x: lake.cx, y: lake.cy, a0: 150, a1: 2600 },
      ].filter(Boolean);
      S.state = 2;
    }).catch(() => { S.state = -1; });
  };

  /** the map data has arrived (or failed for good): the fall waits for this before it reaches the campus, so the ground is never an empty dark void */
  api.ready = () => S.state === 2 || S.state === -1;
  api.resize = () => {
    const d = Math.min(devicePixelRatio || 1, IS_MOBILE ? 1 : 1.5) * (IS_MOBILE ? 0.75 : 1), w = Math.max(2, Math.round(canvas.clientWidth * d)), h = Math.max(2, Math.round(canvas.clientHeight * d));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    api.d = d;
  };

  // v: { alt (m), tilt, yaw (rad), t, a (alpha), lock (0..1) }
  const render = (v) => {
    if (v.a <= 0.003) return;
    api.load();
    const W = canvas.width, H = canvas.height, c = ctx, dpr = api.d || 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#12140f'; c.fillRect(0, 0, W, H);
    if (S.state !== 2) return;

    const alt = v.alt, tilt = v.tilt, hx = Math.sin(v.yaw), hy = Math.cos(v.yaw), st = Math.sin(tilt), ct = Math.cos(tilt);
    const f = [hx * st, hy * st, -ct], dist = alt / ct, C = [-f[0] * dist, -f[1] * dist, alt];
    const r = [hy, -hx, 0], u = [hx * ct, hy * ct, st];
    const focal = H / 2 / Math.tan((66 * Math.PI) / 360), near = Math.max(1, alt * 0.04);
    const P = (x, y, z) => {                                              // -> [sx, sy, depth] (depth <= near: behind the lens)
      const dx = x - C[0], dy = y - C[1], dz = z - C[2];
      const zc = dx * f[0] + dy * f[1] + dz * f[2];
      return [W / 2 + ((dx * r[0] + dy * r[1]) / zc) * focal, H / 2 - ((dx * u[0] + dy * u[1] + dz * u[2]) / zc) * focal, zc];
    };
    const range = alt * 6 + 900, px = (m, lo, hi) => clamp((m * focal) / dist, lo, hi) * dpr;
    const path = (list) => {
      for (const w of list) {
        if (Math.hypot(w.cx, w.cy) - w.r > range) continue;
        let pen = false;
        for (let i = 0; i < w.n; i++) {
          const [sx, sy, z] = P(w.p[2 * i], w.p[2 * i + 1], 0);
          if (z < near) { pen = false; continue; }
          if (pen) c.lineTo(sx, sy); else { c.moveTo(sx, sy); pen = true; }
        }
      }
    };
    c.lineJoin = 'round'; c.lineCap = 'round';

    // --- the ground: a patchwork of dry earth, scrub and paddy, so it reads as land and not as a black void
    {
      const cell = clamp(Math.round(alt * 0.05 / 10) * 10, 30, 400), ext = Math.min(range, cell * 46);
      const gx0 = Math.floor((C[0] + f[0] * dist - ext) / cell), gx1 = Math.floor((C[0] + f[0] * dist + ext) / cell);
      const gy0 = Math.floor((C[1] + f[1] * dist - ext) / cell), gy1 = Math.floor((C[1] + f[1] * dist + ext) / cell);
      const tones = ['#2d3421', '#313822', '#353b24', '#3a3e27', '#3f4029', '#2b311f'];
      const buckets = tones.map(() => []);
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const h = (a, b) => hash(a * 57 + b * 131 + 7), a = h(xi, yi), b = h(xi + 1, yi), c2 = h(xi, yi + 1), d = h(xi + 1, yi + 1);
        return a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy; };
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const wx = gx * cell, wy = gy * cell;
        if (Math.hypot(wx - C[0], wy - C[1]) > range) continue;
        const q = [P(wx, wy, 0), P(wx + cell, wy, 0), P(wx + cell, wy + cell, 0), P(wx, wy + cell, 0)];
        if (q.some((p) => p[2] < near)) continue;
        const n = vn(gx * cell / 900, gy * cell / 900) * 0.62 + vn(gx * cell / 260 + 9, gy * cell / 260 + 4) * 0.38;
        buckets[Math.min(5, Math.floor(n * 6))].push(q);
      }
      for (let k = 0; k < 6; k++) {
        c.fillStyle = tones[k]; c.strokeStyle = tones[k]; c.lineWidth = 1.2 * dpr; c.beginPath();
        for (const q of buckets[k]) { c.moveTo(q[0][0], q[0][1]); c.lineTo(q[1][0], q[1][1]); c.lineTo(q[2][0], q[2][1]); c.lineTo(q[3][0], q[3][1]); c.closePath(); }
        c.fill(); c.stroke();
      }
    }
    // --- water: a cool grey-green sheet with a bright shore
    for (const list of [S.city.water, S.water]) {
      c.beginPath(); path(list); c.fillStyle = '#27414c'; c.fill();
      c.strokeStyle = 'rgba(190,205,200,.38)'; c.lineWidth = px(6, .7, 2); c.stroke();
    }
    // --- the coast (30 km away: a pale thread on the horizon until you are high)
    c.strokeStyle = 'rgba(120,150,165,.35)'; c.lineWidth = px(160, 3, 12); c.beginPath(); path(S.city.coast); c.stroke();
    c.strokeStyle = 'rgba(205,220,225,.75)'; c.lineWidth = px(14, 1, 3); c.beginPath(); path(S.city.coast); c.stroke();
    // --- rail: ballast and sleepers
    c.strokeStyle = 'rgba(30,28,26,.8)'; c.lineWidth = px(12, 1, 2.4); c.beginPath(); path(S.city.rail); c.stroke();
    c.setLineDash([3 * dpr, 4 * dpr]); c.strokeStyle = 'rgba(190,180,165,.55)'; c.lineWidth = px(9, .7, 1.6); c.beginPath(); path(S.city.rail); c.stroke(); c.setLineDash([]);
    // --- roads: dark casing, then asphalt. Trunk roads get a lit centre line and a sodium glow.
    const road = (list, w, lo, hi, asphalt) => {
      c.strokeStyle = 'rgba(10,10,10,.85)'; c.lineWidth = px(w * 1.45, lo + 0.6, hi + 1.4); c.beginPath(); path(list); c.stroke();
      c.strokeStyle = asphalt; c.lineWidth = px(w, lo, hi); c.beginPath(); path(list); c.stroke();
    };
    road(S.city.road, 13, .8, 2.4, '#6a665d');
    road(S.roads, 6.5, .8, 3.2, '#8a8478');
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,150,50,.13)'; c.lineWidth = px(90, 4, 14); c.beginPath(); path(S.city.major); c.stroke();
    c.globalCompositeOperation = 'source-over';
    road(S.city.major, 22, 1.4, 5.5, '#8d887b');
    c.setLineDash([9 * dpr, 7 * dpr]); c.strokeStyle = 'rgba(255,224,150,.8)'; c.lineWidth = px(1.4, .6, 1.1); c.beginPath(); path(S.city.major); c.stroke(); c.setLineDash([]);

    // --- buildings, far to near: shaded walls, then the roof, in the mix of concrete, whitewash and terracotta you see from the air
    if (alt < 7000) {
      const vis = [];
      for (const b of S.blds) {
        const dx = b.cx - C[0], dy = b.cy - C[1], dz = 10 - C[2], zc = dx * f[0] + dy * f[1] + dz * f[2];
        if (zc < near * 1.5 || Math.hypot(b.cx, b.cy) > range * 0.6) continue;
        if ((b.r * focal) / zc < 1.6) continue;
        vis.push([zc, b]);
      }
      vis.sort((a, b) => b[0] - a[0]);
      const fade = 1 - sstep(3500, 7000, alt);
      const ROOF = [[168, 164, 154], [196, 192, 182], [160, 92, 70], [120, 132, 142], [186, 150, 112]];
      for (const [zc, b] of vis) {
        const top = b.p, n = b.n, h = b.h, rc = ROOF[b.pal];
        const base2 = [], roof = [];
        for (let i = 0; i < n; i++) { base2.push(P(top[2 * i], top[2 * i + 1], 0)); roof.push(P(top[2 * i], top[2 * i + 1], h)); }
        if (roof.some((q) => q[2] < near)) continue;
        if (h > 6) {                                                      // shadow thrown away from the low evening sun
          const sx2 = -h * 1.1, sy2 = -h * 0.7; c.fillStyle = `rgba(0,0,0,${0.42 * fade})`;
          for (let i = 0; i < n; i++) { const j = (i + 1) % n, q = [P(top[2 * i] + sx2, top[2 * i + 1] + sy2, 0), P(top[2 * j] + sx2, top[2 * j + 1] + sy2, 0)]; if (q[0][2] < near || q[1][2] < near) continue; c.beginPath(); c.moveTo(base2[i][0], base2[i][1]); c.lineTo(base2[j][0], base2[j][1]); c.lineTo(q[1][0], q[1][1]); c.lineTo(q[0][0], q[0][1]); c.closePath(); c.fill(); }
        }
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n, ex = top[2 * j] - top[2 * i], ey = top[2 * j + 1] - top[2 * i + 1];
          const nx = b.ccw ? ey : -ey, ny = b.ccw ? -ex : ex, nl = Math.hypot(nx, ny) || 1;
          const mx = (top[2 * i] + top[2 * j]) / 2, my = (top[2 * i + 1] + top[2 * j + 1]) / 2;
          if (nx * (C[0] - mx) + ny * (C[1] - my) <= 0) continue;
          const lam = Math.max(0, (nx * 0.7 + ny * 0.45) / nl), k = 0.34 + 0.6 * lam;
          if (b.lm) {                                                     // a landmark: a real facade, not a tinted box
            const wl = Math.hypot(ex, ey), fl = b.fl, tp = b.lm === 'tp', lit = 0.62 + 0.38 * lam;
            const at = (u, v) => [base2[i][0] + (base2[j][0] - base2[i][0]) * u + (roof[i][0] - base2[i][0]) * v, base2[i][1] + (base2[j][1] - base2[i][1]) * u + (roof[i][1] - base2[i][1]) * v];
            const quad = (u0, u1, v0, v1) => { const a = at(u0, v0), bq = at(u1, v0), cq = at(u1, v1), d = at(u0, v1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bq[0], bq[1]); c.lineTo(cq[0], cq[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill(); };
            const wc = tp ? [92, 140, 168] : [232, 224, 206];               // Tech Park: blue-green glass curtain wall; University Building: cream stone
            c.fillStyle = `rgb(${Math.round(wc[0] * lit)},${Math.round(wc[1] * lit)},${Math.round(wc[2] * lit)})`;
            c.beginPath(); c.moveTo(base2[i][0], base2[i][1]); c.lineTo(base2[j][0], base2[j][1]); c.lineTo(roof[j][0], roof[j][1]); c.lineTo(roof[i][0], roof[i][1]); c.closePath(); c.fill();
            const wh2 = Math.abs(base2[i][1] - roof[i][1]);
            if (wh2 > 12 * dpr) {
              const bays = Math.max(1, Math.round(wl / 3.4));
              for (let kk = 0; kk < fl; kk++) {
                const v0 = (kk + (tp ? 0.12 : 0.2)) / fl, v1 = (kk + (tp ? 0.9 : 0.8)) / fl;
                for (let bi = 0; bi < bays; bi++) {
                  const u0 = (bi + 0.1) / bays, u1 = (bi + 0.9) / bays, on = hash(kk * 31 + bi * 7 + i * 3 + b.cx) > 0.5;
                  c.fillStyle = on ? `rgba(255,${206 + 20 * hash(kk + bi)},${128 + 30 * hash(bi)},${0.78 * (0.5 + 0.5 * (1 - lam))})` : tp ? `rgba(${Math.round(30 * lit)},${Math.round(64 * lit)},${Math.round(96 * lit)},.95)` : `rgba(${Math.round(70 * lit)},${Math.round(96 * lit)},${Math.round(128 * lit)},.9)`;
                  quad(u0, u1, v0, v1);
                }
              }
              c.strokeStyle = tp ? 'rgba(236,242,248,.5)' : 'rgba(196,150,60,.7)'; c.lineWidth = Math.max(0.6, 0.9 * dpr);   // white fins on the towers, a gold string course on the University Building
              if (tp) for (let bi = 0; bi <= bays; bi++) { const a = at(bi / bays, 0), d = at(bi / bays, 1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(d[0], d[1]); c.stroke(); }
              else for (const vv of [0.04, 0.5, 0.96]) { const a = at(0, vv), bq = at(1, vv); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bq[0], bq[1]); c.stroke(); }
            }
            continue;
          }
          c.fillStyle = `rgb(${Math.round(rc[0] * k)},${Math.round(rc[1] * k * 0.97)},${Math.round(rc[2] * k * 0.92)})`;
          c.beginPath(); c.moveTo(base2[i][0], base2[i][1]); c.lineTo(base2[j][0], base2[j][1]); c.lineTo(roof[j][0], roof[j][1]); c.lineTo(roof[i][0], roof[i][1]); c.closePath(); c.fill();
          const wh = Math.abs(base2[i][1] - roof[i][1]);                  // windows: warm lit panes on the bigger walls
          if (wh > 16 * dpr && b.fl > 1 && b.fl < 22 && Math.hypot(ex, ey) > 6) {
            c.strokeStyle = `rgba(255,214,140,${(0.16 + 0.34 * (1 - lam)) * Math.min(1, wh / (60 * dpr))})`; c.lineWidth = Math.max(1, (wh / b.fl) * 0.34); c.setLineDash([(wh / b.fl) * 0.8, (wh / b.fl) * 0.7]);
            for (let kk = 0; kk < b.fl; kk++) { const t = (kk + 0.5) / b.fl; c.beginPath(); c.moveTo(base2[i][0] + (roof[i][0] - base2[i][0]) * t, base2[i][1] + (roof[i][1] - base2[i][1]) * t); c.lineTo(base2[j][0] + (roof[j][0] - base2[j][0]) * t, base2[j][1] + (roof[j][1] - base2[j][1]) * t); c.stroke(); }
            c.setLineDash([]);
          }
        }
        c.beginPath(); c.moveTo(roof[0][0], roof[0][1]); for (let i = 1; i < n; i++) c.lineTo(roof[i][0], roof[i][1]); c.closePath();
        const rk = 0.82 + 0.18 * hash(b.pal * 31 + n);
        c.fillStyle = b.lm ? (b.lm === 'tp' ? 'rgb(150,164,176)' : 'rgb(208,200,184)') : `rgb(${Math.round(rc[0] * rk)},${Math.round(rc[1] * rk)},${Math.round(rc[2] * rk)})`; c.fill();
        c.strokeStyle = b.lm === 'ub' ? 'rgba(214,168,72,.95)' : 'rgba(255,248,235,.28)'; c.lineWidth = b.lm ? Math.max(1, 1.8 * dpr) : Math.max(0.5, 0.8 * dpr); c.stroke();
        if (b.lm) {                                                       // a rooftop plant room set back from the edge
          const rx = b.cx, ry = b.cy, q0 = P(rx - 5, ry - 4, h + 3), q1 = P(rx + 5, ry - 4, h + 3), q2 = P(rx + 5, ry + 4, h + 3), q3 = P(rx - 5, ry + 4, h + 3);
          if (q0[2] > near && q1[2] > near && q2[2] > near && q3[2] > near) { c.fillStyle = 'rgba(120,126,134,.9)'; c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.lineTo(q3[0], q3[1]); c.closePath(); c.fill(); }
        }
      }
    }

    // the SRM Arch Gate: two tall cream pillars either side of the entrance road, a deep blue beam with a gold band, a lit arch between them
    {
      const t = TAN, nn = IN, GZ = 0, hw = 4, PH = 32, SPAN = 20;
      const quadP = (pts, col) => { const q = pts.map((p) => P(p[0], p[1], p[2])); if (q.some((a) => a[2] < near)) return; c.fillStyle = col; c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); c.fill(); };
      const box = (cx, cy, ax, ay, bx, by, z0, z1, cols) => {            // a box centred (cx,cy) with half-extents along (ax,ay) and (bx,by)
        const cs = [[cx - ax - bx, cy - ay - by], [cx + ax - bx, cy + ay - by], [cx + ax + bx, cy + ay + by], [cx - ax + bx, cy - ay + by]];
        for (let i = 0; i < 4; i++) {
          const a = cs[i], b2 = cs[(i + 1) % 4], ex = b2[0] - a[0], ey = b2[1] - a[1], nx = ey, ny = -ex, mx = (a[0] + b2[0]) / 2, my = (a[1] + b2[1]) / 2;
          const out = (nx * (mx - cx) + ny * (my - cy)) > 0 ? 1 : -1;
          if (out * (nx * (C[0] - mx) + ny * (C[1] - my)) <= 0) continue;
          const lam = Math.max(0, out * (nx * 0.7 + ny * 0.45) / (Math.hypot(nx, ny) || 1)), k = 0.45 + 0.55 * lam;
          quadP([[a[0], a[1], z0], [b2[0], b2[1], z0], [b2[0], b2[1], z1], [a[0], a[1], z1]], `rgb(${Math.round(cols[0] * k)},${Math.round(cols[1] * k)},${Math.round(cols[2] * k)})`);
        }
        quadP(cs.map((p) => [p[0], p[1], z1]), `rgb(${Math.round(cols[0] * 0.95)},${Math.round(cols[1] * 0.95)},${Math.round(cols[2] * 0.95)})`);
      };
      const gx = GATE[0], gy = GATE[1];
      // ground glow under the gate and the landing approach
      const g0 = P(gx, gy, 0);
      if (g0[2] > near) { c.globalCompositeOperation = 'lighter'; const rr = Math.max(8, (60 * focal) / g0[2]) * dpr * 0.5, gg = c.createRadialGradient(g0[0], g0[1], 0, g0[0], g0[1], rr * 2.4); gg.addColorStop(0, 'rgba(255,200,120,.2)'); gg.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = gg; c.fillRect(g0[0] - rr * 2.4, g0[1] - rr * 2.4, rr * 4.8, rr * 4.8); c.globalCompositeOperation = 'source-over'; }
      for (const s2 of [-1, 1]) {
        const px0 = gx + t[0] * SPAN * s2, py0 = gy + t[1] * SPAN * s2;
        box(px0, py0, t[0] * hw, t[1] * hw, nn[0] * hw, nn[1] * hw, 0, PH, [228, 216, 192]);
        box(px0, py0, t[0] * (hw + 0.9), t[1] * (hw + 0.9), nn[0] * (hw + 0.9), nn[1] * (hw + 0.9), PH, PH + 2.2, [196, 160, 80]);          // gold capital
        box(px0, py0, t[0] * (hw + 1), t[1] * (hw + 1), nn[0] * (hw + 1), nn[1] * (hw + 1), 0, 3, [190, 178, 156]);                           // plinth
      }
      box(gx, gy, t[0] * (SPAN + hw), t[1] * (SPAN + hw), nn[0] * 3.4, nn[1] * 3.4, PH - 1, PH + 8.5, [30, 52, 112]);                          // the deep blue beam
      box(gx, gy, t[0] * (SPAN + hw + 0.4), t[1] * (SPAN + hw + 0.4), nn[0] * 3.8, nn[1] * 3.8, PH + 8.5, PH + 10, [214, 172, 78]);          // gold cornice
      // the lit arch: a gold curve under the beam, with bloom
      const arch = [];
      for (let i = 0; i <= 24; i++) { const sx = (i / 24) * 2 - 1, z = PH - 1 - 7 * (1 - sx * sx) * 0; arch.push(P(gx + t[0] * SPAN * sx, gy + t[1] * SPAN * sx, PH - 1 - 11 * Math.max(0, 1 - sx * sx))); }
      if (arch.every((a) => a[2] > near)) {
        c.lineCap = 'round'; c.strokeStyle = 'rgba(255,214,140,.95)'; c.lineWidth = px(1.4, 1.2, 4);
        c.beginPath(); arch.forEach((a, i) => (i ? c.lineTo(a[0], a[1]) : c.moveTo(a[0], a[1]))); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,170,70,.5)'; c.lineWidth = px(5, 3, 12);
        c.beginPath(); arch.forEach((a, i) => (i ? c.lineTo(a[0], a[1]) : c.moveTo(a[0], a[1]))); c.stroke(); c.globalCompositeOperation = 'source-over';
      }
      // lamps on the pillar tops
      c.globalCompositeOperation = 'lighter';
      for (const s2 of [-1, 1]) { const q = P(gx + t[0] * SPAN * s2, gy + t[1] * SPAN * s2, PH + 5); if (q[2] > near) { const r3 = Math.max(2, (3 * focal) / q[2]) * dpr, gg = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], r3 * 3); gg.addColorStop(0, 'rgba(255,230,170,.7)'); gg.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = gg; c.fillRect(q[0] - r3 * 3, q[1] - r3 * 3, r3 * 6, r3 * 6); } }
      c.globalCompositeOperation = 'source-over';
    }

    // the landing: rings pulsing out on the ground and a column of light standing on SRM
    const lockA = 0.35 + 0.65 * v.lock;
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const ph = (v.t * 0.45 + k / 3) % 1, rad = (30 + ph * 220) * (1 + (1 - v.lock) * 2.5);
      c.strokeStyle = `rgba(255,178,63,${(1 - ph) * 0.7 * lockA})`; c.lineWidth = px(5, 1, 3);
      c.beginPath();
      for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, q = P(Math.cos(a) * rad, Math.sin(a) * rad, 0); if (q[2] < near) continue; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }
      c.stroke();
    }
    const g0 = P(0, 0, 0), g1 = P(0, 0, Math.max(alt * 5, 600));
    if (g0[2] > near) {
      const wB = clamp((26 * focal) / g0[2], 2, 90) * dpr;
      const grad = c.createLinearGradient(g0[0], g0[1], g1[0], g1[1]);
      grad.addColorStop(0, `rgba(255,236,190,${0.95 * lockA})`); grad.addColorStop(0.35, `rgba(255,160,50,${0.5 * lockA})`); grad.addColorStop(1, 'rgba(255,90,20,0)');
      c.strokeStyle = grad; c.lineWidth = wB; c.lineCap = 'butt'; c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]); c.stroke();
      c.lineWidth = wB * 0.28; c.strokeStyle = `rgba(255,250,235,${0.9 * lockA})`; c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(g1[0], g1[1]); c.stroke();
      c.fillStyle = `rgba(255,200,110,${0.55 * lockA})`; c.beginPath(); c.ellipse(g0[0], g0[1], wB * 2.2, wB * 0.9, 0, 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = 'source-over';

    // labels with hairline leaders
    c.textBaseline = 'alphabetic';
    for (const L of S.labels) {
      const a = sstep(L.a1, L.a1 * 0.7, alt) * sstep(L.a0 * 0.6, L.a0, alt);
      if (a < 0.03) continue;
      const q = P(L.x, L.y, 0); if (q[2] < near || q[0] < 20 || q[0] > W - 20 || q[1] < 20 || q[1] > H - 20) continue;
      const lx = q[0] + 46 * dpr, ly = q[1] - 40 * dpr;
      c.globalAlpha = a; c.strokeStyle = 'rgba(239,231,218,.65)'; c.fillStyle = 'rgba(239,231,218,.95)'; c.lineWidth = dpr;
      c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(lx - 4 * dpr, ly); c.lineTo(lx + 80 * dpr, ly); c.stroke();
      c.beginPath(); c.arc(q[0], q[1], 3 * dpr, 0, Math.PI * 2); c.fill();
      c.font = `700 ${11 * dpr}px "JetBrains Mono", ui-monospace, monospace`; c.fillText(L.n.toUpperCase(), lx, ly - 6 * dpr);
      if (L.s) { c.font = `500 ${9 * dpr}px "JetBrains Mono", ui-monospace, monospace`; c.fillStyle = 'rgba(239,231,218,.6)'; c.fillText(L.s.toUpperCase(), lx, ly + 14 * dpr); }
      c.globalAlpha = 1;
    }
    // SRM, named
    const sa = sstep(7000, 3000, alt) * 0.98;
    if (g0[2] > near && sa > 0.03) {
      const lx = g0[0] + 70 * dpr, ly = g0[1] - Math.min(H * 0.28, 200 * dpr);
      c.globalAlpha = sa; c.strokeStyle = 'rgba(255,214,150,.85)'; c.lineWidth = dpr * 1.2; c.beginPath(); c.moveTo(g0[0], g0[1]); c.lineTo(lx - 8 * dpr, ly + 6 * dpr); c.lineTo(lx + 300 * dpr, ly + 6 * dpr); c.stroke();
      c.fillStyle = '#fff3dc'; c.font = `italic 400 ${34 * dpr}px "Instrument Serif", Georgia, serif`; c.fillText('SRM Kattankulathur', lx, ly - 2 * dpr);
      c.fillStyle = 'rgba(255,214,150,.85)'; c.font = `600 ${10 * dpr}px "JetBrains Mono", ui-monospace, monospace`; c.fillText('INSTITUTE OF SCIENCE AND TECHNOLOGY', lx, ly + 24 * dpr);
      c.globalAlpha = 1;
    }
    // haze toward the horizon + soft vignette
    const hz = c.createLinearGradient(0, 0, 0, H * 0.55);
    hz.addColorStop(0, `rgba(22,26,34,${0.7 + 0.28 * sstep(0.1, 0.8, tilt)})`); hz.addColorStop(1, 'rgba(22,26,34,0)');
    c.fillStyle = hz; c.fillRect(0, 0, W, H * 0.6);
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  };

  // This is a full vector re-render of the city (ground tiles, roads, every building with shadows and window rows), far heavier than the other layers.
  // It used to run on every single frame, so on a busy frame it held up everything else (the HUD, the figure, the scroll) and the fly-over lagged.
  // Now it measures its own cost and, when a redraw is slow, redraws at ~45 or ~30 fps instead: the canvas keeps the last picture in between, and
  // the camera moves a hair per frame anyway, so the eye does not see the gap but the frame budget gets freed.
  let lastAt = -1, lastCost = 0, lastW = 0, lastH = 0;
  api.draw = (v) => {
    if (v.a <= 0.003) return;
    const gap = lastCost > 11 ? 1 / 30 : lastCost > 6 ? 1 / 45 : 0;
    if (gap && lastAt >= 0 && canvas.width === lastW && canvas.height === lastH && Math.abs(v.t - lastAt) < gap) return;
    const t0 = performance.now();
    render(v);
    lastCost = lastCost * 0.7 + (performance.now() - t0) * 0.3;
    lastAt = v.t; lastW = canvas.width; lastH = canvas.height;
  };
  return api;
}

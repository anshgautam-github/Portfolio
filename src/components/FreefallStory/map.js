// map.js - the scope that locks onto SRM while you fall: a circular, night-mode map of the Chennai coast drawn live on a 2D canvas
// from real OpenStreetMap data (coastline, trunk and primary roads, railway, lakes; then every road and building of the SRM
// Kattankulathur campus). Data (c) OpenStreetMap contributors, ODbL. Files: public/freefall-story/earth/{chennai-city,srm-campus}.json
// Coordinates are converted once to kilometres from ORIGIN, so a frame is just a scale + offset per point.
export const SRM = { lon: 80.0455, lat: 12.8231 };   // Kattankulathur campus
export const CHENNAI = { lon: 80.2707, lat: 13.0827 };
const ORIGIN = { lon: 80.04, lat: 12.9 };
const KX = 111.32 * Math.cos((ORIGIN.lat * Math.PI) / 180), KY = 110.57;
export const toKm = (lon, lat) => [(lon - ORIGIN.lon) * KX, (lat - ORIGIN.lat) * KY];

const pack = (flat) => { const a = new Float32Array(flat.length); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < flat.length; i += 2) { const [x, y] = toKm(flat[i], flat[i + 1]); a[i] = x; a[i + 1] = y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { p: a, b: [x0, y0, x1, y1] }; };
const packAll = (list) => (list || []).map(pack);

// stitch the coastline ways end to end, then close the polygon on the sea side (east) so the sea can be filled
function seaPolygon(coast) {
  const ways = coast.map((w) => { const o = []; for (let i = 0; i < w.length; i += 2) o.push([w[i], w[i + 1]]); return o; });
  const key = (p) => p[0].toFixed(4) + ',' + p[1].toFixed(4);
  let chain = ways.shift();
  for (let guard = 0; guard < 200 && ways.length; guard++) {
    const head = key(chain[0]), tail = key(chain[chain.length - 1]);
    const i = ways.findIndex((w) => key(w[0]) === tail || key(w[w.length - 1]) === tail || key(w[0]) === head || key(w[w.length - 1]) === head);
    if (i < 0) break;
    let w = ways.splice(i, 1)[0];
    if (key(w[0]) === tail) chain = chain.concat(w.slice(1));
    else if (key(w[w.length - 1]) === tail) chain = chain.concat(w.slice(0, -1).reverse());
    else if (key(w[w.length - 1]) === head) chain = w.slice(0, -1).concat(chain);
    else chain = w.slice(1).reverse().concat(chain);
  }
  if (chain[0][1] > chain[chain.length - 1][1]) chain.reverse();      // south -> north, sea on the right
  const a = chain[0], z = chain[chain.length - 1];
  const poly = chain.concat([[81.2, z[1] + 0.3], [81.2, a[1] - 0.3]]);
  const f = []; poly.forEach(([x, y]) => f.push(x, y));
  const line = []; chain.forEach(([x, y]) => line.push(x, y));
  return { sea: pack(f), line: pack(line) };
}

const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const PLACES = [
  ['Bay of Bengal', 80.52, 12.98, 0, 'sea'], ['Chennai', 80.2707, 13.0827, 0, 'city'], ['Guindy', 80.2212, 13.0067, 0, 'town'],
  ['Tambaram', 80.1275, 12.9249, 0, 'town'], ['Chengalpattu', 79.976, 12.692, 0, 'town'], ['Potheri', 80.0365, 12.8180, 1, 'close'],
];

export function createScope(canvas, base) {
  const ctx = canvas.getContext('2d');
  const S = { city: null, campus: null, state: 0, dpr: 1, size: 0 };
  const load = () => {
    if (S.state) return; S.state = 1;
    Promise.all([fetch(base + 'earth/chennai-city.json').then((r) => r.json()), fetch(base + 'earth/srm-campus.json').then((r) => r.json())])
      .then(([c, k]) => {
        const sea = seaPolygon(c.coast);
        S.city = { sea: sea.sea, coast: sea.line, water: packAll(c.water), rail: packAll(c.rail), road: packAll(c.road), major: packAll(c.major) };
        S.campus = { roads: packAll(k.roads), blds: packAll(k.blds), water: packAll(k.water) };
        S.state = 2;
      }).catch(() => { S.state = -1; });
  };
  const api = { load };
  api.resize = () => {
    const d = Math.min(devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * d);
    if (w && w !== canvas.width) { canvas.width = w; canvas.height = w; S.dpr = d; S.size = canvas.clientWidth; }
  };

  // v: { lon, lat, km (width of the circle), a (alpha), t (seconds), lock (0..1) }
  api.draw = (v) => {
    if (v.a <= 0.005) return;
    load();
    const Z = canvas.width, R = Z / 2, c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, Z, Z);
    const [cx, cy] = toKm(v.lon, v.lat);
    const ppk = Z / v.km;                                   // device pixels per km
    const X = (x) => (x - cx) * ppk + R, Y = (y) => R - (y - cy) * ppk;
    const half = v.km / 2 * 1.45;
    const vis = (b) => b[2] > cx - half && b[0] < cx + half && b[3] > cy - half && b[1] < cy + half;
    const path = (g, close) => { const p = g.p; c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); if (close) c.closePath(); };
    const lw = (px) => px * (Z / 340);

    c.save();
    c.beginPath(); c.arc(R, R, R - 2, 0, Math.PI * 2); c.clip();
    // land, then sea
    c.fillStyle = '#15110c'; c.fillRect(0, 0, Z, Z);
    const g0 = c.createRadialGradient(R, R, 0, R, R, R); g0.addColorStop(0, 'rgba(255,178,63,.10)'); g0.addColorStop(1, 'rgba(0,0,0,.35)');
    c.fillStyle = g0; c.fillRect(0, 0, Z, Z);
    const m = S.city;
    if (m) {
      c.beginPath(); path(m.sea, true); c.fillStyle = '#080d1a'; c.fill();
      // lakes
      c.fillStyle = 'rgba(140,150,255,.20)';
      for (const w of m.water) if (vis(w.b)) { c.beginPath(); path(w, true); c.fill(); }
    }
    // graticule: 1 km at close range, 10 km far
    const step = v.km < 4 ? 0.25 : v.km < 12 ? 1 : v.km < 40 ? 5 : 10;
    c.strokeStyle = 'rgba(239,231,218,.055)'; c.lineWidth = lw(.8); c.beginPath();
    for (let x = Math.floor((cx - half) / step) * step; x < cx + half; x += step) { c.moveTo(X(x), 0); c.lineTo(X(x), Z); }
    for (let y = Math.floor((cy - half) / step) * step; y < cy + half; y += step) { c.moveTo(0, Y(y)); c.lineTo(Z, Y(y)); }
    c.stroke();

    if (m) {
      c.lineJoin = 'round'; c.lineCap = 'round';
      // rail
      c.strokeStyle = 'rgba(239,231,218,.30)'; c.lineWidth = lw(1); c.setLineDash([lw(3), lw(3)]); c.beginPath();
      for (const w of m.rail) if (vis(w.b)) path(w); c.stroke(); c.setLineDash([]);
      // primary roads, then trunk roads with a glow
      c.strokeStyle = 'rgba(255,178,63,.30)'; c.lineWidth = lw(1); c.beginPath();
      for (const w of m.road) if (vis(w.b)) path(w); c.stroke();
      c.save(); c.shadowColor = 'rgba(255,150,40,.9)'; c.shadowBlur = lw(9);
      c.strokeStyle = 'rgba(255,205,120,.95)'; c.lineWidth = lw(1.9 + (v.km < 6 ? 1.4 : 0)); c.beginPath();
      for (const w of m.major) if (vis(w.b)) path(w); c.stroke(); c.restore();
      // the coast
      c.save(); c.shadowColor = 'rgba(140,150,255,.9)'; c.shadowBlur = lw(10);
      c.strokeStyle = 'rgba(190,196,255,.95)'; c.lineWidth = lw(1.6); c.beginPath(); path(m.coast); c.stroke(); c.restore();
    }
    // the campus appears as the scope closes in
    const k = S.campus, reveal = sstep(7, 2.2, v.km);
    if (k && reveal > 0.01) {
      c.globalAlpha = reveal;
      c.fillStyle = 'rgba(140,150,255,.22)';
      for (const w of k.water) if (vis(w.b)) { c.beginPath(); path(w, true); c.fill(); }
      c.strokeStyle = 'rgba(255,178,63,.55)'; c.lineWidth = lw(.9 + (v.km < 1.5 ? .8 : 0)); c.beginPath();
      for (const w of k.roads) if (vis(w.b)) path(w); c.stroke();
      c.fillStyle = 'rgba(255,178,63,.20)'; c.strokeStyle = 'rgba(255,214,150,.85)'; c.lineWidth = lw(.6);
      c.beginPath(); for (const w of k.blds) if (vis(w.b)) path(w, true); c.fill(); c.stroke();
      c.globalAlpha = 1;
    }
    // labels
    c.font = `600 ${lw(8.5)}px "JetBrains Mono", ui-monospace, monospace`; c.textAlign = 'center'; c.fillStyle = 'rgba(239,231,218,.8)';
    for (const [name, lo, la, , kind] of PLACES) {
      const [px, py] = toKm(lo, la), x = X(px), y = Y(py);
      if (x < R * .15 || x > Z - R * .15 || y < R * .15 || y > Z - R * .15) continue;
      const a = kind === 'close' ? sstep(5, 2.5, v.km) : kind === 'sea' ? 1 : sstep(120, 25, v.km) * (1 - sstep(10, 4, v.km) * .6);
      if (a < .02) continue;
      c.globalAlpha = a * (kind === 'sea' ? .5 : 1);
      if (kind !== 'sea') { c.beginPath(); c.arc(x, y - lw(5), lw(1.8), 0, 7); c.fill(); }
      c.fillText(name.toUpperCase(), x, y + lw(6));
    }
    c.globalAlpha = 1;
    // SRM
    const [sx, sy] = toKm(SRM.lon, SRM.lat), px = X(sx), py = Y(sy);
    const pulse = (v.t * 0.9) % 1;
    c.strokeStyle = `rgba(255,178,63,${(1 - pulse) * .9})`; c.lineWidth = lw(1.4); c.beginPath(); c.arc(px, py, lw(5 + pulse * 26), 0, 7); c.stroke();
    c.fillStyle = '#ffb23f'; c.shadowColor = '#ff5a1e'; c.shadowBlur = lw(14); c.beginPath(); c.arc(px, py, lw(4), 0, 7); c.fill(); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,240,215,.95)'; c.textAlign = 'left'; c.font = `700 ${lw(9.5)}px "JetBrains Mono", ui-monospace, monospace`;
    c.fillText('SRM', px + lw(11), py - lw(3));
    c.font = `500 ${lw(7.5)}px "JetBrains Mono", ui-monospace, monospace`; c.fillStyle = 'rgba(239,231,218,.65)';
    c.fillText('KATTANKULATHUR', px + lw(11), py + lw(7));
    // radar sweep
    if (c.createConicGradient && v.lock < 0.98) {
      const ang = v.t * 1.6, cg = c.createConicGradient(ang, R, R);
      cg.addColorStop(0, 'rgba(255,178,63,.0)'); cg.addColorStop(.86, 'rgba(255,178,63,0)'); cg.addColorStop(1, `rgba(255,178,63,${.22 * (1 - v.lock)})`);
      c.fillStyle = cg; c.fillRect(0, 0, Z, Z);
    }
    c.restore();

    // chrome: ring, ticks, crosshair, and corner brackets that tighten as the lock closes
    c.strokeStyle = 'rgba(239,231,218,.55)'; c.lineWidth = lw(1.2); c.beginPath(); c.arc(R, R, R - 2, 0, 7); c.stroke();
    c.lineWidth = lw(1);
    for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 9 : 4, r0 = R - 2; c.beginPath(); c.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0); c.lineTo(R + Math.cos(a) * (r0 - lw(l)), R + Math.sin(a) * (r0 - lw(l))); c.stroke(); }
    c.fillStyle = 'rgba(239,231,218,.85)'; c.font = `700 ${lw(9)}px "JetBrains Mono", ui-monospace, monospace`; c.textAlign = 'center'; c.fillText('N', R, lw(24));
    const br = R * (0.92 - 0.72 * v.lock), arm = R * 0.10;
    c.strokeStyle = `rgba(255,178,63,${.35 + .6 * v.lock})`; c.lineWidth = lw(1.6);
    c.beginPath();
    for (const [sxn, syn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const bx = R + sxn * br * .7071, by = R + syn * br * .7071;
      c.moveTo(bx - sxn * arm, by); c.lineTo(bx, by); c.lineTo(bx, by - syn * arm);
    }
    c.stroke();
    c.strokeStyle = 'rgba(239,231,218,.25)'; c.lineWidth = lw(1); c.beginPath();
    c.moveTo(R - lw(14), R); c.lineTo(R - lw(5), R); c.moveTo(R + lw(5), R); c.lineTo(R + lw(14), R);
    c.moveTo(R, R - lw(14)); c.lineTo(R, R - lw(5)); c.moveTo(R, R + lw(5)); c.lineTo(R, R + lw(14)); c.stroke();
  };
  return api;
}

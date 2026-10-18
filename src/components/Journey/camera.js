const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180;

// terrain keyframes: p, lon, lat, span(deg of latitude on screen)
const K = [
  [0.28, 79.0, 21.0, 28],
  [0.34, 79.6, 15.2, 8],
  [0.37, 80.1, 13.3, 1.5],
  [0.4, 80.25, 13.12, 0.4],
  [0.43, 80.27, 13.09, 0.14],
];

export function terrainState(p) {
  let i = 0;
  while (i < K.length - 2 && p > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1];
  let t = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
  t = t * t * (3 - 2 * t) * 0.5 + t * 0.5;
  const span = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), t));
  const haze = sm(0.265, 0.31, p) * (1 - sm(0.345, 0.43, p));
  return {
    c: [lerp(a[1], b[1], t), lerp(a[2], b[2], t)],
    span,
    tilt: 0,
    night: sm(0.3, 0.4, p),
    dark: 0,
    haze: sm(0.335, 0.362, p) * (1 - sm(0.392, 0.425, p)),
    cloud: (0.05 + 0.5 * sm(0.29, 0.37, p)) * (1 - 0.7 * sm(0.4, 0.44, p)),
    alpha: sm(0.28, 0.36, p),
  };
}

const wrapDeg = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
export function earthState(p, spin = 0) {
  const e = Math.min(1, p / 0.3);
  const ez = Math.pow(e, 1.35);
  const es = e * e * (3 - 2 * e);
  const R = 1.18 * Math.pow(4.1 / 1.18, ez);
  return {
    off: [lerp(0.55, 0, es), lerp(-0.22, 0, es)],
    R,
    lo: (lerp(40, 79, es) + wrapDeg(spin) * (1 - sm(0.02, 0.2, p))) * D2R,
    la: lerp(22, 21, es) * D2R,
    haze: 0.3 * sm(0.26, 0.3, p) * (1 - sm(0.34, 0.38, p)),
    dot: 1 - sm(0.09, 0.2, p),
  };
}

export const showEarth = (p) => p < 0.385;
export const showTerrain = (p) => p > 0.29 && p < 0.46;
export const showCore = (p) => p > 0.78;

/** screen position (px) of a lon/lat on the earth. returns null if on the far side */
export function earthProj(e, W, H, lon, lat, rad = 1) {
  const lo = lon * D2R, la = lat * D2R;
  const P = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const f = [Math.cos(e.la) * Math.cos(e.lo), Math.cos(e.la) * Math.sin(e.lo), Math.sin(e.la)];
  const ee = [-Math.sin(e.lo), Math.cos(e.lo), 0];
  const nn = [f[1] * ee[2] - f[2] * ee[1], f[2] * ee[0] - f[0] * ee[2], f[0] * ee[1] - f[1] * ee[0]];
  const d = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = d(P, f) * rad;
  const ue = d(P, ee) * rad, un = d(P, nn) * rad;
  if (z < 0.02 && !(rad > 1 && Math.hypot(ue, un) > 1.03)) return null;
  const x = e.off[0] + e.R * ue, y = e.off[1] + e.R * un;
  return { x: W / 2 + x * (H / 2), y: H / 2 - y * (H / 2), z, k: e.R * (H / 2) };
}

export function terrainProj(t, W, H, lon, lat) {
  let gx = ((lon - t.c[0]) * Math.cos(t.c[1] * D2R)) / (t.span * 0.5);
  const gy = (lat - t.c[1]) / (t.span * 0.5);
  let py = gy, f = 1;
  const k = t.tilt || 0;
  if (k > 1e-3) {
    const s = (-1 + Math.sqrt(1 + 3.6 * k * (gy + 1))) / (1.8 * k);
    f = 1 + 0.9 * k * s;
    py = s - 1;
    gx = gx / f;
  }
  return { x: W / 2 + gx * (H / 2), y: H / 2 - py * (H / 2) };
}

export function altitudeKm(p, t) {
  if (p < 0.3) return Math.exp(lerp(Math.log(35786), Math.log(2900), p / 0.3));
  return Math.max(0.12, (t.span * 111) / 1.15);
}

export { sm, lerp };

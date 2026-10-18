/**
 * "ansh" as a single chunky monoline script, authored as centre-line bezier paths.
 * The glass renderer strokes it, turns it into a distance field and shades it as a tube.
 *
 * Design space is 1200 x 480 (see MASK_W / MASK_H); STROKE is the tube thickness.
 */
export const MASK_W = 1280;
export const MASK_H = 480;
export const STROKE = 66;

// a  ·  n  ·  s  ·  h  — chunky monoline script, centre-lines as absolute bezier paths.
// Letters are authored in their own boxes and positioned with xf() (scale + translate).
function xf(d, sx, sy, tx, ty) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const v = parseFloat(n);
    return String(Math.round(((i++ % 2 === 0) ? v * sx + tx : v * sy + ty) * 10) / 10);
  });
}

// "h": looped ascender stem + a separate arch that joins it in a clean T (no retraced overlap)
const H_STEM =
  "M 66 366 C 112 360 146 290 168 204 C 190 112 214 56 252 58 C 296 60 292 160 266 250 C 252 300 246 350 244 392";
const H_ARCH =
  "M 256 300 C 262 262 274 216 312 210 C 360 204 380 262 372 326 C 366 368 384 396 424 384";

export const NAME_PATHS = [
  // a : round bowl, stem on the right, exit stroke that flows into the n
  "M 296 228 C 258 192 162 196 134 268 C 108 336 146 400 218 394 C 280 389 304 322 302 240 C 302 322 308 380 342 394 C 372 406 408 398 440 392",
  // n : stem up, arch over, down the right leg with an exit stroke
  "M 440 392 C 446 330 452 270 458 226 C 464 190 556 170 586 238 C 606 290 582 356 592 388 C 598 404 618 404 632 394",
  // s : single S curve
  "M 830 234 C 794 198 714 210 716 262 C 718 312 826 300 830 356 C 834 410 746 416 712 380",
  // h : looped ascender stem, then the arch
  xf(H_STEM, 0.9, 0.9, 850, 40),
  xf(H_ARCH, 0.9, 0.9, 850, 40),
];
export const HELLO_PATHS = NAME_PATHS; // legacy alias

/** Draw the strokes (white on black) into a 2D context of size MASK_W*scale. */
export function drawMask(ctx, scale = 1) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MASK_W * scale, MASK_H * scale);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = STROKE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of NAME_PATHS) ctx.stroke(new Path2D(d));
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Felzenszwalb exact Euclidean distance transform (1-D pass helper)   */
/* ------------------------------------------------------------------ */
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let p = v[k];
    let s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
    while (s <= z[k]) {
      k--;
      p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const p = v[k];
    d[q] = (q - p) * (q - p) + f[p];
  }
}

/** Squared distance of every "inside" pixel to the nearest "outside" pixel. */
function edtSquared(inside, w, h) {
  const INF = 1e12;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) grid[i] = inside[i] ? INF : 0;
  const m = Math.max(w, h);
  const f = new Float64Array(m);
  const d = new Float64Array(m);
  const v = new Int32Array(m);
  const z = new Float64Array(m + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  return grid;
}

function boxBlur(src, w, h, r, passes) {
  let a = src;
  let b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    // vertical
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/**
 * Rasterise the script and return a float height map (0 outside, dome profile inside)
 * of size [MASK_W*scale x MASK_H*scale].
 */
export function buildHeightField(scale = 1) {
  const w = Math.round(MASK_W * scale);
  const h = Math.round(MASK_H * scale);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  drawMask(ctx, scale);
  const px = ctx.getImageData(0, 0, w, h).data;
  const inside = new Uint8Array(w * h);
  for (let i = 0; i < inside.length; i++) inside[i] = px[i * 4] > 127 ? 1 : 0;

  const d2 = edtSquared(inside, w, h);
  const R = (STROKE / 2) * scale; // tube radius in px
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    if (!inside[i]) continue;
    // +0.5 so edge pixels sit half a pixel inside
    const d = Math.sqrt(d2[i]) - 0.5;
    const t = Math.min(1, Math.max(0, d / R));
    // circular tube cross-section; slightly "puffy" where strokes merge
    const dome = Math.sqrt(1 - (1 - t) * (1 - t));
    out[i] = dome + Math.max(0, d / R - 1) * 0.22;
  }
  boxBlur(out, w, h, Math.max(1, Math.round(2 * scale)), 2);
  return { data: out, w, h };
}


/* ------------------------------------------------------------------ */
/* Handwriting timeline: every pixel of the script gets "the moment the pen reaches it" */
/* ------------------------------------------------------------------ */
// Two pens write at once and converge in the middle of the word:
//   pen 1 starts at the "a" and moves left -> right  (a, then n)
//   pen 2 starts at the far right of the "h" and moves right -> left (h exit stroke + arch, then down and round
//   the loop, then the s with its natural right-to-left sweep) until it meets pen 1 where the n and s touch.
// Each entry is [index into NAME_PATHS, written backwards?].
export const PEN_PLAN = [
  [[0, false], [1, false]],
  [[4, true], [3, true], [2, false]],
];
export const AIR_SPEEDUP = 3; // pen-lift moves between strokes are this much faster than writing
export const PEN_SPEED = 900; // path-length units per second, per pen: a calm, natural handwriting pace

function samplePath(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const pts = [[n[0], n[1]]];
  let cx = n[0], cy = n[1];
  for (let k = 2; k + 5 < n.length; k += 6) {
    const [x1, y1, x2, y2, x3, y3] = n.slice(k, k + 6);
    const steps = Math.max(12, Math.ceil(Math.hypot(x3 - cx, y3 - cy) / 2.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      pts.push([
        u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ]);
    }
    cx = x3; cy = y3;
  }
  return pts;
}

/**
 * Float map (MASK_W x MASK_H): t in 0..1 = the moment the pen reaches that pixel (1 = never / outside).
 * Each pen sample stamps a disc the width of the tube; the earliest stamp wins where strokes overlap, so
 * the writing front has a rounded nib. A wider under-layer fills the pixels around the script so the
 * soft shadow can be revealed in step with the pen, and keeps edge pixels from interpolating towards "never".
 */
export function buildWriteMap() {
  const w = MASK_W, h = MASK_H;
  const polys = NAME_PATHS.map(samplePath);
  // two pens write at the same time, one from each end of the word
  const samples = [];
  let total = 0;
  for (const pen of PEN_PLAN) {
    let acc = 0, prev = null;
    pen.forEach(([pi, rev]) => {
      const pts = rev ? polys[pi].slice().reverse() : polys[pi];
      // lifting the pen and travelling to the next stroke is quick, not written at writing speed
      if (prev) acc += Math.max(10, Math.hypot(pts[0][0] - prev[0], pts[0][1] - prev[1]) / AIR_SPEEDUP);
      for (let i = 0; i < pts.length; i++) {
        if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        samples.push([pts[i][0], pts[i][1], acc]);
      }
      prev = pts[pts.length - 1];
    });
    total = Math.max(total, acc);
  }
  const exact = new Float32Array(w * h).fill(2);
  const wide = new Float32Array(w * h).fill(2);
  const stamp = (buf, cx, cy, r, t) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2) {
          const k = y * w + x;
          if (buf[k] > t) buf[k] = t;
        }
      }
    }
  };
  const R = STROKE / 2 + 1.5, RW = STROKE / 2 + 26;
  // densify the pen path (~0.7 unit steps) so the timeline is smooth, not terraced
  let n = 0;
  for (let i = 0; i < samples.length; i++) {
    const [x, y, d] = samples[i];
    const nx = samples[i + 1];
    const sub = nx && nx[2] >= d && Math.hypot(nx[0] - x, nx[1] - y) < 12 ? Math.max(1, Math.ceil(Math.hypot(nx[0] - x, nx[1] - y) / 0.7)) : 1;
    for (let k = 0; k < sub; k++) {
      const f = k / sub;
      const sx = nx && sub > 1 ? x + (nx[0] - x) * f : x;
      const sy = nx && sub > 1 ? y + (nx[1] - y) * f : y;
      const t = (nx && sub > 1 ? d + (nx[2] - d) * f : d) / total;
      stamp(exact, sx, sy, R, t);
      if (n++ % 5 === 0) stamp(wide, sx, sy, RW, t);
    }
  }
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) {
    out[i] = exact[i] <= 1 ? exact[i] : wide[i] <= 1 ? wide[i] : 0; // far from the script: always "written"
  }
  boxBlur(out, w, h, 2, 2); // silky gradients -> no banding in the swelling tip
  return { data: out, w, h, total };
}

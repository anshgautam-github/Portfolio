// "Ink to planet": the signature on the navy page breaks into thousands of glowing dots, which spiral in and assemble into the
// dotted globe. draw(ctx, w, h, i, t) with i = 0..1 transition phase; draws nothing at the ends.
//
// Performance notes (this runs every frame on phones while the Earth scene is also live):
//  - all per-particle state lives in typed arrays and every per-frame output goes into pre-allocated buffers: no GC churn
//  - the signature is sampled ONCE into svg space (idle time, via prewarm); a draw-time "sample" is one getScreenCTM + a multiply
//  - particles that have not launched yet, or have already landed, skip the spiral maths entirely
//  - dots are plain fillRect()s (batched by the GPU, trivial on the CPU) instead of thousands of arc() path segments
//  - the glow gradients only touch their own bounding box instead of the whole canvas
//  - the particle count is lower on phones, and a governor thins it further if frames start taking too long
import { IS_MOBILE, perf } from "../../lib/perf.js";

const PI = Math.PI;
const TAU = PI * 2;
const MAX_N = IS_MOBILE ? 1300 : 2600;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const TILT = 0.38, CT = Math.cos(TILT), ST = Math.sin(TILT);
const COLS = ["232,242,255", "130,180,255", "255,190,110"];

export function createPortal() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* ---- per-particle constants ---- */
  const D = new Float32Array(MAX_N), U = new Float32Array(MAX_N), SW = new Float32Array(MAX_N), SZ = new Float32Array(MAX_N);
  const GY = new Float32Array(MAX_N), RY = new Float32Array(MAX_N), CGA = new Float32Array(MAX_N), SGA = new Float32Array(MAX_N);
  const H = new Uint8Array(MAX_N);
  const GA = new Float32Array(MAX_N);
  for (let k = 0; k < MAX_N; k++) {
    H[k] = (() => { const h = rnd(); return h > 0.7 ? 2 : h > 0.3 ? 1 : 0; })();
    D[k] = rnd(); SW[k] = (rnd() - 0.5) * 2; SZ[k] = 0.7 + rnd() * 1.5;
    GY[k] = 1 - (2 * (k + 0.5)) / MAX_N; GA[k] = k * 2.399963229728653;
  }
  // shuffle which sphere point each ink dot flies to
  for (let k = MAX_N - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    let a = GY[k]; GY[k] = GY[j]; GY[j] = a;
    a = GA[k]; GA[k] = GA[j]; GA[j] = a;
  }
  for (let k = 0; k < MAX_N; k++) { RY[k] = Math.sqrt(Math.max(0, 1 - GY[k] * GY[k])); CGA[k] = Math.cos(GA[k]); SGA[k] = Math.sin(GA[k]); }

  /* ---- signature, in svg space (static; built once) ---- */
  const SVX = new Float32Array(MAX_N), SVY = new Float32Array(MAX_N);   // start point (incl. stroke jitter) in svg units
  let svgBuilt = null;
  function buildSvg(svg) {
    if (svgBuilt === svg) return true;
    const paths = svg ? [...svg.querySelectorAll("path[data-sig]")] : [];
    if (!paths.length) return false;
    const lens = paths.map((p) => p.getTotalLength());
    // getPointAtLength is slow (it re-measures the path on every call), so take a sparse set of points and interpolate between them
    const lx = [], ly = [], lu = [], seg = [];            // seg[j] = true when point j connects to point j+1 on the same path
    paths.forEach((p, pi) => {
      const steps = Math.max(4, Math.ceil(lens[pi] / 16));
      for (let s = 0; s <= steps; s++) {
        const pt = p.getPointAtLength((lens[pi] * s) / steps);
        lx.push(pt.x); ly.push(pt.y); lu.push((pi + s / steps) / paths.length); seg.push(s < steps);
      }
    });
    const L = lx.length;
    for (let k = 0; k < MAX_N; k++) {
      let li = Math.min(L - 1, Math.floor(rnd() * L));
      const f = seg[li] ? rnd() : 0, nx = seg[li] ? li + 1 : li;
      const x = lx[li] + (lx[nx] - lx[li]) * f, y = ly[li] + (ly[nx] - ly[li]) * f;
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * 8;          // half stroke width is 8 svg units
      SVX[k] = x + Math.cos(a) * r; SVY[k] = y + Math.sin(a) * r; U[k] = lu[li] + (lu[nx] - lu[li]) * f;
    }
    svgBuilt = svg;
    return true;
  }

  /* ---- screen-space start points (cheap; redone whenever the transition restarts) ---- */
  const SX = new Float32Array(MAX_N), SY = new Float32Array(MAX_N), A0 = new Float32Array(MAX_N), R0 = new Float32Array(MAX_N);
  let sampled = false, sW = 0, sH = 0;
  function sample(svg, kx, ky, w, h) {
    const cx = w / 2, cy = h / 2;
    const path = svg && buildSvg(svg) ? svg.querySelector("path[data-sig]") : null;
    const m = path ? path.getScreenCTM() : null;
    for (let k = 0; k < MAX_N; k++) {
      let x, y;
      if (!m) {
        const a = rnd() * TAU, r = Math.min(w, h) * (0.2 + rnd() * 0.2);
        x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r; U[k] = rnd();
      } else {
        x = (m.a * SVX[k] + m.c * SVY[k] + m.e) * kx; y = (m.b * SVX[k] + m.d * SVY[k] + m.f) * ky;
      }
      SX[k] = x; SY[k] = y;
      const dx = x - cx, dy = y - cy;
      R0[k] = Math.sqrt(dx * dx + dy * dy); A0[k] = Math.atan2(dy, dx);
    }
    sampled = true; sW = w; sH = h;
  }

  /* ---- per-frame output buffers (reused) ---- */
  const DOT = [0, 1, 2, 3, 4, 5].map(() => new Float32Array(MAX_N * 3)); const DC = new Int32Array(6);   // [colour*2 + bright] -> x, y, radius
  const TRL = [0, 1, 2].map(() => new Float32Array(MAX_N * 4)); const TC = new Int32Array(3);

  /* ---- adaptive particle budget ---- */
  let qual = 1, lastT = 0, ema = 0, nq = 0;
  function govern(now) {
    if (lastT && now - lastT < 250) {
      ema = ema ? ema * 0.85 + (now - lastT) * 0.15 : now - lastT;
      const target = perf.frameMs || 16.7;
      if (++nq >= 6) {
        nq = 0;
        if (ema > target * 1.3) qual = Math.max(0.3, qual - 0.08);
        else if (ema < target * 1.12) qual = Math.min(1, qual + 0.02);
      }
    }
    lastT = now;
  }

  return {
    /** build the (layout independent) signature sample ahead of time, e.g. while the browser is idle */
    prewarm(svg) { try { if (svg) buildSvg(svg); } catch (_) { /* svg not ready: sampled lazily instead */ } },
    reset() { sampled = false; lastT = 0; ema = 0; },
    draw(ctx, w, h, i, t, svg, cssW, cssH) {
      ctx.clearRect(0, 0, w, h);
      if (i <= 0.001 || i >= 0.999) { lastT = 0; return; }
      govern(performance.now());
      const dp = w / cssW;
      if (!sampled || sW !== w || sH !== h) sample(svg, w / cssW, h / cssH, w, h);

      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      const R = m * 0.4 * (1 + 0.55 * sm(0.72, 1, i));
      const env = sm(0, 0.04, i) * (1 - sm(0.84, 1, i));
      const form = sm(0.5, 0.8, i) * (1 - sm(0.88, 1, i));
      const n = Math.max(200, Math.round(MAX_N * qual));
      ctx.globalCompositeOperation = "lighter";
      // glow of the planet body and its rim, growing as the dots lock in
      if (form > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
        g.addColorStop(0, `rgba(14,34,84,${(0.5 * form).toFixed(3)})`);
        g.addColorStop(0.62, `rgba(20,48,120,${(0.4 * form).toFixed(3)})`);
        g.addColorStop(0.625, `rgba(255,176,96,${(0.55 * form).toFixed(3)})`);
        g.addColorStop(0.68, `rgba(90,140,255,${(0.22 * form).toFixed(3)})`);
        g.addColorStop(1, "rgba(10,20,60,0)");
        ctx.fillStyle = g;
        ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
      }

      const rotY = t * 0.55, cR = Math.cos(rotY), sR = Math.sin(rotY);
      DC.fill(0); TC.fill(0);
      const swingK = m * 0.16;
      for (let k = 0; k < n; k++) {
        const local = (i - 0.03 - D[k] * 0.22 - U[k] * 0.1) * (1 / 0.58);
        const b = H[k];
        let px, py, rad, bright;
        if (local <= 0) {
          // still sitting on the signature
          px = SX[k]; py = SY[k]; rad = SZ[k] * dp * 0.75; bright = 1;
        } else {
          // sphere target (rotating, tilted); cos/sin of (ga + rotY) via angle-sum, no trig
          const ca = CGA[k] * cR - SGA[k] * sR, sa = SGA[k] * cR + CGA[k] * sR;
          const xx = ca * RY[k], zz = sa * RY[k], gy = GY[k];
          const y2 = gy * CT - zz * ST, z2 = gy * ST + zz * CT;
          const tx = cx + xx * R, ty = cy - y2 * R;
          if (local >= 1) {
            const dz = z2 * 0.5 + 0.5;
            px = tx; py = ty; rad = SZ[k] * dp * 0.75 * (0.55 + 0.6 * dz); bright = 0.3 + 0.7 * dz > 0.62 ? 1 : 0;
          } else {
            const e = ease(local);
            const ddx = tx - cx, ddy = ty - cy;
            const r1 = Math.sqrt(ddx * ddx + ddy * ddy), a1 = Math.atan2(ddy, ddx);
            const a0 = A0[k], r0 = R0[k], sw = SW[k];
            let da = a1 - a0; if (da > PI) da -= TAU; else if (da < -PI) da += TAU;
            const bend = 1.7 + sw * 1.1, swing = swingK * sw;
            const s1 = Math.sin(PI * e);
            const ang = a0 + da * e + s1 * bend, rr = r0 + (r1 - r0) * e + s1 * swing;
            px = cx + Math.cos(ang) * rr; py = cy + Math.sin(ang) * rr;
            const moving = Math.sin(PI * local);
            rad = SZ[k] * dp * (0.75 + 0.45 * moving); bright = 1;
            if (moving > 0.12) {
              const e2 = e > 0.07 ? e - 0.07 : 0, s2 = Math.sin(PI * e2);
              const ang2 = a0 + da * e2 + s2 * bend, rr2 = r0 + (r1 - r0) * e2 + s2 * swing;
              const tr = TRL[b], o = TC[b]; TC[b] = o + 4;
              tr[o] = cx + Math.cos(ang2) * rr2; tr[o + 1] = cy + Math.sin(ang2) * rr2; tr[o + 2] = px; tr[o + 3] = py;
            }
          }
        }
        const ci = b * 2 + bright, d = DOT[ci], o = DC[ci]; DC[ci] = o + 3;
        d[o] = px; d[o + 1] = py; d[o + 2] = rad;
      }

      const lw = Math.max(1, dp * 0.9);
      ctx.lineCap = "round"; ctx.lineWidth = lw;
      for (let b = 0; b < 3; b++) {
        const tc = TC[b];
        if (tc) {
          const tr = TRL[b];
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(${COLS[b]},${(0.5 * env).toFixed(3)})`;
          ctx.beginPath();
          for (let k = 0; k < tc; k += 4) { ctx.moveTo(tr[k], tr[k + 1]); ctx.lineTo(tr[k + 2], tr[k + 3]); }
          ctx.stroke();
        }
        for (let pass = 0; pass < 2; pass++) {       // back-facing dots dim, front-facing / travelling dots bright
          const ci = b * 2 + pass, cnt = DC[ci];
          if (!cnt) continue;
          const d = DOT[ci];
          ctx.fillStyle = `rgba(${COLS[b]},${((pass ? 0.95 : 0.4) * env).toFixed(3)})`;
          for (let k = 0; k < cnt; k += 3) { const r = d[k + 2]; ctx.fillRect(d[k] - r, d[k + 1] - r, r * 2, r * 2); }
        }
      }
      ctx.globalAlpha = 1;
      // soft halo over the dot cloud while it is in flight
      const fl = Math.sin(PI * sm(0.1, 0.75, i));
      if (fl > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.7);
        g.addColorStop(0, `rgba(120,170,255,${(0.16 * fl).toFixed(3)})`); g.addColorStop(1, "rgba(20,40,110,0)");
        ctx.fillStyle = g; ctx.fillRect(cx - m * 0.7, cy - m * 0.7, m * 1.4, m * 1.4);
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

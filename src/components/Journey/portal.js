// "Ink to planet": the signature on the navy page breaks into thousands of glowing dots, which spiral in and assemble into the
// dotted globe. draw(ctx, w, h, i, t) with i = 0..1 transition phase; draws nothing at the ends.
const N = 2600;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function createPortal() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const P = Array.from({ length: N }, (_, k) => ({
    h: rnd(), d: rnd(), sw: (rnd() - 0.5) * 2, sz: 0.7 + rnd() * 1.5,
    sx: 0, sy: 0, u: 0,
    gy: 1 - (2 * (k + 0.5)) / N, ga: k * 2.399963229728653,
  }));
  // shuffle which sphere point each ink dot flies to
  for (let k = N - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const a = P[k].gy, b = P[k].ga; P[k].gy = P[j].gy; P[k].ga = P[j].ga; P[j].gy = a; P[j].ga = b; }
  let sampled = false;

  // sample the on-screen signature strokes (screen px -> canvas px)
  function sample(svg, sx, sy, w, h) {
    const paths = svg ? [...svg.querySelectorAll("path[data-sig]")] : [];
    const lens = paths.map((p) => p.getTotalLength());
    const tot = lens.reduce((a, b) => a + b, 0) || 1;
    for (let k = 0; k < N; k++) {
      const q = P[k];
      if (!paths.length) { const a = rnd() * 6.283, r = Math.min(w, h) * (0.2 + rnd() * 0.2); q.sx = w / 2 + Math.cos(a) * r; q.sy = h / 2 + Math.sin(a) * r; q.u = rnd(); continue; }
      let s = rnd() * tot, pi = 0;
      while (pi < paths.length - 1 && s > lens[pi]) { s -= lens[pi]; pi++; }
      const p = paths[pi], m = p.getScreenCTM(), pt = p.getPointAtLength(s);
      const x = m.a * pt.x + m.c * pt.y + m.e, y = m.b * pt.x + m.d * pt.y + m.f;
      const wd = Math.hypot(m.a, m.b) * 8;                 // half stroke width in screen px
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * wd;
      q.sx = (x + Math.cos(a) * r) * sx; q.sy = (y + Math.sin(a) * r) * sy;
      q.u = (pi + s / lens[pi]) / paths.length;
    }
    sampled = true;
  }

  return {
    reset() { sampled = false; },
    draw(ctx, w, h, i, t, svg, cssW, cssH) {
      ctx.clearRect(0, 0, w, h);
      if (i <= 0.001 || i >= 0.999) return;
      if (!sampled) sample(svg, w / cssW, h / cssH, w, h);
      const cx = w / 2, cy = h / 2, m = Math.min(w, h);
      const R = m * 0.4 * (1 + 0.55 * sm(0.72, 1, i)), dp = w / cssW;
      const env = sm(0, 0.04, i) * (1 - sm(0.84, 1, i));
      const form = sm(0.5, 0.8, i) * (1 - sm(0.88, 1, i));
      ctx.globalCompositeOperation = "lighter";
      // glow of the planet body and its rim, growing as the dots lock in
      if (form > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
        g.addColorStop(0, `rgba(14,34,84,${(0.5 * form).toFixed(3)})`);
        g.addColorStop(0.62, `rgba(20,48,120,${(0.4 * form).toFixed(3)})`);
        g.addColorStop(0.625, `rgba(255,176,96,${(0.55 * form).toFixed(3)})`);
        g.addColorStop(0.68, `rgba(90,140,255,${(0.22 * form).toFixed(3)})`);
        g.addColorStop(1, "rgba(10,20,60,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      const rotY = t * 0.55, cyw = Math.cos(rotY), syw = Math.sin(rotY), tilt = 0.38, ct = Math.cos(tilt), st = Math.sin(tilt);
      const buckets = [[], [], []], trails = [[], [], []];
      for (let k = 0; k < N; k++) {
        const q = P[k];
        // sphere target (rotating, tilted)
        const ry = Math.sqrt(Math.max(0, 1 - q.gy * q.gy)), a = q.ga + rotY;
        let x = Math.cos(a) * ry, y = q.gy, z = Math.sin(a) * ry;
        const y2 = y * ct - z * st, z2 = y * st + z * ct;
        const tx = cx + x * R, ty = cy - y2 * R, tz = z2;
        // unzip the signature left to right, then spiral in
        const local = (i - 0.03 - q.d * 0.22 - q.u * 0.1) / 0.58;
        const e = ease(Math.max(0, Math.min(1, local)));
        const place = (ee) => {
          const dx0 = q.sx - cx, dy0 = q.sy - cy;
          const r0 = Math.hypot(dx0, dy0), a0 = Math.atan2(dy0, dx0);
          const r1 = Math.hypot(tx - cx, ty - cy), a1 = Math.atan2(ty - cy, tx - cx);
          let da = a1 - a0; while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832;
          const ang = a0 + da * ee + Math.sin(Math.PI * ee) * (1.7 + q.sw * 1.1);
          const rr = r0 + (r1 - r0) * ee + Math.sin(Math.PI * ee) * m * 0.16 * q.sw;
          return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
        };
        const [px, py] = place(e);
        const bi = q.h > 0.7 ? 2 : q.h > 0.3 ? 1 : 0;
        const moving = Math.sin(Math.PI * Math.max(0, Math.min(1, local)));
        // the unzipping dots wobble off the stroke first
        const arrived = e >= 1;
        const depth = arrived ? 0.3 + 0.7 * (tz * 0.5 + 0.5) : 1;
        const rad = q.sz * dp * (0.75 + 0.45 * moving) * (arrived ? 0.55 + 0.6 * (tz * 0.5 + 0.5) : 1);
        buckets[bi].push(px, py, rad, depth);
        if (moving > 0.12 && !arrived) { const [qx, qy] = place(Math.max(0, e - 0.07)); trails[bi].push(qx, qy, px, py, moving); }
      }
      const cols = ["232,242,255", "130,180,255", "255,190,110"];
      for (let b = 0; b < 3; b++) {
        const tr = trails[b];
        if (tr.length) {
          ctx.strokeStyle = `rgba(${cols[b]},${(0.5 * env).toFixed(3)})`; ctx.lineWidth = Math.max(1, dp * 0.9); ctx.lineCap = "round";
          ctx.beginPath();
          for (let k = 0; k < tr.length; k += 5) { ctx.moveTo(tr[k], tr[k + 1]); ctx.lineTo(tr[k + 2], tr[k + 3]); }
          ctx.stroke();
        }
        const pts = buckets[b];
        for (let pass = 0; pass < 2; pass++) {       // back-facing / travelling dots dim, front-facing bright
          ctx.fillStyle = `rgba(${cols[b]},${((pass ? 0.95 : 0.4) * env).toFixed(3)})`;
          ctx.beginPath();
          for (let k = 0; k < pts.length; k += 4) {
            const bright = pts[k + 3] > 0.62;
            if (bright !== !!pass) continue;
            ctx.moveTo(pts[k] + pts[k + 2], pts[k + 1]); ctx.arc(pts[k], pts[k + 1], pts[k + 2], 0, 6.2832);
          }
          ctx.fill();
        }
      }
      // soft halo over the dot cloud while it is in flight
      const fl = Math.sin(Math.PI * sm(0.1, 0.75, i));
      if (fl > 0.01) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 0.7);
        g.addColorStop(0, `rgba(120,170,255,${(0.16 * fl).toFixed(3)})`); g.addColorStop(1, "rgba(20,40,110,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

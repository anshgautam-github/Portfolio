const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x) => Math.min(1, Math.max(0, x));
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Frozen-frame shatter: cracks spread from the core, then the picture breaks into shards that fly at the camera. */
export function createShatter() {
  const snap = document.createElement("canvas");
  let tris = null, cracks = null, W = 0, H = 0, ix = 0, iy = 0;

  function build(w, h) {
    W = w; H = h; ix = w * 0.5; iy = h * 0.47;
    const R = rng(7);
    const cols = 12, rows = 8;
    const P = [];
    for (let j = 0; j <= rows; j++) {
      P[j] = [];
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        const jx = edge ? 0 : (R() - 0.5) * 0.7, jy = edge ? 0 : (R() - 0.5) * 0.7;
        // extra clustering towards the impact point: finer shards near the core
        let x = ((i + jx) / cols) * w, y = ((j + jy) / rows) * h;
        if (!edge) { const k = 0.18; x += (ix - x) * k * (1 - Math.hypot(x - ix, y - iy) / Math.hypot(w, h)); y += (iy - y) * k * (1 - Math.hypot(x - ix, y - iy) / Math.hypot(w, h)); }
        P[j][i] = [x, y];
      }
    }
    const maxD = Math.hypot(Math.max(ix, w - ix), Math.max(iy, h - iy));
    tris = [];
    const add = (a, b, c) => {
      const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
      const d = Math.hypot(cx - ix, cy - iy);
      const dx = (cx - ix) / (d + 1e-3), dy = (cy - iy) / (d + 1e-3);
      tris.push({
        pts: [a, b, c], cx, cy, dx, dy,
        delay: (d / maxD) * 0.34 + R() * 0.1,
        speed: (0.35 + R() * 0.55) * (1.15 - 0.55 * (d / maxD)) * w,
        spin: (R() - 0.5) * 6.5, zk: 0.2 + R() * 1.1, fall: 0.5 + R() * 0.9,
      });
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i], d = P[j + 1][i + 1];
      if (R() > 0.5) { add(a, b, c); add(b, d, c); } else { add(a, b, d); add(a, d, c); }
    }
    // jagged crack rays from the impact point
    cracks = [];
    const n = 16;
    for (let k = 0; k < n; k++) {
      let ang = (k / n) * Math.PI * 2 + (R() - 0.5) * 0.35;
      let x = ix, y = iy;
      const pts = [[x, y]];
      const len = maxD * (0.75 + R() * 0.5);
      let s = 0;
      while (s < len) {
        const st = 18 + R() * 40; ang += (R() - 0.5) * 0.5;
        x += Math.cos(ang) * st; y += Math.sin(ang) * st; s += st; pts.push([x, y]);
      }
      cracks.push({ pts, len, w: 0.8 + R() * 1.2 });
    }
  }

  return {
    capture(glc, hudC, w, h) {
      snap.width = w; snap.height = h;
      const c = snap.getContext("2d");
      c.fillStyle = "#02040a"; c.fillRect(0, 0, w, h);
      try { c.drawImage(glc, 0, 0, w, h); } catch (e) { /* ignore */ }
      try { c.drawImage(hudC, 0, 0, w, h); } catch (e) { /* ignore */ }
      const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.4)");
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (!tris || W !== w || H !== h) build(w, h);
    },
    draw(ctx, w, h, sh) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!tris || sh <= 0.0005) return;
      const crack = sm(0.0, 0.17, sh);
      const rel = sh - 0.15;
      const shake = (1 - sm(0.1, 0.2, sh)) * crack * 5;
      const sx = Math.sin(sh * 400) * shake, sy = Math.cos(sh * 330) * shake;
      const sc = w / 1400;

      // intact frame while the cracks spread
      if (rel <= 0) {
        ctx.drawImage(snap, sx, sy);
      } else {
        for (const t of tris) {
          const u = cl((rel - t.delay) / 0.62);
          const e = 1 - Math.pow(1 - u, 3);
          const x = t.dx * t.speed * e * 1.1, y = t.dy * t.speed * e * 0.9 + 1100 * sc * u * u * t.fall;
          const s = 1 + 0.9 * t.zk * u * u;
          const a = 1 - sm(0.55, 1, u);
          if (a <= 0.003) continue;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(t.cx + x, t.cy + y);
          ctx.rotate(t.spin * u);
          ctx.scale(s, s);
          ctx.translate(-t.cx, -t.cy);
          ctx.beginPath();
          const [p0, p1, p2] = t.pts;
          // inflate a hair so neighbouring shards don't show AA seams
          const k = u < 0.01 ? 1.012 : 1;
          const ex = (p) => [t.cx + (p[0] - t.cx) * k, t.cy + (p[1] - t.cy) * k];
          const a0 = ex(p0), a1 = ex(p1), a2 = ex(p2);
          ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.closePath();
          ctx.save(); ctx.clip();
          ctx.drawImage(snap, 0, 0);
          if (u > 0) { ctx.fillStyle = `rgba(2,4,10,${0.5 * u})`; ctx.fillRect(0, 0, w, h); }
          ctx.restore();
          ctx.strokeStyle = `rgba(255,214,140,${0.55 * (1 - u)})`;
          ctx.lineWidth = 1.2 / s;
          ctx.stroke();
          ctx.restore();
        }
      }

      // cracks (additive glow) – grow, then fade as the pieces let go
      const fadeC = 1 - sm(0.15, 0.3, sh);
      if (fadeC > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        for (const c of cracks) {
          const reach = c.len * crack;
          ctx.beginPath();
          let s = 0;
          ctx.moveTo(c.pts[0][0] + sx, c.pts[0][1] + sy);
          for (let i = 1; i < c.pts.length; i++) {
            const dx = c.pts[i][0] - c.pts[i - 1][0], dy = c.pts[i][1] - c.pts[i - 1][1];
            const d = Math.hypot(dx, dy);
            if (s + d > reach) { const f = (reach - s) / d; ctx.lineTo(c.pts[i - 1][0] + dx * f + sx, c.pts[i - 1][1] + dy * f + sy); break; }
            ctx.lineTo(c.pts[i][0] + sx, c.pts[i][1] + sy); s += d;
          }
          ctx.strokeStyle = `rgba(255,226,170,${0.85 * fadeC})`; ctx.lineWidth = c.w * 2.4 * sc; ctx.shadowColor = "rgba(255,190,90,1)"; ctx.shadowBlur = 14; ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${fadeC})`; ctx.lineWidth = c.w * 0.9 * sc; ctx.shadowBlur = 0; ctx.stroke();
        }
        ctx.restore();
      }
      // impact flash + shockwave
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fl = sm(0.0, 0.12, sh) * (1 - sm(0.12, 0.34, sh));
      if (fl > 0.01) {
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, w * 0.32);
        g.addColorStop(0, `rgba(255,236,190,${0.75 * fl})`); g.addColorStop(1, "rgba(255,190,100,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      if (rel > 0) {
        const rr = sm(0, 0.5, rel) * w * 0.8, al = (1 - sm(0.05, 0.5, rel)) * 0.6;
        if (al > 0.01) {
          ctx.strokeStyle = `rgba(150,215,255,${al})`; ctx.lineWidth = 3 * sc + 6 * (1 - sm(0, 0.5, rel)); ctx.beginPath(); ctx.arc(ix, iy, rr, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = `rgba(255,214,140,${al * 0.7})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ix, iy, rr * 0.86, 0, Math.PI * 2); ctx.stroke();
        }
      }
      ctx.restore();
    },
  };
}

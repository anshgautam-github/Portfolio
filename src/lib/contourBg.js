import gsap from "gsap";
import { capDpr, skipFrame, IS_MOBILE } from "./perf.js";

/*
  A topographic backdrop: ink contour lines of a slowly changing terrain, drawn by marching squares on a coarse grid.
    - the terrain is in PAGE space, so two stacked hosts (the heading block and the pinned stage) show one continuous map
    - the pointer is a hill: contours rise and bunch around it, and the lines near it turn blue (a radial-gradient stroke)
    - a click drops a pebble: a ring of terrain travels out and fades
    - panX() lets the pinned horizontal scroll slide the map sideways at half speed, like something far behind the cards
    - idle / touch: the pointer wanders on its own
  Sleeps off screen, shares the global frame budget, and is never created under reduced motion.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const LEVELS = 10;

export default function initContourBg(host, { anchor = host, panX = () => 0, ink = "5,5,5", accent = "63,114,238" } = {}) {
  if (!host) return () => {};
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block";
  const prevIso = host.style.isolation;
  host.style.isolation = "isolate";
  host.insertBefore(cv, host.firstChild);
  const ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1, live = false, cell = 24, nx = 0, ny = 0, sc = 1, field = new Float32Array(0);
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, last: -99 };
  const pebbles = [];

  const measure = () => {
    W = host.clientWidth; H = host.clientHeight; dpr = capDpr(1.5, 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cell = IS_MOBILE ? 34 : clamp(W / 64, 20, 28); sc = clamp(Math.min(W, H * 1.5) / 900, 0.6, 1.4);
    nx = Math.ceil(W / cell) + 2; ny = Math.ceil(H / cell) + 2; field = new Float32Array(nx * ny);
    if (!ptr.sx) { ptr.x = ptr.sx = W * 0.62; ptr.y = ptr.sy = H * 0.45; }
  };

  const onMove = (e) => {
    const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    ptr.x = x; ptr.y = y; ptr.last = gsap.ticker.time;
  };
  const onDown = (e) => {
    const r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    ptr.x = x; ptr.y = y; ptr.last = gsap.ticker.time;
    if (pebbles.length < 4) pebbles.push({ x, y, t0: gsap.ticker.time });
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  const io = new IntersectionObserver((es) => { live = es[0].isIntersecting; }, { rootMargin: "100px 0px" });
  io.observe(host);

  const paths = Array.from({ length: LEVELS }, () => null);

  const tick = () => {
    if (!live) return;
    const now = performance.now();
    if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const t = gsap.ticker.time;
    const ar = anchor.getBoundingClientRect(), pageY = ar.top + window.scrollY, pan = panX();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    const idle = t - ptr.last > 2.4;
    const tx = idle ? W * (0.5 + 0.32 * Math.sin(t * 0.21)) : ptr.x, ty = idle ? H * (0.5 + 0.26 * Math.sin(t * 0.29 + 1.4)) : ptr.y;
    ptr.sx += (tx - ptr.sx) * 0.1; ptr.sy += (ty - ptr.sy) * 0.1;
    const sx = ptr.sx, sy = ptr.sy, hill = 2 * (150 * sc) ** 2;
    for (let i = pebbles.length - 1; i >= 0; i--) if (t - pebbles[i].t0 > 2.2) pebbles.splice(i, 1);

    // terrain heights at the grid nodes
    for (let j = 0; j < ny; j++) {
      const y = j * cell, wy = y + pageY;
      for (let i = 0; i < nx; i++) {
        const x = i * cell, wx = x + pan;
        let v = 0.5 + 0.23 * Math.sin(wx * 0.0029 + t * 0.06 + 1.4 * Math.sin(wy * 0.0021 + t * 0.03))
          + 0.2 * Math.sin(wy * 0.0039 - t * 0.045 + wx * 0.0011)
          + 0.11 * Math.sin((wx * 0.6 + wy) * 0.0071 + t * 0.08);
        const dx = x - sx, dy = y - sy;
        v += 0.3 * Math.exp(-(dx * dx + dy * dy) / hill);
        for (let k = 0; k < pebbles.length; k++) {
          const p = pebbles[k], age = t - p.t0, d = Math.hypot(x - p.x, y - p.y), q = (d - age * 330 * sc) / (46 * sc);
          v += 0.22 * Math.exp(-q * q) * (1 - age / 2.2);
        }
        field[j * nx + i] = v;
      }
    }

    // marching squares, one Path2D per level
    for (let L = 0; L < LEVELS; L++) {
      const lv = 0.16 + L * 0.085, path = new Path2D();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = field[j * nx + i], b = field[j * nx + i + 1], c = field[(j + 1) * nx + i + 1], d = field[(j + 1) * nx + i];
        const idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x0 = i * cell, y0 = j * cell;
        const T = [x0 + cell * ((lv - a) / (b - a)), y0], R = [x0 + cell, y0 + cell * ((lv - b) / (c - b))];
        const B = [x0 + cell * ((lv - d) / (c - d)), y0 + cell], Lf = [x0, y0 + cell * ((lv - a) / (d - a))];
        const seg = (p, q) => { path.moveTo(p[0], p[1]); path.lineTo(q[0], q[1]); };
        switch (idx) {
          case 1: case 14: seg(Lf, B); break;
          case 2: case 13: seg(B, R); break;
          case 3: case 12: seg(Lf, R); break;
          case 4: case 11: seg(T, R); break;
          case 6: case 9: seg(T, B); break;
          case 7: case 8: seg(T, Lf); break;
          case 5: seg(T, R); seg(Lf, B); break;
          case 10: seg(T, Lf); seg(B, R); break;
        }
      }
      paths[L] = path;
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (let L = 0; L < LEVELS; L++) {
      ctx.strokeStyle = `rgba(${ink},${L % 3 === 0 ? 0.2 : 0.1})`; ctx.lineWidth = L % 3 === 0 ? 1.15 : 0.8;
      ctx.stroke(paths[L]);
    }
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 300 * sc);
    g.addColorStop(0, `rgba(${accent},.85)`); g.addColorStop(0.55, `rgba(${accent},.35)`); g.addColorStop(1, `rgba(${accent},0)`);
    ctx.strokeStyle = g; ctx.lineWidth = 1.5;
    for (let L = 0; L < LEVELS; L++) ctx.stroke(paths[L]);
    // a small pencil mark where the pointer is
    ctx.fillStyle = `rgba(${accent},.9)`; ctx.beginPath(); ctx.arc(sx, sy, 2.6 * sc, 0, 6.283); ctx.fill();
  };
  gsap.ticker.add(tick);
  const onResize = () => measure();
  window.addEventListener("resize", onResize);
  measure();

  return () => {
    gsap.ticker.remove(tick); io.disconnect();
    window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown);
    cv.remove(); host.style.isolation = prevIso;
  };
}

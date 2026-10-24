/* Flow field: hundreds of fine light threads drift along a slowly shifting current; the pointer parts the stream like a stone in water. */
import { capDpr } from "../../lib/perf.js";
export function startFlow(canvas) {
  const g = canvas.getContext("2d");
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const N = window.innerWidth < 700 ? 140 : 320;
  let W = 0, H = 0, raf = 0, dead = false, last = 0;
  const m = { x: -9999, y: -9999, vx: 0, vy: 0 };
  const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), l: 0, h: 0 }));
  const size = () => { const d = capDpr(2, 1.25); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * d; canvas.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H); };
  const move = (e) => { const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; m.vx = x - m.x; m.vy = y - m.y; m.x = x; m.y = y; };
  size(); window.addEventListener("resize", size); window.addEventListener("pointermove", move, { passive: true });
  const ang = (x, y, t) => Math.sin(x * 0.0023 + t * 0.00018) * 2.2 + Math.cos(y * 0.0031 - t * 0.00023) * 2.0 + Math.sin((x + y) * 0.0012 + t * 0.0001) * 1.4;
  const seed = (p) => { p.x = Math.random() * W; p.y = Math.random() * H; p.l = 0; p.h = 205 + Math.random() * 60; };
  P.forEach((p) => { p.h = 205 + Math.random() * 60; });
  // the canvas only animates while it is on (or next to) the screen: it used to keep drawing ~30 frames a second for the whole life of the page
  let vis = true;
  const tick = (t) => {
    raf = 0;
    if (dead || !vis) return;
    raf = requestAnimationFrame(tick);
    if (t - last < 30) return; last = t;
    // fade previous frame to leave trails
    g.globalCompositeOperation = "destination-out";   // erase a little alpha each frame: trails fade but the canvas stays transparent (the warp cursor shows through)
    g.fillStyle = "rgba(0,0,0,.085)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter";
    g.lineWidth = 1.1; g.lineCap = "round";
    for (const p of P) {
      if (p.l === 0 && p.x <= 1) seed(p);
      if (p.x < 1 && p.y < 1) seed(p);
      let a = ang(p.x, p.y, t), sp = 1.5;
      const dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 < 36000) { const f = 1 - d2 / 36000; a += Math.atan2(dy, dx) * 0 + (Math.atan2(dy, dx) - a) * f * 0.9; sp += f * 3 + Math.min(Math.hypot(m.vx, m.vy), 40) * 0.05 * f; }
      const nx = p.x + Math.cos(a) * sp, ny = p.y + Math.sin(a) * sp;
      const al = Math.min(1, p.l / 30) * Math.max(0, 1 - p.l / 260) * 0.55;
      g.strokeStyle = `hsla(${p.h},90%,68%,${al})`;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke();
      p.x = nx; p.y = ny; p.l++;
      if (p.l > 260 || nx < -10 || nx > W + 10 || ny < -10 || ny > H + 10) seed(p);
    }
  };
  if (reduce) return () => {};
  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && !raf && !dead) raf = requestAnimationFrame(tick); }, { rootMargin: "80px" })
    : null;
  if (io) io.observe(canvas);
  raf = requestAnimationFrame(tick);
  return () => { dead = true; cancelAnimationFrame(raf); if (io) io.disconnect(); window.removeEventListener("resize", size); window.removeEventListener("pointermove", move); };
}

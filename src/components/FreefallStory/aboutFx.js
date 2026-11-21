/* aboutFx - the live background behind the About manifesto.
   Layers (bottom -> top), all inside <div class="about-fx">:
     1. a black canvas: ~hundreds of particles riding a slow flow field, drawn as fading light trails. They swirl around the pointer,
        ripple outward on click and get pushed harder while the page scrolls.
     2. three big colour glows that drift on their own (CSS, compositor only).
     3. a dot lattice that only exists near the pointer, and a soft spotlight that follows it (both CSS, masked).
   When the pointer is idle (or on touch) a ghost pointer wanders the section so it always feels alive.
   Pauses off-screen / in a hidden tab, respects prefers-reduced-motion (one still frame). Returns destroy(). */
import { IS_MOBILE, IS_LOW_END, capDpr } from "../../lib/perf.js";

const TAU = Math.PI * 2;
const COLS = ["rgba(126,162,255,.58)", "rgba(154,123,255,.52)", "rgba(111,227,255,.55)"]; // periwinkle, violet, cyan (the manifesto's key-word colours)
const HOT = "rgba(220,232,255,.7)";

export function mountAboutFx(host) {
  const wrap = host && host.querySelector(".about-fx");
  const cv = wrap && wrap.querySelector(".afx-cv");
  if (!cv) return () => {};
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, N = 0;
  let x, y, ox, oy, vx, vy, age, life, hue;
  let px = 0, py = 0, tx = 0, ty = 0, power = 0.45, lastMove = -1e9, inside = false;
  let boost = 0, lastDraw = 0, lastSy = window.scrollY, lastT = 0, running = false, raf = 0, frame = 0, spotX = -1, spotY = -1;
  const ripples = [];
  const R = () => Math.max(130, Math.min(W, 1400) * 0.13);

  const seed = (i, anywhere) => {
    x[i] = ox[i] = Math.random() * W;
    y[i] = oy[i] = anywhere ? Math.random() * H : Math.random() * H;
    vx[i] = vy[i] = 0;
    age[i] = 0;
    life[i] = 4 + Math.random() * 7;
    hue[i] = Math.random();
  };

  const setup = () => {
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    dpr = capDpr(1.5, 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    N = Math.round(Math.min(IS_MOBILE ? 170 : IS_LOW_END ? 420 : 760, (W * H) / (IS_MOBILE ? 5200 : 2300)));
    x = new Float32Array(N); y = new Float32Array(N); ox = new Float32Array(N); oy = new Float32Array(N);
    vx = new Float32Array(N); vy = new Float32Array(N); age = new Float32Array(N); life = new Float32Array(N); hue = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed(i, true); age[i] = Math.random() * life[i]; }
    px = tx = W * 0.5; py = ty = H * 0.4;
    if (reduce) { for (let k = 0; k < 260; k++) step(1 / 60, k / 60, false); drawFrame(); }
  };

  /* slow, smooth angle field: three drifting sine waves */
  const angle = (X, Y, t) => (Math.sin(X * 0.0016 + t * 0.12) + Math.cos(Y * 0.0021 - t * 0.09) + Math.sin((X + Y) * 0.0011 + t * 0.07)) * 1.9;

  const step = (dt, t, interactive) => {
    const r = R(), r2 = r * r;
    const flow = 1 + boost * 1.4;
    const k = Math.min(1, dt * 2.2);
    for (let i = 0; i < N; i++) {
      ox[i] = x[i]; oy[i] = y[i];
      age[i] += dt;
      const a = angle(x[i], y[i], t);
      const sp = (70 + 90 * hue[i]) * flow;
      vx[i] += (Math.cos(a) * sp - vx[i]) * k;
      vy[i] += (Math.sin(a) * sp - vy[i]) * k;
      if (interactive) {
        const dx = x[i] - px, dy = y[i] - py, d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) + 0.001, f = (1 - d / r) * (1 - d / r) * power;
          vx[i] += (-dy / d * 520 - dx / d * 110) * f * dt * 7;   /* swirl around the pointer, with a slight pull */
          vy[i] += (dx / d * 520 - dy / d * 110) * f * dt * 7;
        }
        for (let j = 0; j < ripples.length; j++) {
          const rp = ripples[j], dx2 = x[i] - rp.x, dy2 = y[i] - rp.y, d = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.001, dd = Math.abs(d - rp.r);
          if (dd < 46) { const f = (1 - dd / 46) * rp.a * 900 * dt; vx[i] += dx2 / d * f; vy[i] += dy2 / d * f; }
        }
      }
      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      if (age[i] > life[i] || x[i] < -20 || x[i] > W + 20 || y[i] < -20 || y[i] > H + 20) { seed(i, false); }
    }
  };

  const drawFrame = () => {
    /* fade the trails; every ~90 frames a harder pass clears the 8-bit rounding residue */
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = (frame % 90 === 0) ? "rgba(0,0,0,.38)" : "rgba(0,0,0,.055)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.25; ctx.lineCap = "round";
    const hot = [];
    for (let b = 0; b < 3; b++) {
      ctx.strokeStyle = COLS[b]; ctx.beginPath();
      for (let i = 0; i < N; i++) {
        if (((hue[i] * 3) | 0) !== b) continue;
        if (Math.abs(x[i] - px) + Math.abs(y[i] - py) < 150 * power + 40 && (vx[i] * vx[i] + vy[i] * vy[i]) > 9000) { hot.push(i); continue; }
        ctx.moveTo(ox[i], oy[i]); ctx.lineTo(x[i], y[i]);
      }
      ctx.stroke();
    }
    if (hot.length) { ctx.strokeStyle = HOT; ctx.lineWidth = 1.5; ctx.beginPath(); for (const i of hot) { ctx.moveTo(ox[i], oy[i]); ctx.lineTo(x[i], y[i]); } ctx.stroke(); }
    for (let j = 0; j < ripples.length; j++) {
      const rp = ripples[j];
      ctx.strokeStyle = `rgba(160,190,255,${(rp.a * 0.5).toFixed(3)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, TAU); ctx.stroke();
    }
    frame++;
  };

  const loop = (now) => {
    raf = 0;
    if (!running) return;
    // phones: 30 fps is plenty for slow drifting threads and halves the canvas + compositing work behind the scrolling content
    if (IS_MOBILE && now - lastDraw < 30) { raf = requestAnimationFrame(loop); return; }
    lastDraw = now;
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastT || now)) / 1000)); lastT = now;
    const t = now / 1000;
    /* pointer: the real one while it is moving over the section, otherwise a ghost that wanders */
    const live = inside && now - lastMove < 2600;
    if (!live) { tx = W * (0.5 + 0.34 * Math.sin(t * 0.23)); ty = H * (0.42 + 0.24 * Math.sin(t * 0.31 + 1.3)); }
    power += ((live ? 1 : 0.45) - power) * Math.min(1, dt * 3);
    const e = 1 - Math.exp(-dt * (live ? 9 : 2.5));
    px += (tx - px) * e; py += (ty - py) * e;
    const sy = window.scrollY; boost += (Math.min(1.6, Math.abs(sy - lastSy) / dt / 1800) - boost) * 0.12; lastSy = sy;
    for (let j = ripples.length - 1; j >= 0; j--) { const rp = ripples[j]; rp.r += dt * 520; rp.a -= dt * 0.9; if (rp.a <= 0) ripples.splice(j, 1); }
    step(dt, t, true);
    drawFrame();
    // the pointer lattice + spotlight are hidden on phones (see prism.css): no custom-property writes, so no full-screen masked layer is re-painted per frame
    if (!IS_MOBILE) {
      if (Math.abs(px - spotX) > 0.6 || Math.abs(py - spotY) > 0.6) {
        spotX = px; spotY = py;
        wrap.style.setProperty("--mx", px.toFixed(1) + "px"); wrap.style.setProperty("--my", py.toFixed(1) + "px");
      }
      wrap.style.setProperty("--pw", power.toFixed(3));
    }
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (running || reduce) return; running = true; lastT = 0; raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    const X = e.clientX - r.left, Y = e.clientY - r.top;
    inside = X > -40 && X < r.width + 40 && Y > -40 && Y < r.height + 40;
    if (inside) { tx = X; ty = Y; lastMove = performance.now(); }
  };
  const onDown = (e) => {
    const r = host.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 8, a: 1 });
    if (ripples.length > 4) ripples.shift();
    tx = e.clientX - r.left; ty = e.clientY - r.top; lastMove = performance.now(); inside = true;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerdown", onDown, { passive: true });
  const io = new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { rootMargin: "200px" });
  io.observe(host);
  const ro = new ResizeObserver(() => { const wasRunning = running; stop(); setup(); if (wasRunning) start(); });
  ro.observe(host);
  const onVis = () => (document.hidden ? stop() : (host.getBoundingClientRect().bottom > -200 && host.getBoundingClientRect().top < innerHeight + 200 ? start() : null));
  document.addEventListener("visibilitychange", onVis);
  setup();

  return () => {
    stop(); io.disconnect(); ro.disconnect();
    window.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerdown", onDown);
    document.removeEventListener("visibilitychange", onVis);
  };
}

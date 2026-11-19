/* techBg.js - the live backdrop of the TechSwitch intro screen: a lattice of bone-coloured dots that swells and lights up around the
   cursor, ripples outward when you click, and rolls a slow diagonal wave by itself. Idle cursor -> a ghost pointer drifts a lissajous path. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function mountTechBg(canvas, host) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOBILE = matchMedia("(max-width: 820px)").matches || matchMedia("(pointer: coarse)").matches;
  let W = 2, H = 2, dpr = 1, gap = 36, cols = 0, rows = 0, vis = false, raf = 0, last = 0;
  const P = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, last: -1e9, has: false };
  const ripples = [];
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1 : 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(2, Math.round(w * dpr)); canvas.height = Math.max(2, Math.round(h * dpr));
    W = w; H = h; gap = MOBILE ? 44 : Math.max(30, Math.min(42, w / 40));
    cols = Math.ceil(w / gap) + 2; rows = Math.ceil(h / gap) + 2;
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const rect = () => canvas.getBoundingClientRect();
  const onMove = (e) => { const r = rect(); P.tx = e.clientX - r.left; P.ty = e.clientY - r.top; P.last = performance.now(); if (!P.has) { P.x = P.tx; P.y = P.ty; } P.has = true; };
  const onDown = (e) => { const r = rect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: 0 }); if (ripples.length > 5) ripples.shift(); };
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerdown", onDown, { passive: true });

  const loop = (now) => {
    raf = 0; if (!vis) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const t = now / 1000;
    const live = P.has && now - P.last < 3500;
    if (!live) { P.tx = W * (0.5 + 0.3 * Math.sin(t * 0.37)); P.ty = H * (0.55 + 0.22 * Math.sin(t * 0.53 + 1.3)); }
    const k = 1 - Math.exp(-dt * (live ? 9 : 2.2));
    P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k;
    for (const r of ripples) r.t += dt;
    while (ripples.length && ripples[0].t > 2.2) ripples.shift();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const R = Math.max(150, Math.min(W, H) * 0.3);
    // a soft illuminated pool that breathes around the pointer (drawn under the dots)
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.4);
    const gg = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, R * 0.95 * pulse);
    gg.addColorStop(0, `rgba(24,20,16,${live ? 0.16 : 0.07})`); gg.addColorStop(0.55, `rgba(24,20,16,${live ? 0.05 : 0.02})`); gg.addColorStop(1, "rgba(24,20,16,0)");
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    const buckets = [[], [], [], [], []];
    const ox = ((W - (cols - 2) * gap) / 2) - gap * 0.0, oy = ((H - (rows - 2) * gap) / 2);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let x = ox + (i - 1) * gap, y = oy + (j - 1) * gap;
        const bx = x, by = y;
        // slow diagonal wave
        const wv = Math.sin((bx + by) * 0.006 - t * 0.7) * 0.5 + 0.5;
        let a = 0.34 + wv * 0.2, s = 1.25 + wv * 0.5;
        // pointer swell
        const dx = bx - P.x, dy = by - P.y, d = Math.hypot(dx, dy);
        if (d < R) { const f = 1 - d / R, e = f * f * (3 - 2 * f); a += e * 0.7; s += e * 2.4; x += (dx / (d || 1)) * e * 7; y += (dy / (d || 1)) * e * 7; }
        // click ripples
        for (const r of ripples) {
          const rd = Math.hypot(bx - r.x, by - r.y), front = r.t * 520, w = 90;
          const q = 1 - Math.abs(rd - front) / w;
          if (q > 0) { const fall = 1 - r.t / 2.2; a += q * 0.55 * fall; s += q * 1.6 * fall; const push = q * 10 * fall; x += ((bx - r.x) / (rd || 1)) * push; y += ((by - r.y) / (rd || 1)) * push; }
        }
        a = clamp(a, 0, 1);
        const b = a < 0.42 ? 0 : a < 0.54 ? 1 : a < 0.7 ? 2 : a < 0.88 ? 3 : 4;
        buckets[b].push(x, y, s);
      }
    }
    const alphas = [0.36, 0.48, 0.64, 0.82, 1];
    for (let b = 0; b < 5; b++) {
      const arr = buckets[b]; if (!arr.length) continue;
      ctx.fillStyle = `rgba(24,20,16,${alphas[b]})`;
      for (let n = 0; n < arr.length; n += 3) { const s = arr[n + 2] * 0.55; ctx.fillRect(arr[n] - s, arr[n + 1] - s, s * 2, s * 2); }
    }
    // a hairline "scope" ring that follows the pointer
    ctx.strokeStyle = `rgba(24,20,16,${live ? 0.3 : 0.12})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(P.x, P.y, 28 + Math.sin(t * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(P.x - 40, P.y); ctx.lineTo(P.x - 18, P.y); ctx.moveTo(P.x + 18, P.y); ctx.lineTo(P.x + 40, P.y); ctx.moveTo(P.x, P.y - 40); ctx.lineTo(P.x, P.y - 18); ctx.moveTo(P.x, P.y + 18); ctx.lineTo(P.x, P.y + 40); ctx.stroke();
    raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting && !reduce; if (vis && !raf) { last = 0; raf = requestAnimationFrame(loop); } else if (!vis && raf) { cancelAnimationFrame(raf); raf = 0; } }, { rootMargin: "50px" });
  io.observe(canvas);
  if (reduce) { vis = true; loop(performance.now()); vis = false; }
  return () => { vis = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerdown", onDown); };
}

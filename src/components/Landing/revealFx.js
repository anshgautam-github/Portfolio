/* revealFx - the live background behind the landing card / signature (inside .rv-art).
   A restrained "night sky" built from three depth layers of crisp points that drift, twinkle and parallax with the pointer;
   near neighbours are joined by hairlines, and around the pointer the field gathers into a constellation (lines to the cursor,
   a gentle pull on nearby stars). A thin shooting star crosses every so often. Scrolling pushes the stars into short streaks.
   Two big nebula glows and a soft spotlight (CSS) sit under it. Runs only while the card has started shrinking and the stage is
   on screen, so it never competes with the landing's WebGL scene. Returns { setProgress(p), destroy() }. */
import { IS_MOBILE, IS_LOW_END, capDpr } from "../../lib/perf.js";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const PAL = [[205, 220, 255], [205, 220, 255], [205, 220, 255], [140, 175, 255], [150, 235, 255], [185, 160, 255]]; // mostly cool white, a few periwinkle / cyan / violet

export function mountRevealFx(stage) {
  const art = stage.querySelector(".rv-art");
  const cv = art && art.querySelector(".rv-fx");
  const spot = art && art.querySelector(".rv-spot");
  if (!cv) return { setProgress() {}, destroy() {} };
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, N = 0, dpr = 1;
  let px = 0, py = 0, tx = 0, ty = 0, mx = 0, my = 0, tmx = 0, tmy = 0, pw = 0.4, lastMove = -1e9;
  let prog = 0, lastProg = 0, warp = 0, vis = true, enabled = false, running = false, raf = 0, lastT = 0, nextStar = 0;
  let X, Y, Z, VX, VY, PH, TW, C, SX, SY;
  let star = null, spotX = -1, spotY = -1;

  const spawn = (i, edge) => {
    X[i] = Math.random() * W; Y[i] = Math.random() * H;
    if (edge) { if (Math.random() < 0.5) X[i] = Math.random() < 0.5 ? -4 : W + 4; else Y[i] = Math.random() < 0.5 ? -4 : H + 4; }
    const z = 0.25 + Math.random() * 0.75; Z[i] = z;
    const a = Math.random() * TAU, s = (4 + Math.random() * 9) * z;
    VX[i] = Math.cos(a) * s; VY[i] = Math.sin(a) * s;
    PH[i] = Math.random() * TAU; TW[i] = 0.6 + Math.random() * 1.6; C[i] = (Math.random() * PAL.length) | 0;
  };
  const setup = () => {
    W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
    dpr = capDpr(1.25, 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    N = Math.round(Math.min(IS_MOBILE ? 55 : IS_LOW_END ? 80 : 110, (W * H) / (IS_MOBILE ? 9000 : 9000)));
    X = new Float32Array(N); Y = new Float32Array(N); Z = new Float32Array(N); VX = new Float32Array(N); VY = new Float32Array(N);
    SX = new Float32Array(N); SY = new Float32Array(N); PH = new Float32Array(N); TW = new Float32Array(N); C = new Uint8Array(N);
    for (let i = 0; i < N; i++) spawn(i, false);
    px = tx = W * 0.62; py = ty = H * 0.45;
    if (reduce && enabled) frame(0, 0.016, true);
  };

  const frame = (t, dt, still) => {
    ctx.clearRect(0, 0, W, H);
    const R = Math.max(150, Math.min(W, 1500) * 0.14), R2 = R * R;
    const live = !still && performance.now() - lastMove < 2600;
    if (!live) { tx = W * (0.55 + 0.3 * Math.sin(t * 0.21)); ty = H * (0.45 + 0.22 * Math.sin(t * 0.17 + 1)); }
    pw += ((live ? 1 : 0.5) - pw) * Math.min(1, dt * 3);
    const e = 1 - Math.exp(-dt * (live ? 8 : 2));
    px += (tx - px) * e; py += (ty - py) * e;
    mx += (tmx - mx) * Math.min(1, dt * 3); my += (tmy - my) * Math.min(1, dt * 3);
    const k = Math.min(1, dt * 1.6), streak = 0.05 + warp * 0.22;

    /* move + (depth) parallax */
    for (let i = 0; i < N; i++) {
      const z = Z[i];
      const dx = X[i] - px, dy = Y[i] - py, d2 = dx * dx + dy * dy;
      let ax = 0, ay = 0;
      if (d2 < R2) { const d = Math.sqrt(d2) + 0.001, f = (1 - d / R) * (1 - d / R) * pw * 34 * z; ax = -dx / d * f; ay = -dy / d * f; }
      VX[i] += (ax - 0 + 0) * dt * 6;
      VY[i] += (ay) * dt * 6;
      /* relax toward the star's own slow drift (kept in the angle of the original velocity) */
      const sp = Math.hypot(VX[i], VY[i]) || 1, base = (4 + 9 * z) * (1 + warp * 5);
      VX[i] += (VX[i] / sp * base - VX[i]) * k * 0.6; VY[i] += (VY[i] / sp * base - VY[i]) * k * 0.6;
      X[i] += VX[i] * dt; Y[i] += VY[i] * dt;
      if (X[i] < -8) X[i] = W + 8; else if (X[i] > W + 8) X[i] = -8;
      if (Y[i] < -8) Y[i] = H + 8; else if (Y[i] > H + 8) Y[i] = -8;
    }
    for (let i = 0; i < N; i++) { SX[i] = X[i] + mx * 18 * Z[i]; SY[i] = Y[i] + my * 12 * Z[i]; }
    const sx = (i) => SX[i], sy = (i) => SY[i];

    /* hairlines between near neighbours (4 alpha buckets, one stroke each) */
    const L = Math.max(110, Math.min(W, 1500) * 0.1), L2 = L * L;
    ctx.lineWidth = 0.7; ctx.lineCap = "round";
    const buckets = [[], [], [], []];
    for (let i = 0; i < N; i++) {
      const xi = SX[i], yi = SY[i];
      for (let j = i + 1; j < N; j++) {
        const dx = xi - SX[j];
        if (dx > L || dx < -L) continue;
        const dy = yi - SY[j], d2 = dx * dx + dy * dy;
        if (d2 < L2) buckets[Math.min(3, ((1 - Math.sqrt(d2) / L) * 4) | 0)].push(i, j);
      }
    }
    for (let b = 0; b < 4; b++) {
      const arr = buckets[b]; if (!arr.length) continue;
      ctx.strokeStyle = `rgba(150,180,255,${(0.09 + b * 0.07).toFixed(3)})`; ctx.beginPath();
      for (let n = 0; n < arr.length; n += 2) { ctx.moveTo(sx(arr[n]), sy(arr[n])); ctx.lineTo(sx(arr[n + 1]), sy(arr[n + 1])); }
      ctx.stroke();
    }

    /* constellation around the pointer */
    const R3 = R * 1.25;
    ctx.lineWidth = 0.9;
    for (let i = 0; i < N; i++) {
      const xi = sx(i), yi = sy(i), dx = xi - px, dy = yi - py, d = Math.hypot(dx, dy);
      if (d < R3) { ctx.strokeStyle = `rgba(160,190,255,${((1 - d / R3) * 0.55 * pw).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(xi, yi); ctx.lineTo(px, py); ctx.stroke(); }
    }

    /* the stars */
    for (let i = 0; i < N; i++) {
      const z = Z[i], xi = sx(i), yi = sy(i), c = PAL[C[i]];
      const tw = 0.55 + 0.45 * Math.sin(t * TW[i] + PH[i]);
      const near = Math.max(0, 1 - Math.hypot(xi - px, yi - py) / R) * pw;
      const a = (0.45 + 0.55 * z) * tw + near * 0.5, r = 0.7 + z * 1.35 + near * 1.0;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a).toFixed(3)})`;
      if (warp > 0.08) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = r * 1.1; ctx.beginPath(); ctx.moveTo(xi - VX[i] * streak, yi - VY[i] * streak); ctx.lineTo(xi, yi); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(xi, yi, r, 0, TAU); ctx.fill();
    }

    /* pointer marker: a small ring that breathes */
    ctx.strokeStyle = `rgba(170,195,255,${(0.16 + 0.2 * pw).toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 5 + 1.5 * Math.sin(t * 2.2), 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(170,195,255,${(0.06 + 0.08 * pw).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(px, py, 20 + 3 * Math.sin(t * 1.6 + 1), 0, TAU); ctx.stroke();

    /* a shooting star now and then */
    if (!still) {
      if (!IS_MOBILE && !star && t > nextStar) {
        const fromLeft = Math.random() < 0.5, a = (fromLeft ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.25;
        star = { x: fromLeft ? Math.random() * W * 0.5 : W * (0.5 + Math.random() * 0.5), y: Math.random() * H * 0.35, a, s: 1000 + Math.random() * 500, life: 0, len: 170 + Math.random() * 120 };
        nextStar = t + 6 + Math.random() * 7;
      }
      if (star) {
        star.life += dt; star.x += Math.cos(star.a) * star.s * dt; star.y += Math.sin(star.a) * star.s * dt;
        const al = Math.max(0, 1 - star.life / 0.9), hx = star.x, hy = star.y, tx2 = hx - Math.cos(star.a) * star.len, ty2 = hy - Math.sin(star.a) * star.len;
        const g = ctx.createLinearGradient(tx2, ty2, hx, hy); g.addColorStop(0, "rgba(180,205,255,0)"); g.addColorStop(1, `rgba(235,243,255,${(0.85 * al).toFixed(3)})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(hx, hy); ctx.stroke();
        if (star.life > 0.9 || hx < -300 || hx > W + 300 || hy > H + 300) star = null;
      }
    }

    if (spot && (Math.abs(px - spotX) > 0.6 || Math.abs(py - spotY) > 0.6)) { spotX = px; spotY = py; spot.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0)"; }
  };

  const loop = (now) => {
    raf = 0; if (!running) return;
    if (IS_MOBILE && lastT && now - lastT < 30) { raf = requestAnimationFrame(loop); return; }   // phones: ~30 fps is plenty for drifting stars, and leaves the other frames to the scroll
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastT || now)) / 1000)); lastT = now;
    const dp = Math.abs(prog - lastProg) / dt; lastProg = prog;
    warp += (Math.min(1, dp * 0.9) - warp) * 0.1;
    frame(now / 1000, dt, false);
    raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    const want = enabled && vis && !document.hidden && !reduce;
    if (want && !running) { running = true; lastT = 0; raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    if (reduce && enabled && vis && W) frame(0, 0.016, true);
  };

  const onMove = (e) => {
    if (!vis) return;
    const r = stage.getBoundingClientRect(); const X0 = e.clientX - r.left, Y0 = e.clientY - r.top;
    if (X0 < -40 || X0 > r.width + 40 || Y0 < -40 || Y0 > r.height + 40) return;
    tx = X0; ty = Y0; tmx = (X0 / r.width) * 2 - 1; tmy = (Y0 / r.height) * 2 - 1; lastMove = performance.now();
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; sync(); }, { rootMargin: "100px" });
  io.observe(stage);
  const ro = new ResizeObserver(() => { setup(); });
  ro.observe(stage);
  const onVis = () => sync();
  document.addEventListener("visibilitychange", onVis);
  nextStar = 3; setup();

  return {
    /* phones start the stars at ~10% progress: the card still covers the whole screen before that. Progress of the landing -> reveal scroll: the field only runs once the card starts to shrink (before that the card hides it) */
    setProgress(p) { prog = p; const en = p > (IS_MOBILE ? 0.1 : 0.004) && p < 0.985; if (en !== enabled) { enabled = en; sync(); } },
    destroy() { running = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); },
  };
}

/* workFx - pointer-driven life for the "Where I've worked" cards.
   The pointer (or, with none, a slow ghost cursor) drives two things:
     --sx / --sy  px position inside each card: moves the card's spotlight + dot-grid window (CSS `translate`, compositor only)
     depth        the big word, the logo disc and the logo plate drift at different rates (inline `translate`), and --px / --py
                  go on the disc only (its glare), so no custom property cascades through the whole stage any more.
   Only cards that are actually shown are touched, every layout read happens before the writes (no layout thrash), unchanged values
   are not rewritten, and the idle ghost drift runs at ~30fps (it moves a few px a second). Runs only while the stage is on screen.
   Returns destroy(). */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function mountWorkFx(stage) {
  if (!stage) return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const narrow = window.matchMedia("(max-width: 760px)");   // phones: the depth shifts are off in the stylesheet, so are not written here
  const cards = Array.from(stage.querySelectorAll(".screen")).map((el) => ({
    el, gw: el.querySelector(".sb-gw"), grid: el.querySelector(".sb-grid"), spot: el.querySelector(".sb-spot"), title: el.querySelector(".screen-title"), disc: el.querySelector(".disc"), plate: el.querySelector(".logo-plate"), sx: "", sy: "", d: "",
  }));
  let tx = 0, ty = 0, px = 0, py = 0, cx = 0, cy = 0, lastMove = -1e9, has = false, vis = false, running = false, raf = 0, lastT = 0, lastDraw = 0;

  const onMove = (e) => {
    if (!vis) return;                                   // the stage is off screen: nothing to follow, and no layout read per mouse move
    const r = stage.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return;
    cx = e.clientX; cy = e.clientY;
    tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    lastMove = performance.now(); has = true;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const loop = (now) => {
    raf = 0; if (!running) return;
    raf = requestAnimationFrame(loop);
    const live = has && now - lastMove < 3000;
    if (!live && now - lastDraw < 32) return;           // idle drift: ~30fps is plenty
    lastDraw = now;
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastT || now)) / 1000)); lastT = now;
    const t = now / 1000;

    // 1) reads
    const shown = cards.filter((c) => c.el.style.visibility !== "hidden");
    const r = stage.getBoundingClientRect();
    const rects = shown.map((c) => c.el.getBoundingClientRect());

    // 2) maths
    if (!live) { tx = 0.4 * Math.sin(t * 0.37); ty = 0.28 * Math.sin(t * 0.29 + 1.2); cx = r.left + r.width * (0.5 + tx * 0.35); cy = r.top + r.height * (0.45 + ty * 0.35); }
    const k = 1 - Math.exp(-dt * (live ? 7 : 2.2));
    px += (tx - px) * k; py += (ty - py) * k;
    const depth = !narrow.matches;
    const fx = px.toFixed(3), fy = py.toFixed(3);

    // 3) writes
    for (let i = 0; i < shown.length; i++) {
      const c = shown[i], cr = rects[i];
      const sx = (cx - cr.left).toFixed(0) + "px", sy = (cy - cr.top).toFixed(0) + "px";
      if (sx !== c.sx || sy !== c.sy) {
        c.sx = sx; c.sy = sy;
        const X = parseInt(sx, 10), Y = parseInt(sy, 10);   // inline translates: no custom property restyling the whole card
        if (c.gw) c.gw.style.translate = `${X - 340}px ${Y - 340}px`;
        if (c.grid) c.grid.style.translate = `${340 - X}px ${340 - Y}px`;
        if (c.spot) c.spot.style.translate = `${X - 420}px ${Y - 420}px`;
      }
      const key = fx + "|" + fy;
      if (key === c.d) continue;
      c.d = key;
      if (c.disc) { c.disc.style.setProperty("--px", fx); c.disc.style.setProperty("--py", fy); }
      if (!depth) continue;
      if (c.title) c.title.style.translate = `${(px * -26).toFixed(1)}px ${(py * -14).toFixed(1)}px`;
      if (c.disc) c.disc.style.translate = `${(px * 18).toFixed(1)}px ${(py * 12).toFixed(1)}px`;
      if (c.plate) c.plate.style.translate = `${(px * 10).toFixed(1)}px ${(py * 8).toFixed(1)}px`;
    }
  };
  const sync = () => {
    const want = vis && !document.hidden;
    if (want && !running) { running = true; lastT = 0; raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; sync(); }, { rootMargin: "50px" });
  io.observe(stage);
  const onVis = () => sync();
  document.addEventListener("visibilitychange", onVis);
  return () => { running = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); };
}

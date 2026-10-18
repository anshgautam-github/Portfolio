/**
 * Tiny rigid-circle physics for the falling stickers: gravity, walls, floor, circle-circle collisions
 * with spin, cursor "wind" (moving the mouse shoves nearby stickers) and drag-to-throw.
 * No dependencies; positions are written straight to DOM transforms.
 */
export function createStickerWorld(container, { onImpact } = {}) {
  const bodies = [];
  let W = 0, H = 0;
  let raf = 0, last = 0, destroyed = false, visible = true;
  const GRAV = 1900;
  const REST = 0.38;       // bounciness
  const AIR = 0.12;        // linear air drag per second
  let floorExtra = 0;

  const measure = () => {
    const r = container.getBoundingClientRect();
    W = r.width;
    H = r.height;
  };

  function add(el, size, x, y, opts = {}) {
    const b = {
      el, size, r: size * 0.43, m: size * size,
      x, y, vx: opts.vx || 0, vy: opts.vy || 0,
      a: opts.a || 0, w: opts.w || 0,
      drag: null, delay: opts.delay || 0, born: false, rest: 0,
    };
    bodies.push(b);
    place(b);
    return b;
  }

  function place(b) {
    b.el.style.transform = `translate3d(${(b.x - b.size / 2).toFixed(2)}px,${(b.y - b.size / 2).toFixed(2)}px,0) rotate(${b.a.toFixed(4)}rad)`;
  }

  function step(dt) {
    const floor = H + floorExtra;
    for (const b of bodies) {
      if (b.delay > 0) { b.delay -= dt; continue; }
      if (b.drag) {
        // spring toward the pointer – feels weighty but responsive
        const k = 38, c = 11;
        const ax = (b.drag.x - b.x) * k - b.vx * c;
        const ay = (b.drag.y - b.y) * k - b.vy * c;
        b.vx += ax * dt;
        b.vy += ay * dt;
        b.w += ((b.vx * 0.004) - b.w) * Math.min(1, dt * 6);
      } else {
        b.vy += GRAV * dt;
      }
      const damp = Math.exp(-AIR * dt);
      b.vx *= damp;
      b.vy *= damp;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.w * dt;
      b.rest = Math.max(0, b.rest - dt);

      // walls + floor
      let hit = 0;
      if (b.x - b.r < 0) { b.x = b.r; if (b.vx < 0) { hit = Math.max(hit, -b.vx); b.vx = -b.vx * REST; } }
      else if (b.x + b.r > W) { b.x = W - b.r; if (b.vx > 0) { hit = Math.max(hit, b.vx); b.vx = -b.vx * REST; } }
      if (b.y + b.r > floor) {
        b.y = floor - b.r;
        if (b.vy > 0) {
          hit = Math.max(hit, b.vy);
          b.vy = b.vy > 140 ? -b.vy * REST : 0;
        }
        // rolling friction: spin follows ground speed
        const target = b.vx / b.r;
        b.w += (target - b.w) * Math.min(1, dt * 10);
        b.vx *= Math.exp(-2.6 * dt);
      }
      if (hit > 260 && onImpact && b.rest <= 0) { b.rest = 0.08; onImpact(Math.min(1, hit / 1400)); }
    }

    // circle-circle
    for (let i = 0; i < bodies.length; i++) {
      const A = bodies[i];
      if (A.delay > 0) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const B = bodies[j];
        if (B.delay > 0) continue;
        let dx = B.x - A.x, dy = B.y - A.y;
        const min = A.r + B.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        const pen = min - d;
        const ma = A.drag ? 1e6 : A.m, mb = B.drag ? 1e6 : B.m;
        const tot = ma + mb;
        A.x -= nx * pen * (mb / tot);
        A.y -= ny * pen * (mb / tot);
        B.x += nx * pen * (ma / tot);
        B.y += ny * pen * (ma / tot);
        const rvx = B.vx - A.vx, rvy = B.vy - A.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const jn = (-(1 + REST) * vn) / (1 / ma + 1 / mb);
          A.vx -= (jn * nx) / ma; A.vy -= (jn * ny) / ma;
          B.vx += (jn * nx) / mb; B.vy += (jn * ny) / mb;
          // tangential friction -> spin
          const tx = -ny, ty = nx;
          const vt = rvx * tx + rvy * ty;
          const jt = vt * 0.12;
          A.w += jt * 0.01; B.w += jt * 0.01;
          if (-vn > 240 && onImpact && A.rest <= 0) { A.rest = 0.08; onImpact(Math.min(1, -vn / 1200)); }
        }
      }
    }
  }

  function render() {
    for (const b of bodies) if (b.delay <= 0) { if (!b.born) { b.born = true; b.el.style.visibility = "visible"; } place(b); }
  }

  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    let dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const n = 3;
    for (let i = 0; i < n; i++) step(dt / n);
    render();
  }

  /** shove stickers near the pointer in proportion to how fast it is moving */
  function wind(x, y, vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < 1.5) return;
    for (const b of bodies) {
      if (b.delay > 0 || b.drag) continue;
      const dx = b.x - x, dy = b.y - y;
      const d = Math.hypot(dx, dy);
      const reach = b.r + 70;
      if (d > reach || d < 1) continue;
      const f = Math.pow(1 - d / reach, 1.4);
      const k = Math.min(1500, speed * 38) * f;
      b.vx += (dx / d) * k * 0.55 + (vx / (speed + 1)) * k * 0.45;
      b.vy += (dy / d) * k * 0.55 + (vy / (speed + 1)) * k * 0.45 - k * 0.12;
      b.w += ((dx / d) * vy - (dy / d) * vx) * 0.0016 * f;
    }
  }

  function pick(el) { return bodies.find((b) => b.el === el); }

  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 });
  io.observe(container);
  measure();
  const ro = new ResizeObserver(() => {
    const oldW = W;
    measure();
    for (const b of bodies) { if (oldW) b.x = Math.min(Math.max(b.r, (b.x / oldW) * W), W - b.r); }
  });
  ro.observe(container);
  last = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    add, wind, pick, measure,
    get size() { return { W, H }; },
    setFloorExtra(v) { floorExtra = v; },
    destroy() { destroyed = true; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); },
  };
}

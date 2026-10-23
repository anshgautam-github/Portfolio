/**
 * Sticker rain, in two flavours that live side by side:
 *
 *   - PILE stickers (a handful) drop once with real rigid-circle physics (gravity, walls, floor, collisions with
 *     spin), land and stay piled along the bottom. The cursor can shove them and they can be dragged / thrown.
 *   - DRIFT stickers (the rest) never land: they float down slowly on a smooth closed-form path (gentle sway +
 *     spin, a pure function of time), shrink smaller and smaller towards the bottom edge, vanish, and re-enter
 *     from the top in a new lane. Endless, no accumulation.
 *
 * None of them are DOM elements: they are rasterised once into a sprite atlas and drawn *inside* the WebGL scene,
 * behind the glass lettering, so they show through (refracted) the "ansh" letters whenever they pass behind them.
 */
import { STICKER_ORDER, STICKER_SCALE, stickerSvg } from "./stickers.js";
import { IS_MOBILE } from "../../lib/perf.js";

export const ATLAS_COLS = 4;          // 4 x 4 cells = up to 16 stickers
export const ATLAS_CELL = IS_MOBILE ? 200 : 320;   // texels per cell (phones draw stickers <=160px: a 2.5x smaller atlas to decode, upload and mip)
const ART = IS_MOBILE ? 160 : 256;                      // sticker artwork size inside a cell (the rest is padding for the soft shadow)
const QUAD = ATLAS_CELL / ART;        // sprite quad / artwork size

/** which stickers pile up at the bottom (in order of arrival); everything else drifts down and vanishes */
export const PILE_NAMES = ["amazon", "ibm", "microsoft", "ieee", "mckinsey", "iisc"];

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

// where (as a fraction of the width) each piled sticker is dropped: pairs land close together and stack
const PILE_LANES = [0.12, 0.85, 0.48, 0.18, 0.89, 0.53];

// pile physics (same feel as the original sticker pile)
const GRAV = 1900, REST = 0.38, AIR = 0.12;

export function createFallingStickers(opts = {}) {
  const startDelay = opts.startDelay ?? 0.9;   // seconds before the first sticker appears
  const stagger = opts.stagger ?? 0.55;        // seconds between the first appearance of each drifting sticker
  const pileNames = opts.pile || PILE_NAMES;
  const onImpact = opts.onImpact;
  const names = STICKER_ORDER.slice(0, ATLAS_COLS * ATLAS_COLS);
  const N = names.length;

  /* ---------- sprite atlas (SVG -> canvas), loaded in the background ---------- */
  const atlas = document.createElement("canvas");
  atlas.width = atlas.height = ATLAS_CELL * ATLAS_COLS;
  const actx = atlas.getContext("2d");
  const ready = new Array(N).fill(false);
  const api = {
    atlas, version: 0, loaded: false, count: 0, cell: ATLAS_CELL, data: new Float32Array(16 * 6),
    step, wind, pick, destroy,
  };
  let dead = false;

  names.forEach((name, i) => {
    const svg = stickerSvg(name, i).replace('width="100%" height="100%"', `width="${ART}" height="${ART}"`);
    const img = new Image();
    img.onload = () => {
      if (dead) return;
      const cx = (i % ATLAS_COLS) * ATLAS_CELL + (ATLAS_CELL - ART) / 2;
      const cy = Math.floor(i / ATLAS_COLS) * ATLAS_CELL + (ATLAS_CELL - ART) / 2;
      actx.drawImage(img, cx, cy, ART, ART);
      ready[i] = true;
      if (ready.every(Boolean)) { api.loaded = true; api.version++; }   // one single atlas upload, after everything is drawn
    };
    img.onerror = () => { ready[i] = true; if (ready.every(Boolean)) { api.loaded = true; api.version++; } };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });

  /* ---------- drifting stickers: per-sticker constants ---------- */
  const drift = [];
  names.forEach((name, i) => {
    if (pileNames.includes(name)) return;
    const j = drift.length;
    drift.push({
      cell: i,
      scale: STICKER_SCALE[name] || 1,
      delay: startDelay + j * stagger * 1.25 + hash(i * 3.1) * 0.35,
      speed: 0.068 + 0.032 * hash(i * 5.7 + 1),          // viewport heights per second (a fall takes ~10-14 s)
      swayF: 0.07 + 0.07 * hash(i * 2.3 + 4),             // Hz
      swayA: 0.010 + 0.014 * hash(i * 9.1 + 2),           // fraction of the width
      spin: (hash(i * 4.4 + 7) - 0.5) * 0.42,             // rad / s
      ox: 0, oy: 0,                                       // pointer push (smoothed)
      j, i,
    });
  });

  /* ---------- piled stickers: rigid circles ---------- */
  const pile = [];
  let W = 0, H = 0, base = 120, spawned = false;
  const bodySize = (cell) => base * (STICKER_SCALE[names[cell]] || 1);

  function spawn() {
    spawned = true;
    pileNames.forEach((name, k) => {
      const cell = names.indexOf(name);
      if (cell < 0) return;
      const size = bodySize(cell);
      pile.push({
        cell, size, r: size * 0.43, m: size * size,
        x: W * (PILE_LANES[k % PILE_LANES.length] + (Math.random() - 0.5) * 0.02),   // drop in clustered pairs so they heap up
        y: -size * (0.8 + k * 0.55),
        vx: (Math.random() - 0.5) * 70, vy: 0,
        a: (Math.random() - 0.5) * 1.2, w: (Math.random() - 0.5) * 3.2,
        delay: startDelay + 0.1 + k * 0.5 + Math.random() * 0.12,
        drag: null, rest: 0,
      });
    });
  }

  function physics(dt) {
    const floor = H;
    for (const b of pile) {
      if (b.delay > 0) continue;
      if (b.drag) {
        // spring toward the pointer: weighty but responsive
        const k = 38, c = 11;
        b.vx += ((b.drag.x - b.x) * k - b.vx * c) * dt;
        b.vy += ((b.drag.y - b.y) * k - b.vy * c) * dt;
        b.w += ((b.vx * 0.004) - b.w) * Math.min(1, dt * 6);
      } else {
        b.vy += GRAV * dt;
      }
      const damp = Math.exp(-AIR * dt);
      b.vx *= damp; b.vy *= damp;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
      b.rest = Math.max(0, b.rest - dt);

      let hit = 0;
      if (b.x - b.r < 0) { b.x = b.r; if (b.vx < 0) { hit = Math.max(hit, -b.vx); b.vx = -b.vx * REST; } }
      else if (b.x + b.r > W) { b.x = W - b.r; if (b.vx > 0) { hit = Math.max(hit, b.vx); b.vx = -b.vx * REST; } }
      if (b.y + b.r > floor) {
        b.y = floor - b.r;
        if (b.vy > 0) { hit = Math.max(hit, b.vy); b.vy = b.vy > 140 ? -b.vy * REST : 0; }
        const target = b.vx / b.r;                          // rolling friction: spin follows ground speed
        b.w += (target - b.w) * Math.min(1, dt * 10);
        b.vx *= Math.exp(-2.6 * dt);
      }
      if (hit > 260 && onImpact && b.rest <= 0) { b.rest = 0.08; onImpact(Math.min(1, hit / 1400)); }
    }
    for (let i = 0; i < pile.length; i++) {
      const A = pile[i];
      if (A.delay > 0) continue;
      for (let j = i + 1; j < pile.length; j++) {
        const B = pile[j];
        if (B.delay > 0) continue;
        const dx = B.x - A.x, dy = B.y - A.y;
        const min = A.r + B.r, d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = min - d;
        const ma = A.drag ? 1e6 : A.m, mb = B.drag ? 1e6 : B.m, tot = ma + mb;
        A.x -= nx * pen * (mb / tot); A.y -= ny * pen * (mb / tot);
        B.x += nx * pen * (ma / tot); B.y += ny * pen * (ma / tot);
        const rvx = B.vx - A.vx, rvy = B.vy - A.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const jn = (-(1 + REST) * vn) / (1 / ma + 1 / mb);
          A.vx -= (jn * nx) / ma; A.vy -= (jn * ny) / ma;
          B.vx += (jn * nx) / mb; B.vy += (jn * ny) / mb;
          const vt = rvx * -ny + rvy * nx, jt = vt * 0.12;     // tangential friction -> spin
          A.w += jt * 0.01; B.w += jt * 0.01;
          if (-vn > 240 && onImpact && A.rest <= 0) { A.rest = 0.08; onImpact(Math.min(1, -vn / 1200)); }
        }
      }
    }
  }

  /** shove piled stickers near the pointer in proportion to how fast it is moving */
  function wind(x, y, vx, vy) {
    const speed = Math.hypot(vx, vy);
    if (speed < 1.5) return;
    for (const b of pile) {
      if (b.delay > 0 || b.drag) continue;
      const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy), reach = b.r + 70;
      if (d > reach || d < 1) continue;
      const f = Math.pow(1 - d / reach, 1.4);
      const k = Math.min(1500, speed * 38) * f;
      b.vx += (dx / d) * k * 0.55 + (vx / (speed + 1)) * k * 0.45;
      b.vy += (dy / d) * k * 0.55 + (vy / (speed + 1)) * k * 0.45 - k * 0.12;
      b.w += ((dx / d) * vy - (dy / d) * vx) * 0.0016 * f;
    }
  }

  /** the piled sticker under (x, y), or null (used for drag + throw) */
  function pick(x, y) {
    let best = null, bd = 1e9;
    for (const b of pile) {
      if (b.delay > 0) continue;
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < b.size * 0.5 && d < bd) { best = b; bd = d; }
    }
    return best;
  }

  /** advances everything and fills api.data with [x, y, halfQuad, angle, cell, alpha] per visible sticker (viewport-height units) */
  function step(t, w, h, px, py, active, dt) {
    const oldW = W;
    W = w; H = h;
    base = W < 700 ? Math.max(52, Math.min(68, W * 0.16)) : Math.max(92, Math.min(158, W * 0.074));   // phones: smaller stickers so they never swamp the copy
    if (!spawned && W > 0) spawn();
    if (oldW && Math.abs(oldW - W) > 0.5) for (const b of pile) b.x = Math.min(Math.max(b.r, (b.x / oldW) * W), W - b.r);
    for (const b of pile) { const s = bodySize(b.cell); if (Math.abs(s - b.size) > 0.5) { b.size = s; b.r = s * 0.43; b.m = s * s; } }

    const d = Math.min(0.05, Math.max(0.001, dt || 0.016));
    for (const b of pile) if (b.delay > 0) b.delay -= d;
    for (let i = 0; i < 3; i++) physics(d / 3);

    const ease = 1 - Math.exp(-Math.min(0.1, d) * 5.5);
    let n = 0;

    /* drifting stickers (drawn first, i.e. underneath the pile) */
    for (const s of drift) {
      if (!ready[s.i]) continue;
      const tt = t - s.delay;
      if (tt < 0) continue;
      const period = (1 + 0.16) / s.speed;                 // seconds for one trip incl. entering / leaving margins
      const k = Math.floor(tt / period);
      const p = tt / period - k;                           // 0..1 progress along this trip
      const size = base * s.scale * (0.92 + 0.16 * hash(s.i * 13.3 + k * 2.9));
      const lane = (0.11 + s.i * 0.6180339 + k * 0.3819660) % 1;
      const ph = hash(s.i * 17.0 + k * 7.0) * TAU;

      const margin = size * 0.8;
      const y = -margin + p * (H + margin);                // top (above the screen) -> bottom edge
      const x = (0.07 + 0.86 * lane) * W + Math.sin(TAU * s.swayF * tt + ph) * s.swayA * W;
      const a = ph * 0.35 + s.spin * tt + 0.22 * Math.sin(TAU * 0.06 * tt + ph * 1.7);

      // shrink smoothly towards the bottom edge, fade the last few percent
      const shrink = 1 - smooth(0.74, 1.0, p);
      const grow = smooth(0.0, 0.03, p);
      const sc = shrink * shrink * (3 - 2 * shrink) * grow;  // extra easing -> "smaller and smaller"
      const alpha = 1 - smooth(0.93, 1.0, p);
      if (sc < 0.004 || alpha < 0.004) continue;

      // gentle, springy parting around the cursor
      let tx = 0, ty = 0;
      if (active) {
        const dx = x - px, dy = y - py, dd = Math.hypot(dx, dy) || 1;
        const reach = size * 0.9 + 70;
        if (dd < reach) { const f = 1 - dd / reach, push = f * f * 46; tx = (dx / dd) * push; ty = (dy / dd) * push; }
      }
      s.ox += (tx - s.ox) * ease;
      s.oy += (ty - s.oy) * ease;

      const o = n * 6;
      api.data[o] = (x + s.ox) / H;
      api.data[o + 1] = (y + s.oy) / H;
      api.data[o + 2] = (size * sc * QUAD * 0.5) / H;
      api.data[o + 3] = a;
      api.data[o + 4] = s.cell;
      api.data[o + 5] = alpha;
      n++;
    }

    /* piled stickers */
    for (const b of pile) {
      if (b.delay > 0 || !ready[b.cell] || n >= 16) continue;
      const o = n * 6;
      api.data[o] = b.x / H;
      api.data[o + 1] = b.y / H;
      api.data[o + 2] = (b.size * QUAD * 0.5) / H;
      api.data[o + 3] = b.a;
      api.data[o + 4] = b.cell;
      api.data[o + 5] = 1;
      n++;
    }
    api.count = n;
  }

  function destroy() { dead = true; }
  return api;
}

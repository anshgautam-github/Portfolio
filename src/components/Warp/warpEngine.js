import { capDpr, IS_MOBILE } from "../../lib/perf.js";
/**
 * warpEngine — canvas renderer for the "Innovate with Purpose" scroll piece.
 *
 * It owns no scroll logic. A GSAP timeline mutates the plain `state` object
 * (cursor size / rotation, background colour, streak density …) and this
 * engine just paints whatever the state says, once per GSAP tick.
 *
 * What it draws, back to front:
 *   1. background colour   (dark → navy → black, driven by state.bg)
 *   2. halftone dot grid + halftone stickers   (state.dots)
 *   3. the 3D-ish blue cursor, with streaks clipped inside it   (state.inside)
 *   4. full-screen streaks   (state.outside)
 *
 * The streaks are radial "warp" lines. They always drift gently, and the
 * page's scroll *velocity* is added on top, so scrolling literally pushes the
 * lines outward (and scrolling back pulls them in).
 */

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRGB = (a, b, t) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
};

/* ---------- palette ---------- */
const COOL = ["#7df9ff", "#6cd8ff", "#4f9bff", "#3f6bff", "#5a4bff", "#5ff2d0", "#9fe9ff"];
const WARM = ["#ff4ff0", "#c26bff", "#a24bff", "#ff7ad9"];

const BG_DARK = "#101211";
const BG_NAVY = "#14355c";
const BG_BLACK = "#000000";
const FACE_BRIGHT = "#4a9bf7";
const FACE_DEEP = "#3577c3";

/* ---------- the cursor shape (unit space, centred on 0,0) ---------- */
const PTS = [
  [-0.5, -0.5], // tip
  [0.48, -0.11], // right wing
  [0.1, 0.1], // inner notch
  [-0.08, 0.46], // tail
];
const RAD = [0.1, 0.1, 0.035, 0.1];

function roundedPoly(ctx, pts, rad) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    ctx.arcTo(p[0], p[1], m[0], m[1], rad[i]);
  }
  ctx.closePath();
}

/* ---------- halftone stickers ---------- */
const SPR = 128;

function sprite(draw) {
  const c = document.createElement("canvas");
  c.width = c.height = SPR;
  const x = c.getContext("2d");
  x.translate(SPR / 2, SPR / 2);
  draw(x);
  return c;
}

function halftone(src, step = 5) {
  const sx = src.getContext("2d").getImageData(0, 0, SPR, SPR).data;
  const out = document.createElement("canvas");
  out.width = out.height = SPR;
  const o = out.getContext("2d");
  for (let y = step / 2; y < SPR; y += step) {
    for (let x = step / 2; x < SPR; x += step) {
      const i = (Math.floor(y) * SPR + Math.floor(x)) * 4;
      const a = sx[i + 3];
      if (a < 40) continue;
      const lum = (sx[i] * 0.3 + sx[i + 1] * 0.59 + sx[i + 2] * 0.11) / 255;
      const r = step * 0.52 * (a / 255) * (0.45 + 0.55 * lum);
      if (r < 0.4) continue;
      o.fillStyle = `rgb(${sx[i]},${sx[i + 1]},${sx[i + 2]})`;
      o.beginPath();
      o.arc(x, y, r, 0, TAU);
      o.fill();
    }
  }
  return out;
}

const STICKER_DRAW = {
  smiley: (col) => (x) => {
    x.fillStyle = col;
    x.beginPath();
    x.arc(0, 0, 54, 0, TAU);
    x.fill();
    x.fillStyle = "#1b1b1b";
    x.beginPath();
    x.ellipse(-18, -10, 7, 12, 0.2, 0, TAU);
    x.ellipse(18, -10, 7, 12, -0.2, 0, TAU);
    x.fill();
    x.strokeStyle = "#1b1b1b";
    x.lineWidth = 7;
    x.lineCap = "round";
    x.beginPath();
    x.arc(0, 8, 26, 0.2, Math.PI - 0.2);
    x.stroke();
  },
  heart: () => (x) => {
    const g = x.createLinearGradient(0, -50, 0, 56);
    g.addColorStop(0, "#ff3b3b");
    g.addColorStop(1, "#ff4fb8");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 52);
    x.bezierCurveTo(-72, 0, -50, -62, 0, -26);
    x.bezierCurveTo(50, -62, 72, 0, 0, 52);
    x.fill();
  },
  flower: () => (x) => {
    x.strokeStyle = "#7dff5a";
    x.lineWidth = 7;
    for (let i = 0; i < 8; i++) {
      x.save();
      x.rotate((i / 8) * TAU);
      x.beginPath();
      x.ellipse(0, -30, 13, 26, 0, 0, TAU);
      x.stroke();
      x.restore();
    }
    x.beginPath();
    x.arc(0, 0, 10, 0, TAU);
    x.stroke();
  },
  bolt: (col) => (x) => {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(14, -58);
    x.lineTo(-30, 8);
    x.lineTo(-2, 8);
    x.lineTo(-14, 58);
    x.lineTo(32, -8);
    x.lineTo(4, -8);
    x.closePath();
    x.fill();
  },
  face: () => (x) => {
    x.fillStyle = "#e0a27c";
    x.beginPath();
    x.arc(0, 6, 40, 0, TAU);
    x.fill();
    x.fillStyle = "#5a3a22";
    x.beginPath();
    x.arc(0, 0, 46, Math.PI, TAU);
    x.fill();
    x.fillStyle = "#1b1b1b";
    x.beginPath();
    x.arc(-14, 8, 5, 0, TAU);
    x.arc(14, 8, 5, 0, TAU);
    x.fill();
  },
  sparkle: (col) => (x) => {
    x.fillStyle = col;
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 14 : 56;
      const a = (i / 8) * TAU - Math.PI / 2;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
  },
};

// [kind, colour, x, y]  — x / y are fractions of the viewport from the centre
const STICKERS = [
  ["smiley", "#c9cdd1", -0.215, -0.29],
  ["smiley", "#f5a83a", -0.12, -0.06],
  ["flower", null, 0.13, -0.12],
  ["heart", null, 0.23, -0.1],
  ["bolt", "#5cff6a", 0.01, 0.23],
  ["face", null, -0.11, 0.38],
  ["sparkle", "#8fb4ff", 0.0, 0.44],
];

/* ====================================================================== */

export function createWarpEngine(canvas, S) {
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = 1;

  // smoothed pointer (-1..1) + pixel position
  const sm = { mx: 0, my: 0, px: 0, py: 0 };
  // smoothed scroll velocity (px / s, signed)
  let vel = 0;
  let lastY = typeof window !== "undefined" ? window.scrollY : 0;

  /* ---- streaks ---- */
  const N = IS_MOBILE ? 220 : 900;
  const streaks = [];
  for (let i = 0; i < N; i++) {
    const s = { u: (i + 0.5) / N, a: i * 2.399963 + (Math.random() - 0.5) * 0.12 };
    resetStreak(s, Math.random());
    streaks.push(s);
  }
  function resetStreak(s, r) {
    s.r = r;
    s.sp = 0.45 + Math.random() * 1.1;
    s.len = 0.5 + Math.random() * 1.4;
    s.wd = 0.65 + Math.random() * 0.9;
    s.warm = Math.random() < 0.3;
    s.ci = Math.floor(Math.random() * 100);
  }
  // the density ranks are shuffled so streaks don't fade in around the circle in order
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [streaks[i].u, streaks[j].u] = [streaks[j].u, streaks[i].u];
  }

  /* ---- stickers + dot grid (built lazily, once) ---- */
  let stickers = null;
  let dotPattern = null;
  const stickerFx = STICKERS.map(() => ({ ox: 0, oy: 0 }));
  function buildAssets() {
    stickers = STICKERS.map(([kind, col, fx, fy]) => ({
      img: halftone(sprite(STICKER_DRAW[kind](col))),
      fx,
      fy,
    }));
    const t = document.createElement("canvas");
    t.width = t.height = 7 * 2;
    const x = t.getContext("2d");
    x.fillStyle = "rgba(96,120,255,0.9)";
    x.beginPath();
    x.arc(7, 7, 1.7, 0, TAU);
    x.fill();
    dotPattern = ctx.createPattern(t, "repeat");
    try {
      dotPattern.setTransform(new DOMMatrix().scale(0.5));
    } catch (_) {
      /* old Safari: dots simply render 2x on retina */
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = capDpr(1.5, 1);
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    sm.px = sm.px || w / 2;
    sm.py = sm.py || h / 2;
  }

  /* ---- per-frame ---- */
  function updateStreaks(dt) {
    // scroll → velocity (signed, smoothed)
    const y = window.scrollY;
    const raw = (y - lastY) / Math.max(dt, 0.001);
    lastY = y;
    vel += (clamp(raw, -9000, 9000) - vel) * Math.min(1, dt * 5);

    const push = vel * 0.00042; // how hard scrolling pushes the lines
    const speed = 0.09 + S.drift + push;
    const boost = clamp(Math.abs(vel) / 2600, 0, 1.4);

    for (let i = 0; i < N; i++) {
      const s = streaks[i];
      s.r += speed * s.sp * (0.22 + s.r) * dt;
      if (s.r > 1.12) resetStreak(s, 0.015 + Math.random() * 0.04);
      else if (s.r < 0.012) resetStreak(s, 1.05 + Math.random() * 0.05);
    }
    return boost;
  }

  function drawStreaks(alpha, boost, cx, cy) {
    if (alpha <= 0.003) return;
    const R = Math.hypot(w, h) * 0.5;
    const hue = clamp(S.hue);
    ctx.lineCap = "round";
    for (let i = 0; i < N; i++) {
      const s = streaks[i];
      const on = clamp((S.density - s.u) * 9);
      if (on <= 0) continue;
      const fadeIn = smooth(0.02, 0.28, s.r);
      const warmA = s.warm ? 0.25 + 0.75 * hue : 1;
      const a = alpha * on * fadeIn * warmA;
      if (a < 0.02) continue;
      const k = (0.07 + 0.2 * boost) * s.len; // tail length (fraction of r)
      const r1 = s.r * R;
      const r0 = r1 * (1 - k);
      const cos = Math.cos(s.a);
      const sin = Math.sin(s.a);
      ctx.globalAlpha = a;
      ctx.strokeStyle = s.warm ? WARM[s.ci % WARM.length] : COOL[s.ci % COOL.length];
      ctx.lineWidth = (0.9 + s.r * 3.4) * s.wd;
      ctx.beginPath();
      ctx.moveTo(cx + cos * r0, cy + sin * r0);
      ctx.lineTo(cx + cos * r1, cy + sin * r1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function bgColor() {
    return S.bg <= 1 ? mixRGB(BG_DARK, BG_NAVY, clamp(S.bg)) : mixRGB(BG_NAVY, BG_BLACK, clamp(S.bg - 1));
  }

  function render(dt, time) {
    if (!w) return;
    dt = Math.min(dt, 0.05);

    // pointer smoothing
    const k = 1 - Math.pow(0.001, dt);
    sm.mx += (S.mx - sm.mx) * k * 0.9;
    sm.my += (S.my - sm.my) * k * 0.9;
    sm.px += (S.px - sm.px) * (1 - Math.pow(0.0004, dt));
    sm.py += (S.py - sm.py) * (1 - Math.pow(0.0004, dt));

    const boost = updateStreaks(dt);
    if (!stickers && S.dots > 0.01) buildAssets();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bgColor();
    ctx.fillRect(0, 0, w, h);

    // vanishing point drifts a touch toward the pointer
    const vx = w / 2 + sm.mx * w * 0.022;
    const vy = h / 2 + sm.my * h * 0.022;

    /* dot grid */
    if (S.dots > 0.01 && dotPattern) {
      ctx.globalAlpha = S.dots * 0.4;
      ctx.fillStyle = dotPattern;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    /* cursor geometry (needed by stickers too) */
    const unit = Math.min(w * 0.3, h * 0.2);
    let cpx = w / 2 + S.cx * w + sm.mx * w * 0.012;
    let cpy = h / 2 + S.cy * h + sm.my * h * 0.012;
    cpx = lerp(cpx, sm.px, S.follow);
    cpy = lerp(cpy, sm.py, S.follow);
    const rot = ((S.cr + sm.mx * 6 + sm.my * 2) * Math.PI) / 180;
    const sc = unit * S.cs;

    /* stickers */
    if (stickers && S.dots > 0.01) drawStickers(time, cpx, cpy, unit);

    /* cursor */
    if (S.cAlpha > 0.003) {
      const face = mixRGB(FACE_BRIGHT, FACE_DEEP, clamp(S.cMix));
      ctx.save();
      ctx.globalAlpha = S.cAlpha;

      // extruded side — a stack of offset copies, lighter toward the back
      if (S.tilt > 0.01 && S.cs < 14) {
        const L = IS_MOBILE ? 6 : 16;
        const depth = sc * 0.075 * S.tilt;
        const ang = -2.35 + rot * 0.35;
        const dx = Math.cos(ang) * depth;
        const dy = Math.sin(ang) * depth;
        for (let i = L; i >= 1; i--) {
          const t = i / L;
          ctx.save();
          ctx.translate(cpx + dx * t, cpy + dy * t);
          ctx.rotate(rot);
          ctx.scale(sc, sc);
          roundedPoly(ctx, PTS, RAD);
          ctx.fillStyle = mixRGB("#2f86ee", "#8ec1ff", t);
          ctx.fill();
          ctx.restore();
        }
      }

      // face
      ctx.save();
      ctx.translate(cpx, cpy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      roundedPoly(ctx, PTS, RAD);
      ctx.fillStyle = face;
      ctx.fill();
      ctx.restore();

      // streaks that live inside the cursor
      if (S.inside > 0.003) {
        ctx.save();
        ctx.translate(cpx, cpy);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        roundedPoly(ctx, PTS, RAD);
        ctx.restore();
        ctx.clip();
        // streaks are centred on the cursor so the burst stays "inside" it
        drawStreaks(S.inside, boost, lerp(vx, cpx, 0.85), lerp(vy, cpy, 0.85));
      }

      // soft rim light
      if (S.cs < 14) {
        ctx.save();
        ctx.translate(cpx, cpy);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        roundedPoly(ctx, PTS, RAD);
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(200,228,255,0.5)";
        ctx.stroke();
      }
      ctx.restore();
    }

    /* full-screen streaks */
    drawStreaks(S.outside, boost, vx, vy);
  }

  function drawStickers(time, cpx, cpy, unit) {
    const reach = unit * 1.7;
    for (let i = 0; i < stickers.length; i++) {
      const st = stickers[i];
      const appear = smooth(i * 0.09, i * 0.09 + 0.45, S.dots);
      if (appear <= 0.003) continue;
      const bx = w / 2 + st.fx * w + sm.mx * (8 + i * 3) + Math.sin(time * 0.6 + i * 1.7) * 7;
      const by = h / 2 + st.fy * h + sm.my * (8 + i * 3) + Math.cos(time * 0.5 + i * 2.1) * 7;
      // pushed away from the cursor, eased
      const fx = stickerFx[i];
      const ddx = bx - cpx;
      const ddy = by - cpy;
      const d = Math.hypot(ddx, ddy) || 1;
      const push = Math.pow(clamp(1 - d / reach), 2) * S.follow * unit * 0.9;
      fx.ox += (((ddx / d) * push) - fx.ox) * 0.08;
      fx.oy += (((ddy / d) * push) - fx.oy) * 0.08;
      const size = Math.min(w, h) * 0.105 * (0.55 + 0.45 * appear);
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate(bx + fx.ox, by + fx.oy);
      ctx.rotate(Math.sin(time * 0.4 + i) * 0.12 + (1 - appear) * 0.6);
      ctx.drawImage(st.img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  return { resize, render };
}

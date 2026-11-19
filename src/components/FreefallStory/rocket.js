// rocket.js - the opening and the ending of the fall, drawn live on one 2D canvas (no image assets).
// OPENING (p .00-.12): a two-stage launch vehicle coasting over the Earth. Main-engine cutoff, the first stage pushes away and tumbles,
// the upper stage lights a pale vacuum plume, the fairing splits and falls away, the capsule separates on thrusters, its hatch opens,
// and the person pushes off.  ENDING (p .395-.47): drogue, streamer, a staggered inflation with a snap, a swaying descent with a
// gust, a flare, an upright landing that is not perfectly clean (a stumble), and the canopy collapsing behind.
// Everything is a pure function of story progress p (+ time t for sway), so it scrubs both ways.
import { IS_MOBILE } from '../../lib/perf.js';
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const norm = (v, a, b) => clamp((v - a) / (b - a));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (i) => { const s = Math.sin(i * 91.7 + 17.3) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), s) * 2 - 1; };

export const CH = { P0: 0.395, PILOT: 0.405, STREAM: 0.418, INFL: 0.436, FLARE: 0.456, TOUCH: 0.464, END: 0.472, HANG: -92 };

// ---- the descent under canopy: a pure function of p and t. The engine drives the figure from this; the canopy is drawn around it. ----
export function descent(p, t, W, H, size) {
  const sz = size, inflate = norm(p, CH.STREAM, CH.INFL), hang = clamp(1 - Math.exp(-7 * norm(p, CH.STREAM, 0.46)) * Math.cos(11 * norm(p, CH.STREAM, 0.46)), -0.3, 1.2);
  const flare = sstep(CH.FLARE, CH.TOUCH, p), touch = sstep(CH.TOUCH - 0.001, CH.TOUCH + 0.004, p), collapse = sstep(CH.TOUCH + 0.002, CH.END, p);
  const decay = Math.exp(-5 * norm(p, CH.INFL - 0.006, 0.47));                      // the snap rings out, then settles
  const gust = Math.exp(-Math.pow((p - 0.4465) / 0.0035, 2)) * 0.34;                // one rough patch of air on the way down
  let sw = (0.55 * decay * Math.sin(t * 3.3) + 0.12 * Math.sin(t * 1.7 + 1) + 0.07 * noise1(t * 0.9) + gust * Math.sin(t * 7)) * (1 - flare * 0.85) + flare * 0.02;
  // the stumble: at touchdown the body pitches forward, takes two steps, straightens
  const stumble = touch * Math.exp(-5 * norm(p, CH.TOUCH, CH.END)) * Math.sin(norm(p, CH.TOUCH, CH.END) * 14) * 0.22;
  const w = Math.min(1, sz * 1.0);
  const cx0 = W * (0.5 + 0.03 * Math.sin(p * 60)) + sw * sz * 0.4 + lerp(0, W * 0.02, collapse), cy0 = H * lerp(0.27, 0.43, flare) + collapse * H * 0.06;
  const Ls = sz * lerp(1.0, 0.96, flare);                                              // line length
  return { sw, stumble, cx0, cy0, Ls, inflate, hang, flare, touch, collapse, w, gx: cx0 + Math.sin(sw) * (Ls + sz * 0.28), gy: cy0 + Math.cos(sw) * (Ls + sz * 0.28) + touch * sz * 0.1, ang: CH.HANG * hang + (sw * 57.3) + stumble * 57.3 * 1.6 };
}

export function createRocket(canvas) {
  const ctx = canvas.getContext('2d');
  const api = { hatch: { x: 0, y: 0 }, dpr: 1 };
  let grain = null;
  api.resize = () => {
    const d = Math.min(devicePixelRatio || 1, IS_MOBILE ? 1.1 : 1.75), w = Math.max(2, Math.round(canvas.clientWidth * d)), h = Math.max(2, Math.round(canvas.clientHeight * d));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    api.dpr = d;
  };
  const getGrain = (c) => {
    if (grain) return grain;
    const g = document.createElement('canvas'); g.width = g.height = 96; const x = g.getContext('2d'), im = x.createImageData(96, 96);
    for (let i = 0; i < im.data.length; i += 4) { const v = 120 + Math.random() * 135; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); grain = c.createPattern(g, 'repeat'); return grain;
  };

  // a lit metal cylinder: sun from the left, earthshine blue on the shadow edge, panel seams and surface grain
  const metal = (c, x, y, w, h, base, u, o = {}) => {
    const [r, g, b] = base, k = (m) => `rgb(${Math.round(clamp(r * m, 0, 255))},${Math.round(clamp(g * m, 0, 255))},${Math.round(clamp(b * m, 0, 255))})`;
    const gr = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, k(0.55)); gr.addColorStop(0.12, k(1.12)); gr.addColorStop(0.34, k(0.95)); gr.addColorStop(0.72, k(0.42)); gr.addColorStop(0.94, k(0.22)); gr.addColorStop(1, 'rgb(70,100,170)');
    c.save(); c.beginPath(); if (o.path) o.path(c); else c.rect(x - w / 2, y, w, h); c.clip();
    c.fillStyle = gr; c.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    c.globalAlpha = 0.16; c.globalCompositeOperation = 'overlay'; c.fillStyle = getGrain(c); c.fillRect(x - w / 2, y, w, h); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.strokeStyle = 'rgba(0,0,0,.33)'; c.lineWidth = Math.max(0.5, u * 0.07);
    for (let yy = y + (o.seam || 7) * u; yy < y + h - 1; yy += (o.seam || 7) * u) { c.beginPath(); c.moveTo(x - w / 2, yy); c.lineTo(x + w / 2, yy); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.08)'; for (let yy = y + (o.seam || 7) * u + u * 0.1; yy < y + h - 1; yy += (o.seam || 7) * u) { c.beginPath(); c.moveTo(x - w / 2, yy); c.lineTo(x + w / 2, yy); c.stroke(); }
    c.restore();
  };

  function stage1(c, u, a) {                            // first stage + interstage; origin = top centre of interstage
    c.globalAlpha = a;
    metal(c, 0, 0, 7 * u, 3 * u, [38, 36, 34], u, { seam: 3 });
    metal(c, 0, 3 * u, 7 * u, 32 * u, [236, 232, 224], u, { seam: 8 });
    // soot washing up from the engines
    const so = c.createLinearGradient(0, 22 * u, 0, 35 * u); so.addColorStop(0, 'rgba(10,8,6,0)'); so.addColorStop(1, 'rgba(10,8,6,.78)'); c.fillStyle = so; c.fillRect(-3.5 * u, 22 * u, 7 * u, 13 * u);
    c.strokeStyle = 'rgba(10,8,6,.35)'; c.lineWidth = u * 0.12; for (let i = 0; i < 9; i++) { const xx = (hash(i) - 0.5) * 6.4 * u; c.beginPath(); c.moveTo(xx, 24 * u + hash(i + 4) * 4 * u); c.lineTo(xx + (hash(i + 9) - 0.5) * u, 35 * u); c.stroke(); }
    c.fillStyle = 'rgba(15,15,16,.9)'; c.fillRect(-3.5 * u, 8 * u, 7 * u, 0.6 * u);           // roll band
    // folded grid fins near the top, landing legs folded along the base
    c.fillStyle = '#2a2927'; c.fillRect(3.5 * u, 4 * u, 1.3 * u, 2.6 * u); c.fillRect(-4.8 * u, 4 * u, 1.3 * u, 2.6 * u);
    c.strokeStyle = 'rgba(20,20,20,.9)'; c.lineWidth = u * 0.45; c.beginPath(); c.moveTo(3.3 * u, 28 * u); c.lineTo(4.6 * u, 35 * u); c.moveTo(-3.3 * u, 28 * u); c.lineTo(-4.6 * u, 35 * u); c.stroke();
    // engine section
    metal(c, 0, 35 * u, 7 * u, 1.2 * u, [26, 25, 24], u, { seam: 9 });
    c.fillStyle = '#17110c'; for (const x of [-2.6, -1.3, 0, 1.3, 2.6]) { c.beginPath(); c.moveTo((x - 0.55) * u, 36.2 * u); c.lineTo((x + 0.55) * u, 36.2 * u); c.lineTo((x + 0.75) * u, 38.2 * u); c.lineTo((x - 0.75) * u, 38.2 * u); c.closePath(); c.fill(); }
    c.globalAlpha = 1;
  }
  function stage2(c, u, a) {                            // upper stage; origin = top centre
    c.globalAlpha = a;
    metal(c, 0, 0, 6.4 * u, 13 * u, [228, 225, 218], u, { seam: 6.5 });
    metal(c, 0, 13 * u, 6.4 * u, 1 * u, [40, 38, 36], u);
    const g = c.createLinearGradient(-1.6 * u, 0, 1.6 * u, 0); g.addColorStop(0, '#5b564f'); g.addColorStop(1, '#16130f');   // vacuum engine bell
    c.fillStyle = g; c.beginPath(); c.moveTo(-1 * u, 14 * u); c.lineTo(1 * u, 14 * u); c.lineTo(2.1 * u, 18.4 * u); c.lineTo(-2.1 * u, 18.4 * u); c.closePath(); c.fill();
    c.globalAlpha = 1;
  }
  function fairing(c, u, a, side) {                     // one fairing half; origin = bottom outer edge, side = -1 left / +1 right
    c.globalAlpha = a;
    const w = 3.2 * u, h = 11 * u;
    c.save(); c.scale(side, 1);
    const path = (x) => { x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, -h * 0.45); x.quadraticCurveTo(w, -h * 0.85, 0.2 * u, -h); x.lineTo(0, -h); x.closePath(); };
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, side < 0 ? '#f4f1ea' : '#5a574f'); g.addColorStop(1, side < 0 ? '#9d988f' : '#1c1a17');
    c.fillStyle = g; c.beginPath(); path(c); c.fill();
    c.save(); c.clip(); c.globalAlpha = 0.14 * a; c.globalCompositeOperation = 'overlay'; c.fillStyle = getGrain(c); c.fillRect(0, -h, w, h); c.restore();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = u * 0.08; c.beginPath(); c.moveTo(0, -h * 0.3); c.lineTo(w, -h * 0.3); c.stroke();
    c.restore(); c.globalAlpha = 1;
  }
  function capsule(c, u, a, door) {                     // crew capsule + trunk; origin = top of the nose
    c.globalAlpha = a;
    // trunk with radiator panels and a dark solar band
    metal(c, 0, 8.2 * u, 6.2 * u, 5.6 * u, [238, 234, 226], u, { seam: 5.6 });
    c.fillStyle = 'rgba(20,28,60,.85)'; c.fillRect(-3.1 * u, 11 * u, 6.2 * u, 1.8 * u); c.fillStyle = 'rgba(255,255,255,.1)'; for (let i = 0; i < 6; i++) c.fillRect((-3.1 + i * 1.05) * u, 11 * u, 0.05 * u, 1.8 * u);
    // capsule: blunt cone with a nose cover; shaded like the stages
    const cap = (x) => { x.moveTo(-1.1 * u, 0.4 * u); x.quadraticCurveTo(0, -0.5 * u, 1.1 * u, 0.4 * u); x.lineTo(3.3 * u, 8.2 * u); x.lineTo(-3.3 * u, 8.2 * u); x.closePath(); };
    metal(c, 0, 0, 6.6 * u, 8.2 * u, [244, 241, 234], u, { path: cap, seam: 4 });
    c.fillStyle = '#2b2a28'; c.beginPath(); c.moveTo(-1.1 * u, 0.4 * u); c.quadraticCurveTo(0, -0.5 * u, 1.1 * u, 0.4 * u); c.lineTo(1.3 * u, 1.4 * u); c.lineTo(-1.3 * u, 1.4 * u); c.closePath(); c.fill();
    // hatch + windows
    const hx = 0.4 * u, hy = 3.8 * u, hw = 2.2 * u, hh = 3.2 * u;
    c.fillStyle = '#100d0a'; c.beginPath(); c.roundRect(hx - hw / 2, hy, hw, hh, 0.5 * u); c.fill();
    if (door > 0) {
      const gl = c.createRadialGradient(hx, hy + hh / 2, 0, hx, hy + hh / 2, 6 * u); gl.addColorStop(0, `rgba(255,222,165,${0.95 * door})`); gl.addColorStop(1, 'rgba(255,150,40,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = gl; c.fillRect(hx - 7 * u, hy - 4 * u, 14 * u, 12 * u); c.globalCompositeOperation = 'source-over';
    }
    const dw = hw * (1 - door * 0.93);
    c.fillStyle = '#e6e0d3'; c.strokeStyle = 'rgba(30,28,25,.9)'; c.lineWidth = Math.max(0.5, 0.18 * u);
    c.beginPath(); c.roundRect(hx - hw / 2 - door * 1.2 * u, hy + 0.1 * u, Math.max(0.2 * u, dw), hh - 0.2 * u, 0.4 * u); c.fill(); c.stroke();
    c.fillStyle = 'rgba(40,55,90,.9)'; c.beginPath(); c.arc(-1.4 * u, 4.6 * u, 0.42 * u, 0, 6.283); c.fill();
    c.globalAlpha = 1;
  }
  const puff = (c, x, y, k, u, n, seed, size = 1) => {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const a = hash(i + seed) * 6.283, r = (1.5 + k * 16 * (0.3 + hash(i * 3.1 + seed))) * u; c.fillStyle = `rgba(255,244,228,${(1 - k) * 0.42})`; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, (0.35 + (1 - k) * 0.9) * u * 0.7 * size, 0, 6.283); c.fill(); }
    c.globalCompositeOperation = 'source-over';
  };
  const plume = (c, u, x, y, len, wid, hot, t) => {                       // engine exhaust, a soft additive cone
    const L = len * (1 + Math.sin(t * 43) * 0.025), g = c.createLinearGradient(0, y, 0, y + L);
    g.addColorStop(0, hot); g.addColorStop(0.25, 'rgba(255,170,70,.55)'); g.addColorStop(1, 'rgba(255,100,30,0)');
    c.save(); c.filter = `blur(${Math.max(1, u * 0.35)}px)`; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.moveTo(x - wid * 0.55, y); c.quadraticCurveTo(x - wid * 1.25, y + L * 0.3, x - wid * 0.5, y + L * 0.75); c.lineTo(x, y + L); c.lineTo(x + wid * 0.5, y + L * 0.75); c.quadraticCurveTo(x + wid * 1.25, y + L * 0.3, x + wid * 0.55, y); c.closePath(); c.fill(); c.restore();
  };

  // v: { p, t, W, H, fig: {cx, cy, size, on}, px }
  api.draw = (v) => {
    const { p, t, W, H } = v, c = ctx, d = api.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    c.setTransform(d, 0, 0, d, 0, 0);
    const u = H * 0.0098;

    // ================= opening: the vehicle =================
    const enter = ease(norm(p, 0.0015, 0.017)), alive = (1 - sstep(0.125, 0.17, p)) * sstep(0.0015, 0.008, p);   // hidden until the first scroll, then it climbs into frame under thrust
    if (alive > 0.01) {
      const narrow = W < 760, X = W * (narrow ? 0.5 : 0.7), Y = H * (narrow ? 0.5 : 0.44) + Math.sin(t * 0.6) * u * 0.4;
      const tilt = -0.3 + Math.sin(t * 0.35) * 0.012 + norm(p, 0.07, 0.15) * 0.2;
      const recede = ease(norm(p, 0.09, 0.16));
      c.save(); c.translate(X - recede * u * 12 - (1 - enter) * u * 6, Y - recede * u * 10 + (1 - enter) * H * 0.55); c.rotate(tilt); const sc = 1 - recede * 0.6; c.scale(sc, sc);
      // earthshine falling on the underside
      const aur = c.createRadialGradient(0, 14 * u, 2 * u, 0, 14 * u, 46 * u); aur.addColorStop(0, 'rgba(90,150,255,.16)'); aur.addColorStop(1, 'rgba(90,150,255,0)');
      c.fillStyle = aur; c.fillRect(-60 * u, -50 * u, 120 * u, 120 * u);

      const sep1 = ease(norm(p, 0.014, 0.085)), fair = ease(norm(p, 0.048, 0.11)), csep = ease(norm(p, 0.062, 0.1));
      // positions down the axis (y grows toward the tail); stage 2 top at 0, capsule/fairing sit above it
      const s2y = 0, s1y = 18.4 * u * 0 + 14 * u + 3.5 * u * 0;   // stage 1 interstage top = bottom of stage 2 (13+1)
      const burn = 1 - sstep(0.012, 0.02, p);
      // first stage burns until MECO, then pushes away aft and tumbles
      c.save(); c.translate(-sep1 * 15 * u, s1y + sep1 * 50 * u); c.rotate(sep1 * 0.6);
      if (burn > 0.01) plume(c, u, 0, 38.2 * u, 30 * u * burn, 3.4 * u, 'rgba(255,248,225,.95)', t);
      stage1(c, u, 1 - sstep(0.085, 0.125, p)); c.restore();
      // upper stage lights after separation: a pale, wide vacuum plume
      const ign = sstep(0.026, 0.036, p) * (1 - sstep(0.092, 0.105, p));
      c.save(); c.translate(0, s2y);
      if (ign > 0.01) plume(c, u, 0, 18.4 * u, 17 * u * ign, 4.6 * u * ign, 'rgba(190,215,255,.7)', t);
      stage2(c, u, 1 - sstep(0.12, 0.155, p)); c.restore();
      // fairing: splits along its seam and the halves hinge outward and fall away
      if (fair < 0.999) {
        const fa = 1 - sstep(0.09, 0.125, p);
        c.save(); c.translate(-0.1 * u, 0); c.rotate(-fair * 1.15); c.translate(-fair * 5 * u, fair * 20 * u); fairing(c, u, fa, -1); c.restore();
        c.save(); c.translate(0.1 * u, 0); c.rotate(fair * 1.0); c.translate(fair * 6 * u, fair * 28 * u); fairing(c, u, fa, 1); c.restore();
      }
      // capsule: separates forward on small thrusters, then drifts
      const cy = -17.6 * u - csep * 30 * u;
      c.save(); c.translate(csep * 2 * u, cy); c.rotate(csep * 0.08); capsule(c, u, 1, sstep(0.078, 0.094, p));
      const m = c.getTransform(); const hp = m.transformPoint(new DOMPoint(0.4 * u, 5.4 * u)); api.hatch.x = hp.x / d; api.hatch.y = hp.y / d; c.restore();
      // cold-gas puffs at each event
      if (norm(p, 0.013, 0.04) > 0 && norm(p, 0.013, 0.04) < 1) puff(c, -sep1 * 6 * u, s1y + sep1 * 20 * u, norm(p, 0.013, 0.04), u, 14, 1);
      if (norm(p, 0.048, 0.072) > 0 && norm(p, 0.048, 0.072) < 1) puff(c, 0, -10 * u, norm(p, 0.048, 0.072), u, 12, 5, 0.8);
      if (norm(p, 0.062, 0.088) > 0 && norm(p, 0.062, 0.088) < 1) puff(c, 0, cy + 13 * u + csep * 30 * u, norm(p, 0.062, 0.088), u, 10, 9, 0.8);
      if (norm(p, 0.094, 0.11) > 0 && norm(p, 0.094, 0.11) < 1) puff(c, 0.4 * u, cy + 5 * u, norm(p, 0.094, 0.11), u, 10, 13, 0.7);
      c.restore(); c.globalAlpha = 1;
    } else { api.hatch.x = W * 0.7; api.hatch.y = H * 0.4; }

    // ================= ending: the parachute =================
    const f = v.fig;
    if (f && f.on && p > CH.P0 - 0.002 && p < CH.END + 0.004) {
      const D = descent(p, t, W, H, f.size), sz = f.size, a = 1 - sstep(0.469, 0.475, p);
      const pilot = sstep(CH.P0, CH.P0 + 0.006, p) * (1 - sstep(CH.PILOT + 0.004, CH.STREAM, p));
      const inf = ease(D.inflate);
      // staggered inflation: the first fill is partial, it hunts, then it snaps full (the snap is what yanks the body upright)
      const pulse = D.inflate < 1 ? [0, 0.28, 0.2, 0.55, 0.42, 0.78, 0.7, 1][Math.min(7, Math.floor(D.inflate * 8))] : 1;
      const w = D.inflate <= 0 ? 0 : lerp(0.12, 1, Math.max(inf * 0.6, pulse)) * (1 - D.collapse * 0.8) * (1 + 0.035 * Math.sin(t * 5.1) * (1 - D.flare));
      const chh = sz * 0.82 * (0.45 + 0.55 * w) * (1 - D.collapse * 0.5), cwid = sz * 2.0 * w;
      c.save(); c.globalAlpha = a;
      if (pilot > 0.01 && D.inflate <= 0) {                                               // drogue: a small chute pulled out on a line
        const ex = f.cx + Math.sin(t * 9) * 3, ey = f.cy - sz * 0.5 - pilot * sz * 0.9;
        c.strokeStyle = 'rgba(239,231,218,.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(f.cx, f.cy - sz * 0.3); c.lineTo(ex, ey + sz * 0.05); c.stroke();
        c.fillStyle = '#ffb23f'; c.beginPath(); c.ellipse(ex, ey, sz * 0.1, sz * 0.06, 0, Math.PI, 0); c.fill();
      }
      if (D.inflate > 0 || p > CH.STREAM - 0.004) {
        const tilt = D.sw * 0.45 + (1 - D.inflate) * 0.2 * Math.sin(t * 8), cx = D.cx0, cy = D.cy0;
        const streamer = D.inflate < 0.05;
        c.save(); c.translate(cx, cy); c.rotate(tilt);
        // suspension lines from the hem down to the confluence point; they slacken and whip while the canopy hunts
        const F = { x: (D.gx - cx) / 1, y: (D.gy - cy) / 1 - sz * 0.28 };
        c.strokeStyle = 'rgba(239,231,218,.5)'; c.lineWidth = Math.max(1, sz * 0.005); c.beginPath();
        for (let i = 0; i <= 10; i++) { const x = ((i / 10) * 2 - 1) * cwid * 0.5, sag = (1 - w) * 8 * Math.sin(t * 9 + i), mx = (x + F.x) / 2 + sag; c.moveTo(x, 0); c.quadraticCurveTo(mx, F.y * 0.5, F.x + ((i / 10) * 2 - 1) * sz * 0.04, F.y); }
        c.stroke();
        if (!streamer || D.inflate > 0) {
          // canopy: gores are individually shaded domes; scalloped hem; vent at the apex; asymmetric breathing
          const N = 12, top = -chh, lean = Math.sin(t * 2.3) * cwid * 0.04 * (1 - D.flare), R = cwid / 2;
          const pt = (phi, lat) => [R * Math.cos(lat) * Math.sin(phi) + lean * Math.sin(lat), -chh * Math.sin(lat) * (1 + 0.02 * Math.sin(phi * 3 + t * 4) * (1 - w))];
          for (let i = 0; i < N; i++) {
            const p0 = -Math.PI / 2 + (Math.PI * i) / N, p1 = -Math.PI / 2 + (Math.PI * (i + 1)) / N, pm = (p0 + p1) / 2;
            const base = i % 2 ? [239, 231, 218] : [255, 122, 28], sh = 0.34 + 0.85 * Math.max(0, Math.cos(pm + 0.7)) ;
            const gg = c.createLinearGradient(pt(p0, 0)[0], 0, pt(p1, 0)[0], 0), k = (m) => `rgb(${Math.round(clamp(base[0] * m, 0, 255))},${Math.round(clamp(base[1] * m, 0, 255))},${Math.round(clamp(base[2] * m, 0, 255))})`;
            gg.addColorStop(0, k(sh * 0.85)); gg.addColorStop(0.5, k(sh * 1.1)); gg.addColorStop(1, k(sh * 0.8));
            c.fillStyle = gg; c.beginPath();
            const S = 8; let q = pt(p0, 0); c.moveTo(q[0], q[1]);
            for (let s = 1; s <= S; s++) { q = pt(p0, (s / S) * 1.5); c.lineTo(q[0], q[1]); }
            q = pt(pm, 1.5707); c.lineTo(q[0], q[1]);
            for (let s = S; s >= 0; s--) { q = pt(p1, (s / S) * 1.5); c.lineTo(q[0], q[1]); }
            const hm = pt(pm, 0); c.quadraticCurveTo(hm[0], hm[1] + chh * 0.1 + Math.sin(t * 6 + i) * chh * 0.02 * (1 - w), pt(p0, 0)[0], 0); c.closePath(); c.fill();
            c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 0.8; c.beginPath(); q = pt(p0, 0); c.moveTo(q[0], q[1]); for (let s = 1; s <= S; s++) { q = pt(p0, (s / S) * 1.5); c.lineTo(q[0], q[1]); } c.stroke();
          }
          c.fillStyle = 'rgba(8,6,5,.8)'; c.beginPath(); c.ellipse(lean * 0.5, top * 0.985, cwid * 0.035, chh * 0.04, 0, 0, 6.283); c.fill();   // apex vent
          if (D.inflate < 1) { c.fillStyle = 'rgba(8,6,5,.18)'; c.beginPath(); c.ellipse(0, -chh * 0.4, cwid * 0.5, chh * 0.5, 0, 0, 6.283); c.fill(); }   // creases while it hunts
        }
        c.restore();
      }
      // landing: dust thrown up at the feet, and the canopy's shadow-light on the ground
      if (D.touch > 0.01) {
        const k = norm(p, CH.TOUCH, CH.END + 0.004);
        c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) { const ang = hash(i) * 6.283, r = ease(k) * sz * (0.2 + 0.9 * hash(i + 3)); c.fillStyle = `rgba(255,205,140,${(1 - k) * 0.28})`; c.beginPath(); c.arc(D.gx + Math.cos(ang) * r, D.gy + sz * 0.3 + Math.sin(ang) * r * 0.32, sz * (0.05 + 0.1 * hash(i + 8)) * (0.6 + k), 0, 6.283); c.fill(); }
        c.globalCompositeOperation = 'source-over';
      }
      c.restore(); c.globalAlpha = 1;
    }
  };
  return api;
}

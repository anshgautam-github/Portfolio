// figure.js - the person falling through the descent: a skydiver in the classic belly-to-earth arch, seen from above - back to us, rig on his back,
// elbows out with the hands up like goalposts, knees bent and apart, soles of the shoes showing. He is drawn live (2D canvas) from a small
// skeleton, so he moves the way a body does on the air: the arms and legs flutter, the whole body rocks on the wind, and the pose reacts to you -
// he drifts and banks toward the pointer, raises the nearer hand to it, sweeps into a head-down track when you scroll fast, glows as the air
// heats up, and does a spinning flip with a burst of sparks on click.
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// the suit
const PAL = {
  suit: '#1a1c21', suitHi: '#2a2d35', pants: '#4b5530', pantsHi: '#5f6b3d', lime: '#b5df5a', rig: '#101216', strap: '#2f58bd',
  helmet: '#0e0f12', visor: '#2b2f38', glove: '#0c0c0e', shoe: '#e9e5dc', sole: '#c98a4a', soleDk: '#8c5a2a',
};

export function createFigure(canvas, base) {
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d');       // the figure alone, so the heat can tint just him
  const F = {
    d: 1, size: 0, dir: 1, mirror: 1, bank: 0, ox: 0, oy: 0, near: 0, pv: 0, lastPx: 0, lastPy: 0, tuck: 0, hand: 0,
    spinT: 1, spinDir: 1, rings: [], parts: [], streaks: [], embers: [], interacted: false,
  };

  F.resize = (size) => {
    const d = Math.min(devicePixelRatio || 1, 2), px = Math.round(size * 3.4 * d);
    if (px !== canvas.width) { canvas.width = px; canvas.height = px; F.d = d; }
    if (off.width !== px) { off.width = px; off.height = px; }
    F.size = size;
  };
  F.spin = () => {
    if (F.spinT < 1) return;
    F.interacted = true; F.spinT = 0; F.spinDir = Math.random() > 0.5 ? 1 : -1;
    F.rings.push({ t: 0 });
    for (let i = 0; i < 36; i++) {
      const a = Math.random() * TAU, sp = 160 + Math.random() * 540;
      F.parts.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: 0.9 + Math.random() * 1.1, r: 1 + Math.random() * 2.2, ember: Math.random() > 0.35 });
    }
  };

  // ---- the skeleton, in units of U (the figure is ~0.8 U tall). x right, y down the screen, head at the top. ----
  const pose = (t, tuck, hand, nearSide) => {
    const sp = 1 - tuck * 0.85;                                      // 1 = full arch, 0 = tracking (arms back, legs together)
    const fl = (k, a = 1) => Math.sin(t * k) * 0.007 * a;            // the wind shaking limbs
    const P = {};
    P.head = [0, -0.318 + fl(2.1) * 0.3];
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'L' : 'R', ph = s < 0 ? 0 : 1.9;
      const wave = nearSide === s ? hand : 0;                         // the nearer hand lifts toward the pointer
      P['sh' + side] = [s * 0.128, -0.205];
      P['el' + side] = [s * lerp(0.2, 0.31, sp), lerp(-0.1, -0.185, sp) + fl(3.1 + ph) - wave * 0.03];
      P['ha' + side] = [s * lerp(0.17, 0.33, sp) + fl(4.3 + ph, 1.4) * s, lerp(0.07, -0.385, sp) + fl(3.7 + ph, 1.6) - wave * 0.1];
      P['hp' + side] = [s * 0.088, 0.072];
      P['kn' + side] = [s * lerp(0.07, 0.215, sp), lerp(0.26, 0.205, sp) + fl(2.6 + ph)];
      P['ft' + side] = [s * lerp(0.066, 0.335, sp) + fl(3.4 + ph, 1.5) * s, lerp(0.42, 0.318, sp) + fl(2.9 + ph, 1.5)];
    }
    return P;
  };

  const cap = (c, a, b, w, fill) => { c.strokeStyle = fill; c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };

  // Draw him at the origin of c, scaled by U. mono = a single flat colour (the rim light and the afterimages), else the full suit.
  const body = (c, P, U, mono) => {
    c.save(); c.scale(U, U); c.lineCap = 'round'; c.lineJoin = 'round';
    const col = (v) => mono || v;
    const sc = (px) => px / U;
    // legs first (they go under the rig): thigh, shin, then the shoe with its sole turned up to us
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1, hp = P['hp' + side], kn = P['kn' + side], ft = P['ft' + side];
      cap(c, hp, kn, 0.108, col(PAL.pants)); cap(c, kn, ft, 0.088, col(PAL.pants));
      if (!mono) {
        c.globalAlpha = 0.85;                                         // the reflective stripe down the outside of the leg
        cap(c, [hp[0] + s * 0.04, hp[1] + 0.01], [kn[0] + s * 0.036, kn[1]], 0.016, PAL.lime); cap(c, [kn[0] + s * 0.03, kn[1]], [ft[0] + s * 0.026, ft[1] - 0.03], 0.014, PAL.lime);
        c.globalAlpha = 0.28; cap(c, hp, kn, 0.05, PAL.pantsHi); c.globalAlpha = 1;
      }
      const ang = Math.atan2(ft[1] - kn[1], ft[0] - kn[0]);
      c.save(); c.translate(ft[0], ft[1]); c.rotate(ang - Math.PI / 2);
      c.fillStyle = col(PAL.shoe); c.beginPath(); c.ellipse(0, 0.034, 0.047, 0.07, 0, 0, TAU); c.fill();
      if (!mono) { c.fillStyle = PAL.sole; c.beginPath(); c.ellipse(0, 0.04, 0.036, 0.057, 0, 0, TAU); c.fill(); c.strokeStyle = PAL.soleDk; c.lineWidth = 0.005; c.globalAlpha = 0.6; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(-0.036, 0.04 + k * 0.02); c.lineTo(0.036, 0.04 + k * 0.02); c.stroke(); } c.globalAlpha = 1; }
      c.restore();
    }
    // torso: broad at the shoulders, narrower at the hips
    const sL = P.shL, sR = P.shR, hL = P.hpL, hR = P.hpR;
    c.fillStyle = col(PAL.suit); c.beginPath();
    c.moveTo(sL[0] - 0.03, sL[1] - 0.018); c.quadraticCurveTo(0, sL[1] - 0.05, sR[0] + 0.03, sR[1] - 0.018);
    c.lineTo(hR[0] + 0.018, hR[1] + 0.03); c.quadraticCurveTo(0, hR[1] + 0.06, hL[0] - 0.018, hL[1] + 0.03); c.closePath(); c.fill();
    // belt / hip block in the olive of the trousers
    c.fillStyle = col(PAL.pants); c.beginPath(); c.moveTo(hL[0] - 0.02, hL[1] - 0.018); c.lineTo(hR[0] + 0.02, hR[1] - 0.018); c.lineTo(hR[0] + 0.03, hR[1] + 0.04); c.quadraticCurveTo(0, hR[1] + 0.075, hL[0] - 0.03, hL[1] + 0.04); c.closePath(); c.fill();
    // arms: upper arm, forearm, glove
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? -1 : 1, sh = P['sh' + side], el = P['el' + side], ha = P['ha' + side];
      cap(c, sh, el, 0.078, col(PAL.suit)); cap(c, el, ha, 0.064, col(PAL.suit));
      if (!mono) {
        c.globalAlpha = 0.9; cap(c, [sh[0] + s * 0.02, sh[1] - 0.004], [el[0] - s * 0.02, el[1] - 0.004], 0.02, PAL.lime); c.globalAlpha = 0.35; cap(c, sh, el, 0.036, PAL.suitHi); cap(c, el, ha, 0.03, PAL.suitHi); c.globalAlpha = 1;   // shoulder patch + sheen
        c.strokeStyle = PAL.lime; c.globalAlpha = 0.9; c.lineWidth = 0.012; c.beginPath(); c.moveTo(el[0] - s * 0.032, el[1] + 0.002); c.lineTo(ha[0] - s * 0.027, ha[1] + 0.07); c.stroke(); c.globalAlpha = 1;
      }
      const dx = ha[0] - el[0], dy = ha[1] - el[1], l = Math.hypot(dx, dy) || 1;
      cap(c, ha, [ha[0] + (dx / l) * 0.04, ha[1] + (dy / l) * 0.04], 0.062, col(PAL.glove));       // the hand, fingers spread a little
      if (!mono) { c.fillStyle = '#fff'; c.globalAlpha = 0.8; c.beginPath(); c.arc(ha[0] - s * 0.012, ha[1] + 0.03, 0.012, 0, TAU); c.fill(); c.globalAlpha = 1; }
    }
    // the rig on his back: container, reserve flap, two blue risers over the shoulders
    c.fillStyle = col(PAL.rig); c.beginPath();
    const rx0 = -0.1, rx1 = 0.1, ry0 = sL[1] + 0.018, ry1 = hL[1] - 0.005;
    c.moveTo(rx0 + 0.02, ry0); c.lineTo(rx1 - 0.02, ry0); c.quadraticCurveTo(rx1 + 0.012, ry0 + 0.01, rx1 + 0.004, ry0 + 0.06); c.lineTo(rx1 - 0.006, ry1 - 0.02); c.quadraticCurveTo(rx1 - 0.01, ry1, rx1 - 0.03, ry1); c.lineTo(rx0 + 0.03, ry1); c.quadraticCurveTo(rx0 + 0.01, ry1, rx0 + 0.006, ry1 - 0.02); c.lineTo(rx0 - 0.004, ry0 + 0.06); c.quadraticCurveTo(rx0 - 0.012, ry0 + 0.01, rx0 + 0.02, ry0); c.closePath(); c.fill();
    if (!mono) {
      c.globalAlpha = 0.5; c.fillStyle = '#23262d'; c.beginPath(); c.roundRect ? c.roundRect(-0.07, ry0 + 0.02, 0.14, 0.1, 0.02) : c.rect(-0.07, ry0 + 0.02, 0.14, 0.1); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = PAL.strap; c.lineWidth = 0.022; c.beginPath(); c.moveTo(-0.07, ry0 + 0.008); c.lineTo(-0.03, ry0 + 0.1); c.moveTo(0.07, ry0 + 0.008); c.lineTo(0.03, ry0 + 0.1); c.stroke();
      c.strokeStyle = '#000'; c.globalAlpha = 0.5; c.lineWidth = 0.006; c.beginPath(); c.moveTo(0, ry0 + 0.03); c.lineTo(0, ry1 - 0.02); c.stroke(); c.globalAlpha = 1;
    }
    // neck and helmet
    cap(c, [0, sL[1] - 0.02], [P.head[0], P.head[1] + 0.03], 0.06, col(PAL.suit));
    c.fillStyle = col(PAL.helmet); c.beginPath(); c.ellipse(P.head[0], P.head[1], 0.07, 0.078, 0, 0, TAU); c.fill();
    if (!mono) {
      c.fillStyle = PAL.visor; c.globalAlpha = 0.8; c.beginPath(); c.ellipse(P.head[0], P.head[1] - 0.052, 0.04, 0.018, 0, 0, TAU); c.fill(); c.globalAlpha = 1;      // the visor edge, just seen over the crown
      c.fillStyle = '#fff'; c.globalAlpha = 0.85; c.beginPath(); c.roundRect ? c.roundRect(-0.026, P.head[1] - 0.012, 0.052, 0.018, 0.006) : c.rect(-0.026, P.head[1] - 0.012, 0.052, 0.018); c.fill(); c.globalAlpha = 1;   // the label on the shell
      const g = c.createRadialGradient(-0.02, P.head[1] - 0.03, 0, -0.02, P.head[1] - 0.03, 0.06); g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(P.head[0], P.head[1], 0.07, 0.078, 0, 0, TAU); c.fill();
    }
    c.restore();
  };

  // o: { t, dt, size, heat, vel (scroll px/frame), baseX, baseY (screen px, figure centre), px, py (pointer), hasPtr, W, H }
  F.frame = (o) => {
    const dt = Math.min(o.dt, 0.05), t = o.t;
    F.resize(o.size);
    const dpr = F.d, Z = canvas.width, cx = Z / 2, cy = Z / 2, S = o.size * dpr;
    const rx = o.px - o.baseX, ry = o.py - o.baseY, pd = Math.hypot(rx, ry);
    const pvel = Math.hypot(o.px - F.lastPx, o.py - F.lastPy); F.lastPx = o.px; F.lastPy = o.py;
    F.pv = damp(F.pv, pvel, 6, dt);
    if (o.hasPtr && pvel > 2 && pd < o.H * 0.5) F.interacted = true;
    const steer = o.hasPtr;
    const tx = steer ? clamp(rx / (o.W * 0.5), -1, 1) : Math.sin(t * 0.5) * 0.35;
    const ty = steer ? clamp(ry / (o.H * 0.5), -1, 1) : Math.cos(t * 0.37) * 0.3;
    F.ox = damp(F.ox, tx * o.W * 0.09, 2.2, dt); F.oy = damp(F.oy, ty * o.H * 0.07, 2.2, dt);
    const dive = clamp(Math.abs(o.vel) / 55), heat = clamp(o.heat);
    F.near = damp(F.near, steer ? clamp(1 - pd / (o.H * 0.45)) : 0, 5, dt);
    F.bank = damp(F.bank, tx * 0.5 + Math.sin(t * 0.8) * 0.09 + Math.sin(t * 1.9) * 0.03, 3, dt);
    F.tuck = damp(F.tuck, dive, 4, dt);                                // scroll fast: arms sweep back, legs close into a track
    F.hand = damp(F.hand, F.near, 5, dt);
    if (F.spinT < 1) F.spinT = Math.min(1, F.spinT + dt / 1.2);
    const sp = ease(F.spinT), spinRot = sp * TAU * F.spinDir, pop = 1 + Math.sin(F.spinT * Math.PI) * 0.22;
    // he rocks on the air: a slow roll, a quicker flutter, banking toward where you point
    const rock = Math.sin(t * 0.62) * 0.075 + Math.sin(t * 1.55 + 1) * 0.025 + F.bank * 0.9;
    const P = pose(t, F.tuck * 0.9, F.hand, steer && Math.abs(tx) > 0.1 ? Math.sign(tx) : 0);
    const U = S * 1.18;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Z, Z);
    ctx.lineCap = 'round';
    // wind streaks running up past him
    const sc = 0.4 + dive * 1.7 + heat * 0.5;
    while (F.streaks.length < 28) F.streaks.push({ x: (Math.random() - 0.5) * 3.2, y: Math.random() * 3.4 - 1.7, l: 0.25 + Math.random() * 0.7, v: 0.7 + Math.random() * 1.4, a: 0.1 + Math.random() * 0.3 });
    for (const st of F.streaks) {
      st.y -= st.v * sc * dt * 1.6;
      if (st.y < -1.9) { st.y = 1.8; st.x = (Math.random() - 0.5) * 3.2; }
      const x = cx + st.x * S * 0.5 + (Math.abs(st.x) < 0.5 ? Math.sign(st.x || 1) * S * 0.45 : 0), y = cy - st.y * S * 0.5;
      ctx.strokeStyle = heat > 0.2 ? `rgba(255,${190 - heat * 80},${130 - heat * 90},${st.a * (0.6 + sc * 0.2)})` : `rgba(235,240,255,${st.a * (0.5 + sc * 0.2)})`;
      ctx.lineWidth = Math.max(1, dpr * 1.1);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + st.l * S * 0.4 * (0.6 + sc * 0.5)); ctx.stroke();
    }
    // the air heating up around him
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.1);
    g.addColorStop(0, `rgba(255,160,70,${0.2 + heat * 0.35})`); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Z, Z);
    // embers rising off him when it is hot
    if (heat > 0.12 && Math.random() < heat * 0.9) F.embers.push({ x: (Math.random() - 0.5) * S * 0.7, y: (Math.random() - 0.5) * S * 0.4, vy: -(60 + Math.random() * 160), life: 1, r: 0.8 + Math.random() * 1.8 });
    for (const e of F.embers) { e.y += e.vy * dt * dpr; e.x += Math.sin(t * 6 + e.y * 0.02) * 0.4; e.life -= dt * 1.1; ctx.fillStyle = `rgba(255,${160 + e.life * 70},70,${Math.max(e.life, 0) * 0.9})`; ctx.beginPath(); ctx.arc(cx + e.x, cy + e.y, e.r * dpr, 0, TAU); ctx.fill(); }
    F.embers = F.embers.filter((e) => e.life > 0);

    // him
    const rot = rock + spinRot, k = pop;
    const place = (fn, alpha, dx = 0, dy = 0, kk = 1) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(k * kk, k * kk); fn(); ctx.restore();
    };
    // afterimages streaming up behind him: the faster he falls, the longer the trail
    const trail = clamp(0.25 + dive * 1.2 + heat * 0.7, 0, 1.4);
    const tint = heat > 0.15 ? 'rgb(255,120,40)' : 'rgb(255,190,110)';
    for (let j = 3; j >= 1; j--) place(() => body(ctx, P, U, tint), 0.16 * trail / j, 0, -j * S * 0.085 * (0.5 + trail));
    // rim light from the sunrise side, then the suit itself
    place(() => body(ctx, P, U, 'rgb(255,190,100)'), 0.7 + heat * 0.25, -S * 0.016, -S * 0.022, 1.03);
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, Z, Z);
    octx.save(); octx.translate(cx, cy); octx.rotate(rot); octx.scale(k, k); body(octx, P, U, null); octx.restore();
    octx.globalCompositeOperation = 'source-atop';                      // the glow of the air on the suit: warm from the sunrise side, hotter with the heat
    const wg = octx.createLinearGradient(cx - S * 0.4, cy - S * 0.5, cx + S * 0.3, cy + S * 0.5);
    wg.addColorStop(0, `rgba(255,170,80,${0.22 + heat * 0.3})`); wg.addColorStop(0.55, `rgba(255,140,60,${0.04 + heat * 0.18})`); wg.addColorStop(1, `rgba(40,60,120,.1)`);
    octx.fillStyle = wg; octx.fillRect(0, 0, Z, Z);
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(off, 0, 0); ctx.restore();

    // spin burst
    for (const r of F.rings) r.t += dt / 0.7;
    F.rings = F.rings.filter((r) => r.t < 1);
    for (const r of F.rings) { ctx.strokeStyle = `rgba(255,190,110,${(1 - r.t) * 0.8})`; ctx.lineWidth = dpr * 2; ctx.beginPath(); ctx.arc(cx, cy, S * (0.3 + ease(r.t) * 1.2), 0, TAU); ctx.stroke(); }
    for (const q of F.parts) { q.x += q.vx * dt * dpr; q.y += q.vy * dt * dpr; q.vx *= 0.97; q.vy *= 0.97; q.vy -= 40 * dt; q.life -= q.dec * dt; }
    F.parts = F.parts.filter((q) => q.life > 0);
    for (const q of F.parts) { ctx.fillStyle = q.ember ? `rgba(255,${150 + 80 * (1 - q.life)},60,${q.life})` : `rgba(255,245,225,${q.life})`; ctx.beginPath(); ctx.arc(cx + q.x, cy + q.y, q.r * dpr * q.life + 0.4, 0, TAU); ctx.fill(); }
    return { ox: F.ox, oy: F.oy };
  };
  return F;
}

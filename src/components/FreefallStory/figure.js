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
  suit: '#1c1e22', suitHi: '#2a2d35', pants: '#434b2e', pantsHi: '#5f6b3d', lime: '#9fc050', rig: '#101216', strap: '#2f58bd',
  helmet: '#0e0f12', visor: '#2b2f38', glove: '#0c0c0e', shoe: '#e9e5dc', sole: '#c98a4a', soleDk: '#8c5a2a',
};

export function createFigure(canvas, base) {
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d'), rim = document.createElement('canvas'), rctx = rim.getContext('2d');       // the figure alone, so the heat can tint just him
  const img = new Image(); let ready = false;                       // a real photograph of a belly-to-earth skydiver, cut out
  // limbs cut from the photo so each can move on its own about its joint (polygons in the photo's pixels; pivot = shoulder / hip)
  const LIMBS = [
    { id: 'aL', pivot: [195, 205], poly: [[30, 35], [100, 40], [135, 150], [205, 165], [210, 245], [150, 245], [110, 235], [45, 140]] },
    { id: 'aR', pivot: [345, 175], poly: [[345, 30], [415, 30], [448, 100], [448, 192], [380, 218], [335, 192], [330, 150], [345, 130]] },
    { id: 'lL', pivot: [250, 385], poly: [[130, 415], [240, 400], [300, 430], [305, 480], [255, 548], [160, 552], [130, 512]] },
    { id: 'lR', pivot: [350, 420], poly: [[330, 380], [420, 380], [520, 405], [634, 490], [634, 538], [560, 538], [470, 502], [380, 472], [330, 440]] },
  ];
  const OX = 38, OY = 36; let base0 = null;
  const build = () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    const mk = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
    const soft = (poly, grow) => {                                  // a feathered mask of the polygon (shadow trick: no ctx.filter, which Safari lacks)
      const m = mk(), x = m.getContext('2d'); x.shadowColor = '#000'; x.shadowBlur = 7; x.shadowOffsetX = 5000;
      x.beginPath(); poly.forEach((p, i) => { const X = p[0] - OX - 5000, Y = p[1] - OY; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.fill(); x.fill(); return m;
    };
    base0 = mk(); const bx = base0.getContext('2d'); bx.drawImage(img, 0, 0);
    for (const L of LIMBS) {
      const m = soft(L.poly), pc = mk(), px = pc.getContext('2d');
      px.drawImage(img, 0, 0); px.globalCompositeOperation = 'destination-in'; px.drawImage(m, 0, 0); L.piece = pc;
      // take the limb out of the base, but keep the joint, so nothing tears open when it swings
      bx.globalCompositeOperation = 'destination-out'; bx.drawImage(m, 0, 0);
      bx.globalCompositeOperation = 'source-over'; bx.save(); bx.beginPath(); bx.arc(L.pivot[0] - OX, L.pivot[1] - OY, 46, 0, TAU); bx.clip(); bx.drawImage(img, 0, 0); bx.restore();
    }
    ready = true;
  };
  img.onload = build; img.decoding = 'async'; img.src = base + 'earth/skydiver.webp';
  const silC = {};
  const sil = (col) => {
    if (silC[col]) return silC[col];
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, cv.width, cv.height);
    return (silC[col] = cv);
  };
  const F = {
    d: 1, size: 0, dir: 1, mirror: 1, bank: 0, ox: 0, oy: 0, near: 0, pv: 0, lastPx: 0, lastPy: 0, tuck: 0, hand: 0,
    spinT: 1, spinDir: 1, rings: [], parts: [], streaks: [], embers: [], interacted: false,
  };

  F.sprite = () => (ready ? img : null);
  F.resize = (size) => {
    const d = Math.min(devicePixelRatio || 1, 2), px = Math.round(size * 3.4 * d);
    if (px !== canvas.width) { canvas.width = px; canvas.height = px; F.d = d; }
    if (off.width !== px) { off.width = px; off.height = px; rim.width = px; rim.height = px; }
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

  // light comes from the upper left (the sunrise side). He is a dark, lit-from-behind figure: one continuous body, not a set of coloured parts.
  const LX = -0.55, LY = -0.83;
  const body = (c, P, U, mono) => {
    c.save(); c.scale(U, U); c.lineCap = 'round'; c.lineJoin = 'round';
    let fillS = mono;
    if (!mono) fillS = '#fff0d2';
    // a limb is a run of overlapping discs whose radius follows the muscle: it merges into one smooth organic shape
    const tube = (a, b, prof, n = 14) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n; let k = 0; while (k < prof.length - 2 && t > prof[k + 1][0]) k++;
        const [t0, r0] = prof[k], [t1, r1] = prof[k + 1], u = clamp((t - t0) / (t1 - t0 || 1)), r = lerp(r0, r1, u * u * (3 - 2 * u));
        out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), r]);
      }
      return out;
    };
    const path = (cs, g) => { c.beginPath(); for (const q of cs) { c.moveTo(q[0] + q[2] * g, q[1]); c.arc(q[0], q[1], q[2] * g, 0, TAU); } };
    const paint = (cs) => {
                // a dark edge where he overlaps himself, so the limbs stay readable
      c.fillStyle = fillS; path(cs, 1); c.fill();
    };
    const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    // legs: thigh, knee, calf bulge, ankle, and the shoe with its sole to us
    for (const side of ['L', 'R']) {
      const hp = P['hp' + side], kn = P['kn' + side], ft = P['ft' + side];
      paint(tube(hp, kn, [[0, 0.074], [0.45, 0.07], [1, 0.047]]).concat(tube(kn, ft, [[0, 0.047], [0.3, 0.052], [0.7, 0.04], [1, 0.029]])));
      const a = ang(kn, ft);
      c.save(); c.translate(ft[0], ft[1]); c.rotate(a - Math.PI / 2);
      
      c.fillStyle = mono || '#fff0d2'; c.beginPath(); c.moveTo(-0.034, -0.01); c.quadraticCurveTo(-0.046, 0.05, -0.03, 0.098); c.quadraticCurveTo(0, 0.122, 0.03, 0.098); c.quadraticCurveTo(0.046, 0.05, 0.034, -0.01); c.quadraticCurveTo(0, -0.024, -0.034, -0.01); c.fill();
      c.restore();
    }
    // torso: trapezius, chest, narrowing to the waist, hips
    const sL = P.shL, sR = P.shR, hL = P.hpL, hR = P.hpR, ty = sL[1];
    const torso = () => {
      c.beginPath(); c.moveTo(sL[0] - 0.05, ty + 0.012);
      c.quadraticCurveTo(sL[0] - 0.012, ty - 0.04, -0.03, ty - 0.034); c.quadraticCurveTo(0, ty - 0.04, 0.03, ty - 0.034); c.quadraticCurveTo(sR[0] + 0.012, ty - 0.04, sR[0] + 0.05, ty + 0.012);
      c.bezierCurveTo(sR[0] + 0.03, ty + 0.1, 0.1, 0.0, hR[0] + 0.035, hR[1] + 0.012);
      c.quadraticCurveTo(0, hR[1] + 0.085, hL[0] - 0.035, hL[1] + 0.012);
      c.bezierCurveTo(-0.1, 0.0, sL[0] - 0.03, ty + 0.1, sL[0] - 0.05, ty + 0.012); c.closePath();
    };
    
    c.fillStyle = fillS; torso(); c.fill();
    // arms: shoulder, biceps, elbow, forearm, glove with fingers
    for (const side of ['L', 'R']) {
      const sh = P['sh' + side], el = P['el' + side], ha = P['ha' + side], a = ang(el, ha), ux = Math.cos(a), uy = Math.sin(a);
      paint(tube(sh, el, [[0, 0.056], [0.4, 0.052], [1, 0.039]]).concat(tube(el, ha, [[0, 0.039], [0.3, 0.041], [1, 0.027]])));
      const hand = tube(ha, [ha[0] + ux * 0.05, ha[1] + uy * 0.05], [[0, 0.037], [1, 0.032]], 4);
      paint(hand);
      c.strokeStyle = mono || '#fff0d2'; c.lineWidth = 0.013;
      for (let k = -2; k <= 2; k++) { const a2 = a + k * 0.24, bx = ha[0] + ux * 0.045, by = ha[1] + uy * 0.045, L = Math.abs(k) === 2 ? 0.04 : 0.058; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(a2) * L, by + Math.sin(a2) * L); c.stroke(); }
    }
    // neck and helmet
    paint(tube([0, ty - 0.03], [P.head[0], P.head[1] + 0.03], [[0, 0.036], [1, 0.034]], 4));
    const hx = P.head[0], hy = P.head[1];
    
    c.fillStyle = fillS; c.beginPath(); c.ellipse(hx, hy, 0.07, 0.079, 0, 0, TAU); c.fill();
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

    // him: the photograph, rocking on the air with a slight flex so the limbs seem to ride the wind
    const rot = rock + spinRot, k = pop;
    const place = (fn, alpha, dx = 0, dy = 0, kk = 1) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx + dx, cy + dy); ctx.rotate(rot); ctx.scale(k * kk, k * kk); fn(); ctx.restore();
    };
    const nearL = steer && tx < -0.1, nearR = steer && tx > 0.1;
    const SH = S * 1.2, SW = SH * (img.naturalWidth / Math.max(1, img.naturalHeight));
    const flex = (c, w) => c.transform(1, Math.sin(t * 2.3) * 0.012 * w, Math.sin(t * 1.7 + 1) * 0.014 * w, 1 + Math.sin(t * 3.1) * 0.006 * w, 0, 0);
    const draw = (c, mono, w = 1) => {
      c.save(); flex(c, w * (1 - F.tuck * 0.6));
      if (!ready) { c.restore(); return; }
      if (mono) { c.drawImage(sil(mono), -SW / 2, -SH / 2 - S * 0.03, SW, SH); c.restore(); return; }
      const sc = SW / img.naturalWidth, x0 = -SW / 2, y0 = -SH / 2 - S * 0.03, ar = 1 - F.tuck * 0.7;
      c.drawImage(base0, x0, y0, SW, SH);
      // each limb swings about its own joint, one side easing out as the other eases in, at its own pace, like a body riding the wind
      const sw = (a, b, ph) => Math.sin(t * a + ph) * b;
      const rot = {
        aL: (sw(0.78, 0.18, 0.3) + sw(2.9, 0.04, 1.1) + sw(5.3, 0.012, 0)) * ar - (nearL ? F.hand * 0.12 : 0),
        aR: (sw(0.78, 0.18, 3.6) + sw(3.3, 0.04, 2.4) + sw(5.9, 0.012, 1)) * ar + (nearR ? F.hand * 0.12 : 0),
        lL: sw(0.6, 0.11, 1.2) + sw(2.4, 0.03, 0.2) + sw(4.7, 0.01, 2),
        lR: sw(0.6, 0.11, 4.4) + sw(2.1, 0.03, 1.7) + sw(4.1, 0.01, 0.4),
      };
      for (const L of LIMBS) {
        const px = x0 + (L.pivot[0] - OX) * sc, py = y0 + (L.pivot[1] - OY) * sc;
        c.save(); c.translate(px, py); c.rotate(rot[L.id]); c.translate(-px, -py); c.drawImage(L.piece, x0, y0, SW, SH); c.restore();
      }
      c.restore();
    };
    // afterimages streaming up behind him: the faster he falls, the longer the trail
    const trail = clamp(0.2 + dive * 1.2 + heat * 0.7, 0, 1.4);
    const tint = heat > 0.15 ? 'rgb(255,120,40)' : 'rgb(255,190,110)';
    for (let j = 3; j >= 1; j--) place(() => draw(ctx, tint), 0.08 * trail / j, 0, -j * S * 0.085 * (0.5 + trail));
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, Z, Z);
    octx.save(); octx.translate(cx, cy); octx.rotate(rot); octx.scale(k, k); draw(octx, null); octx.restore();
    octx.globalCompositeOperation = 'source-atop';                      // sunrise on one side, the cold of the earth on the other, and the heat of re-entry on top
    const wg = octx.createLinearGradient(cx - S * 0.5, cy - S * 0.5, cx + S * 0.4, cy + S * 0.5);
    wg.addColorStop(0, `rgba(255,170,90,${0.12 + heat * 0.3})`); wg.addColorStop(0.5, `rgba(255,140,60,${0.0 + heat * 0.16})`); wg.addColorStop(1, 'rgba(30,50,110,.16)');
    octx.fillStyle = wg; octx.fillRect(0, 0, Z, Z); octx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.drawImage(off, 0, 0); ctx.restore();

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

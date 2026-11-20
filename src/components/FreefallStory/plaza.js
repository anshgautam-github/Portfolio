// plaza.js - the landing. You come down into the SRM campus at night and the film's anonymous crowd is replaced by a drawn one: a plaza
// in front of the arch gate, lamp posts pooling warm light on the paving, and a ring of students - backpacks, ID lanyards, phones up -
// who turn toward the glowing figure as he lands. Everything is drawn live on the film canvas (2D), in a real perspective, and is a pure
// function of (u, t): u = 0..1 through the scene, t = seconds. Nothing is fetched. Deterministic, so scrubbing back and forth is stable.
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const TAU = Math.PI * 2;
// where the film's glowing figure is in each frame (normalised), so the same skydiver can take its place
const TRK0 = 210, TRX = [0.601,0.603,0.605,0.606,0.591,0.577,0.562,0.546,0.529,0.512,0.495,0.495,0.495,0.494,0.493,0.492,0.491,0.489,0.489,0.488,0.487,0.487,0.486,0.486,0.485,0.484,0.483,0.482,0.481,0.481,0.480,0.480,0.480,0.479,0.478,0.477,0.477,0.478,0.479,0.480,0.482,0.484,0.485,0.487,0.490,0.492,0.493,0.494,0.494,0.495,0.495,0.494,0.493,0.493,0.495,0.496,0.496,0.499,0.499,0.497,0.495,0.490,0.486,0.486,0.482,0.483,0.484,0.486,0.491,0.494,0.495,0.496,0.497,0.498,0.498,0.498,0.497,0.497,0.496,0.496,0.496,0.496,0.496,0.496,0.496,0.496,0.497,0.497,0.497,0.497,0.497,0.497,0.498,0.498,0.499,0.499,0.499,0.499,0.498,0.498,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.497,0.496,0.496,0.496,0.497,0.497,0.497,0.497,0.498,0.498,0.499,0.500,0.501,0.501,0.502,0.503,0.504,0.504,0.504,0.504,0.505,0.506,0.506,0.507,0.508,0.509,0.509,0.509,0.509,0.509,0.509,0.509,0.510,0.510,0.511,0.511,0.511,0.512,0.512,0.512,0.513,0.513,0.513,0.513,0.513,0.513,0.513,0.513,0.512,0.512,0.511,0.510,0.509,0.508,0.506,0.505,0.503,0.502,0.500,0.499,0.497,0.495,0.494,0.493,0.491,0.490,0.489,0.488,0.487,0.486,0.485,0.484,0.482,0.481,0.479,0.478,0.478,0.477,0.477,0.477,0.477,0.477,0.477,0.477,0.478,0.479,0.480,0.481,0.482,0.484,0.485,0.486,0.487,0.488,0.489,0.490,0.490,0.491,0.491,0.491,0.490,0.490,0.490,0.489,0.488,0.487,0.487,0.486,0.486,0.485,0.484,0.485,0.485,0.485,0.486,0.486,0.487,0.488,0.489,0.490,0.491,0.492,0.494,0.495,0.496,0.497,0.498,0.499,0.500,0.501,0.501,0.502,0.502,0.502,0.503,0.503,0.502,0.502,0.502,0.502,0.501,0.501], TRY = [0.065,0.069,0.071,0.073,0.101,0.130,0.158,0.186,0.213,0.241,0.268,0.270,0.273,0.276,0.279,0.281,0.283,0.287,0.290,0.294,0.297,0.300,0.304,0.308,0.313,0.316,0.320,0.324,0.329,0.334,0.338,0.341,0.346,0.351,0.356,0.360,0.364,0.370,0.376,0.381,0.386,0.390,0.394,0.398,0.399,0.401,0.402,0.403,0.404,0.406,0.407,0.409,0.411,0.414,0.417,0.419,0.420,0.421,0.421,0.417,0.411,0.407,0.404,0.403,0.404,0.404,0.409,0.414,0.418,0.420,0.421,0.421,0.421,0.421,0.421,0.421,0.421,0.421,0.421,0.421,0.421,0.422,0.422,0.422,0.422,0.422,0.422,0.422,0.422,0.422,0.422,0.422,0.423,0.423,0.423,0.423,0.423,0.423,0.424,0.424,0.424,0.425,0.425,0.425,0.425,0.426,0.426,0.426,0.426,0.427,0.427,0.427,0.427,0.428,0.428,0.428,0.428,0.428,0.428,0.429,0.429,0.429,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.431,0.431,0.432,0.432,0.432,0.432,0.432,0.432,0.432,0.432,0.432,0.431,0.431,0.431,0.431,0.431,0.431,0.431,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.430,0.431,0.431,0.432,0.432,0.432,0.432,0.433,0.433,0.433,0.433,0.433,0.433,0.432,0.432,0.432,0.431,0.431,0.430,0.430,0.429,0.429,0.428,0.428,0.428,0.428,0.427,0.427,0.426,0.426,0.426,0.425,0.425,0.425,0.424,0.424,0.423,0.423,0.422,0.421,0.421,0.420,0.419,0.419,0.418,0.418,0.417,0.416,0.416,0.415,0.415,0.414,0.414,0.414,0.414,0.414,0.414,0.414,0.414,0.413,0.413,0.413,0.413,0.413,0.413,0.413,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.412,0.411,0.411,0.411,0.410,0.410,0.410,0.410,0.409];

const SKIN = [[168, 112, 78], [150, 98, 68], [186, 128, 92], [130, 84, 58], [196, 142, 104], [116, 74, 52]];
const HAIR = [[18, 14, 12], [22, 16, 12], [34, 24, 16], [14, 12, 14], [44, 30, 20]];
const SHIRT = [[226, 222, 212], [226, 222, 212], [52, 66, 100], [28, 30, 36], [108, 114, 122], [112, 46, 50], [62, 84, 68], [170, 160, 140], [84, 100, 130], [200, 202, 208], [38, 48, 66], [150, 120, 84]];
const PANTS = [[34, 44, 70], [26, 28, 34], [48, 46, 44], [44, 52, 80], [22, 24, 30], [70, 66, 58], [30, 38, 58]];
const BAG = [[24, 24, 28], [24, 24, 28], [28, 40, 76], [110, 34, 38], [40, 78, 80], [84, 86, 92], [150, 96, 40], [34, 56, 40], [60, 46, 80]];

export function createPlaza() {
  // ---- the cast: fixed, seeded ----
  const people = [];
  let id = 0;
  const add = (x, z, o = {}) => {
    const i = id++, h = (k) => hash(i * 13 + k);
    people.push({
      i, x0: x, z0: z, x, z, ring: !!o.ring, r0: o.r || 0, a0: o.a || 0,
      face0: o.face !== undefined ? o.face : h(1) * TAU, hgt: 1.56 + h(2) * 0.3 + (o.tall || 0),
      skin: SKIN[Math.floor(h(3) * SKIN.length)], hair: HAIR[Math.floor(h(4) * HAIR.length)],
      shirt: SHIRT[Math.floor(h(5) * SHIRT.length)], pants: PANTS[Math.floor(h(6) * PANTS.length)], bag: BAG[Math.floor(h(7) * BAG.length)],
      long: h(8) < 0.42, lan: h(9) < 0.78, phone: h(10) < 0.2, walker: o.walker !== undefined ? o.walker : h(11) < 0.45,
      ph: h(12) * TAU, sp: 0.6 + h(13) * 0.5, wob: h(14), bagless: h(15) < 0.06, sling: h(16) < 0.16, delay: h(17) * 0.12,
    });
  };
  // a ring around the landing spot, a few deep
  for (let ring = 0; ring < 5; ring++) {
    const r = 3.4 + ring * 2.1, n = Math.round(10 + ring * 7.5);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + hash(ring * 50 + k) * 0.5 - 0.25, rr = r + (hash(ring * 90 + k + 3) - 0.5) * 1.3;
      add(Math.cos(a) * rr, 11 + Math.sin(a) * rr * 0.92, { ring: true, r: rr, a });
    }
  }
  // students crossing the plaza in the back, and little clusters of friends
  for (let k = 0; k < 46; k++) add((hash(k + 700) - 0.5) * 46, 25 + hash(k + 800) * 34, { walker: hash(k + 900) < 0.7 });
  for (let g = 0; g < 7; g++) {
    const gx = (hash(g + 1200) - 0.5) * 36, gz = 17 + hash(g + 1300) * 20;
    for (let k = 0; k < 3 + (g % 3); k++) add(gx + (hash(g * 9 + k + 5) - 0.5) * 2.2, gz + (hash(g * 9 + k + 6) - 0.5) * 1.6, { face: (g * 1.7 + k * 1.1) % TAU, walker: false });
  }
  people.sort((a, b) => a.i - b.i);

  const lampsX = [-17, 17], lampsZ = [2, 14, 27, 42, 58];

  // ---- projection (high 3/4 view, like the film) ----
  const cam = {};
  const setCam = (W, H, u) => {
    const portrait = H > W;
    cam.W = W; cam.H = H;
    cam.Hc = 11;                                                        // a high angle close to the footage's, so his fire ring sits right
    cam.ph = 0.45; cam.sn = Math.sin(cam.ph); cam.cs = Math.cos(cam.ph);
    cam.zc = -2;
    cam.F = (portrait ? W * 1.45 : H * 0.89) * (1 + 0.07 * u);          // a slow push-in
    cam.cx = W / 2; cam.cy = H * (portrait ? 0.46 : 0.5);
  };
  const P = (x, y, z) => {
    if (cam.gs) { x *= cam.gs; y *= cam.gs; }
    const yy = y - cam.Hc, zz = z - cam.zc, d = -yy * cam.sn + zz * cam.cs;
    if (d < 0.6) return null;
    const up = yy * cam.cs + zz * cam.sn, s = cam.F / d;
    return { x: cam.cx + x * s, y: cam.cy - up * s, s, d };
  };
  const CX = 0, CZ = 11;                                                 // the landing spot

  // light falling on a point: the lamps and, above all, the glow of the figure
  const light = (x, z, glow) => {
    let l = 0.09;
    for (const lx of lampsX) for (const lz of lampsZ) { const d2 = (x - lx) * (x - lx) + (z - lz) * (z - lz); l += 0.42 / (1 + d2 * 0.03); }
    const dc = (x - CX) * (x - CX) + (z - CZ) * (z - CZ);
    return Math.min(1.2, l + glow * 1.7 / (1 + dc * 0.045));
  };
  const rgb = (c, k, warm = 0) => `rgb(${Math.round(clamp(c[0] * k * (1 + 0.28 * warm), 0, 255))},${Math.round(clamp(c[1] * k * (1 + 0.06 * warm), 0, 255))},${Math.round(clamp(c[2] * k * (1 - 0.22 * warm), 0, 255))})`;

  // a limb / torso: a thick round-capped line between two 3D points, width in metres
  const limb = (c, a, b, wm, fill) => {
    const A = P(a[0], a[1], a[2]), B = P(b[0], b[1], b[2]); if (!A || !B) return;
    c.strokeStyle = fill; c.lineWidth = Math.max(0.8, wm * (A.s + B.s) / 2); c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  };

  // ---- one student ----
  const drawStudent = (c, p, st, k, glow, u, t) => {
    const g = P(st.x, 0, st.z); if (!g) return;
    const hgt = p.hgt, sc = hgt / 1.7;
    if (g.x < -60 || g.x > cam.W + 60 || g.y < -120 || g.y > cam.H + 140) return;
    const pxh = hgt * g.s; if (pxh < 3.2) return;
    const dx = Math.sin(st.face), dz = Math.cos(st.face);               // where he faces (ground plane)
    const step = st.walk ? Math.sin(st.phase) : 0, bob = st.walk ? Math.abs(Math.cos(st.phase)) * 0.025 : Math.sin(t * 1.6 + p.ph) * 0.006;
    const rxv = dz, rzv = -dx;                                           // his right-hand side
    const hip = 0.92 * sc, sh = 1.46 * sc, hd = 1.64 * sc;
    const cx = st.x, cz = st.z, y0 = bob;
    const L = k;                                                         // light level 0..~1.2
    const warm = clamp(glow * 0.9 + (L - 0.4) * 0.4);
    const shirt = rgb(p.shirt, 0.3 + 0.78 * L, warm), pants = rgb(p.pants, 0.26 + 0.7 * L, warm), skin = rgb(p.skin, 0.32 + 0.86 * L, warm), hair = rgb(p.hair, 0.5 + 0.5 * L, 0);
    const bag = rgb(p.bag, 0.3 + 0.8 * L, warm), bagHi = rgb(p.bag, 0.62 + 0.8 * L, warm * 1.4);
    c.lineCap = 'round'; c.lineJoin = 'round';
    // contact shadow
    c.fillStyle = `rgba(0,0,0,${0.35 + 0.2 * (1 - L)})`; c.beginPath(); c.ellipse(g.x - pxh * 0.03, g.y + pxh * 0.01, pxh * 0.19, pxh * 0.065, 0, 0, TAU); c.fill();
    const facingAway = dz > 0;                                           // back toward the camera: the pack is in front of him
    const bx = cx - dx * 0.2 * sc, bz = cz - dz * 0.2 * sc;              // where the backpack sits
    const drawBag = () => {
      if (p.bagless) return;
      if (p.sling) { limb(c, [bx + rxv * 0.12 * sc, 0.98 * sc, bz + rzv * 0.12 * sc], [bx + rxv * 0.12 * sc, 1.3 * sc, bz + rzv * 0.12 * sc], 0.24 * sc, bag); return; }
      limb(c, [bx, 1.02 * sc + y0, bz], [bx, 1.44 * sc + y0, bz], 0.34 * sc, bag);                          // the pack
      limb(c, [bx + dx * 0.04, 1.06 * sc + y0, bz + dz * 0.04], [bx + dx * 0.04, 1.4 * sc + y0, bz + dz * 0.04], 0.2 * sc, bagHi);   // front pocket / highlight
      if (facingAway) { limb(c, [bx, 1.04 * sc, bz], [bx, 1.42 * sc, bz], 0.02 * sc, 'rgba(0,0,0,.45)'); }    // zip seam
    };
    if (!facingAway) drawBag();
    // legs
    const hipP = [cx, hip + y0, cz], sw = 0.13 * sc;
    const lf = [cx + rxv * 0.1 * sc + dx * step * 0.22, 0, cz + rzv * 0.1 * sc + dz * step * 0.22];
    const rf = [cx - rxv * 0.1 * sc - dx * step * 0.22, 0, cz - rzv * 0.1 * sc - dz * step * 0.22];
    limb(c, [cx + rxv * 0.1 * sc, hip + y0, cz + rzv * 0.1 * sc], lf, sw, pants);
    limb(c, [cx - rxv * 0.1 * sc, hip + y0, cz - rzv * 0.1 * sc], rf, sw, pants);
    limb(c, [lf[0] + dx * 0.05, 0.02, lf[2] + dz * 0.05], [lf[0] + dx * 0.1, 0.02, lf[2] + dz * 0.1], 0.1 * sc, 'rgb(14,14,16)');
    limb(c, [rf[0] + dx * 0.05, 0.02, rf[2] + dz * 0.05], [rf[0] + dx * 0.1, 0.02, rf[2] + dz * 0.1], 0.1 * sc, 'rgb(14,14,16)');
    // arms: swing when walking; one hand up with a phone for some
    const lh = [cx + rxv * 0.24 * sc - dx * step * 0.12, hip + 0.05 * sc, cz + rzv * 0.24 * sc - dz * step * 0.12];
    let rh = [cx - rxv * 0.24 * sc + dx * step * 0.12, hip + 0.05 * sc, cz - rzv * 0.24 * sc + dz * step * 0.12];
    const phoneUp = p.phone && st.watch > 0.5;
    if (phoneUp) rh = [cx - rxv * 0.12 * sc + dx * 0.32 * sc, 1.42 * sc, cz - rzv * 0.12 * sc + dz * 0.32 * sc];
    limb(c, [cx + rxv * 0.21 * sc, sh - 0.04, cz + rzv * 0.21 * sc], lh, 0.095 * sc, shirt);
    limb(c, [cx - rxv * 0.21 * sc, sh - 0.04, cz - rzv * 0.21 * sc], rh, 0.095 * sc, shirt);
    limb(c, rh, [rh[0] + (rh[0] - cx) * 0.02, rh[1] - 0.04, rh[2]], 0.08 * sc, skin);
    // torso
    limb(c, [cx, hip + 0.08 * sc + y0, cz], [cx, sh + y0, cz], 0.4 * sc, shirt);
    if (!facingAway && p.lan) {                                          // the SRM ID card on its lanyard, seen on the chest
      limb(c, [cx + dx * 0.2 * sc, sh - 0.02, cz + dz * 0.2 * sc], [cx + dx * 0.2 * sc, 1.12 * sc, cz + dz * 0.2 * sc], 0.025 * sc, rgb([232, 126, 36], 0.4 + 0.8 * L, warm));
      limb(c, [cx + dx * 0.21 * sc, 1.1 * sc, cz + dz * 0.21 * sc], [cx + dx * 0.21 * sc, 1.02 * sc, cz + dz * 0.21 * sc], 0.07 * sc, rgb([236, 232, 224], 0.5 + 0.8 * L, warm));
    }
    if (facingAway) drawBag();
    // shoulder straps over the chest when he faces the camera
    if (!facingAway && !p.bagless && !p.sling) { for (const sd of [-1, 1]) limb(c, [cx + rxv * 0.13 * sc * sd + dx * 0.2 * sc, sh - 0.02, cz + rzv * 0.13 * sc * sd + dz * 0.2 * sc], [cx + rxv * 0.13 * sc * sd + dx * 0.2 * sc, sh - 0.3 * sc, cz + rzv * 0.13 * sc * sd + dz * 0.2 * sc], 0.03 * sc, rgb(p.bag, 0.25 + 0.6 * L, 0)); }
    // neck + head + hair
    limb(c, [cx, sh + 0.02 + y0, cz], [cx, sh + 0.1 * sc + y0, cz], 0.09 * sc, skin);
    const hP = P(cx, hd + y0, cz), hr = 0.13 * sc * (hP ? hP.s : 1);
    if (hP) {
      c.fillStyle = skin; c.beginPath(); c.arc(hP.x, hP.y, hr, 0, TAU); c.fill();
      const hb = P(cx - dx * 0.035 * sc, hd + 0.02 * sc + y0, cz - dz * 0.035 * sc);   // hair: covers the back and top of the head
      if (hb) { c.fillStyle = hair; c.beginPath(); c.arc(hb.x, hb.y, hr * (facingAway ? 1.06 : 0.98), facingAway ? 0 : Math.PI * 1.02, facingAway ? TAU : Math.PI * 1.98 + 0.02); c.closePath(); c.fill(); }
      if (p.long) limb(c, [cx - dx * 0.06 * sc, hd - 0.02, cz - dz * 0.06 * sc], [cx - dx * 0.08 * sc, sh - 0.12 * sc, cz - dz * 0.08 * sc], 0.15 * sc, hair);
    }
    // a lit phone screen
    if (phoneUp) {
      const ph = P(rh[0] + dx * 0.04, rh[1] + 0.04, rh[2] + dz * 0.04);
      if (ph) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(180,210,255,.9)'; c.fillRect(ph.x - ph.s * 0.035, ph.y - ph.s * 0.06, ph.s * 0.07, ph.s * 0.12); const gl = c.createRadialGradient(ph.x, ph.y, 0, ph.x, ph.y, ph.s * 0.35); gl.addColorStop(0, 'rgba(150,190,255,.35)'); gl.addColorStop(1, 'rgba(150,190,255,0)'); c.fillStyle = gl; c.fillRect(ph.x - ph.s * 0.35, ph.y - ph.s * 0.35, ph.s * 0.7, ph.s * 0.7); c.globalCompositeOperation = 'source-over'; }
    }
    // rim light from the glowing figure
    if (glow > 0.15 && st.rim > 0.05) {
      const ang = Math.atan2(CZ - st.z, CX - st.x), a0 = P(st.x + Math.cos(ang) * 0.17 * sc, 1.2 * sc, st.z + Math.sin(ang) * 0.17 * sc);
      if (a0) limb(c, [st.x + Math.cos(ang) * 0.17 * sc, 0.95 * sc, st.z + Math.sin(ang) * 0.17 * sc], [st.x + Math.cos(ang) * 0.17 * sc, 1.5 * sc, st.z + Math.sin(ang) * 0.17 * sc], 0.05 * sc, `rgba(255,170,80,${0.4 * st.rim * glow})`);
    }
  };

  // the luminous figure at the centre: falls in from above, crouches, stands
  const drawHero = (c, u, t, glow) => {
    const land = sstep(0.0, 0.11, u), stand = sstep(0.1, 0.3, u);
    const g = P(CX, 0, CZ); if (!g) return;
    const fall = (1 - land) ** 2 * 11, y0 = fall;
    const crouch = (1 - stand) * 0.34 * sstep(0.08, 0.12, u) + Math.sin(u * 22) * 0.004;
    const sc = 1.0, hip = (0.9 - crouch * 0.9) * sc + y0, sh = (1.48 - crouch * 1.1) * sc + y0, hd = (1.66 - crouch * 1.2) * sc + y0;
    c.save(); c.lineCap = 'round';
    const col = '#ffe8c0';
    c.shadowColor = 'rgba(255,150,40,.95)'; c.shadowBlur = Math.max(10, g.s * 0.5);
    const lean = (1 - stand) * 0.3 * sstep(0.08, 0.12, u);
    const leg = (s2) => limb(c, [CX + s2 * 0.1, hip, CZ], [CX + s2 * 0.12, y0, CZ - crouch * 0.4 * (s2 > 0 ? 1 : 0.4)], 0.14, col);
    leg(1); leg(-1);
    limb(c, [CX, hip, CZ], [CX, sh, CZ + lean], 0.4, col);
    limb(c, [CX + 0.22, sh - 0.04, CZ + lean], [CX + 0.28, hip + 0.1 - crouch * 0.2, CZ + lean * 0.5 + 0.06], 0.1, col);
    limb(c, [CX - 0.22, sh - 0.04, CZ + lean], [CX - 0.28, hip + 0.1 - crouch * 0.2, CZ + lean * 0.5 + 0.06], 0.1, col);
    const hp = P(CX, hd, CZ + lean); if (hp) { c.fillStyle = col; c.beginPath(); c.arc(hp.x, hp.y, 0.12 * hp.s, 0, TAU); c.fill(); }
    c.restore();
    c.globalCompositeOperation = 'lighter';
    const gr = c.createRadialGradient(g.x, g.y - g.s * 0.9, 0, g.x, g.y - g.s * 0.9, g.s * 3.2 * (0.7 + 0.3 * Math.sin(t * 3)));
    gr.addColorStop(0, `rgba(255,170,70,${0.38 * glow})`); gr.addColorStop(1, 'rgba(255,120,30,0)');
    c.fillStyle = gr; c.fillRect(g.x - g.s * 4, g.y - g.s * 4.5, g.s * 8, g.s * 6);
    c.globalCompositeOperation = 'source-over';
  };

  // ---- the backdrop: ground, arch gate, buildings, trees, lamps ----
  const quad = (c, pts, fill) => { const q = pts.map((a) => P(a[0], a[1], a[2])); if (q.some((v) => !v)) return; c.fillStyle = fill; c.beginPath(); c.moveTo(q[0].x, q[0].y); for (let i = 1; i < q.length; i++) c.lineTo(q[i].x, q[i].y); c.closePath(); c.fill(); };
  const box = (c, x0, x1, z0, z1, h, base, lit, winRows) => {          // a building seen from the front: face, roof edge, lit windows
    quad(c, [[x0, 0, z0], [x1, 0, z0], [x1, h, z0], [x0, h, z0]], base);
    const q = [P(x0, 0, z0), P(x1, 0, z0), P(x1, h, z0), P(x0, h, z0)]; if (q.some((v) => !v)) return;
    if (winRows) {
      const cols = Math.max(2, Math.round((x1 - x0) / 2.6));
      for (let r = 0; r < winRows; r++) for (let k = 0; k < cols; k++) {
        const hh = hash(r * 31 + k * 7 + x0 * 3 + h);
        if (hh < 0.34) continue;
        const wx = x0 + ((k + 0.25) / cols) * (x1 - x0), ww = ((x1 - x0) / cols) * 0.5, wy = ((r + 0.3) / winRows) * h, wh = (h / winRows) * 0.42;
        const a = P(wx, wy, z0), b = P(wx + ww, wy + wh, z0); if (!a || !b) continue;
        c.fillStyle = `rgba(255,${200 + hh * 40},${120 + hh * 50},${0.3 + 0.6 * hh * lit})`; c.fillRect(a.x, b.y, b.x - a.x, a.y - b.y);
      }
    }
  };

  const drawBackdrop = (c, u, t, glow) => {
    const W = cam.W, H = cam.H;
    // sky and far haze
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#04060c'); sky.addColorStop(0.4, '#0a0e18'); sky.addColorStop(1, '#0c0b0c');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // ground: dark paving, with a worn warm patch where the light lands
    const gTop = P(0, 0, 140);
    const gy0 = gTop ? gTop.y : 0;
    const gg = c.createLinearGradient(0, gy0, 0, H);
    gg.addColorStop(0, '#0e0f12'); gg.addColorStop(0.5, '#15130f'); gg.addColorStop(1, '#1a1511');
    c.fillStyle = gg; c.fillRect(0, gy0, W, H - gy0);
    // paver grid
    c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.45)';
    for (let z = -4; z < 130; z += 2.4) { const a = P(-90, 0, z), b = P(90, 0, z); if (a && b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
    for (let x = -72; x <= 72; x += 2.4) { const a = P(x, 0, -4), b = P(x, 0, 130); if (a && b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); } }
    // lamps: pools of light on the stone
    c.globalCompositeOperation = 'lighter';
    for (const lx of lampsX) for (const lz of lampsZ) {
      const a = P(lx, 0, lz); if (!a) continue;
      c.save(); c.translate(a.x, a.y); c.scale(1, 0.42);
      const r = a.s * 8.5, gl = c.createRadialGradient(0, 0, 0, 0, 0, r);
      gl.addColorStop(0, 'rgba(255,184,96,.34)'); gl.addColorStop(0.5, 'rgba(255,150,60,.1)'); gl.addColorStop(1, 'rgba(255,130,40,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.restore();
    }
    // the landing glow on the ground
    { const a = P(CX, 0, CZ); if (a) { c.save(); c.translate(a.x, a.y); c.scale(1, 0.46); const r = a.s * 11 * (0.9 + 0.08 * Math.sin(t * 3)), gl = c.createRadialGradient(0, 0, 0, 0, 0, r); gl.addColorStop(0, `rgba(255,170,70,${0.62 * glow})`); gl.addColorStop(0.45, `rgba(255,120,40,${0.2 * glow})`); gl.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.restore(); } }
    c.globalCompositeOperation = 'source-over';
    // the campus behind: academic blocks left and right, lit
    const FZ = 104;
    box(c, -90, -34, FZ, FZ, 30, '#0d1016', 1, 9); box(c, 34, 90, FZ, FZ, 34, '#0d1016', 1, 10);
    box(c, -33, -16, FZ - 6, FZ - 6, 20, '#10131a', 0.8, 6); box(c, 16, 33, FZ - 6, FZ - 6, 22, '#10131a', 0.8, 6);
    box(c, -70, -40, 70, 70, 11, '#0b0e13', 0.6, 3); box(c, 42, 78, 72, 72, 12, '#0b0e13', 0.6, 3);
    // trees: dark rounded crowns along both sides
    for (let k = 0; k < 18; k++) {
      const side = k % 2 ? 1 : -1, tz = 10 + Math.floor(k / 2) * 8.2, tx = side * (21.5 + hash(k) * 2.5), a = P(tx, 0, tz), b = P(tx, 5.2 + hash(k + 4) * 1.6, tz); if (!a || !b) continue;
      c.fillStyle = '#05090a'; c.beginPath(); c.ellipse(b.x, b.y, a.s * 2.8, a.s * 2.6, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(40,70,40,.18)'; c.beginPath(); c.ellipse(b.x - a.s * 0.5, b.y - a.s * 0.4, a.s * 1.4, a.s * 1.1, 0, 0, TAU); c.fill();
      c.strokeStyle = '#08090a'; c.lineWidth = Math.max(1, a.s * 0.3); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y + a.s); c.stroke();
    }
    // THE ARCH GATE: two pillars, a lit arch, a heavy beam, uplit in warm white
    const GZ = 84; cam.gs = 0.46;
    const pil = (x0, x1) => { box(c, x0, x1, GZ, GZ, 24, '#cfc3a8', 0, 0); quad(c, [[x0, 0, GZ], [x0, 24, GZ], [x0 + (x1 - x0) * 0.28, 24, GZ], [x0 + (x1 - x0) * 0.28, 0, GZ]], 'rgba(40,30,20,.35)'); };
    pil(-15, -10.5); pil(10.5, 15);
    const gl = [P(-15, 24, GZ), P(15, 24, GZ), P(15, 29.5, GZ), P(-15, 29.5, GZ)];
    quad(c, [[-16.2, 24, GZ], [16.2, 24, GZ], [16.2, 29.5, GZ], [-16.2, 29.5, GZ]], '#d9cdb0');
    quad(c, [[-16.2, 29.5, GZ], [16.2, 29.5, GZ], [16.2, 30.6, GZ], [-16.2, 30.6, GZ]], '#a89b82');
    // arch underside + lit inner curve
    c.strokeStyle = 'rgba(255,226,160,.95)'; c.lineWidth = Math.max(2, (P(0, 0, GZ) || { s: 4 }).s * 0.5); c.beginPath(); let pen = false;
    for (let k = 0; k <= 36; k++) { const th = (k / 36) * Math.PI, q = P(-10.5 * Math.cos(th), 12 + 12 * Math.sin(th), GZ); if (!q) continue; pen ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); pen = true; } c.stroke();
    c.fillStyle = 'rgba(255,214,150,.07)'; c.beginPath(); pen = false;
    for (let k = 0; k <= 36; k++) { const th = (k / 36) * Math.PI, q = P(-10.5 * Math.cos(th), 12 + 12 * Math.sin(th), GZ); if (!q) continue; pen ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); pen = true; }
    { const q = P(10.5, 0, GZ), q2 = P(-10.5, 0, GZ); if (q && q2) { c.lineTo(q.x, q.y); c.lineTo(q2.x, q2.y); } } c.closePath(); c.fill();
    // the lettering: SRM on the beam
    const lt = P(0, 27, GZ), lb = P(0, 26, GZ);
    if (lt && lb) { c.fillStyle = '#3a2c1c'; c.font = `700 ${Math.max(8, lt.s * 3.1)}px "Instrument Serif", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SRM', lt.x, lt.y + lt.s * 0.1); c.textAlign = 'start'; }
    // flood bloom on the gate
    c.globalCompositeOperation = 'lighter';
    { const a = P(0, 16, GZ * 1); if (a) { const r = a.s * 34, gr = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, r); gr.addColorStop(0, 'rgba(255,200,130,.32)'); gr.addColorStop(1, 'rgba(255,160,70,0)'); c.fillStyle = gr; c.fillRect(a.x - r, a.y - r, r * 2, r * 2); } }
    cam.gs = 0;
    // lamp heads + bloom
    for (const lx of lampsX) for (const lz of lampsZ) {
      const a = P(lx, 0, lz), b = P(lx, 7.2, lz); if (!a || !b) continue;
      c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#0a0a0c'; c.lineWidth = Math.max(1, a.s * 0.14); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      c.globalCompositeOperation = 'lighter';
      const r = b.s * 2.2, gr = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, r); gr.addColorStop(0, 'rgba(255,214,150,.95)'); gr.addColorStop(0.12, 'rgba(255,190,110,.55)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = gr; c.fillRect(b.x - r, b.y - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = 'source-over';
  };

  // ---- the footage's glowing figure: his tumble, the landing, the fire ring - lifted out of the original frames and laid over the plaza ----
  // The frames are dark crowd + bright fire; squaring them (multiply with themselves) sinks the crowd to black and keeps the fire, and
  // 'lighter' then adds only the fire to the new scene. Anchored on his feet (0.5, 0.488 of the frame), scaled so he stands a bit taller than a student.
  const FX = { a: null, b: null, cv: null, c2: null, tmp: null, t2: null };
  const filmLayer = (c, A, B, bt, fi, sp) => {
    const g = P(CX, 0, CZ); if (!g || !A) return;
    const iw = A.naturalWidth || A.width, ih = A.naturalHeight || A.height; if (!iw) return;
    const figH = 2.5 * g.s, Hd = figH / 0.095, Wd = Hd * (iw / ih);
    // the size follows the camera zoom, which changes on every redraw while the visitor scrolls. Assigning canvas.width re-allocates the bitmap, and that
    // churn (several canvases per redraw) makes Safari purge canvas memory: the film canvas goes black for a moment, then comes back, then goes black again.
    // So the scratch canvases only change size in coarse steps (a handful of times through the whole landing); the layer is simply drawn from them scaled.
    const lw = Math.min(640, Math.max(192, Math.ceil(Wd * 0.5 / 64) * 64)), lh = Math.round(lw * (ih / iw));
    if (!FX.cv) { FX.cv = document.createElement('canvas'); FX.c2 = FX.cv.getContext('2d'); FX.tmp = document.createElement('canvas'); FX.t2 = FX.tmp.getContext('2d'); }
    if (FX.cv.width !== lw || FX.cv.height !== lh) { FX.cv.width = FX.tmp.width = lw; FX.cv.height = FX.tmp.height = lh; }
    const q = FX.c2, t2 = FX.t2;
    q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; q.drawImage(A, 0, 0, lw, lh);
    if (B && bt > 0.02) { q.globalAlpha = bt; q.drawImage(B, 0, 0, lw, lh); q.globalAlpha = 1; }
    t2.globalCompositeOperation = 'copy'; t2.drawImage(FX.cv, 0, 0);
    q.globalCompositeOperation = 'multiply'; q.drawImage(FX.tmp, 0, 0);                   // x^2: the crowd goes black, the fire stays
    q.globalCompositeOperation = 'multiply'; q.drawImage(FX.tmp, 0, 0);                   // x^3: sink the crowd a little further
    q.globalCompositeOperation = 'lighter'; q.globalAlpha = 0.55; q.drawImage(FX.tmp, 0, 0); q.globalAlpha = 1;   // a little of the original back: keeps his glowing outline
    q.globalCompositeOperation = 'destination-out';                                       // feather the frame edges so no seam shows
    const fe = (x0, y0, x1, y1, rx, ry, rw, rh) => { const gr = q.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(rx, ry, rw, rh); };
    fe(0, 0, lw * 0.16, 0, 0, 0, lw * 0.16, lh); fe(lw, 0, lw * 0.84, 0, lw * 0.84, 0, lw * 0.16, lh);
    fe(0, 0, 0, lh * 0.2, 0, 0, lw, lh * 0.2); fe(0, lh, 0, lh * 0.8, 0, lh * 0.8, lw, lh * 0.2);
    // the same skydiver as in the fall takes the glowing figure's place: he tumbles in, slams down, and stays lit by the fire
    const k0 = Math.round(fi) - TRK0, hasSp = sp && sp.naturalWidth && fi >= 216 && k0 >= 0 && k0 < TRX.length;
    const spA = hasSp ? sstep(216, 222, fi) * (1 - sstep(262, 268, fi)) + sstep(284, 292, fi) * (fi > 270 ? 1 : 0) : 0;
    const fx = hasSp ? TRX[k0] : 0.5, fy = hasSp ? TRY[k0] : 0.43;
    if (spA > 0.01) {
      q.globalCompositeOperation = 'destination-out'; const rr = lw * 0.15, gx = fx * lw, gy = fy * lh;
      const eg = q.createRadialGradient(gx, gy, rr * 0.35, gx, gy, rr); eg.addColorStop(0, `rgba(0,0,0,${spA})`); eg.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = eg; q.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
    }
    q.globalCompositeOperation = 'source-over';
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1;
    c.drawImage(FX.cv, g.x - Wd * 0.5, g.y - Hd * 0.488, Wd, Hd);
    c.restore();
    if (spA > 0.01) {
      const sw = Hd * 0.15, sh = sw * (sp.naturalHeight / sp.naturalWidth), X = g.x + (fx - 0.5) * Wd, Y = g.y + (fy - 0.488) * Hd;
      const hot = 0.4 * (1 - sstep(226, 262, fi)) + 0.07;                 // white-hot as he falls in, lit by the fire once down
      const fall = 1 - sstep(236, 264, fi), rot = -1.0 * fall * Math.sin(fi * 0.11) * 0.0 - 0.9 * fall + (fi > 286 ? Math.sin(fi * 0.05) * 0.02 : 0);
      if (!FX.sp) { FX.sp = document.createElement('canvas'); FX.s2 = FX.sp.getContext('2d'); }
      const pw = Math.max(64, Math.ceil(sw * 1.6 / 32) * 32), ph = Math.round(pw * (sp.naturalHeight / sp.naturalWidth));
      if (FX.sp.width !== pw || FX.sp.height !== ph) { FX.sp.width = pw; FX.sp.height = ph; }
      const x2 = FX.s2; x2.globalCompositeOperation = 'source-over'; x2.clearRect(0, 0, pw, ph); x2.drawImage(sp, 0, 0, pw, ph);
      x2.globalCompositeOperation = 'source-atop'; x2.fillStyle = `rgba(255,196,120,${hot})`; x2.fillRect(0, 0, pw, ph);
      x2.fillStyle = 'rgba(255,120,40,.1)'; x2.fillRect(0, 0, pw, ph); x2.globalCompositeOperation = 'source-over';
      c.save(); c.globalAlpha = spA; c.translate(X, Y); c.rotate(rot); c.scale(1, 0.86 + 0.14 * fall);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = spA * 0.22; c.drawImage(FX.sp, -sw * 0.54, -sh * 0.54, sw * 1.08, sh * 1.08);   // the fire's glow around him
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = spA; c.drawImage(FX.sp, -sw / 2, -sh / 2, sw, sh);
      c.restore();
    }
  };

  const state = { frame: -1 };

  return {
    // c: 2D context of the film canvas; u: 0..1 through the plaza; t: seconds
    draw(c, W, H, u, t, A, B, bt, fi, sp) {
      u = clamp(u); setCam(W, H, u);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
      const shock = sstep(0.285, 0.3, u), glow = clamp(sstep(0.0, 0.07, u) * (1 - 0.45 * sstep(0.45, 1, u)));
      drawBackdrop(c, u, t, glow);
      // the crowd: milling about, then turning to face him and stepping back when he lands
      const react = sstep(0.04, 0.16, u), back = sstep(0.285, 0.36, u) * 0.9, settle = sstep(0.36, 0.7, u);
      const drawn = [];
      for (const p of people) {
        const st = p, r = react * clamp((u - p.delay * 0.5) * 8);
        let x = p.x0, z = p.z0, face = p.face0, walk = p.walker && u < 0.04 || (p.walker && !p.ring);
        if (p.ring) {
          const ang = p.a0, rad = p.r0 + back * (1.1 + p.r0 * 0.04) + Math.sin(t * 0.6 + p.ph) * 0.06;
          x = CX + Math.cos(ang) * rad + Math.sin(t * 0.7 * p.sp + p.ph) * 0.07; z = CZ + Math.sin(ang) * rad * 0.92 + Math.cos(t * 0.6 * p.sp + p.ph) * 0.06;
          const toC = Math.atan2(CX - x, CZ - z);                          // facing the middle
          face = lerp(p.face0 + Math.sin(t * 0.4 + p.ph) * 0.4, toC + (p.wob - 0.5) * 0.35, r);
        } else if (p.walker) {
          const sp = 0.55 + p.sp * 0.5, ang = p.face0; x = p.x0 + Math.sin(ang) * t * sp * 0.4 % 6 - 3 * Math.sin(ang); z = p.z0 + Math.cos(ang) * t * sp * 0.4 % 6 - 3 * Math.cos(ang);
          face = ang;
          if (Math.hypot(x - CX, z - CZ) < 24) face = lerp(ang, Math.atan2(CX - x, CZ - z), react * 0.55);
        } else if (Math.hypot(x - CX, z - CZ) < 26) face = lerp(face, Math.atan2(CX - x, CZ - z), react * 0.6);
        st.x = x; st.z = z; st.face = face; st.walk = p.ring ? (u > 0.28 && u < 0.4) : walk; st.phase = t * 5.2 * p.sp + p.ph;
        st.watch = p.ring ? sstep(0.12, 0.2, u) * (1 - sstep(0.9, 1, u)) : 0; st.rim = p.ring ? 1 : 0.3;
        drawn.push(st);
      }
      drawn.sort((a, b) => b.z - a.z);
      for (const st of drawn) { const k = light(st.x, st.z, glow * (1 + 0.3 * shock)); drawStudent(c, st, st, k, glow, u, t); }
      filmLayer(c, A, B, bt, fi == null ? 217 : fi, sp);
      // grade: warm the centre, sink the edges, a little film grain of dust in the lamp light
      const vg = c.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 1.0);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 46; k++) { const x = (hash(k) * W + t * (6 + hash(k + 2) * 10)) % W, y = (hash(k + 1) * H * 0.85 + Math.sin(t * 0.5 + k) * 12 + t * 3 * hash(k + 3)) % (H * 0.9), r = 0.7 + hash(k + 5) * 1.4; c.fillStyle = `rgba(255,200,130,${0.08 + 0.18 * hash(k + 7)})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
      c.globalCompositeOperation = 'source-over';
      // the cut from the golden flash
      const fl = 1 - sstep(0, 0.07, u); if (fl > 0.01) { c.fillStyle = `rgba(255,228,176,${fl * 0.9})`; c.fillRect(0, 0, W, H); }
      c.restore();
    },
  };
}

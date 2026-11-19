/* cloudFx.js - life inside the loader's cloud bank.
   While the clouds roll in (k 0 -> 1) this 2D layer sits on top of the cloud shader and adds what makes it feel like you are really
   flying through it: billowing mist puffs that rush toward the lens (parting around the pointer), a far-off airliner with a contrail
   glimpsed through a gap, drifting ice-crystal glints, an altitude readout counting down, and a soft wake around the cursor. */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = (v) => v - Math.floor(v);
const rnd = (s) => fract(Math.sin(s * 127.1 + 311.7) * 43758.5453);

function makePuff(seed) {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const blobs = 11;
  for (let i = 0; i < blobs; i++) {
    const a = rnd(seed * 9 + i) * Math.PI * 2, d = rnd(seed * 5 + i * 3) * S * 0.2;
    const x = S / 2 + Math.cos(a) * d * 1.3, y = S / 2 + Math.sin(a) * d * 0.7;
    const r = S * (0.2 + rnd(seed + i * 7) * 0.14);
    const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.35, r * 0.05, x, y, r);
    gr.addColorStop(0, "rgba(255,252,244,.55)");
    gr.addColorStop(0.35, "rgba(236,240,250,.36)");
    gr.addColorStop(0.7, "rgba(190,203,228,.12)");
    gr.addColorStop(1, "rgba(170,186,216,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}

export function createCloudFx(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const MOBILE = matchMedia("(max-width: 820px)").matches || matchMedia("(pointer: coarse)").matches;
  const sprites = [makePuff(1), makePuff(2), makePuff(3), makePuff(4)];
  const N = MOBILE ? 22 : 40;
  const puffs = Array.from({ length: N }, (_, i) => ({ ph: rnd(i + 1), a: rnd(i * 3 + 2) * Math.PI * 2, sp: 0.05 + rnd(i * 7 + 3) * 0.06, sz: 0.55 + rnd(i * 11 + 4) * 0.8, s: sprites[i % sprites.length], rot: (rnd(i + 9) - 0.5) * 0.6, off: 0.55 + rnd(i * 13 + 5) * 0.55 }));
  const G = MOBILE ? 18 : 34;
  const glints = Array.from({ length: G }, (_, i) => ({ x: rnd(i * 17 + 1), y: rnd(i * 19 + 2), ph: rnd(i * 23 + 3) * 6.28, sz: 3 + rnd(i * 29 + 4) * 7, dr: 0.01 + rnd(i * 31) * 0.02 }));
  let W = 2, H = 2, dpr = 1;
  const P = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, has: false, last: 0 };
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1 : 1.25);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
    W = canvas.width; H = canvas.height;
  };
  resize();
  const onMove = (e) => { P.x = e.clientX / innerWidth; P.y = e.clientY / innerHeight; P.has = true; P.last = performance.now(); };
  window.addEventListener("pointermove", onMove, { passive: true });

  // a proper airliner, seen from above and slightly banked: swept wings with engines, tapered fuselage, tail planes, lit from the top,
  // with a twin contrail and wing-tip nav lights. `bank` squeezes the wing span a little so it rolls gently as it crosses.
  const plane = (x, y, s, ang, a, bank, t) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a;
    const w = (v) => v * bank;
    // soft haze round it, so it reads as sitting inside the cloud
    const hz = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 2.2);
    hz.addColorStop(0, "rgba(190,208,255,.28)"); hz.addColorStop(1, "rgba(190,208,255,0)");
    ctx.fillStyle = hz; ctx.fillRect(-s * 2.4, -s * 2.4, s * 4.8, s * 4.8);
    // twin contrails from the engines
    const tl = s * 7;
    for (const side of [-1, 1]) {
      const ey = w(side * s * 0.52);
      const cg = ctx.createLinearGradient(-s * 0.9 - tl, 0, -s * 0.6, 0);
      cg.addColorStop(0, "rgba(255,255,255,0)"); cg.addColorStop(0.7, "rgba(255,255,255,.35)"); cg.addColorStop(1, "rgba(255,255,255,.7)");
      ctx.fillStyle = cg; ctx.beginPath();
      ctx.moveTo(-s * 0.6, ey - s * 0.035); ctx.lineTo(-s * 0.9 - tl, ey - s * 0.16); ctx.lineTo(-s * 0.9 - tl, ey + s * 0.16); ctx.lineTo(-s * 0.6, ey + s * 0.035); ctx.fill();
    }
    const body = ctx.createLinearGradient(0, -s * 0.16, 0, s * 0.16);
    body.addColorStop(0, "#9fb3dc"); body.addColorStop(0.45, "#52648f"); body.addColorStop(1, "#1f2947");
    const wing = ctx.createLinearGradient(-s * 0.7, 0, s * 0.3, 0);
    wing.addColorStop(0, "#27325a"); wing.addColorStop(1, "#6e82ae");
    ctx.shadowColor = "rgba(10,18,50,.45)"; ctx.shadowBlur = s * 0.35; ctx.shadowOffsetY = s * 0.18;
    // tail planes
    ctx.fillStyle = wing;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-s * 0.82, 0); ctx.lineTo(-s * 1.12, w(side * s * 0.44)); ctx.lineTo(-s * 1.3, w(side * s * 0.44)); ctx.lineTo(-s * 1.12, 0); ctx.closePath(); ctx.fill();
    }
    // main wings, swept back
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 0.34, 0); ctx.lineTo(-s * 0.5, w(side * s * 1.18)); ctx.lineTo(-s * 0.72, w(side * s * 1.18)); ctx.lineTo(-s * 0.52, 0); ctx.closePath(); ctx.fill();
    }
    ctx.shadowColor = "transparent";
    // engines
    for (const side of [-1, 1]) {
      const eg = ctx.createLinearGradient(0, w(side * s * 0.52) - s * 0.1, 0, w(side * s * 0.52) + s * 0.1);
      eg.addColorStop(0, "#9fb3dc"); eg.addColorStop(1, "#2a3558");
      ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(-s * 0.12, w(side * s * 0.52), s * 0.3, s * 0.085, 0, 0, Math.PI * 2); ctx.fill();
    }
    // fuselage: pointed nose, long tapering tail
    ctx.fillStyle = body; ctx.beginPath();
    ctx.moveTo(s * 1.25, 0); ctx.bezierCurveTo(s * 1.1, -s * 0.15, s * 0.7, -s * 0.16, s * 0.1, -s * 0.16);
    ctx.lineTo(-s * 0.9, -s * 0.07); ctx.quadraticCurveTo(-s * 1.2, -s * 0.03, -s * 1.28, 0);
    ctx.quadraticCurveTo(-s * 1.2, s * 0.03, -s * 0.9, s * 0.07); ctx.lineTo(s * 0.1, s * 0.16);
    ctx.bezierCurveTo(s * 0.7, s * 0.16, s * 1.1, s * 0.15, s * 1.25, 0); ctx.fill();
    // top highlight and cockpit
    ctx.fillStyle = "rgba(235,243,255,.35)"; ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.07, s * 0.95, s * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(20,30,60,.7)"; ctx.beginPath(); ctx.ellipse(s * 0.95, 0, s * 0.12, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    // nav lights
    const blink = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.globalCompositeOperation = "lighter";
    for (const [side, col] of [[-1, "255,70,70"], [1, "70,255,140"]]) {
      const lg = ctx.createRadialGradient(-s * 0.6, w(side * s * 1.18), 0, -s * 0.6, w(side * s * 1.18), s * 0.22);
      lg.addColorStop(0, `rgba(${col},${0.95 * blink})`); lg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = lg; ctx.fillRect(-s * 0.9, w(side * s * 1.18) - s * 0.25, s * 0.6, s * 0.5);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  return {
    resize,
    draw(k, t) {
      resize();
      ctx.clearRect(0, 0, W, H);
      const amp = sstep(0.06, 0.3, k) * (1 - sstep(0.7, 0.95, k));
      if (amp <= 0.002) return;
      P.sx += (P.x - P.sx) * 0.08; P.sy += (P.y - P.sy) * 0.08;
      const live = P.has && performance.now() - P.last < 2500;
      const px = P.sx * W, py = P.sy * H;
      const cx = W * (0.5 + (P.sx - 0.5) * -0.08), cy = H * (0.5 + (P.sy - 0.5) * -0.08), maxR = Math.hypot(W, H) * 0.62;
      const unit = Math.min(W, H) / 900;

      // 1. an airliner far off, seen through a gap: it crosses while the clouds are thickest, then the mist closes over it
      const pk = (k - 0.16) / 0.56;
      if (pk > 0 && pk < 1) {
        // crosses the middle of the screen, easing in from the left and out to the right; grows a touch as it passes "closer"
        const e = pk * pk * (3 - 2 * pk) * 0.35 + pk * 0.65;
        const x = W * (-0.2 + 1.4 * e), y = H * (0.5 - 0.045 * Math.sin(pk * Math.PI) - 0.02 * pk);
        const size = (108 + 24 * Math.sin(pk * Math.PI)) * unit * dpr;
        const vis = sstep(0, 0.16, pk) * (1 - sstep(0.84, 1, pk)) * 0.96 * Math.min(1, amp * 1.6);
        plane(x, y, size, -0.07 - 0.03 * Math.sin(pk * 6), vis, 0.9 + 0.1 * Math.cos(pk * 5), t);
      }

      // 2. mist puffs rushing past the lens, parting around the pointer
      ctx.globalCompositeOperation = "source-over";
      for (const p of puffs) {
        const u = fract(p.ph + t * p.sp);
        const e = Math.pow(u, 1.9);
        const r = e * maxR * p.off;
        let x = cx + Math.cos(p.a) * r, y = cy + Math.sin(p.a) * r * 0.82;
        const sz = (0.18 + e * 2.6) * p.sz * 300 * unit * dpr;
        if (live) {
          const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), R = 260 * unit * dpr + sz * 0.25;
          if (d < R) { const f = Math.pow(1 - d / R, 1.6) * 190 * unit * dpr; x += (dx / (d || 1)) * f; y += (dy / (d || 1)) * f; }
        }
        const al = Math.pow(Math.sin(Math.PI * u), 0.85) * sstep(0.14, 0.4, u) * amp * 0.9;
        if (al < 0.01) continue;
        ctx.globalAlpha = al;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + t * 0.02); ctx.drawImage(p.s, -sz / 2, -sz / 2, sz, sz); ctx.restore();
      }
      ctx.globalAlpha = 1;

      // 3. ice-crystal glints drifting up through the cloud (brighter near the pointer)
      const ga = sstep(0.22, 0.45, k) * (1 - sstep(0.72, 0.95, k));
      if (ga > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        for (const g of glints) {
          const gy = fract(g.y - t * g.dr), gx = g.x + Math.sin(t * 0.4 + g.ph) * 0.01;
          const x = gx * W, y = gy * H;
          let tw = 0.5 + 0.5 * Math.sin(t * 2.2 + g.ph); tw = tw * tw;
          const near = live ? 1 + 1.6 * Math.max(0, 1 - Math.hypot(x - px, y - py) / (240 * unit * dpr)) : 1;
          const s = g.sz * unit * dpr * (0.55 + tw * 0.7) * Math.min(near, 1.8);
          ctx.globalAlpha = ga * tw * 0.8 * Math.min(1, near);
          const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 2);
          gr.addColorStop(0, "rgba(255,255,255,.7)"); gr.addColorStop(0.35, "rgba(255,255,255,.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr; ctx.fillRect(x - s * 2, y - s * 2, s * 4, s * 4);
          ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = Math.max(1, dpr * 0.8);
          ctx.beginPath(); ctx.moveTo(x - s * 2.2, y); ctx.lineTo(x + s * 2.2, y); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x, y + s * 2.2); ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // 4. a soft wake around the cursor: the cloud visibly parts where you point
      if (live) {
        const R = 120 * unit * dpr * (1 + 0.06 * Math.sin(t * 3));
        const rg = ctx.createRadialGradient(px, py, R * 0.2, px, py, R);
        rg.addColorStop(0, "rgba(255,248,232,.28)"); rg.addColorStop(0.7, "rgba(255,255,255,.08)"); rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = amp; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = dpr; ctx.globalAlpha = amp * 0.7;
        ctx.beginPath(); ctx.arc(px, py, R * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 5. readout: altitude counting down through the deck
      const ta = sstep(0.12, 0.28, k) * (1 - sstep(0.56, 0.7, k));
      if (ta > 0.01) {
        const alt = Math.round(3400 - 2500 * sstep(0.1, 0.62, k));
        const fs1 = 11 * dpr * Math.max(0.85, unit), fs2 = 44 * dpr * Math.max(0.8, unit);
        ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.globalAlpha = ta;
        ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = 14 * dpr;
        ctx.fillStyle = "#1e2a4d";
        ctx.font = `500 ${fs1}px "JetBrains Mono", ui-monospace, monospace`;
        const tr = (s) => s.split("").join(" ");
        ctx.fillText(tr("PASSING THROUGH THE CLOUD DECK"), W / 2, H * 0.8);
        ctx.font = `800 ${fs2}px "Archivo", "Inter Tight", sans-serif`;
        ctx.fillText(`${alt.toLocaleString("en-US")} M`, W / 2, H * 0.8 + fs2 * 1.15);
        if (!MOBILE) { ctx.font = `500 ${fs1 * 0.9}px "JetBrains Mono", ui-monospace, monospace`; ctx.globalAlpha = ta * (live ? 0.45 : 0.8); ctx.shadowBlur = 8 * dpr; ctx.fillText(tr("MOVE YOUR CURSOR TO PART THE MIST"), W / 2, H * 0.8 + fs2 * 1.15 + fs1 * 2.6); }
        ctx.restore();
      }
    },
    destroy() { window.removeEventListener("pointermove", onMove); },
  };
}

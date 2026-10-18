const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Dark data-centre corridor. z in 0..1 is how far we've travelled in, a = overall opacity. */
export function drawCore(ctx, W, H, z, a, t) {
  ctx.clearRect(0, 0, W, H);
  if (a <= 0.001) return;
  ctx.globalAlpha = a;
  const vx = W / 2, vy = H * 0.47;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#020409"); bg.addColorStop(0.5, "#05080f"); bg.addColorStop(1, "#02030a");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const S = H * 0.62; // scale at depth 1
  const N = 15;
  const travel = z * 12;
  const off = travel % 1;
  const base = Math.floor(travel);

  // floor reflection glow
  const fg = ctx.createRadialGradient(vx, vy + H * 0.22, 5, vx, vy + H * 0.22, W * 0.5);
  fg.addColorStop(0, "rgba(255,190,90,.20)"); fg.addColorStop(1, "rgba(255,190,90,0)");
  ctx.fillStyle = fg; ctx.fillRect(0, vy, W, H - vy);

  // floor grid lines
  ctx.strokeStyle = "rgba(255,190,100,.10)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -8; i <= 8; i++) {
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + i * W * 0.22, H);
  }
  for (let k = 0; k < 18; k++) {
    const d = 1 + k * 0.5 - off * 0.5;
    const y = vy + (S * 0.9) / d;
    ctx.moveTo(0, y); ctx.lineTo(W, y);
  }
  ctx.stroke();

  // racks, far -> near
  for (let i = N; i >= 0; i--) {
    const d = 1 + (i - off) * 0.55;
    if (d < 0.35) continue;
    const idx = base + i;
    const sc = S / d;
    const fade = Math.min(1, (N - i + off) / 4) * Math.min(1, (d - 0.3) / 0.35);
    for (const side of [-1, 1]) {
      const w = sc * 0.46, hh = sc * 0.95;
      const x0 = vx + side * sc * 1.05 - (side > 0 ? 0 : w);
      const y0 = vy - hh * 0.72;
      ctx.fillStyle = `rgba(9,13,22,${0.96 * fade})`;
      ctx.fillRect(x0, y0, w, hh);
      ctx.strokeStyle = `rgba(80,100,130,${0.4 * fade})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, w, hh);
      // LED rows
      const rows = 14, cols = 5;
      for (let r = 0; r < rows; r++) {
        const ry = y0 + hh * (0.04 + (r / rows) * 0.92);
        ctx.fillStyle = `rgba(40,52,74,${0.55 * fade})`;
        ctx.fillRect(x0 + w * 0.06, ry, w * 0.88, hh * 0.05);
        for (let c = 0; c < cols; c++) {
          const key = idx * 31 + r * 7 + c + (side > 0 ? 500 : 0);
          const h = hash(key);
          const on = Math.sin(t * (1 + h * 4) + h * 40) > -0.2 + h * 0.5;
          if (!on) continue;
          const col = h > 0.86 ? "255,80,70" : h > 0.55 ? "90,230,150" : h > 0.25 ? "255,190,90" : "110,200,255";
          const lx = x0 + w * (0.12 + c * 0.15);
          const sz = Math.max(1.2, sc * 0.012);
          ctx.fillStyle = `rgba(${col},${0.9 * fade})`;
          ctx.fillRect(lx, ry + hh * 0.012, sz * 1.6, sz);
          if (sc > 160 && h > 0.5) {
            ctx.fillStyle = `rgba(${col},${0.12 * fade})`;
            ctx.fillRect(lx - sz, ry - sz * 0.4, sz * 3.6, sz * 2.6);
          }
        }
      }
      // floor reflection
      ctx.fillStyle = `rgba(255,190,100,${0.04 * fade})`;
      ctx.fillRect(x0, y0 + hh, w, hh * 0.25);
    }
  }

  // far tower / gate at the end
  const tw = W * 0.05, th = H * 0.5;
  const tg = ctx.createLinearGradient(0, vy - th, 0, vy + th * 0.1);
  tg.addColorStop(0, "rgba(255,220,150,0)"); tg.addColorStop(0.5, "rgba(255,225,160,.9)"); tg.addColorStop(1, "rgba(255,200,110,.2)");
  ctx.fillStyle = tg; ctx.fillRect(vx - tw / 2, vy - th * 0.9, tw, th);

  // light cone from above (additive)
  ctx.globalCompositeOperation = "lighter";
  const cg = ctx.createLinearGradient(0, 0, 0, H * 0.9);
  cg.addColorStop(0, "rgba(255,200,110,.50)"); cg.addColorStop(0.55, "rgba(255,190,100,.12)"); cg.addColorStop(1, "rgba(255,190,100,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(vx - W * 0.04, 0); ctx.lineTo(vx + W * 0.04, 0);
  ctx.lineTo(vx + W * 0.34, H * 0.95); ctx.lineTo(vx - W * 0.34, H * 0.95);
  ctx.closePath(); ctx.fill();
  const hg = ctx.createRadialGradient(vx, vy, 4, vx, vy, W * 0.22);
  hg.addColorStop(0, "rgba(255,230,170,.55)"); hg.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";

  // vignette
  const vg = ctx.createRadialGradient(vx, vy, H * 0.3, vx, vy, W * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.75)");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

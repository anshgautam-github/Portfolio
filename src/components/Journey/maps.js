import { WORLD } from "./coast.js";

const chaikin = (pts, n) => {
  let p = pts;
  for (let k = 0; k < n; k++) {
    const o = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      o.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = o;
  }
  return p;
};
const SMOOTH = WORLD.map((poly) => (poly.length > 5 ? chaikin(poly, 3) : poly));

const fillPolys = (ctx, proj) => {
  ctx.fillStyle = "#fff";
  SMOOTH.forEach((poly) => {
    ctx.beginPath();
    poly.forEach(([lo, la], i) => {
      const [x, y] = proj(lo, la);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });
};

/** equirectangular land mask of the whole planet (white = land) */
export function makeWorld(W = 2048, H = 1024) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  fillPolys(ctx, (lo, la) => [((lo + 180) / 360) * W, ((90 - la) / 180) * H]);
  return c;
}

export const REGION = { lon0: 50, lon1: 110, lat0: -5, lat1: 40 };
/** the same coastlines, but only South / South-East Asia, at ~40 px per degree, for the zoom-in map */
export function makeRegion(W = 2560, H = 1920) {
  const { lon0, lon1, lat0, lat1 } = REGION;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  fillPolys(ctx, (lo, la) => [((lo - lon0) / (lon1 - lon0)) * W, ((lat1 - la) / (lat1 - lat0)) * H]);
  return c;
}

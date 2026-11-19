// art.js - the drawn visuals for <FreefallStory />: one small SVG per chapter of the descent, plus the loss curve that
// runs along the bottom of the chapters and the little fragments floating in the index.
//
// Everything is generated from a seeded random number generator, so the drawings are identical on every load (no layout
// jump, no hydration surprises) and cost nothing at runtime. Every drawing reads one CSS custom property, --p (0 -> 1):
// the engine writes it on the chapter that is on screen, and freefallStory.css turns it into motion (dots settle,
// the attention matrix fills row by row, the noise gives way to a clean signal, a network grows, the rings converge).
// A drawing placed inside a tile sets --p:1 itself, so it shows its finished state.

const mulberry = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f = (n) => +n.toFixed(1);
const svg = (cls, inner, extra = '') =>
  `<svg class="art ${cls}" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" ${extra}>${inner}</svg>`;

/* ---------- the loss curve ----------
   One function, used by the rail along the bottom of the chapters and by the curve tile in the index.
   It falls, hits a bump where the noise chapter sits (a false summit on the way down), a smaller wobble later,
   and flattens out at a floor. t is 0..1, the return value is 0..1 (1 = the top of the hill). */
const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
export const lossAt = (t) => 0.06 + 0.94 * Math.exp(-3.4 * t) + 0.14 * bump(t, 0.5, 0.06) + 0.05 * bump(t, 0.72, 0.05);

/* ---------- I. Guess: a scatter of random points around a target nobody has hit yet ---------- */
export function guessArt(extra = '') {
  const r = mulberry(7);
  let dots = '';
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = 42 + Math.sqrt(r()) * 140;
    const x = 200 + Math.cos(a) * d, y = 200 + Math.sin(a) * d;
    const s = 1.6 + r() * 3.2;
    const dx = (r() - 0.5) * 28, dy = (r() - 0.5) * 28, dur = 5 + r() * 6, del = -r() * 9;
    dots += `<circle class="g-dot${r() > 0.82 ? ' hot' : ''}" cx="${f(x)}" cy="${f(y)}" r="${f(s)}" style="--dx:${f(dx)}px;--dy:${f(dy)}px;--t:${f(dur)}s;--w:${f(del)}s"/>`;
  }
  return svg('art-guess', `
    <g class="g-rings"><circle cx="200" cy="200" r="62"/><circle cx="200" cy="200" r="116"/><circle cx="200" cy="200" r="170"/></g>
    <path class="g-cross" d="M200 142v116M142 200h116"/>
    ${dots}
    <text class="g-q" x="200" y="252" text-anchor="middle">?</text>`, extra);
}

/* ---------- II. Fall: causal self-attention, the lower-triangular matrix of a decoder language model ---------- */
export function attnArt(n = 12, size = 252, extra = '') {
  const r = mulberry(23);
  const cs = size / n, off = (400 - size) / 2;
  let cells = '', mask = '';
  for (let i = 0; i < n; i++) {
    const strong = new Set();
    if (i > 1) { strong.add(Math.floor(r() * i)); if (r() > 0.45) strong.add(Math.floor(r() * i)); }
    for (let j = 0; j < n; j++) {
      const x = f(off + j * cs + 1), y = f(off + i * cs + 1), w = f(cs - 2);
      if (j > i) { mask += `<rect class="a-mask" x="${x}" y="${y}" width="${w}" height="${w}" rx="3"/>`; continue; }
      const hot = j !== i && strong.has(j);
      const a = j === i ? 0.95 : hot ? 0.6 + r() * 0.32 : 0.07 + r() * 0.16;
      cells += `<rect class="a-cell${hot ? ' hot' : ''}" x="${x}" y="${y}" width="${w}" height="${w}" rx="3" style="--r:${i};--a:${a.toFixed(2)}"/>`;
    }
  }
  return svg('art-attn', `
    <g>${mask}</g><g>${cells}</g>
    <text class="a-lab" x="${off}" y="${f(off - 10)}">keys →</text>
    <text class="a-lab" x="${f(off - 10)}" y="${off}" transform="rotate(-90 ${f(off - 10)} ${off})" text-anchor="end">queries →</text>`, extra);
}

/* ---------- III. Noise: a jittery line that gives way to one clean signal, while the crowd's voices fade ---------- */
export function noiseArt(extra = '') {
  const N = 120, x0 = 36, W = 328;
  const base = (u) => Math.sin(u * Math.PI * 4) * 46 + Math.sin(u * Math.PI * 9) * 12;
  const noisy = (seed, amp) => {
    const rr = mulberry(seed);
    let d = '';
    for (let i = 0; i <= N; i++) { const u = i / N; d += `${i ? 'L' : 'M'}${f(x0 + W * u)} ${f(200 + base(u) + (rr() - 0.5) * amp)} `; }
    return d;
  };
  let clean = '';
  for (let i = 0; i <= 80; i++) { const u = i / 80; clean += `${i ? 'L' : 'M'}${f(x0 + W * u)} ${f(200 + base(u))} `; }
  const voices = [['just call the API', 112, 126], ['ship it by friday?', 290, 296], ["it's basically magic", 122, 300], ['10x, instantly', 288, 112]]
    .map(([t, x, y], i) => `<text class="n-voice" x="${x}" y="${y}" text-anchor="middle" style="--i:${i}">${t}</text>`).join('');
  return svg('art-noise', `
    <line class="n-axis" x1="30" y1="200" x2="370" y2="200"/>
    <g class="n-noise"><path d="${noisy(41, 120)}"/><path d="${noisy(42, 90)}"/><path d="${noisy(43, 60)}"/></g>
    ${voices}
    <path class="n-signal" pathLength="1" d="${clean}"/>`, extra);
}

/* ---------- IV. Teach: one node, then rings of nodes: the network grows outward ---------- */
export function teachArt(extra = '') {
  const r = mulberry(99);
  const rings = [[44, 5], [88, 9], [132, 14], [176, 20]];
  let lines = '', nodes = '';
  let prev = [{ x: 200, y: 200, a: 0 }];
  rings.forEach(([rad, n], k) => {
    const off = r() * Math.PI * 2;
    const cur = [];
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.18;
      const rr = rad + (r() - 0.5) * 12;
      const x = 200 + Math.cos(a) * rr, y = 200 + Math.sin(a) * rr;
      // parent = the closest node of the ring before
      let best = prev[0], bd = 1e9;
      for (const p of prev) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
      lines += `<path class="t-line" pathLength="1" d="M${f(best.x)} ${f(best.y)}L${f(x)} ${f(y)}" style="--k:${k}"/>`;
      nodes += `<circle class="t-node${r() > 0.78 ? ' hot' : ''}" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 2.8)}" style="--k:${k}"/>`;
      cur.push({ x, y });
    }
    prev = cur;
  });
  return svg('art-teach', `
    <g>${lines}</g><g>${nodes}</g>
    <circle class="t-halo" cx="200" cy="200" r="20"/>
    <circle class="t-core" cx="200" cy="200" r="10"/>`, extra);
}

/* ---------- V. Stand: rings that settle outward around a steady centre, a dial ticking round the edge ---------- */
export function standArt(extra = '') {
  let rings = '', ticks = '';
  for (let k = 0; k < 11; k++) {
    rings += `<circle class="s-ring" cx="200" cy="200" r="${18 + k * 14}" style="--k:${k};--o:${(1 - k * 0.075).toFixed(2)}"/>`;
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, long = i % 6 === 0, r1 = 176, r2 = long ? 192 : 184;
    ticks += `<path d="M${f(200 + Math.cos(a) * r1)} ${f(200 + Math.sin(a) * r1)}L${f(200 + Math.cos(a) * r2)} ${f(200 + Math.sin(a) * r2)}"${long ? ' class="long"' : ''}/>`;
  }
  return svg('art-stand', `
    <g class="s-dial">${ticks}</g>
    ${rings}
    <circle class="s-core" cx="200" cy="200" r="13"/>`, extra);
}

/* ---------- index tiles: finished states of the same drawings, plus the loss curve ---------- */
export const tileGuess = () => guessArt('style="--p:1"');
export const tileAttn = () => attnArt(8, 280, 'style="--p:1"');
export function tileCurve() {
  const pts = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([20 + t * 360, 40 + lossAt(t) * 150]); }
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ');
  const [bx, by] = pts[pts.length - 1];
  return `<svg class="art art-curve" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <path class="c-axis" d="M20 16V196H380"/><path class="c-line" d="${d}"/>
    <circle class="c-ball" cx="${f(bx)}" cy="${f(by)}" r="6"/></svg>`;
}

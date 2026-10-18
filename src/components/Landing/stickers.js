/**
 * Original die-cut "sticker" artwork themed around CS / AI engineering.
 * Every sticker is a self-contained inline SVG (120 x 120 box) with a cream die-cut outline.
 */

const INK = "#161b2e";

function star(cx, cy, ro, ri, n = 5, rot = -Math.PI / 2) {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = rot + (i * Math.PI) / n;
    d += (i ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(2) + " " + (cy + Math.sin(a) * r).toFixed(2) + " ";
  }
  return d + "Z";
}

/** wraps art in an svg with a die-cut outline filter (unique ids per instance) */
function wrap(id, art, outline = 4.2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
  <defs>
    <filter id="o${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${outline}" result="d"/>
      <feFlood flood-color="#fbf6ea"/>
      <feComposite in2="d" operator="in" result="edge"/>
      <feMerge><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="g${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fb1"/><stop offset="1" stop-color="#ff3d6e"/></linearGradient>
    <linearGradient id="g${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4ff"/><stop offset="1" stop-color="#4a6df0"/></linearGradient>
    <linearGradient id="g${id}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb02e"/></linearGradient>
  </defs>
  <g filter="url(#o${id})">${art}</g>
</svg>`;
}

const S = {
  /* friendly robot head */
  robot: (id) => wrap(id, `
    <rect x="26" y="34" width="68" height="58" rx="18" fill="url(#g${id}c)" stroke="${INK}" stroke-width="4.5"/>
    <path d="M60 34 V21" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="60" cy="16" r="6.5" fill="#ff4d79" stroke="${INK}" stroke-width="4"/>
    <rect x="17" y="53" width="9" height="20" rx="4.5" fill="#8fb4ff" stroke="${INK}" stroke-width="4"/>
    <rect x="94" y="53" width="9" height="20" rx="4.5" fill="#8fb4ff" stroke="${INK}" stroke-width="4"/>
    <rect x="38" y="50" width="16" height="20" rx="8" fill="${INK}"/><rect x="66" y="50" width="16" height="20" rx="8" fill="${INK}"/>
    <circle cx="44" cy="56" r="3.2" fill="#fff"/><circle cx="72" cy="56" r="3.2" fill="#fff"/>
    <path d="M44 78 Q60 90 76 78" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`),

  /* neural network badge */
  neural: (id) => wrap(id, `
    <circle cx="60" cy="60" r="46" fill="${INK}"/>
    <g stroke="#7f8fd0" stroke-width="1.6" opacity=".75">
      <path d="M34 42 L60 34 M34 42 L60 60 M34 42 L60 86 M34 78 L60 34 M34 78 L60 60 M34 78 L60 86 M34 60 L60 34 M34 60 L60 60 M34 60 L60 86"/>
      <path d="M60 34 L88 48 M60 34 L88 72 M60 60 L88 48 M60 60 L88 72 M60 86 L88 48 M60 86 L88 72"/>
    </g>
    <g stroke="${INK}" stroke-width="2.4">
      <circle cx="34" cy="42" r="7" fill="#5eead4"/><circle cx="34" cy="60" r="7" fill="#5eead4"/><circle cx="34" cy="78" r="7" fill="#5eead4"/>
      <circle cx="60" cy="34" r="7" fill="#ffd166"/><circle cx="60" cy="60" r="7" fill="#ffd166"/><circle cx="60" cy="86" r="7" fill="#ffd166"/>
      <circle cx="88" cy="48" r="7.5" fill="#ff7ab6"/><circle cx="88" cy="72" r="7.5" fill="#ff7ab6"/>
    </g>`),

  /* terminal prompt */
  terminal: (id) => wrap(id, `
    <rect x="12" y="24" width="96" height="72" rx="14" fill="#10162a" stroke="${INK}" stroke-width="4"/>
    <circle cx="27" cy="37" r="4" fill="#ff6b6b"/><circle cx="40" cy="37" r="4" fill="#ffd166"/><circle cx="53" cy="37" r="4" fill="#4ade80"/>
    <path d="M28 56 L44 68 L28 80" fill="none" stroke="#4ade80" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M54 82 H84" stroke="#4ade80" stroke-width="7.5" stroke-linecap="round"/>`),

  /* AI chip */
  chip: (id) => wrap(id, `
    <g stroke="${INK}" stroke-width="4.5" stroke-linecap="round">
      <path d="M42 20 V32 M60 20 V32 M78 20 V32 M42 88 V100 M60 88 V100 M78 88 V100 M20 42 H32 M20 60 H32 M20 78 H32 M88 42 H100 M88 60 H100 M88 78 H100" fill="none"/>
    </g>
    <rect x="30" y="30" width="60" height="60" rx="12" fill="url(#g${id}b)" stroke="${INK}" stroke-width="4.5"/>
    <rect x="42" y="42" width="36" height="36" rx="7" fill="#eef3ff" stroke="${INK}" stroke-width="3.5"/>
    <path d="M50 70 L55.5 50 L61 70 M52 64.5 H59" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 50 V70" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`),

  /* </> pill */
  code: (id) => wrap(id, `
    <rect x="10" y="33" width="100" height="54" rx="27" fill="#c9ff3f" stroke="${INK}" stroke-width="4.5"/>
    <g fill="none" stroke="${INK}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M42 47 L29 60 L42 73"/><path d="M78 47 L91 60 L78 73"/><path d="M65 45 L55 75"/>
    </g>`),

  /* loss curve card */
  loss: (id) => wrap(id, `
    <rect x="14" y="16" width="92" height="88" rx="14" fill="#ffffff" stroke="${INK}" stroke-width="4.5"/>
    <path d="M28 30 V88 H94" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M32 36 C44 38 46 74 60 78 S 84 80 92 79" fill="none" stroke="#ff5c7a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="74" cy="79.5" r="6" fill="#ffd166" stroke="${INK}" stroke-width="3.5"/>`),

  /* pixel heart */
  heart: (id) => {
    const rows = [
      "..XX...XX..", ".XXXX.XXXX.", "XXXXXXXXXXX", "XXXXXXXXXXX", ".XXXXXXXXX.", "..XXXXXXX..", "...XXXXX...", "....XXX....", ".....X.....",
    ];
    const cs = 8.6, ox = 60 - (11 * cs) / 2, oy = 60 - (9 * cs) / 2;
    let rects = "";
    rows.forEach((r, y) => [...r].forEach((c, x) => {
      if (c === "X") rects += `<rect x="${(ox + x * cs).toFixed(1)}" y="${(oy + y * cs).toFixed(1)}" width="${cs + 0.4}" height="${cs + 0.4}"/>`;
    }));
    return wrap(id, `
      <g fill="#ff4f7b" stroke="#ff4f7b" stroke-width="0.8" shape-rendering="crispEdges">${rects}</g>
      <rect x="${(ox + cs).toFixed(1)}" y="${(oy + 1.2 * cs).toFixed(1)}" width="${cs}" height="${cs}" fill="#fff" opacity=".85"/>
      <rect x="${(ox + 2 * cs).toFixed(1)}" y="${(oy + 2.2 * cs).toFixed(1)}" width="${cs * 0.6}" height="${cs * 0.6}" fill="#fff" opacity=".7"/>`);
  },

  /* happy star with eyes */
  starface: (id) => wrap(id, `
    <path d="${star(60, 62, 48, 25)}" fill="url(#g${id}c)" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <ellipse cx="49" cy="62" rx="3.4" ry="6.2" fill="${INK}" transform="rotate(-12 49 62)"/>
    <ellipse cx="71" cy="62" rx="3.4" ry="6.2" fill="${INK}" transform="rotate(12 71 62)"/>
    <path d="M52 76 Q60 82 68 76" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`),

  /* git branch */
  git: (id) => wrap(id, `
    <circle cx="60" cy="60" r="46" fill="#ff9a3d" stroke="${INK}" stroke-width="4.5"/>
    <path d="M44 34 V86 M44 70 C44 56 76 62 76 46" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="44" cy="34" r="8" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="44" cy="86" r="8" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="76" cy="44" r="8" fill="#c9ff3f" stroke="${INK}" stroke-width="4"/>`),

  /* tensor cube */
  tensor: (id) => wrap(id, `
    <g stroke="${INK}" stroke-width="4.5" stroke-linejoin="round">
      <path d="M60 14 L100 36 L60 58 L20 36 Z" fill="#9ff3e3"/>
      <path d="M20 36 L60 58 V104 L20 82 Z" fill="#4fd1c5"/>
      <path d="M100 36 L60 58 V104 L100 82 Z" fill="#2aa39b"/>
    </g>
    <g stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".8">
      <path d="M40 25 L80 47 M80 25 L40 47 M40 47 V93 M80 47 V93 M20 59 L60 81 M100 59 L60 81"/>
    </g>`),

  /* binary badge */
  binary: (id) => wrap(id, `
    <circle cx="60" cy="60" r="46" fill="#bfe3ff" stroke="${INK}" stroke-width="4.5"/>
    <g fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cx="42" cy="60" rx="9" ry="14"/><path d="M72 46 L80 41 V79"/>
    </g>
    <path d="M30 28 A40 40 0 0 1 64 20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>`),

  /* ai sparkle */
  sparkle: (id) => wrap(id, `
    <path d="M52 14 C56 44 66 54 98 58 C66 62 56 72 52 104 C48 72 38 62 6 58 C38 54 48 44 52 14 Z" transform="translate(8 2)" fill="url(#g${id}b)" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M96 12 C97.5 22 100 25 110 26 C100 27 97.5 30 96 40 C94.5 30 92 27 82 26 C92 25 94.5 22 96 12 Z" fill="#ffd166" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`),

  /* gpu fan */
  gpu: (id) => wrap(id, `
    <rect x="10" y="30" width="100" height="60" rx="12" fill="#2c3354" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="40" cy="60" r="19" fill="#10162a" stroke="${INK}" stroke-width="3.5"/>
    <circle cx="82" cy="60" r="19" fill="#10162a" stroke="${INK}" stroke-width="3.5"/>
    <g fill="#8fb4ff"><path d="M40 60 L40 43 A17 17 0 0 1 53 49 Z"/><path d="M40 60 L57 60 A17 17 0 0 1 51 73 Z"/><path d="M40 60 L40 77 A17 17 0 0 1 27 71 Z"/><path d="M40 60 L23 60 A17 17 0 0 1 29 47 Z"/></g>
    <g fill="#ff7ab6"><path d="M82 60 L82 43 A17 17 0 0 1 95 49 Z"/><path d="M82 60 L99 60 A17 17 0 0 1 93 73 Z"/><path d="M82 60 L82 77 A17 17 0 0 1 69 71 Z"/><path d="M82 60 L65 60 A17 17 0 0 1 71 47 Z"/></g>
    <circle cx="40" cy="60" r="4" fill="#fff"/><circle cx="82" cy="60" r="4" fill="#fff"/>`),
};

export const STICKER_ORDER = ["robot", "neural", "terminal", "chip", "heart", "starface", "code", "loss", "sparkle", "git", "tensor", "binary", "gpu"];
// relative sizes so the pile feels hand-placed
export const STICKER_SCALE = { robot: 1.05, neural: 1.0, terminal: 1.0, chip: 1.0, heart: 0.9, starface: 1.0, code: 1.0, loss: 0.95, sparkle: 0.95, git: 0.92, tensor: 0.95, binary: 0.9, gpu: 1.0 };

export function stickerSvg(name, uid) {
  return S[name](uid);
}

/** The big glossy 3-D pointer, rendered as layered SVG (side wall + face + glints). */
export function bigArrowSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="100%" height="100%" aria-hidden="true">
  <defs>
    <linearGradient id="arF" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#5d95f0"/><stop offset="0.55" stop-color="#3f78e0"/><stop offset="1" stop-color="#2f62c9"/></linearGradient>
    <linearGradient id="arS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa5f2"/><stop offset="1" stop-color="#3a66c8"/></linearGradient>
    <filter id="arB" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
  </defs>
  <!-- extruded side -->
  <path d="M30 22 L196 106 Q205 111 196 116 L134 140 L108 200 Q103 210 95 200 Z" transform="translate(7 12)" fill="url(#arS)" opacity=".95" stroke="#2c58b8" stroke-width="8" stroke-linejoin="round"/>
  <!-- face -->
  <path d="M30 22 L196 106 Q205 111 196 116 L134 140 L108 200 Q103 210 95 200 Z" fill="url(#arF)" stroke="#4a85ec" stroke-width="8" stroke-linejoin="round"/>
  <!-- bevel highlight -->
  <path d="M40 40 L168 104" fill="none" stroke="#bcd4ff" stroke-width="5" stroke-linecap="round" opacity=".7" filter="url(#arB)"/>
  <path d="M42 46 L98 192" fill="none" stroke="#8db3f6" stroke-width="4" stroke-linecap="round" opacity=".5" filter="url(#arB)"/>
</svg>`;
}

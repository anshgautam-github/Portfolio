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

/* ------------------------------------------------------------------ logo stickers
   Each sticker is a die-cut badge for a company / internship / program / community from the portfolio.
   They are brand-style marks drawn as inline SVG (swap any of them for the official artwork if you prefer). */
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

/** rounded tile that every logo sits on */
const tile = (fill, extra = "") => `<rect x="14" y="14" width="92" height="92" rx="24" fill="${fill}" stroke="${INK}" stroke-width="4.5"/>${extra}`;
/** text that is forced to a fixed width so the layout survives any fallback font */
const txt = (s, x, y, size, fill, w, weight = 800, family = FONT, extra = "") =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" textLength="${w}" lengthAdjust="spacingAndGlyphs" ${extra}>${s}</text>`;

const S = {
  /* Amazon ML Summer School */
  amazon: (id) => wrap(id, `
    ${tile("#ffffff")}
    ${txt("amazon", 60, 58, 24, "#232f3e", 62, 800, FONT, 'letter-spacing="-1"')}
    <path d="M30 68 Q60 86 88 67" fill="none" stroke="#ff9900" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M80 62 L90 66 L84 75" fill="none" stroke="#ff9900" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${txt("ML SUMMER SCHOOL", 60, 94, 7, "#232f3e", 62, 700)}`),

  /* IBM Z Student Ambassador */
  ibm: (id) => `${wrap(id, `
    ${tile("#ffffff")}
    <g mask="url(#m${id})">${txt("IBM", 60, 72, 40, "#1f70c1", 66, 900, "Arial Black, Arial, Helvetica, sans-serif")}</g>
    ${txt("Z STUDENT AMBASSADOR", 60, 92, 6.2, "#1f70c1", 66, 700)}`).replace("</defs>", `<mask id="m${id}"><rect width="120" height="120" fill="#fff"/><g stroke="#000" stroke-width="1.7">${[40, 44.6, 49.2, 53.8, 58.4, 63, 67.6, 72].map((y) => `<path d="M0 ${y} H120"/>`).join("")}</g></mask></defs>`)}`,

  /* Microsoft Learn Student Ambassador */
  microsoft: (id) => wrap(id, `
    ${tile("#ffffff")}
    <rect x="34" y="30" width="24" height="24" fill="#f25022"/><rect x="62" y="30" width="24" height="24" fill="#7fba00"/>
    <rect x="34" y="58" width="24" height="24" fill="#00a4ef"/><rect x="62" y="58" width="24" height="24" fill="#ffb900"/>
    ${txt("MS LEARN AMBASSADOR", 60, 95, 6.4, "#3b3b3b", 66, 700)}`),

  /* IEEE GRSS, Technical Head */
  ieee: (id) => wrap(id, `
    ${tile("#00629b")}
    <path d="M60 24 L74 40 L60 56 L46 40 Z" fill="#fff" opacity=".18"/>
    ${txt("IEEE", 60, 66, 31, "#ffffff", 62, 900)}
    <path d="M30 74 H90" stroke="#7fc4ee" stroke-width="2.4" stroke-linecap="round"/>
    ${txt("GRSS", 60, 91, 14, "#bfe4ff", 36, 800)}`),

  /* McKinsey Forward Program */
  mckinsey: (id) => wrap(id, `
    ${tile("#051c2c")}
    ${txt("McKinsey", 60, 58, 22, "#ffffff", 68, 700, SERIF)}
    ${txt("&amp; Company", 60, 73, 11, "#9fc2ff", 56, 400, SERIF, 'font-style="italic"')}
    <path d="M32 82 H88" stroke="#2251ff" stroke-width="3" stroke-linecap="round"/>
    ${txt("FORWARD", 60, 94, 7, "#cfe0ff", 40, 700)}`),

  /* Edge AI & Robotics Summer School, IISc (1 of 100) */
  iisc: (id) => wrap(id, `
    <circle cx="60" cy="60" r="47" fill="#7a1f2b" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="60" cy="60" r="38" fill="none" stroke="#f6dfb3" stroke-width="2.2"/>
    <circle cx="60" cy="60" r="35" fill="none" stroke="#f6dfb3" stroke-width="0.9" stroke-dasharray="1.6 2.6"/>
    ${txt("IISc", 60, 68, 30, "#fbe9c4", 50, 800, SERIF)}
    ${txt("BENGALURU", 60, 84, 6.6, "#f6dfb3", 40, 700)}
    <path d="M60 33 L62.4 38.6 L68.4 39 L63.8 42.8 L65.3 48.6 L60 45.4 L54.7 48.6 L56.2 42.8 L51.6 39 L57.6 38.6 Z" fill="#f6dfb3"/>`),

  /* Genospark, Full Stack AI Intern */
  genospark: (id) => wrap(id, `
    ${tile("#10162a")}
    <path d="M60 24 C62 40 66 44 82 46 C66 48 62 52 60 68 C58 52 54 48 38 46 C54 44 58 40 60 24 Z" fill="url(#g${id}c)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="84" cy="30" r="3.2" fill="#8fb4ff"/><circle cx="35" cy="62" r="2.4" fill="#ff7ab6"/>
    ${txt("Genospark", 60, 87, 15.5, "#ffffff", 68, 800)}
    ${txt("FULL STACK AI INTERN", 60, 97, 5.6, "#8fb4ff", 62, 700)}`),

  /* East Central Railway, IT Intern */
  ecr: (id) => wrap(id, `
    ${tile("#ffffff")}
    ${txt("ECR", 60, 52, 30, "#c8102e", 56, 900)}
    <path d="M44 60 L30 98 M76 60 L90 98" stroke="#1b3a8a" stroke-width="4" stroke-linecap="round"/>
    <g stroke="#1b3a8a" stroke-width="3.2" stroke-linecap="round"><path d="M42 66 H78 M38 76 H82 M34 87 H86"/></g>`),

  /* GirlScript Summer of Code, Contributor + Campus Ambassador */
  gssoc: (id) => wrap(id, `
    <rect x="14" y="14" width="92" height="92" rx="24" fill="url(#g${id}c)" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="60" cy="44" r="14" fill="#fff" stroke="${INK}" stroke-width="3.5"/>
    <path d="M54 44 L58.5 48.5 L67 39.5" fill="none" stroke="#ff7a00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${txt("GSSoC", 60, 78, 22, INK, 62, 900)}
    ${txt("GIRLSCRIPT", 60, 93, 8, INK, 52, 800)}`),

  /* Hacktoberfest contributor */
  hacktoberfest: (id) => wrap(id, `
    ${tile("#1a1033")}
    <path d="M60 24 Q64 17 70 20" fill="none" stroke="#7ddc6b" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="46" cy="49" rx="15" ry="17" fill="#ff8a00"/><ellipse cx="74" cy="49" rx="15" ry="17" fill="#ff8a00"/>
    <ellipse cx="60" cy="49" rx="14" ry="19" fill="#ffa72e" stroke="#1a1033" stroke-width="2"/>
    <path d="M51 46 L57 50 L51 54 M69 46 L63 50 L69 54" fill="none" stroke="#1a1033" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${txt("hacktoberfest", 60, 82, 13, "#ffffff", 70, 800)}
    ${txt("OPEN SOURCE", 60, 95, 6.4, "#c9a4ff", 50, 700)}`),

  /* SRM Institute of Science and Technology */
  srm: (id) => wrap(id, `
    ${tile("#0b4f9c")}
    ${txt("SRM", 60, 62, 34, "#ffffff", 66, 900)}
    <path d="M28 70 H92" stroke="#ff9d2e" stroke-width="4" stroke-linecap="round"/>
    ${txt("INSTITUTE OF SCIENCE", 60, 83, 6.2, "#cfe5ff", 64, 700)}
    ${txt("&amp; TECHNOLOGY", 60, 92, 6.2, "#cfe5ff", 50, 700)}`),

  /* SRM iOS Development Center, iOS App Developer (top 100 of 1000+) */
  ios: (id) => wrap(id, `
    <rect x="14" y="14" width="92" height="92" rx="24" fill="url(#g${id}b)" stroke="${INK}" stroke-width="4.5"/>
    <g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 38 L21 49 L32 60"/><path d="M88 38 L99 49 L88 60"/></g>
    ${txt("iOS", 60, 56, 26, "#ffffff", 40, 900)}
    ${txt("SRM DEV CENTER", 60, 80, 8, "#ffffff", 58, 800)}
    ${txt("TOP 100 / 1000+", 60, 93, 6.6, "#dbe7ff", 52, 700)}`),

  /* CineMyst, the iOS app */
  cinemyst: (id) => wrap(id, `
    <defs><linearGradient id="cm${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a1f43"/><stop offset=".5" stop-color="#8a4a72"/><stop offset="1" stop-color="#e0bfd4"/></linearGradient></defs>
    <circle cx="60" cy="60" r="47" fill="url(#cm${id})" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="60" cy="60" r="31" fill="#07050a"/>
    <path d="M72 46 A19 19 0 1 0 72 74" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`),

  /* OwnMove, the opportunities platform */
  ownmove: (id) => wrap(id, `
    <g fill="#fff" stroke="${INK}" stroke-width="3.6">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<circle cx="${(60 + Math.cos((a * Math.PI) / 180) * 30).toFixed(1)}" cy="${(60 + Math.sin((a * Math.PI) / 180) * 30).toFixed(1)}" r="14"/>`).join("")}</g>
    <circle cx="60" cy="60" r="25" fill="#d9c9ff" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="52" cy="55" r="3.2" fill="${INK}"/><circle cx="68" cy="55" r="3.2" fill="${INK}"/>
    <path d="M50 66 Q60 77 70 66" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`),
};

export const STICKER_ORDER = ["amazon", "ibm", "microsoft", "ieee", "mckinsey", "iisc", "genospark", "ecr", "gssoc", "hacktoberfest", "srm", "ios", "cinemyst", "ownmove"];
// relative sizes so the pile feels hand-placed
export const STICKER_SCALE = { amazon: 1.05, ibm: 1.0, microsoft: 1.0, ieee: 1.0, mckinsey: 1.0, iisc: 1.0, genospark: 1.0, ecr: 0.98, gssoc: 1.0, hacktoberfest: 1.0, srm: 1.0, ios: 1.0, cinemyst: 0.95, ownmove: 1.05 };

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

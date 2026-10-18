/*
  Living backdrop for the garden: golden-hour sky (or night), sun / moon, drifting clouds, a hot-air balloon, layered hills with a
  windmill and pines, flocks of birds, butterflies, bees, pollen and - at night - stars, fireflies and a shooting star.
  Everything is inline SVG + CSS (see garden.css). Pure presentation: no effects, no state. Theme comes from
  data-night on the section, so toggling it cross-fades everything.
*/

const mulberry = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rnd = mulberry(2026);
const r = (a, b) => a + rnd() * (b - a);
const f1 = (n) => n.toFixed(1);

/* ---------------- stars + fireflies + pollen (generated once) ---------------- */
const STARS = Array.from({ length: 90 }, () => ({ x: r(0, 1000), y: r(0, 560), r: r(0.7, 2.3), d: r(0, 6), t: r(2.4, 5.5) }));
const FIREFLIES = Array.from({ length: 18 }, () => ({ x: r(4, 96), y: r(52, 92), d: r(-14, 0), t: r(9, 18), b: r(2.2, 4.8), s: r(3, 6), ax: r(-6, 6), ay: r(-9, 9) }));
const POLLEN = Array.from({ length: 22 }, () => ({ x: r(0, 100), y: r(40, 100), s: r(2, 4.6), d: r(-30, 0), t: r(16, 34), dx: r(10, 26) }));

/* ---------------- hills ---------------- */
const wave = (fn) => {
  let d = "M-60 520 L-60 " + f1(fn(-60));
  for (let x = -40; x <= 2060; x += 20) d += " L" + x + " " + f1(fn(x));
  return d + " L2060 520 Z";
};
const yMid = (x) => 330 + 30 * Math.sin(x / 260 + 1) + 13 * Math.sin(x / 90);
const yNear = (x) => 392 + 24 * Math.sin(x / 340 + 3) + 10 * Math.sin(x / 120);
const MOUNTS =
  "M-60 520 L-60 300 L100 232 L200 272 L330 160 L450 252 L560 204 L690 292 L820 190 L960 266 L1100 176 L1240 252 L1350 212 L1500 286 L1640 186 L1780 256 L1900 216 L2060 262 L2060 520 Z";
const SNOW = "M330 160 L300 190 L322 184 L336 198 L352 186 L372 192 Z M1100 176 L1074 202 L1094 198 L1108 210 L1124 198 L1144 202 Z M1640 186 L1616 208 L1634 204 L1646 214 L1660 204 L1678 208 Z";
const MID = wave(yMid);
const NEAR = wave(yNear);

function Pine({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-6" width="6" height="14" className="gd-trunk" />
      <path d="M0 -62 L18 -30 L9 -30 L24 -6 L-24 -6 L-9 -30 L-18 -30 Z" className="gd-pine" />
    </g>
  );
}
function Windmill({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} className="gd-windmill">
      <path d="M-13 0 L-8 -58 L8 -58 L13 0 Z" className="gd-wm-body" />
      <path d="M-11 -58 L0 -72 L11 -58 Z" className="gd-wm-cap" />
      <rect x="-3.5" y="-22" width="7" height="22" rx="3" className="gd-wm-door" />
      <g transform="translate(0 -60)">
        <g className="gd-wm-blades">
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="16s" repeatCount="indefinite" />
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <rect x="-2" y="-52" width="4" height="52" className="gd-wm-arm" />
              <rect x="2" y="-50" width="15" height="26" className="gd-wm-sail" />
            </g>
          ))}
        </g>
        <circle r="4.5" className="gd-wm-cap" />
      </g>
    </g>
  );
}

/* ---------------- bird ---------------- */
const WING_UP = "M2 4 Q18 -7 32 16 Q46 -7 62 4 Q48 14 32 22 Q16 14 2 4 Z";
const WING_MID_UNUSED = "M2 12 Q18 2 32 17 Q46 2 62 12 Q48 16 32 22 Q16 16 2 12 Z";
const WING_DN_UNUSED = "M3 22 Q18 15 32 18 Q46 15 61 22 Q48 23 32 24 Q16 23 3 22 Z";
function Bird({ w, flap, begin }) {
  return (
    <svg className="gd-bird-svg" viewBox="0 0 64 28" width={w} height={(w * 28) / 64} aria-hidden="true" style={{ animationDuration: `${flap}s`, animationDelay: `${begin}s` }}>
      <path d={WING_UP} className="gd-bird-fill" />
    </svg>
  );
}
const V = (n, gap) => {
  const out = [[0, 0]];
  for (let i = 1; i <= n; i++) out.push([-i * gap, i * gap * 0.55], [-i * gap, -i * gap * 0.55]);
  return out;
};
const FLOCKS = [
  { top: "13%", t: 52, d: -14, dir: 1, w: 30, birds: V(3, 38) },
  { top: "27%", t: 70, d: -46, dir: -1, w: 22, birds: V(2, 30) },
  { top: "7%", t: 34, d: -6, dir: 1, w: 18, birds: [[0, 0]] },
  { top: "36%", t: 44, d: -28, dir: -1, w: 16, birds: [[0, 0], [-26, 10]] },
];
const BIRD_SEED = mulberry(77);

/* ---------------- critters ---------------- */
function Butterfly({ c1, c2 }) {
  return (
    <svg viewBox="0 0 44 36" className="gd-bf-svg" aria-hidden="true">
      <g className="gd-wings">
        <path d="M22 17 C30 2 44 4 42 15 C41 24 30 24 22 19 Z" fill={c1} />
        <path d="M22 19 C30 23 38 28 34 33 C29 37 24 28 22 21 Z" fill={c2} />
        <path d="M22 17 C14 2 0 4 2 15 C3 24 14 24 22 19 Z" fill={c1} />
        <path d="M22 19 C14 23 6 28 10 33 C15 37 20 28 22 21 Z" fill={c2} />
        <circle cx="33" cy="12" r="3" fill="#fff" opacity=".55" />
        <circle cx="11" cy="12" r="3" fill="#fff" opacity=".55" />
      </g>
      <rect x="21" y="12" width="2" height="16" rx="1" fill="#2b2230" />
    </svg>
  );
}
function Bee() {
  return (
    <svg viewBox="0 0 30 22" className="gd-bee-svg" aria-hidden="true">
      <ellipse className="gd-bee-wing" cx="12" cy="6" rx="6" ry="4" fill="#fff" opacity=".75" />
      <ellipse className="gd-bee-wing gd-bee-wing--b" cx="19" cy="6" rx="6" ry="4" fill="#fff" opacity=".75" />
      <ellipse cx="15" cy="13" rx="10" ry="6.5" fill="#f4c21f" />
      <path d="M11 7.5 V18.5 M16 6.8 V19.2 M21 7.5 V18.5" stroke="#1b1a17" strokeWidth="2.4" />
      <circle cx="25.5" cy="12.5" r="3.2" fill="#1b1a17" />
      <path d="M4.5 13 l-3 1" stroke="#1b1a17" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
const BFLIES = [
  { x: "18%", y: "58%", ax: 9, ay: 9, t: 26, d: -3, w: 34, c: ["#ff9a3c", "#ffd36e"] },
  { x: "46%", y: "66%", ax: 11, ay: 7, t: 32, d: -15, w: 28, c: ["#5aa6ff", "#bfe0ff"] },
  { x: "74%", y: "60%", ax: 8, ay: 10, t: 29, d: -8, w: 32, c: ["#ff7fb1", "#ffd1e3"] },
  { x: "88%", y: "70%", ax: 6, ay: 6, t: 36, d: -21, w: 24, c: ["#b58cff", "#e6d6ff"] },
];
const BEES = [
  { x: "30%", y: "74%", ax: 5, ay: 5, t: 9, d: -2 },
  { x: "66%", y: "72%", ax: 4, ay: 6, t: 11, d: -6 },
];

export function World() {
  return (
    <div className="gd-world" aria-hidden="true">
      <div className="gd-sky gd-sky--day" />
      <div className="gd-sky gd-sky--night" />
      <div className="gd-rays" />

      {/* stars (night) */}
      <svg className="gd-stars" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice">
        {STARS.map((s, i) => (
          <circle key={i} cx={f1(s.x)} cy={f1(s.y)} r={f1(s.r)} className={i % 6 === 0 ? "gd-star gd-tw" : "gd-star"} style={{ animationDelay: `${f1(s.d)}s`, animationDuration: `${f1(s.t)}s` }} />
        ))}
      </svg>
      <i className="gd-shoot" />

      {/* sun (day) / moon (night): whichever is down sinks below the hills */}
      <div className="gd-sun">
        <i className="gd-sun-glow" />
        <i className="gd-sun-rays" />
        <i className="gd-sun-core" />
      </div>
      <div className="gd-moon">
        <i className="gd-moon-glow" />
        <svg viewBox="0 0 100 100">
          <defs>
            <radialGradient id="gdMoon" cx="38%" cy="34%" r="75%">
              <stop offset="0" stopColor="#fffdf0" />
              <stop offset="1" stopColor="#e4dcc0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#gdMoon)" />
          <g fill="#cfc6a6" opacity=".55">
            <circle cx="34" cy="38" r="9" />
            <circle cx="62" cy="30" r="5" />
            <circle cx="64" cy="60" r="12" />
            <circle cx="40" cy="68" r="5.5" />
            <circle cx="76" cy="44" r="3.5" />
          </g>
        </svg>
      </div>

      {/* clouds */}
      <div className="gd-clouds">
        {[
          { top: "6%", w: 22, t: 220, d: -60, o: 0.95 },
          { top: "15%", w: 15, t: 170, d: -120, o: 0.8 },
          { top: "24%", w: 26, t: 260, d: -190, o: 0.9 },
          { top: "10%", w: 12, t: 140, d: -30, o: 0.7 },
          { top: "31%", w: 18, t: 200, d: -85, o: 0.75 },
        ].map((c, i) => (
          <svg key={i} viewBox="0 0 220 90" className="gd-cloud" style={{ top: c.top, width: `${c.w}vw`, "--t": `${c.t}s`, "--d": `${c.d}s`, opacity: c.o }}>
            <g>
              <ellipse cx="118" cy="68" rx="96" ry="17" fill="#8fa6c6" opacity=".28" />
              <g fill="#fff">
                <ellipse cx="62" cy="56" rx="48" ry="26" />
                <circle cx="98" cy="38" r="31" />
                <circle cx="140" cy="46" r="27" />
                <ellipse cx="116" cy="58" rx="76" ry="21" />
                <circle cx="172" cy="58" r="20" />
              </g>
              <ellipse cx="108" cy="30" rx="30" ry="12" fill="#fff" opacity=".9" />
            </g>
          </svg>
        ))}
      </div>

      {/* hot-air balloon */}
      <div className="gd-balloon">
        <svg viewBox="0 0 80 110">
          <defs>
            <linearGradient id="gdBal" x1="0" x2="1">
              <stop offset="0" stopColor="#ff6b57" />
              <stop offset="0.5" stopColor="#ffd36e" />
              <stop offset="1" stopColor="#4d7dff" />
            </linearGradient>
          </defs>
          <path d="M40 4 C70 4 76 36 62 58 C56 66 50 72 48 78 L32 78 C30 72 24 66 18 58 C4 36 10 4 40 4 Z" fill="url(#gdBal)" />
          <path d="M40 4 C28 20 26 52 32 78 M40 4 C52 20 54 52 48 78" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" />
          <path d="M32 78 L35 94 M48 78 L45 94" stroke="#5b4636" strokeWidth="1.4" />
          <rect x="33" y="94" width="14" height="10" rx="2" fill="#8a5a3a" />
        </svg>
      </div>

      {/* hills with windmill + pines (layered, drifting slightly with the pointer) */}
      <svg className="gd-hills gd-hills--far" viewBox="0 0 2000 520" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="gdMist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="gd-mist-a" stopOpacity="0" />
            <stop offset="0.85" className="gd-mist-a" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path d={MOUNTS} className="gd-mount" />
        <path d={SNOW} className="gd-snow" />
        <path d="M-60 210 L2060 210 L2060 520 L-60 520 Z" className="gd-mist" />
      </svg>
      <svg className="gd-hills gd-hills--mid" viewBox="0 0 2000 520" preserveAspectRatio="xMidYMax slice">
        <path d={MID} className="gd-hill-mid" />
        <Windmill x={560} y={yMid(560) + 6} />
        <Pine x={1340} y={yMid(1340) + 6} s={0.9} />
        <Pine x={1380} y={yMid(1380) + 6} s={1.15} />
        <Pine x={1422} y={yMid(1422) + 6} s={0.8} />
      </svg>
      <svg className="gd-hills gd-hills--near" viewBox="0 0 2000 520" preserveAspectRatio="xMidYMax slice">
        <path d={NEAR} className="gd-hill-near" />
        <Pine x={210} y={yNear(210) + 8} s={1.35} />
        <Pine x={262} y={yNear(262) + 8} s={1} />
        <Pine x={1830} y={yNear(1830) + 8} s={1.5} />
        <Pine x={1886} y={yNear(1886) + 8} s={1.1} />
      </svg>

      {/* birds */}
      <div className="gd-birds">
        {FLOCKS.map((f, i) => (
          <div key={i} className={`gd-flock${f.dir < 0 ? " gd-flock--r" : ""}`} style={{ top: f.top, "--t": `${f.t}s`, "--d": `${f.d}s` }}>
            {f.birds.map(([x, y], j) => (
              <span key={j} className="gd-b" style={{ left: `${x}px`, top: `${y}px`, animationDelay: `${(-BIRD_SEED() * 3).toFixed(2)}s` }}>
                <Bird w={f.w} flap={(0.62 + BIRD_SEED() * 0.25).toFixed(2)} begin={(-BIRD_SEED()).toFixed(2)} />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* drifting pollen (day) */}
      <div className="gd-pollen">
        {POLLEN.map((p, i) => (
          <i key={i} style={{ left: `${f1(p.x)}%`, top: `${f1(p.y)}%`, width: `${f1(p.s)}px`, height: `${f1(p.s)}px`, "--dx": `${f1(p.dx)}vw`, animationDelay: `${f1(p.d)}s`, animationDuration: `${f1(p.t)}s` }} />
        ))}
      </div>

      {/* fireflies (night) */}
      <div className="gd-fireflies">
        {FIREFLIES.map((p, i) => (
          <i
            key={i}
            style={{ left: `${f1(p.x)}%`, top: `${f1(p.y)}%`, width: `${f1(p.s)}px`, height: `${f1(p.s)}px`, "--ax": `${f1(p.ax)}vw`, "--ay": `${f1(p.ay)}vh`, "--b": `${f1(p.b)}s`, animationDelay: `${f1(p.d)}s, ${f1(p.d / 2)}s`, animationDuration: `${f1(p.t)}s, ${f1(p.b)}s` }}
          />
        ))}
      </div>

      <i className="gd-haze" />
      <i className="gd-grain" />
    </div>
  );
}

/* in front of the garden SVG: butterflies and bees working the flowers */
export function Critters() {
  return (
    <div className="gd-critters" aria-hidden="true">
      {BFLIES.map((b, i) => (
        <div key={i} className="gd-wander gd-wander--bf" style={{ left: b.x, top: b.y, width: `${b.w}px`, "--ax": b.ax, "--ay": b.ay, "--t": `${b.t}s`, "--d": `${b.d}s` }}>
          <Butterfly c1={b.c[0]} c2={b.c[1]} />
        </div>
      ))}
      {BEES.map((b, i) => (
        <div key={i} className="gd-wander gd-wander--bee" style={{ left: b.x, top: b.y, "--ax": b.ax, "--ay": b.ay, "--t": `${b.t}s`, "--d": `${b.d}s` }}>
          <Bee />
        </div>
      ))}
    </div>
  );
}

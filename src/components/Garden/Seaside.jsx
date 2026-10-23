/* Seaside backdrop for the garden: a calm bay with a striped lighthouse on a headland, sailboats, a far island village,
   moving waves and a glittering sun/moon path. Day = golden hour, night = moonlit with a sweeping lighthouse beam.
   Pure inline SVG + CSS (seaside.css); theme comes from .gd[data-night]. */

const wavePath = (amp, period, w = 4400, y = 0) => {
  let d = `M0 ${y}`;
  for (let x = 0; x < w; x += period) d += ` q ${period / 4} ${-amp} ${period / 2} 0 t ${period / 2} 0`;
  return d;
};
const LINES = [
  { y: 20, amp: 3, per: 120, o: 0.5, t: 60, k: "a" },
  { y: 46, amp: 4, per: 160, o: 0.55, t: 46, k: "b" },
  { y: 78, amp: 5, per: 220, o: 0.6, t: 38, k: "a" },
  { y: 118, amp: 7, per: 300, o: 0.7, t: 30, k: "b" },
  { y: 168, amp: 9, per: 400, o: 0.8, t: 24, k: "a" },
  { y: 224, amp: 12, per: 520, o: 0.9, t: 20, k: "b" },
];
const GLINTS = Array.from({ length: 16 }, (_, i) => ({ y: 4 + i * 6, w: 14 + i * 3.2, d: (i * 0.37) % 3, t: 2.2 + (i % 5) * 0.5 }));

function Boat({ x, y, s = 1, sail = "#fff6e6", hull = "#7a3b2e", d = 0, t = 90, bob = 4 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="ss-drift" style={{ "--t": `${t}s`, "--d": `${d}s` }}>
        <g className="ss-bob" style={{ "--b": `${bob}s` }}>
          <path d="M-22 0 L26 0 L18 11 L-14 11 Z" fill={hull} />
          <rect x="-1" y="-58" width="2.6" height="58" className="ss-mast" />
          <path d="M3 -56 C26 -38 28 -16 26 -4 L3 -4 Z" fill={sail} className="ss-sail" />
          <path d="M-3 -50 C-16 -34 -18 -16 -20 -4 L-3 -4 Z" fill={sail} className="ss-sail ss-sail--b" />
          <path d="M1.5 -58 L12 -61 L1.5 -64 Z" fill="#ff6b57" />
        </g>
        <ellipse cx="2" cy="16" rx="26" ry="3.2" className="ss-reflect" />
      </g>
    </g>
  );
}

export function Seaside() {
  return (
    <>
      {/* water + everything standing in it */}
      <svg className="ss-scene" viewBox="0 0 2000 620" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="ssSeaD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe3b8" /><stop offset="0.22" stopColor="#f6c9a0" />
            <stop offset="0.6" stopColor="#6db3c9" /><stop offset="1" stopColor="#2f7f9e" />
          </linearGradient>
          <linearGradient id="ssSeaN" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4a86" /><stop offset="0.25" stopColor="#2c3a78" />
            <stop offset="0.65" stopColor="#14214d" /><stop offset="1" stopColor="#0a1230" />
          </linearGradient>
          <linearGradient id="ssBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6c8" stopOpacity="0.9" /><stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ssCliff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="ss-cl-a" /><stop offset="1" className="ss-cl-b" />
          </linearGradient>
          <clipPath id="ssWater"><rect x="0" y="250" width="2000" height="370" /></clipPath>
        </defs>

        {/* sea */}
        <rect x="0" y="250" width="2000" height="370" fill="url(#ssSeaD)" className="ss-sea-d" />
        <rect x="0" y="250" width="2000" height="370" fill="url(#ssSeaN)" className="ss-sea-n" />
        {/* horizon glow line */}
        <rect x="0" y="248" width="2000" height="5" className="ss-horizon" />

        {/* far island village on the right */}
        <g className="ss-island" transform="translate(1320 252)">
          <path d="M0 0 C40 -26 96 -40 160 -34 C230 -28 300 -30 360 0 Z" className="ss-isle" />
          {[[60, -30, 16, 18], [92, -36, 18, 22], [126, -34, 14, 18], [160, -36, 20, 22], [200, -32, 16, 18], [236, -28, 14, 14]].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} className="ss-house" />
              <path d={`M${x - 2} ${y} L${x + w / 2} ${y - 9} L${x + w + 2} ${y} Z`} className="ss-roof" />
              <rect x={x + w / 2 - 2} y={y + 5} width="4" height="5" className="ss-win" style={{ animationDelay: `${(i * 0.7).toFixed(1)}s` }} />
            </g>
          ))}
        </g>

        {/* distant sailboats on the horizon */}
        <Boat x={1040} y={262} s={0.5} d={-10} t={140} bob={5} />
        <Boat x={640} y={268} s={0.42} sail="#ffe9d0" hull="#5a3a4a" d={-60} t={170} bob={6} />

        {/* waves */}
        <g clipPath="url(#ssWater)">
          {LINES.map((l, i) => (
            <path key={i} d={wavePath(l.amp, l.per, 4400, 250 + l.y)} className={`ss-wave ss-wave--${l.k}`} style={{ "--t": `${l.t}s`, opacity: l.o, "--per": `${l.per}px`, strokeWidth: 1.2 + i * 0.35 }} />
          ))}
        </g>

        {/* headland + lighthouse (left) */}
        <g className="ss-land" transform="translate(0 0)">
          <path d="M-40 620 L-40 360 C60 340 130 320 220 316 C300 312 360 330 430 380 C490 420 540 470 620 520 C700 570 780 600 860 620 Z" fill="url(#ssCliff)" />
          <path d="M-40 420 C70 400 150 392 250 396 C330 400 400 424 470 470" className="ss-cliff-hi" fill="none" />
          {/* grass top */}
          <path d="M-40 362 C60 342 130 322 220 318 C300 314 360 332 430 382 L430 392 C350 346 300 332 220 336 C130 340 60 358 -40 380 Z" className="ss-grass" />
          {/* lighthouse */}
          <g transform="translate(236 316)">
            <path d="M-26 0 L-17 -150 L17 -150 L26 0 Z" className="ss-lh-body" />
            <path d="M-23 -34 L-21 -62 L21 -62 L23 -34 Z M-19 -92 L-17.6 -120 L17.6 -120 L19 -92 Z" className="ss-lh-band" />
            <rect x="-24" y="-158" width="48" height="9" rx="2" className="ss-lh-deck" />
            <rect x="-14" y="-190" width="28" height="32" rx="3" className="ss-lh-lamp" />
            <rect x="-14" y="-190" width="28" height="32" rx="3" className="ss-lh-lampglow" />
            <path d="M-20 -190 L0 -216 L20 -190 Z" className="ss-lh-roof" />
            <circle cx="0" cy="-219" r="3" className="ss-lh-roof" />
            <rect x="-5" y="-14" width="10" height="14" rx="5" className="ss-lh-door" />
            {/* beams */}
            <g className="ss-beams" transform="translate(0 -174)">
              <path d="M0 -6 L900 -60 L900 60 Z" fill="url(#ssBeam)" className="ss-beam ss-beam--r" />
              <path d="M0 -6 L-900 -60 L-900 60 Z" fill="url(#ssBeam)" className="ss-beam ss-beam--l" />
            </g>
          </g>
          {/* little rocks + foam */}
          <g className="ss-foam">
            <ellipse cx="800" cy="606" rx="70" ry="6" /><ellipse cx="640" cy="560" rx="50" ry="4.5" /><ellipse cx="500" cy="480" rx="38" ry="3.6" />
          </g>
        </g>
      </svg>

      {/* sun / moon glitter path on the water */}
      <div className="ss-glit ss-glit--sun" aria-hidden="true">
        {GLINTS.map((g, i) => (<i key={i} style={{ top: `${g.y}%`, width: `${g.w}%`, animationDelay: `${g.d}s`, animationDuration: `${g.t}s` }} />))}
      </div>
      <div className="ss-glit ss-glit--moon" aria-hidden="true">
        {GLINTS.map((g, i) => (<i key={i} style={{ top: `${g.y}%`, width: `${g.w}%`, animationDelay: `${g.d}s`, animationDuration: `${g.t}s` }} />))}
      </div>
    </>
  );
}

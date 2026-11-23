import { useEffect, useId, useMemo, useRef } from "react";
import initHorizon from "./horizon.js";
import "./horizon.css";

/* After "Look closer": an endless wavy ribbon, an orange "what I do" scene, a curve into lime, then a pinned horizontal scroll through three giant words.
   All copy is in COPY / PANELS below. The art (discs, cards, tape strips) is drawn here in svg, nothing is an image. */

const COPY = {
  ribbon: "WHEN MODELS GET MESSY, I MAKE THEM HOLD  •  ",
  eyebrow: "meet the one who ships",
  headA: "THE",
  headB: "BUILDER",
  blurb: "Always ready for the messy part: data, evals, deploys. Calm under load. No drama.",
  chips: ["MODELS", "PIPELINES", "AGENTS"],
  explore: "EXPLORE",
  whyEyebrow: "why I build",
  why: ["I'M HERE FOR THE", "REAL-WORLD PROBLEMS."],
  rollNote: "scroll it",
};

const PANELS = [
  { n: 1, word: "TO TRAIN", note: ["models that learn", "what actually matters."], disc: { c: "#8f7bff", c2: "#c3b8ff", t: "LLMs", s: "FROM SCRATCH", ring: "TRAINED ON REAL DATA • TESTED ON REAL USERS •" }, cards: [{ art: "net", x: 60, y: 4, w: 36, r: 7 }], discAt: { x: 6, y: 56 }, noteAt: { x: 40, y: 70 } },
  { n: 2, word: "TO SHIP", note: ["from notebook", "to production."], disc: { c: "#ff8f9e", c2: "#ffc9d0", t: "MLOps", s: "SHIPS SAFELY", ring: "BUILT TO SCALE • BUILT TO RECOVER •" }, cards: [{ art: "code", x: 44, y: 2, w: 34, r: 9 }, { art: "chart", x: 14, y: 40, w: 30, r: -8 }], discAt: { x: 62, y: 58 }, noteAt: { x: 30, y: 8 } },
  { n: 3, word: "TO LAST", note: ["monitored, tested,", "boring in the best way."], disc: { c: "#101211", c2: "#3a3f3c", t: "AGENTS", s: "WITH GUARDRAILS", ring: "OBSERVED • EVALUATED • IMPROVED •" }, cards: [{ art: "chart", x: 62, y: 8, w: 36, r: 6 }], discAt: { x: 8, y: 54 }, noteAt: { x: 40, y: 72 } },
];

const RIBBON = (() => {
  const pts = [];
  for (let x = -300; x <= 1900; x += 50) pts.push([x, 205 - 92 * Math.sin(((x - 500) / 1250) * Math.PI * 2)]);
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
})();

function Disc({ c, c2, t, s, ring, dir = 1 }) {
  const id = "hz" + useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 300 300" className="hz-disc-svg" aria-hidden="true" focusable="false">
      <defs><path id={id} d="M150 150 m-116 0 a116 116 0 1 1 232 0 a116 116 0 1 1 -232 0" /></defs>
      <circle cx="150" cy="150" r="146" fill={c} />
      <circle cx="150" cy="150" r="104" fill={c2} />
      <g data-hz-ring data-dir={dir}>
        <text className="hz-ringtext"><textPath href={"#" + id} startOffset="0">{ring.repeat(2)}</textPath></text>
      </g>
      <text x="150" y="152" textAnchor="middle" className="hz-disc-t" fill={c === "#101211" ? "#eef3ff" : "#101211"}>{t}</text>
      <text x="150" y="184" textAnchor="middle" className="hz-disc-s" fill={c === "#101211" ? "#eef3ff" : "#101211"}>{s}</text>
    </svg>
  );
}

function Art({ kind }) {
  if (kind === "net") {
    const cols = [[70, 130, 190, 250], [50, 105, 160, 215, 270], [70, 130, 190, 250], [110, 190]];
    const xs = [48, 118, 188, 258];
    return (
      <svg viewBox="0 0 300 300" aria-hidden="true" focusable="false">
        <rect width="300" height="300" fill="#2a3ea8" />
        <g stroke="rgba(255,250,240,.35)" strokeWidth="1.6">
          {cols.slice(0, -1).flatMap((col, ci) => col.flatMap((y1, i) => cols[ci + 1].map((y2, j) => <line key={`${ci}-${i}-${j}`} x1={xs[ci]} y1={y1} x2={xs[ci + 1]} y2={y2} />)))}
        </g>
        {cols.flatMap((col, ci) => col.map((y, i) => <circle key={`n${ci}-${i}`} cx={xs[ci]} cy={y} r={ci === 3 ? 13 : 9} fill={ci === 3 ? "#4ee39a" : "#eef3ff"} stroke="#101211" strokeWidth="3" />))}
        <path d="M0 300 L0 262 L40 282 L78 258 L118 284 L160 256 L204 284 L246 260 L300 280 L300 300 Z" fill="#ff8f9e" />
      </svg>
    );
  }
  if (kind === "code") {
    const rows = [[18, 70, "#4ee39a"], [34, 120, "#eef3ff"], [34, 90, "#c3b8ff"], [18, 140, "#eef3ff"], [34, 60, "#ff8f9e"], [34, 110, "#eef3ff"], [18, 80, "#5b8cff"]];
    return (
      <svg viewBox="0 0 300 300" aria-hidden="true" focusable="false">
        <rect width="300" height="300" fill="#0b1022" />
        <rect y="0" width="300" height="38" fill="#161d3a" />
        {[0, 1, 2].map((i) => <circle key={i} cx={24 + i * 20} cy="19" r="6" fill={["#ff8f9e", "#4ee39a", "#4ee39a"][i]} />)}
        {rows.map(([x, w, c], i) => <rect key={i} x={30 + x} y={62 + i * 28} width={w} height="12" rx="6" fill={c} />)}
        <rect x="48" y="262" width="14" height="22" rx="3" fill="#4ee39a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true" focusable="false">
      <rect width="300" height="300" fill="#7ea2ff" />
      <g stroke="rgba(16,18,17,.28)" strokeWidth="2">{[70, 120, 170, 220].map((y) => <line key={y} x1="30" x2="276" y1={y} y2={y} />)}</g>
      <path d="M30 70 C70 80 80 150 120 170 C160 190 190 205 276 214" fill="none" stroke="#eef3ff" strokeWidth="9" strokeLinecap="round" />
      {[[30, 70], [120, 170], [276, 214]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="11" fill="#4ee39a" stroke="#101211" strokeWidth="4" />)}
      <path d="M30 252 H276" stroke="#101211" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export default function Horizon() {
  const root = useRef(null);
  const unit = useMemo(() => COPY.ribbon, []);
  useEffect(() => initHorizon(root.current), []);

  return (
    <section ref={root} className="hz" id="horizon" aria-label="What I do">
      {/* ribbon */}
      <div className="hz-top" data-hz-top>
        <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <defs><path id="hz-rc" d={RIBBON} /></defs>
          <path className="hz-orange" d={RIBBON + " L1900 440 L-300 440 Z"} />
          <path className="hz-band" d={RIBBON} />
          <text className="hz-rtext"><textPath href="#hz-rc" data-hz-tp startOffset="0"><tspan dy=".35em" data-hz-ts data-unit={unit}>{unit.repeat(8)}</tspan></textPath></text>
        </svg>
      </div>

      {/* orange scene */}
      <div className="hz-intro" data-hz-intro>
        <h2 className="hz-head" aria-label={COPY.headA + " " + COPY.headB}>
          <span className="hz-head-l" aria-hidden="true"><span data-hz-word>{COPY.headA}</span></span>
          <span className="hz-head-l" aria-hidden="true"><span data-hz-word>{COPY.headB}</span></span>
        </h2>
        <div className="hz-chips">{COPY.chips.map((c) => <span className="hz-chip" data-hz-rise key={c}><i />{c}</span>)}</div>
        <p className="hz-blurb" data-hz-rise>{COPY.blurb}</p>
        <div className="hz-hero-disc" data-hz-heroDisc><Disc c="#4ee39a" c2="#b8f5d6" t="AI" s="ENGINEER" ring={"BUILT TO HOLD • BUILT TO SHIP • "} /></div>
        <div className="hz-card hz-card-l" data-hz-card data-k="-0.12"><span className="hz-tape" /><Art kind="net" /></div>
        <div className="hz-card hz-card-r" data-hz-card data-k="0.1"><span className="hz-tape" /><Art kind="code" /></div>
        <button type="button" className="hz-explore" data-hz-explore aria-label="Scroll to the horizontal section">
          <svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="92" fill="#eef3ff" /><circle cx="100" cy="100" r="82" fill="none" stroke="#050505" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" /></svg>
          <span>{COPY.explore}</span><b aria-hidden="true">&#8599;</b>
        </button>
      </div>

      <div className="hz-curve" aria-hidden="true" />

      {/* heading on lime */}
      <div className="hz-why">
        <h2 className="hz-whyh" aria-label={COPY.why.join(" ")}>
          {COPY.why.map((l) => <span className="hz-head-l" key={l} aria-hidden="true"><span data-hz-why>{l}</span></span>)}
        </h2>
      </div>

      {/* pinned horizontal scroll */}
      <div className="hz-wrap" data-hz-wrap>
        <div className="hz-stage" data-hz-stage>
          <div className="hz-track" data-hz-track>
            {PANELS.map((p) => (
              <div className="hz-panel" data-hz-panel key={p.n}>
                <span className="hz-num" aria-hidden="true"><svg viewBox="0 0 80 80"><ellipse cx="38" cy="42" rx="30" ry="32" /><path d="M64 14 C74 26 72 54 62 68" /><text x="38" y="52" textAnchor="middle">{p.n}</text></svg></span>
                <h3 className="hz-word" aria-label={p.word}><span aria-hidden="true">{p.word}</span></h3>
                {p.cards.map((c, i) => (
                  <div className="hz-card hz-pcard" data-hz-card data-k={i ? 0.14 : -0.1} key={i} style={{ left: c.x + "%", top: c.y + "%", "--w": c.w, "--r": c.r + "deg" }}>
                    <span className="hz-tape hz-tape-d" /><Art kind={c.art} />
                  </div>
                ))}
                <div className="hz-pdisc" data-hz-card data-k="0.06" style={{ left: p.discAt.x + "%", top: p.discAt.y + "%" }}><Disc {...p.disc} dir={p.n % 2 ? 1 : -1} /></div>
                <p className="hz-note" data-hz-note style={{ left: p.noteAt.x + "%", top: p.noteAt.y + "%" }}>
                  <svg viewBox="0 0 160 60" aria-hidden="true"><path d="M2 18 Q60 8 150 2" /><path d="M18 2 Q16 30 22 58" /></svg>
                  <span>{p.note[0]}<br />{p.note[1]}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="hz-prog" aria-hidden="true"><span data-hz-count>01</span><i><b data-hz-bar /></i><span>0{PANELS.length}</span><em>{COPY.rollNote}</em></div>
        </div>
      </div>

      <div className="hz-out" aria-hidden="true" />
    </section>
  );
}

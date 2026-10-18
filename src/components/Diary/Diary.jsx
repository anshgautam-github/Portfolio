import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import * as snd from "./sound.js";
import "./diary.css";

gsap.registerPlugin(ScrollTrigger);

/*
  <Diary /> - a scrapbook diary you open and flip through. All copy lives in content.js -> diary
  (experience / certifications / education come from the same data as the rest of the site).

  Book = cover + 3 sheets (6 pages) + back cover. State k = how many leaves are flipped:
    k0 closed | k1 inside cover + Contents | k2 Experience + Certifications | k3 Education + Project | k4 Closing note + back cover
  Input: click the cover, click a page, drag a page, arrow keys, the ← → buttons, or the Contents list (multi-page jump).
  Sound is synthesised (see sound.js); the speaker button mutes it.
*/

const LEAVES = 4; // cover + 3 sheets
const LAST = LEAVES; // k when the back cover is showing
const SIG =
  "M10 74 L28 14 L46 74 M18 52 L40 50 M56 74 L58 40 C60 32 74 32 76 42 L76 74 M96 36 C84 33 83 47 95 51 C108 55 101 73 85 68 M116 12 L113 74 M113 50 C118 38 134 37 133 50 L131 74 M8 88 C52 94 112 86 142 78";

/* ───────────────────────── small pieces ───────────────────────── */

function Sig({ svgRef, pathRef, className = "", dark = false }) {
  return (
    <svg ref={svgRef} className={`dr-sig ${className}`} viewBox="0 0 150 96" fill="none" aria-hidden="true">
      <path ref={pathRef} d={SIG} stroke={dark ? "#1d1d1d" : "#f4efe2"} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Scribble({ className = "" }) {
  return (
    <svg className={`dr-underline ${className}`} viewBox="0 0 220 14" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path data-draw d="M3 9 C40 2 80 12 118 6 S190 3 217 8" pathLength="1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PenSvg() {
  return (
    <svg viewBox="0 0 60 520" aria-hidden="true">
      <defs>
        <linearGradient id="drp-body" x1="0" x2="1">
          <stop offset="0" stopColor="#0e1220" />
          <stop offset="0.35" stopColor="#38426a" />
          <stop offset="0.6" stopColor="#1d2442" />
          <stop offset="1" stopColor="#0a0d18" />
        </linearGradient>
        <linearGradient id="drp-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#7d7f86" />
          <stop offset="0.3" stopColor="#f3f4f7" />
          <stop offset="0.55" stopColor="#a4a7b0" />
          <stop offset="1" stopColor="#5d5f67" />
        </linearGradient>
        <linearGradient id="drp-nib" x1="0" x2="1">
          <stop offset="0" stopColor="#9a9a9e" />
          <stop offset="0.45" stopColor="#f6f6f6" />
          <stop offset="1" stopColor="#7c7c82" />
        </linearGradient>
      </defs>
      <path d="M14 8 Q14 0 30 0 Q46 0 46 8 L47 250 Q47 300 41 340 L39 392 L21 392 L19 340 Q13 300 13 250 Z" fill="url(#drp-body)" />
      <rect x="22" y="14" width="4" height="250" rx="2" fill="#fff" opacity="0.16" />
      <rect x="12" y="266" width="36" height="9" rx="3" fill="url(#drp-metal)" />
      <rect x="13" y="281" width="34" height="6" rx="3" fill="url(#drp-metal)" />
      <rect x="17" y="344" width="26" height="5" rx="2.5" fill="url(#drp-metal)" />
      <path d="M21 392 L39 392 L37 447 L23 447 Z" fill="url(#drp-metal)" />
      <path d="M22 402 H38 M22.4 412 H37.6 M22.8 422 H37.2 M23.2 432 H36.8" stroke="#000" strokeOpacity="0.25" strokeWidth="1" />
      <path d="M23 447 L37 447 L36 471 Q33 500 30 520 Q27 500 24 471 Z" fill="url(#drp-nib)" />
      <path d="M30 474 V516" stroke="#2a2a2e" strokeWidth="1.2" />
      <circle cx="30" cy="472" r="2.6" fill="#2a2a2e" />
    </svg>
  );
}

const Arrow = ({ dir = "right" }) => (
  <svg className={`dr-arrow dr-arrow--${dir}`} viewBox="0 0 28 60" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 56 V6 M4 16 14 5 24 16" />
  </svg>
);

/* ───────────────────────── the cover (internship stickers) ───────────────────────── */

function Cover({ d }) {
  return (
    <div className="dr-cv" aria-hidden="true">
      <div className="dr-cv-leather" />
      {/* torn scraps + halftone paper */}
      <i className="dr-sc dr-dots" style={{ left: "5em", top: "17em", width: "9em", height: "11em", background: "#16a58c", rotate: "-6deg", clipPath: "polygon(8% 0,100% 10%,92% 100%,0 90%)" }} />
      <i className="dr-sc" style={{ left: "10em", top: "21em", width: "6em", height: "8em", background: "#6b3fa8", rotate: "10deg", clipPath: "polygon(0 0,100% 14%,86% 100%,10% 88%)" }} />
      <i className="dr-sc dr-dots" style={{ left: "16.5em", top: "13em", width: "8em", height: "6em", background: "#e8c43d", rotate: "6deg", clipPath: "polygon(0 14%,92% 0,100% 90%,8% 100%)" }} />
      <i className="dr-sc" style={{ left: "3em", top: "30em", width: "9em", height: "4em", background: "#d9d2c0", rotate: "-3deg", clipPath: "polygon(0 8%,100% 0,96% 100%,3% 92%)" }} />

      {/* vertical navy label (left) */}
      <div className="dr-lbl dr-lbl--navy" style={{ left: "3.4em", top: "4.2em", width: "3.8em", height: "10.8em" }}>
        <span>INTERN LOG</span>
      </div>

      {/* barcode ticket */}
      <div className="dr-ticket" style={{ left: "7.6em", top: "3.2em" }}>
        <b>PROPERTY OF</b>
        <em>{d.name.toUpperCase()}</em>
        <span className="dr-bars" />
      </div>

      {/* burst */}
      <i className="dr-sc" style={{ left: "8em", top: "9.2em", width: "6.4em", height: "6.4em", background: "#e2362b", clipPath: "polygon(50% 0,60% 30%,95% 20%,72% 48%,100% 64%,66% 70%,70% 100%,50% 78%,28% 100%,34% 70%,0 64%,28% 48%,5% 20%,40% 30%)" }} />

      {/* HELLO my name is */}
      <div className="dr-nametag" style={{ left: "13.2em", top: "6em" }}>
        <div className="dr-nametag-top">
          <b>HELLO</b>
          <small>my name is</small>
        </div>
        <div className="dr-nametag-body">
          <span>{d.name}</span>
        </div>
        <i className="dr-washi" style={{ left: "-1em", top: "-0.5em", rotate: "-32deg" }} />
      </div>

      {/* briefcase sticker */}
      <div className="dr-round dr-globe" style={{ left: "13.6em", top: "13.6em", width: "6em", height: "6em" }}>
        <svg viewBox="0 0 60 60" fill="none" stroke="#1d3d9a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="20" width="42" height="28" rx="4" fill="#dfe8ff" />
          <path d="M22 20v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5" />
          <path d="M9 33h42" />
          <rect x="26" y="30" width="8" height="7" rx="1.5" fill="#f2c230" />
        </svg>
      </div>

      {/* INTERN badge */}
      <div className="dr-round dr-badge" style={{ left: "20.2em", top: "15em", width: "4.9em", height: "4.9em" }}>
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="23" fill="#ffd21f" stroke="#111" strokeWidth="2.5" />
          <circle cx="25" cy="25" r="18.5" fill="none" stroke="#111" strokeWidth="1" strokeDasharray="2 2.5" />
          <text x="25" y="15.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#111">{"\u2605 \u2605 \u2605"}</text>
          <text x="25" y="27.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#111" letterSpacing="0.2">INTERN</text>
          <text x="25" y="37.5" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#111" letterSpacing="0.4">{"\u201925\u2013\u201926"}</text>
        </svg>
      </div>

      {/* CLICK TO OPEN tape */}
      <div className="dr-tape-open" style={{ left: "6.8em", top: "21.4em" }}>
        <span>Click to open</span>
      </div>

      {/* scribble */}
      <div className="dr-merged" style={{ left: "8.2em", top: "24.4em" }}>
        <b>{"\u2713"}</b> PR MERGED
      </div>

      {/* ledger written on the torn beige scrap: every place worked at */}
      <div className="dr-ledger" style={{ left: "3.5em", top: "30.2em" }}>
        {(d.experience || []).slice(0, 3).map((e) => (
          <span key={e.company}>{e.company}</span>
        ))}
      </div>

      {/* green </> starburst */}
      <div className="dr-sticker-burst" style={{ left: "4.4em", top: "27.2em" }}>
        <span>{"</>"}</span>
      </div>

      {/* pink 404 */}
      <div className="dr-pink" style={{ left: "11.4em", top: "28.4em" }}>
        <b>{String((d.experience || []).length).padStart(2, "0")}</b>
        <small>roles logged</small>
      </div>

      {/* completion seal */}
      <svg className="dr-seal" style={{ left: "15.2em", top: "24.4em" }} viewBox="0 0 100 100">
        <defs>
          <path id="dr-seal-ring" d="M50 50 m-35 0 a35 35 0 1 1 70 0 a35 35 0 1 1 -70 0" />
        </defs>
        <circle cx="50" cy="50" r="47" fill="#f6f3ea" stroke="#c4372d" strokeWidth="3" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="#c4372d" strokeWidth="1.6" />
        <text fontSize="8.4" fontWeight="800" fill="#c4372d">
          <textPath href="#dr-seal-ring" startOffset="0" textLength="216" lengthAdjust="spacing">{"INTERNSHIP \u2022 EXPERIENCE \u2022 ARCHIVE \u2022 "}</textPath>
        </text>
        <path d="M37 51 l9 9 l18 -21" fill="none" stroke="#1f9d55" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* vertical navy label (right) */}
      <div className="dr-lbl dr-lbl--navy dr-lbl--b" style={{ left: "21em", top: "23.4em", width: "3.4em", height: "8.4em" }}>
        <span>{d.volume}</span>
      </div>

      {/* bottom strip */}
      <div className="dr-strip" style={{ left: "5.4em", top: "33.2em" }}>
        {d.strip}
      </div>

      <i className="dr-stain" />
      <i className="dr-scuffs" />
      <i className="dr-spine" />
      <i className="dr-cv-edge" />
    </div>
  );
}

/* ───────────────────────── pages ───────────────────────── */

const PageNo = ({ n, side }) => <span className={`dr-no dr-no--${side}`}>{n}</span>;

function Contents({ d, go }) {
  const items = [
    ["Experience", "02", 2],
    ["Certifications", "03", 2],
    ["Education", "04", 3],
    ["Project", "05", 3],
    ["A note", "06", 4],
  ];
  return (
    <div className="dr-pg dr-pg--r">
      <h3 className="dr-h" data-pop>
        Contents
      </h3>
      <Scribble className="dr-h-line" />
      <ol className="dr-toc">
        {items.map(([label, n, to], i) => (
          <li key={label} data-pop>
            <button type="button" className="dr-toc-i" onClick={() => go(to)}>
              <span className="dr-toc-n">{n}</span>
              <span className="dr-toc-l">{label}</span>
              <span className="dr-toc-dots" />
              <span className="dr-toc-go">flip →</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="dr-stamp" data-pop>
        <span>ARCHIVE</span>
        <b>2026</b>
      </div>
      <p className="dr-hand dr-toc-note" data-pop>
        click any line &amp; the pages will turn for you
      </p>
      <PageNo n="01" side="r" />
    </div>
  );
}

function Experience({ d }) {
  const list = d.experience;
  return (
    <div className="dr-pg dr-pg--l">
      <h3 className="dr-h" data-pop>
        Internships &amp; roles
      </h3>
      <Scribble className="dr-h-line" />
      <ol className="dr-exp" style={{ "--n": Math.max(list.length + 1, 3) }}>
        {list.map((e, i) => (
          <li className="dr-job" key={e.company + i} data-pop style={{ "--r": `${[-0.9, 0.7, -0.5, 0.9, -0.7][i % 5]}deg` }}>
            <i className="dr-tape-s" />
            <span className="dr-mono">{e.company.trim()[0]}</span>
            <div className="dr-job-main">
              <div className="dr-job-top">
                <b>{e.company}</b>
                <small>{e.period}</small>
              </div>
              <div className="dr-job-role">
                {e.role}
                {e.kind && <em>{e.kind}</em>}
              </div>
              <p>{e.text}</p>
            </div>
          </li>
        ))}
        <li className="dr-job dr-job--next" data-pop>
          <span className="dr-hand">next chapter loading&hellip;</span>
        </li>
      </ol>
      <PageNo n="02" side="l" />
    </div>
  );
}

function Certs({ list }) {
  return (
    <div className="dr-pg dr-pg--r">
      <h3 className="dr-h" data-pop>
        Certifications
      </h3>
      <Scribble className="dr-h-line" />
      <ul className="dr-certs">
        {list.map((c, i) => {
          const [a, b] = c.split("—").map((s) => s.trim());
          return (
            <li key={c} data-pop style={{ "--r": `${[-1.4, 1, -0.6, 1.3, -1][i % 5]}deg` }}>
              <span className="dr-cert-n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <small>{a}</small>
                <b>{b}</b>
              </div>
              <span className="dr-check" aria-hidden="true">
                ✓
              </span>
            </li>
          );
        })}
      </ul>
      <PageNo n="03" side="r" />
    </div>
  );
}

function Education({ card }) {
  const [deg, school] = card.lines.map((l) => l.t);
  return (
    <div className="dr-pg dr-pg--l">
      <h3 className="dr-h" data-pop>
        School
      </h3>
      <Scribble className="dr-h-line" />
      <div className="dr-edu" data-pop>
        <i className="dr-tape-s dr-tape-s--l" />
        <small>Degree</small>
        <b>{deg}</b>
        <span>{school}</span>
      </div>
      <div className="dr-cgpa" data-pop>
        <small>{card.big.label}</small>
        <strong>{card.big.value}</strong>
        <em>{card.big.suffix}</em>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle data-draw pathLength="1" cx="60" cy="60" r="52" fill="none" stroke="#c4372d" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <p className="dr-hand dr-edu-note" data-pop>
        still learning every day
      </p>
      <PageNo n="04" side="l" />
    </div>
  );
}

function Project({ p }) {
  return (
    <div className="dr-pg dr-pg--r">
      <h3 className="dr-h" data-pop>
        Mini-project
      </h3>
      <Scribble className="dr-h-line" />
      <div className="dr-proj" data-pop>
        <div className="dr-proj-art" aria-hidden="true">
          <svg viewBox="0 0 200 120">
            <defs>
              <linearGradient id="drp-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7fd3c4" />
                <stop offset="1" stopColor="#f2e9c2" />
              </linearGradient>
            </defs>
            <rect width="200" height="120" fill="url(#drp-sky)" />
            <g fill="#1d2b3a">
              <path d="M20 100V62l22-12 22 12v38z" opacity="0.9" />
              <path d="M70 100V40l26-14 26 14v60z" />
              <path d="M128 100V58l20-10 20 10v42z" opacity="0.9" />
            </g>
            <g fill="#ffd34d">
              <rect x="82" y="52" width="6" height="8" />
              <rect x="96" y="52" width="6" height="8" />
              <rect x="82" y="68" width="6" height="8" />
              <rect x="96" y="68" width="6" height="8" />
              <rect x="30" y="72" width="5" height="7" />
              <rect x="138" y="70" width="5" height="7" />
            </g>
            <path d="M0 100h200v20H0z" fill="#2e6a4f" />
            <circle cx="160" cy="24" r="10" fill="#fff4b0" />
          </svg>
          <span>3D · walkable</span>
        </div>
        <b>{p.title}</b>
        <em>{p.course}</em>
        <p>{p.text}</p>
        <div className="dr-tags">
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
      <PageNo n="05" side="r" />
    </div>
  );
}

function Closing({ c, sigRef, back }) {
  return (
    <div className="dr-pg dr-pg--l">
      <h3 className="dr-hand dr-big" data-pop>
        {c.line}
      </h3>
      <p className="dr-hand dr-sub" data-pop>
        {c.sub}
      </p>
      <Sig svgRef={sigRef} className="dr-sig--end" dark />
      <div className="dr-cta-row" data-pop>
        <a className="dr-cta" href={c.cta.href}>
          {c.cta.label} <span>→</span>
        </a>
        <button type="button" className="dr-link" onClick={back}>
          back to the cover
        </button>
      </div>
      <PageNo n="06" side="l" />
    </div>
  );
}

/* ───────────────────────── the component ───────────────────────── */

export default function Diary() {
  const d = content.diary;
  const root = useRef(null);
  const sigSvg = useRef(null);
  const sigPath = useRef(null);
  const endSig = useRef(null);
  const api = useRef({ goTo() {}, next() {}, prev() {} });
  const [k, setK] = useState(0);
  const [muted, setMutedState] = useState(false);
  const capRef = useRef(null);

  const picked = content.picked.cards;
  const eduCard = picked[0];
  const certs = picked[2].list;
  const latest = d.experience[0] || {};

  useLayoutEffect(() => {
    const el = root.current;
    const q = gsap.utils.selector(el);
    const leaves = q("[data-leaf]");
    const base = q("[data-base]")[0];
    const bookEl = q("[data-book]")[0];
    const floatEl = q("[data-float]")[0];
    const bobEl = q("[data-bob]")[0];
    const penBtn = q(".dr-pen-btn")[0];
    gsap.set(bookEl, { xPercent: -25 });
    const pen = q("[data-pen]")[0];
    const penIn = q("[data-pen-in]")[0];
    const tag = q("[data-tag]")[0];
    const ui = q("[data-ui]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const st = leaves.map(() => ({ p: 0, tw: null }));
    let kk = 0;
    let busy = false;
    let drag = null;
    let peek = null;
    let wrote = false;
    let inView = false;
    let penFree = true; // false while the pen is writing
    const timers = [];
    const later = (s, fn) => {
      const c = gsap.delayedCall(s, fn);
      timers.push(c);
      return c;
    };

    const face = (i, side) => leaves[i]?.querySelector(`[data-face="${side}"]`);
    const spreadFaces = (n) => [n >= 1 ? face(n - 1, "b") : null, n < LAST ? face(n, "f") : base].filter(Boolean);
    const pops = (faces) => faces.flatMap((f) => [...f.querySelectorAll("[data-pop]")]);
    const draws = (faces) => faces.flatMap((f) => [...f.querySelectorAll("[data-draw]")]);

    /* ---------- leaf rendering ---------- */
    const zFor = (i, p) => (p <= 0 ? (LEAVES - i) * 2 : p >= 1 ? i * 2 + 1 : 80);
    const apply = (i, p) => {
      const leaf = leaves[i];
      const s = Math.sin(Math.PI * p);
      leaf.style.transform = `translate3d(0,0,${zFor(i, p)}px) rotateY(${-180 * p}deg) rotateX(${(s * 2.4).toFixed(2)}deg) skewY(${(-s * 3.4).toFixed(2)}deg)`;
      // belt and braces: never rely on backface-visibility alone (children with their own layers can leak through)
      const ff = face(i, "f"), bf = face(i, "b");
      if (ff) ff.style.visibility = p < 0.5 ? "visible" : "hidden";
      if (bf) bf.style.visibility = p < 0.5 ? "hidden" : "visible";
      leaf.style.setProperty("--fs", p < 0.5 ? (p * 2 * 0.6).toFixed(3) : 0); // front face dims as it turns away
      leaf.style.setProperty("--bs", p > 0.5 ? ((1 - p) * 2 * 0.6).toFixed(3) : 0); // back face brightens as it arrives
      const cast = (s * 0.55).toFixed(3);
      (leaves[i + 1] || base).style.setProperty("--castF", cast); // shadow on the page being uncovered
      if (leaves[i - 1]) leaves[i - 1].style.setProperty("--castB", cast); // shadow on the page it lands on
    };
    leaves.forEach((_, i) => apply(i, 0));

    /* ---------- pen ---------- */
    const rest = () => ({ x: el.clientWidth * 0.215, y: el.clientHeight * 0.975 });
    const placePen = () => {
      if (!penFree) return;
      const r = rest();
      gsap.set(pen, { x: r.x, y: r.y, rotation: -19 });
    };
    placePen();

    /* ---------- reveal page furniture when a spread arrives ---------- */
    const writeSignature = () => {
      const path = sigPath.current;
      const svg = sigSvg.current;
      if (!path || !svg) return;
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      if (wrote || reduce) {
        gsap.set(path, { strokeDashoffset: 0 });
        wrote = true;
        return;
      }
      wrote = true;
      penFree = false;
      const tip = (L) => {
        const pt = path.getPointAtLength(L);
        const r = svg.getBoundingClientRect();
        const s = el.getBoundingClientRect();
        const vb = svg.viewBox.baseVal;
        return { x: r.left - s.left + (pt.x / vb.width) * r.width, y: r.top - s.top + (pt.y / vb.height) * r.height };
      };
      const o = { t: 0 };
      const tl = gsap.timeline({ delay: 1.35 });
      timers.push(tl);
      tl.to(pen, { x: () => tip(0).x, y: () => tip(0).y, rotation: 32, duration: 1, ease: "power3.inOut" });
      tl.add(() => snd.scratch(2.4));
      tl.to(o, {
        t: 1,
        duration: 2.4,
        ease: "none",
        onUpdate() {
          path.style.strokeDashoffset = len * (1 - o.t);
          const p = tip(o.t * len);
          gsap.set(pen, { x: p.x, y: p.y, rotation: 32 + Math.sin(o.t * 40) * 3 });
        },
      });
      tl.to(pen, {
        x: () => rest().x,
        y: () => rest().y,
        rotation: -19,
        duration: 1.1,
        ease: "power3.inOut",
        onComplete: () => (penFree = true),
      }, ">+0.25");
    };

    const reveal = (n) => {
      const faces = spreadFaces(n);
      const p = pops(faces);
      gsap.fromTo(p, { autoAlpha: 0, y: 24, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", stagger: 0.08, overwrite: true });
      gsap.fromTo(draws(faces), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.15, delay: 0.25, overwrite: true });
      if (n === 1) writeSignature();
      if (n === LAST && endSig.current) {
        const path = endSig.current.querySelector("path") || endSig.current;
        const len = path.getTotalLength?.() || 600;
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", delay: 0.5 });
      }
    };
    const hideFaces = (faces) => {
      gsap.set(pops(faces), { autoAlpha: 0 });
      gsap.set(draws(faces), { strokeDashoffset: 1 });
    };
    // everything starts hidden; it is revealed as each spread arrives
    hideFaces([...leaves.flatMap((_, i) => [face(i, "f"), face(i, "b")]), base].filter(Boolean));

    const afterChange = (n, revealIn = 0.55) => {
      const old = kk;
      kk = n;
      setK(n);
      const gone = spreadFaces(old).filter((f) => !spreadFaces(n).includes(f));
      hideFaces(spreadFaces(n));
      later(revealIn, () => reveal(n));
      later(revealIn + 0.9, () => hideFaces(gone));
    };

    /* ---------- one leaf turning ---------- */
    const flip = (i, dir, { dur = 1.25, delay = 0, cover = false } = {}) => {
      const s = st[i];
      s.tw?.kill();
      s.tw = gsap.to(s, {
        p: dir > 0 ? 1 : 0,
        duration: reduce ? 0.01 : dur,
        delay,
        ease: cover ? "power3.inOut" : "power2.inOut",
        onStart: () => (cover ? snd.cover({ closing: dir < 0 }) : snd.flip({ speed: dur > 1.1 ? 1 : 1.3 })),
        onUpdate: () => apply(i, s.p),
        onComplete: () => apply(i, dir > 0 ? 1 : 0),
      });
    };

    const goTo = (t) => {
      t = Math.max(0, Math.min(LAST, t));
      if (t === kk || busy) return;
      unpeek();
      const old = kk;
      const dir = t > old ? 1 : -1;
      const n = Math.abs(t - old);
      const dur = n > 1 ? 0.9 : old === 0 || t === 0 ? 1.6 : 1.25;
      const gap = 0.17;
      busy = true;
      for (let j = 0; j < n; j++) {
        const i = dir > 0 ? old + j : old - 1 - j;
        flip(i, dir, { dur, delay: j * gap, cover: i === 0 });
      }
      if (old === 0) gsap.to(bookEl, { xPercent: 0, duration: reduce ? 0.01 : 1.6, ease: "power3.inOut" });
      if (t === 0) gsap.to(bookEl, { xPercent: -25, duration: reduce ? 0.01 : 1.6, ease: "power3.inOut", delay: 0.1 });
      const total = dur + (n - 1) * gap;
      afterChange(t, total * 0.55);
      later(total + 0.05, () => (busy = false));
    };
    const next = () => goTo(kk + 1);
    const prev = () => goTo(kk - 1);
    api.current = { goTo, next, prev };

    /* ---------- hover peeks (lift a corner when the pointer is near the edge) ---------- */
    const setPeek = (idx, target) => {
      if (peek && peek.idx === idx && peek.target === target) return;
      unpeek();
      peek = { idx, target };
      const s = st[idx];
      s.tw?.kill();
      s.tw = gsap.to(s, { p: target, duration: 0.45, ease: "power2.out", onUpdate: () => apply(idx, s.p) });
    };
    function unpeek() {
      if (!peek) return;
      const { idx, target } = peek;
      peek = null;
      const s = st[idx];
      s.tw?.kill();
      const home = target < 0.5 ? 0 : 1;
      s.tw = gsap.to(s, { p: home, duration: 0.5, ease: "power2.out", onUpdate: () => apply(idx, s.p), onComplete: () => apply(idx, home) });
    }

    /* ---------- pointer: tilt, peek, drag ---------- */
    const tiltY = gsap.quickTo(bookEl, "rotationY", { duration: 0.9, ease: "power3.out" });
    const tiltX = gsap.quickTo(bookEl, "rotationX", { duration: 0.9, ease: "power3.out" });
    const penShiftX = gsap.quickTo(penIn, "x", { duration: 1.1, ease: "power3.out" });
    const penShiftY = gsap.quickTo(penIn, "y", { duration: 1.1, ease: "power3.out" });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!coarse) {
        tiltY(nx * 5);
        tiltX(-ny * 3);
        penShiftX(-nx * 14);
        penShiftY(-ny * 10);
        el.style.setProperty("--mx", nx.toFixed(3));
        el.style.setProperty("--my", ny.toFixed(3));
      }
      if (coarse || busy || drag?.moved) return;
      const b = bookEl.getBoundingClientRect();
      const inside = e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom;
      if (!inside) return unpeek();
      const mid = b.left + b.width / 2;
      const right = e.clientX > mid;
      if (kk === 0) return right ? setPeek(0, 0.045) : unpeek();
      const zone = b.width * 0.11;
      const low = e.clientY > b.top + b.height * 0.55;
      if (right && kk < LAST && e.clientX > b.right - zone * 1.6 && low) setPeek(kk, 0.07);
      else if (!right && e.clientX < b.left + zone * 1.6 && low) setPeek(kk - 1, 0.93);
      else unpeek();
    };
    const onLeave = () => {
      tiltY(0);
      tiltX(0);
      penShiftX(0);
      penShiftY(0);
      unpeek();
    };

    const onDown = (e) => {
      if (busy) return;
      const b = bookEl.getBoundingClientRect();
      const right = e.clientX > b.left + b.width / 2;
      if (kk === 0) {
        if (right) drag = { mode: "open" };
        return;
      }
      if (e.target.closest("button,a")) return;
      const idx = right ? (kk < LAST ? kk : -1) : kk - 1;
      if (idx < 0) return;
      drag = { mode: "page", idx, dir: right ? 1 : -1, x0: e.clientX, moved: false, pw: b.width / 2 };
      try {
        bookEl.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    const onDrag = (e) => {
      if (!drag || drag.mode !== "page") return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) < 9) return;
        drag.moved = true;
        unpeek();
        st[drag.idx].tw?.kill();
        hideFaces(spreadFaces(kk + drag.dir));
      }
      const prog = Math.max(0, Math.min(1, (drag.dir > 0 ? -dx : dx) / (drag.pw * 0.95)));
      drag.prog = prog;
      const s = st[drag.idx];
      s.p = drag.dir > 0 ? prog : 1 - prog;
      apply(drag.idx, s.p);
    };
    const onUp = () => {
      const dg = drag;
      drag = null;
      if (!dg) return;
      if (dg.mode === "open") return goTo(1);
      if (!dg.moved) return goTo(kk + dg.dir);
      const s = st[dg.idx];
      const commit = (dg.prog || 0) > 0.3;
      const to = commit ? (dg.dir > 0 ? 1 : 0) : dg.dir > 0 ? 0 : 1;
      s.tw?.kill();
      busy = true;
      if (commit) snd.flip({ speed: 1.4 });
      s.tw = gsap.to(s, { p: to, duration: reduce ? 0.01 : 0.6, ease: "power2.out", onUpdate: () => apply(dg.idx, s.p), onComplete: () => apply(dg.idx, to) });
      if (commit) {
        const n = kk + dg.dir;
        if (n === 0) gsap.to(bookEl, { xPercent: -25, duration: 1.2, ease: "power3.inOut" });
        afterChange(n, 0.3);
      } else {
        hideFaces(spreadFaces(kk + dg.dir).filter((f) => !spreadFaces(kk).includes(f)));
      }
      later(0.7, () => (busy = false));
    };

    bookEl.addEventListener("pointerdown", onDown);
    bookEl.addEventListener("pointermove", onDrag);
    bookEl.addEventListener("pointerup", onUp);
    bookEl.addEventListener("pointercancel", onUp);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);

    const onKey = (e) => {
      if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.("input,textarea,select")) return;
      if (e.key === "ArrowRight") (e.preventDefault(), next());
      else if (e.key === "ArrowLeft") (e.preventDefault(), prev());
    };
    window.addEventListener("keydown", onKey);

    /* ---------- entrance + ambience ---------- */
    const intro = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    intro
      .fromTo(floatEl, { y: 110, rotationX: 18, autoAlpha: 0 }, { y: 0, rotationX: 0, autoAlpha: 1, duration: reduce ? 0.01 : 1.5 }, 0)
      .fromTo(tag, { xPercent: 115, rotation: 7, autoAlpha: 0 }, { xPercent: 0, rotation: 0, autoAlpha: 1, duration: reduce ? 0.01 : 1.2, ease: "back.out(1.2)" }, 0.35)
      .fromTo(penIn, { yPercent: 25, rotation: -30, autoAlpha: 0 }, { yPercent: 0, rotation: 0, autoAlpha: 1, duration: reduce ? 0.01 : 1.3 }, 0.5)
      .fromTo(ui, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: reduce ? 0.01 : 0.9, stagger: 0.1 }, 1);

    // some GPUs drop tiles of a big 3D layer; one forced repaint after the entrance heals it
    intro.eventCallback("onComplete", () => {
      const f0 = face(0, "f");
      if (!f0) return;
      f0.style.display = "none";
      void f0.offsetHeight;
      f0.style.display = "";
    });
    const st1 = ScrollTrigger.create({ trigger: el, start: "top 70%", once: true, onEnter: () => intro.play() });
    // measurement-independent safety net: if the scroll trigger positions are stale, still play when it is on screen
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { intro.play(); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    const st2 = ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 45%", onToggle: (s) => {
        inView = s.isActive;
        el.style.setProperty("--dr-play", s.isActive ? "running" : "paused"); // ambient grid only animates while the diary is on screen
      },
    });

    if (!reduce) {
      gsap.to(bobEl, { y: -9, rotation: 0.35, duration: 3.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(penBtn, { rotation: 1.6, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }

    const ro = new ResizeObserver(placePen);
    ro.observe(el);
    const ioOff = () => io.disconnect();

    return () => {
      ioOff();
      bookEl.removeEventListener("pointerdown", onDown);
      bookEl.removeEventListener("pointermove", onDrag);
      bookEl.removeEventListener("pointerup", onUp);
      bookEl.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
      st1.kill();
      st2.kill();
      intro.kill();
      timers.forEach((t) => t.kill());
      gsap.killTweensOf([bookEl, floatEl, bobEl, pen, penIn, penBtn, tag, ui, ...st, ...leaves]);
    };
  }, []);

  /* caption swaps with a little roll */
  useEffect(() => {
    const c = capRef.current;
    if (!c) return;
    gsap.fromTo(c.children, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.25 });
  }, [k]);

  const cap = d.captions[k] || d.captions[0];
  const toggleSound = () => {
    const m = !muted;
    snd.setMuted(m);
    setMutedState(m);
  };
  const penClick = () => {
    snd.click();
    const pen = root.current.querySelector("[data-pen-in]");
    gsap.fromTo(pen, { scale: 1 }, { keyframes: [{ scale: 1.08, rotation: -6, duration: 0.15 }, { scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1,0.4)" }] });
  };
  const go = (n) => api.current.goTo(n);

  return (
    <section ref={root} className="dr" id="diary" aria-label={d.title} data-k={k}>
      <div className="dr-glow" aria-hidden="true" />
      <div className="dr-dust" aria-hidden="true" />
      <div className="dr-deco" aria-hidden="true">
        <div className="dr-gridfx">
          <i className="dr-grid">
            <b className="dr-beam dr-beam--v" style={{ left: "calc(120px * 3 - 1px)", animationDuration: "7s", animationDelay: "-1s" }} />
            <b className="dr-beam dr-beam--v dr-beam--b" style={{ left: "calc(120px * 8 - 1px)", animationDuration: "9s", animationDelay: "-5s" }} />
            <b className="dr-beam dr-beam--v" style={{ left: "calc(120px * 12 - 1px)", animationDuration: "8s", animationDelay: "-3s" }} />
            <b className="dr-beam dr-beam--v dr-beam--b" style={{ left: "calc(120px * 15 - 1px)", animationDuration: "10s", animationDelay: "-7s" }} />
            <b className="dr-beam dr-beam--h" style={{ top: "calc(120px * 2 - 1px)", animationDuration: "9s", animationDelay: "-2s" }} />
            <b className="dr-beam dr-beam--h dr-beam--b" style={{ top: "calc(120px * 4 - 1px)", animationDuration: "11s", animationDelay: "-6s" }} />
            <b className="dr-beam dr-beam--h" style={{ top: "calc(120px * 6 - 1px)", animationDuration: "8s", animationDelay: "-4s" }} />
          </i>
        </div>
        <i className="dr-horizon" />
        <i className="dr-floor" />
        <span className="dr-ghost dr-ghost--a">EXPERIENCE</span>
        <span className="dr-ghost dr-ghost--b">{"'25 \u2192 '26"}</span>
        <div className="dr-note dr-note--a">
          <b>INTERN SNAPSHOT</b>
          <div className="dr-note-row">
            <small>role</small>
            <span>{latest.role}</span>
          </div>
          <div className="dr-note-row">
            <small>at</small>
            <span>{latest.company}</span>
          </div>
          <div className="dr-note-row">
            <small>when</small>
            <span>{latest.period}</span>
          </div>
          <div className="dr-note-row">
            <small>stack</small>
            <span>{(d.stack || []).join(" \u00b7 ")}</span>
          </div>
          <div className="dr-note-tally">
            <span>
              <em>{String(d.experience.length).padStart(2, "0")}</em> roles
            </span>
            <span>
              <em>{String(certs.length).padStart(2, "0")}</em> certs
            </span>
            <span>
              <em>{eduCard.big?.value}</em> CGPA
            </span>
          </div>
          {(d.highlights || []).map((h) => (
            <span className="dr-note-ck" key={h}>
              {"\u2713 "}
              {h}
            </span>
          ))}
        </div>
        <div className="dr-code">
          <em>{"// intern.js"}</em>
          <span>
            <i>const</i> day = () =&gt; {"{"}
          </span>
          <span>{"  learn(); build(); ship();"}</span>
          <span>{"}"}</span>
        </div>
        <div className="dr-ring dr-ring--a" />
        <div className="dr-ring dr-ring--b" />
        <svg className="dr-clip" viewBox="0 0 40 100" fill="none" stroke="#9aa3b5" strokeWidth="3" strokeLinecap="round">
          <path d="M14 70V26a8 8 0 0 1 16 0v52a13 13 0 0 1-26 0V30" />
        </svg>
        <div className="dr-flipme">
          flip through
          <svg viewBox="0 0 90 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8C30 2 58 8 78 30" strokeDasharray="2 6" />
            <path d="M66 28l13 3-4-13" />
          </svg>
        </div>
        <span className="dr-spark dr-spark--a">{"\u2726"}</span>
        <span className="dr-spark dr-spark--b">{"\u2726"}</span>
        <span className="dr-spark dr-spark--c">{"\u2727"}</span>
        <span className="dr-spark dr-spark--d">{"\u2726"}</span>
      </div>

      {/* torn label */}
      <div className="dr-tagwrap" data-tag>
        <div className="dr-tagpaper">
          <span>{d.title.split(" ").slice(0, -1).join(" ")}</span>
          <span>{d.title.split(" ").slice(-1)}</span>
        </div>
      </div>

      {/* the book */}
      <div className="dr-stage">
        <div className="dr-float" data-float>
          <div className="dr-bob" data-bob>
          <div className="dr-book" data-book data-k={k}>
            {/* back cover (shows on the right once every sheet is flipped) */}
            <div className="dr-base" data-base>
              <div className="dr-pg dr-pg--r dr-pg--end">
                <p className="dr-hand dr-fin" data-pop>
                  Fin.
                </p>
                <button type="button" className="dr-link" data-pop onClick={() => go(0)}>
                  close the diary
                </button>
                <span className="dr-hand dr-fin-sub" data-pop>
                  see you at the next chapter
                </span>
              </div>
            </div>

            {/* leaf 0: the cover */}
            <div className="dr-leaf dr-leaf--cover" data-leaf>
              <div className="dr-face dr-face--f" data-face="f">
                <Cover d={d} />
                <button type="button" className="dr-open" aria-label="Open the diary" onClick={() => go(1)} />
              </div>
              <div className="dr-face dr-face--b" data-face="b">
                <div className="dr-pg dr-pg--l dr-pg--inside">
                  <div className="dr-owner" data-pop>
                    <small>this diary belongs to</small>
                    <b>{d.owner}</b>
                    <span>if found, please return to a recruiter</span>
                  </div>
                  <Sig svgRef={sigSvg} pathRef={sigPath} className="dr-sig--in" dark />
                  <p className="dr-hand dr-inside-note" data-pop>
                    every internship, in one place &rarr;
                  </p>
                </div>
              </div>
            </div>

            {/* leaf 1: Contents | Experience */}
            <div className="dr-leaf" data-leaf>
              <div className="dr-face dr-face--f" data-face="f">
                <Contents d={d} go={go} />
              </div>
              <div className="dr-face dr-face--b" data-face="b">
                <Experience d={d} />
              </div>
            </div>

            {/* leaf 2: Certifications | Education */}
            <div className="dr-leaf" data-leaf>
              <div className="dr-face dr-face--f" data-face="f">
                <Certs list={certs} />
              </div>
              <div className="dr-face dr-face--b" data-face="b">
                <Education card={eduCard} />
              </div>
            </div>

            {/* leaf 3: Project | Closing */}
            <div className="dr-leaf" data-leaf>
              <div className="dr-face dr-face--f" data-face="f">
                <Project p={d.project} />
              </div>
              <div className="dr-face dr-face--b" data-face="b">
                <Closing c={d.closing} sigRef={endSig} back={() => go(0)} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* pen */}
      <div className="dr-pen" data-pen>
        <div className="dr-pen-in" data-pen-in>
          <button type="button" className="dr-pen-btn" onClick={penClick} aria-label="Click the pen">
            <PenSvg />
          </button>
        </div>
      </div>

      {/* controls */}
      <div className="dr-nav" data-ui>
        <button type="button" className="dr-nav-b" onClick={() => api.current.prev()} disabled={k === 0} aria-label="Previous page">
          <Arrow dir="left" />
        </button>
        <button type="button" className="dr-nav-b" onClick={() => api.current.next()} disabled={k === LAST} aria-label="Next page">
          <Arrow dir="right" />
        </button>
      </div>
      <div className="dr-cap" data-ui aria-live="polite">
        <div ref={capRef}>
          <span>&larr; {cap[0]}</span>
          <span>({cap[1].replace(/^\(|\)$/g, "")})</span>
        </div>
      </div>
      <button type="button" className="dr-snd" data-ui onClick={toggleSound} aria-pressed={!muted}>
        sound {muted ? "off" : "on"}
      </button>
    </section>
  );
}

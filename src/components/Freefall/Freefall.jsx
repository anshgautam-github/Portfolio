import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./freefall.css";

gsap.registerPlugin(ScrollTrigger);

/*
  <Freefall /> - a scroll-driven deck of four abstractions.

  The section pins. Scrolling advances a continuous value t (0 -> 10). Card i sits at depth d = i - t:
    d > 0   still waiting: stacked up and away (each one a little smaller, a little higher, a little more tilted back)
    d = 0   the card in front
    d < 0   already read: it drops off the bottom edge, accelerating, and leaves
  Everything is written straight to the card elements each frame (no React renders while scrolling);
  React state only changes when the "current" card changes (counter, name, glow colour).

  Art lives in /public/freefall/01..11.jpg - swap them for your own images any time (same file names).
*/


const MOTIFS = [
  /* railway: converging tracks, sleepers and a signal */
  <svg key="m0" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M20 260 L180 20 M110 260 L196 20 M380 260 L220 20 M290 260 L204 20" strokeWidth="1.4" />
    {[0, 1, 2, 3, 4, 5, 6].map((k) => { const y = 40 + k * k * 4.6 + k * 14; const w = 18 + (y - 20) * 0.62; return <path key={k} d={`M${200 - w} ${y} H${200 + w}`} strokeWidth="1" opacity=".7" />; })}
    <circle cx="326" cy="60" r="22" strokeWidth="1.2" /><circle cx="326" cy="60" r="7" fill="currentColor" stroke="none" /><path d="M326 82 V150" strokeWidth="1.4" />
  </g></svg>,
  /* web: code brackets, tags and a browser frame */
  <svg key="m1" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="70" y="36" width="260" height="170" rx="14" strokeWidth="1.4" /><path d="M70 66 H330" strokeWidth="1.2" />
    <circle cx="90" cy="51" r="4" fill="currentColor" stroke="none" /><circle cx="106" cy="51" r="4" fill="currentColor" stroke="none" opacity=".6" /><circle cx="122" cy="51" r="4" fill="currentColor" stroke="none" opacity=".35" />
    <path d="M150 112 L116 140 L150 168 M250 112 L284 140 L250 168" strokeWidth="3" /><path d="M218 104 L182 176" strokeWidth="3" />
    <path d="M96 190 H150 M166 190 H240 M96 86 H140" strokeWidth="1.4" opacity=".6" />
  </g></svg>,
  /* ios: phone outline with app tiles */
  <svg key="m2" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="146" y="14" width="108" height="226" rx="22" strokeWidth="1.6" /><path d="M184 28 H216" strokeWidth="4" />
    {[0, 1, 2, 3, 4, 5].map((k) => <rect key={k} x={162 + (k % 3) * 29} y={64 + Math.floor(k / 3) * 29} width="21" height="21" rx="6" strokeWidth="1.3" opacity={0.9 - k * 0.08} />)}
    <rect x="162" y="136" width="76" height="40" rx="10" strokeWidth="1.3" opacity=".7" /><path d="M170 150 H210 M170 162 H196" strokeWidth="1.3" opacity=".6" />
    <path d="M60 200 C90 160 110 220 146 180 M254 80 C290 40 320 110 350 64" strokeWidth="1.2" opacity=".5" />
  </g></svg>,
  /* research: a node network with a highlighted hub */
  <svg key="m3" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="currentColor" strokeLinecap="round">
    <path d="M200 120 L110 60 M200 120 L300 52 M200 120 L96 168 M200 120 L316 156 M200 120 L200 214 M110 60 L56 110 M300 52 L352 100 M316 156 L352 212 M96 168 L60 222 M110 60 L200 22" strokeWidth="1.2" opacity=".7" />
    {[[110, 60], [300, 52], [96, 168], [316, 156], [200, 214], [56, 110], [352, 100], [352, 212], [60, 222], [200, 22]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="6" fill="currentColor" stroke="none" opacity=".75" />)}
    <circle cx="200" cy="120" r="26" strokeWidth="1.6" /><circle cx="200" cy="120" r="12" fill="currentColor" stroke="none" /><circle cx="200" cy="120" r="46" strokeWidth="1" opacity=".4" strokeDasharray="3 6" />
  </g></svg>,
];

const CARDS = [
  {
    art: 1, theme: ["#e0453c", "#7b1623", "#130709"], glow: "#e5483f", tag: "ON-SITE", rail: "Railway", short: "East Central Railway", yr: "Dec 25", logo: "ecr.png",
    n: "Information Technology Intern",
    company: "East Central Railway", kind: "Internship", when: "Dec 2025 \u2013 Jan 2026 \u00b7 2 mos",
    text: "Worked as an Information Technology Intern at East Central Railway, getting hands-on experience with enterprise IT systems and day to day technical operations.",
  },
  {
    art: 5, theme: ["#33b5a0", "#14524d", "#06161a"], glow: "#33b5a0", tag: "HYBRID", rail: "Seven Hills", short: "Seven Hills National", yr: "Dec 25", logo: "shn.png",
    n: "Web Developer",
    company: "Seven Hills National", kind: "Internship", when: "Dec 2025 \u2013 Jan 2026 \u00b7 2 mos", place: "Chennai, Tamil Nadu, India",
    text: "Led an awesome team of 4 devs and built responsive web apps.",
  },
  {
    art: 6, theme: ["#4b86f0", "#1e3a8a", "#060b1c"], glow: "#2f64e0", tag: "ON-SITE", rail: "Infosys", short: "Infosys", yr: "Mar 26", logo: "infosys.png",
    n: "iOS Developer",
    company: "Infosys", kind: "Internship", when: "Mar 2026 \u00b7 1 mo", place: "Mysore, Karnataka, India",
    text: "Completed an iOS Development Internship with Infosys through the SRM \u00d7 Apple \u00d7 Infosys collaboration.",
  },
  {
    art: 8, theme: ["#c9a24a", "#5c4514", "#0b0905"], glow: "#c9a24a", tag: "REMOTE", rail: "SDG Research", short: "SDG & Policy Research", yr: "Oct 25", logo: "iisppr.png", sq: true,
    n: "Head of Research",
    company: "International Institute of SDG\u2019s and Public Policy Research", kind: "Internship", when: "Oct \u2013 Dec 2025 \u00b7 3 mos", place: "Remote \u00b7 Delhi, India",
    text: "Started as a Research Intern, reading papers and digging into data, then got to lead an amazing team of 9 researchers.",
  },
];
const N = CARDS.length;
const LINE1 = "Where";
const WORD = "I\u2019ve Worked".split("");
// blue -> violet -> magenta -> orange, spread evenly over however many letters the headline has
const STOPS = ["#3a2cff", "#7b2dcc", "#c02e92", "#ea5a58", "#f26a45"];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const WORD_COLORS = WORD.map((_, i) => {
  const t = (i / (WORD.length - 1)) * (STOPS.length - 1), k = Math.min(STOPS.length - 2, Math.floor(t)), f = t - k;
  const a = hex(STOPS[k]), b = hex(STOPS[k + 1]);
  return "#" + a.map((v, j) => Math.round(v + (b[j] - v) * f).toString(16).padStart(2, "0")).join("");
});

const SPARKS = [[6,5,16,0,3],[14,3,21,6,-2],[23,6,18,11,4],[33,4,24,3,-3],[41,3,19,14,2],[52,5,22,8,-4],[61,3,17,2,3],[70,6,26,12,-2],[78,4,20,5,4],[86,3,23,9,-3],[93,5,18,15,2],[48,3,28,1,-1]];
const pad = (n) => String(n).padStart(2, "0");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const smoother = (f) => f * f * f * (f * (f * 6 - 15) + 10); // dwell on each card, move quickly between them
const BASE = import.meta.env.BASE_URL || "/";


/* ---- shatter: a fixed jittered triangulation of the card, shared by every card ---- */
const BREAK_AT = 0.14;
const makeShatter = (SH_C, SH_R) => {
  let a = 20261023;
  const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const P = [];
  for (let r = 0; r <= SH_R; r++) for (let c = 0; c <= SH_C; c++) {
    const edgeX = c === 0 || c === SH_C, edgeY = r === 0 || r === SH_R;
    P.push([c / SH_C + (edgeX ? 0 : (rnd() - 0.5) * 0.62 / SH_C), r / SH_R + (edgeY ? 0 : (rnd() - 0.5) * 0.62 / SH_R)]);
  }
  const at = (c, r) => P[r * (SH_C + 1) + c];
  const tris = [], edges = [];
  for (let r = 0; r < SH_R; r++) for (let c = 0; c < SH_C; c++) {
    const A = at(c, r), B = at(c + 1, r), C = at(c + 1, r + 1), D = at(c, r + 1);
    const flip = (r + c) % 2 === 0;
    const ts = flip ? [[A, B, C], [A, C, D]] : [[A, B, D], [B, C, D]];
    ts.forEach((t) => tris.push(t));
    edges.push([A, B], [A, D], flip ? [A, C] : [B, D]);
    if (c === SH_C - 1) edges.push([B, C]);
    if (r === SH_R - 1) edges.push([D, C]);
  }
  const shards = tris.map((t) => {
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const dx = cx - 0.5, dy = cy - 0.3, dist = Math.hypot(dx, dy) || 0.01;
    const xs = t.map((p) => p[0]), ys = t.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(0.001, Math.max(...xs) - bx), bh = Math.max(0.001, Math.max(...ys) - by);
    return {
      /* each piece is a SMALL box (its triangle's bounding box) that clips a shifted copy of the card, so the browser only ever
         rasterises the little box, never 32 full-size cards */
      bx, by, bw, bh,
      poly: "polygon(" + t.map((p) => (((p[0] - bx) / bw) * 100).toFixed(2) + "% " + (((p[1] - by) / bh) * 100).toFixed(2) + "%").join(",") + ")",
      cx, cy, ox: ((((cx - bx) / bw) * 100).toFixed(2)) + "% " + ((((cy - by) / bh) * 100).toFixed(2)) + "%",
      vx: (dx / dist) * (0.35 + rnd() * 0.6) + (rnd() - 0.5) * 0.3, vy: (dy / dist) * (0.15 + rnd() * 0.4) - 0.12 - rnd() * 0.2,
      vz: 0.1 + rnd() * 0.5, rz: (rnd() - 0.5) * 540, rx: (rnd() - 0.5) * 420, ry: (rnd() - 0.5) * 420,
      g: 0.75 + rnd() * 0.6, delay: Math.min(0.34, dist * 0.42 + rnd() * 0.06),
    };
  });
  return { shards, edges };
};
/* every card carries its own set of cloned shards, so the break is kept coarse everywhere (3x3 = 18 pieces instead of 32):
   it reads just as clearly as glass, but the page holds ~70 cloned cards instead of ~130 and the first frame of a break paints far fewer layers */
const SHATTER = makeShatter(3, 3), SHATTER_LITE = SHATTER;

export default function Freefall() {
  const root = useRef(null);
  const deckRef = useRef(null);
  const fillRef = useRef(null);
  const dotRef = useRef(null);
  const api = useRef({ step() {} });
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const el = root.current;
    const deck = deckRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const liteMQ = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const lite = liteMQ.matches;
    const isLite = () => liteMQ.matches; // live, so resizing / device emulation after load is honoured   // phones: lighter shatter (fewer shards), quicker scrub
    const cleanups = [];

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray("[data-card]", el);
      const arts = cards.map((c) => c.querySelector("[data-art]"));
      const caps = cards.map((c) => c.querySelector("[data-cap]"));
      const shades = cards.map((c) => c.querySelector("[data-shade]"));
      const sheens = cards.map((c) => c.querySelector("[data-sheen]"));
      const intro = cards.map(() => ({ v: reduce ? 1 : 0 }));
      const prog = { t: 0 };
      let H = 800, cw = 300, Y1 = 150, ratio = 1.14, mobile = false;
      let current = -1;
      let st = null;

      /* ---- shatter pieces (built lazily, the first time a card breaks) ---- */
      const wraps = cards.map(() => null);
      const sizeWrap = (w) => { w.style.top = `${slotPx}px`; w.style.width = `${cw}px`; w.style.height = `${cw * ratio}px`; w.style.marginLeft = `${-cw / 2}px`; };
      let slotPx = 0;
      const buildShards = (i) => {
        const w = document.createElement("div");
        w.className = "ff-shards"; w.setAttribute("aria-hidden", "true");
        w.style.zIndex = String(700 - i);
        const g = cards[i].style.getPropertyValue("--g");
        const SH = lite ? SHATTER_LITE : SHATTER;
        const pieces = SH.shards.map((sh) => {
          const box = document.createElement("div");
          box.className = "ff-shard";
          box.style.cssText = `left:${(sh.bx * 100).toFixed(3)}%;top:${(sh.by * 100).toFixed(3)}%;width:${(sh.bw * 100).toFixed(3)}%;height:${(sh.bh * 100).toFixed(3)}%;clip-path:${sh.poly};transform-origin:${sh.ox};display:none`;
          const n = cards[i].cloneNode(true);
          // a clean, light copy of the card: no heavy texture / animated layers, captions fully on, art at rest
          n.querySelectorAll(".ff-grain,.ff-streak,[data-sheen],.ff-ring,.ff-beam").forEach((x) => x.remove());
          const ca = n.querySelector("[data-cap]"), ar = n.querySelector("[data-art]"), sd = n.querySelector("[data-shade]");
          if (ca) ca.style.opacity = "1"; if (sd) sd.style.opacity = "0"; if (ar) ar.style.transform = "scale(1.12)";
          n.removeAttribute("data-card"); n.removeAttribute("aria-label"); n.removeAttribute("style");
          n.querySelectorAll("[data-art],[data-cap],[data-shade]").forEach((x) => { x.removeAttribute("data-art"); x.removeAttribute("data-cap"); x.removeAttribute("data-shade"); });
          n.classList.add("ff-shardcard");
          if (g) n.style.setProperty("--g", g);
          n.style.left = `${(-(sh.bx / sh.bw) * 100).toFixed(3)}%`; n.style.top = `${(-(sh.by / sh.bh) * 100).toFixed(3)}%`;
          n.style.width = `${(100 / sh.bw).toFixed(3)}%`; n.style.height = `${(100 / sh.bh).toFixed(3)}%`;
          box.appendChild(n);
          w.appendChild(box);
          return { n: box, sh, op: -1 };
        });
        const NSV = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NSV, "svg");
        svg.setAttribute("class", "ff-cracks"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none");
        svg.innerHTML = SH.edges.map((e) => `<line x1="${(e[0][0] * 100).toFixed(2)}" y1="${(e[0][1] * 100).toFixed(2)}" x2="${(e[1][0] * 100).toFixed(2)}" y2="${(e[1][1] * 100).toFixed(2)}"/>`).join("");
        w.appendChild(svg);
        const flash = document.createElement("i"); flash.className = "ff-flash"; w.appendChild(flash);
        deck.appendChild(w);
        sizeWrap(w);
        return { w, pieces, svg, flash, broken: false };
      };
      cleanups.push(() => wraps.forEach((x) => x && x.w.remove()));
      // build the pieces while the browser is idle so the first break never hitches
      let idleId = 0, nextBuild = 0;
      const ric = window.requestIdleCallback || ((f) => setTimeout(f, 300));
      const cic = window.cancelIdleCallback || clearTimeout;
      const prebuild = () => { if (nextBuild < N && !reduce && !isLite()) { if (!wraps[nextBuild]) wraps[nextBuild] = buildShards(nextBuild); nextBuild++; idleId = ric(prebuild); } };
      // ...but only once the section is within ~1.5 screens of the viewport: until then the page stays free of ~70 hidden card clones
      // (every one of them is restyled on each class / custom-property change anywhere inside the section, and cloned again by the glass transition)
      let nearIO = null;
      const startPrebuild = () => { if (nearIO) { nearIO.disconnect(); nearIO = null; } idleId = ric(prebuild); };
      if (typeof IntersectionObserver === "function") {
        nearIO = new IntersectionObserver(([x]) => { if (x.isIntersecting) startPrebuild(); }, { rootMargin: "150% 0px" });
        nearIO.observe(el);
      } else startPrebuild();
      cleanups.push(() => { if (nearIO) nearIO.disconnect(); cic(idleId); });

      const layout = () => {
        H = el.clientHeight;
        const Wd = el.clientWidth;
        mobile = Wd <= 900;
        let slot;
        if (mobile) {
          /* phones / tablets: stack the deck in the space left under the headline and above the counter bar, so nothing overlaps at any screen size */
          const left = el.querySelector(".ff-left");
          const head = left ? left.offsetTop + left.offsetHeight : H * 0.28;
          ratio = 1.3;
          Y1 = Math.min(H * 0.085, 90);
          const topY = head + Y1 * 1.25 + 10;               // room for the cards peeking out behind the front one
          const bottomY = H - Math.max(84, H * 0.1);        // room for the counter + pager
          const avail = Math.max(180, bottomY - topY);
          cw = clamp(Math.min(Wd * 0.84, 440, avail / ratio), 150, 440);
          slot = topY + Math.max(0, avail - cw * ratio) * 0.45;
        } else {
          ratio = 1.14;
          cw = Math.min(H * 0.39, deck.clientWidth * 0.9);
          slot = H * 0.41;
          Y1 = 0.192 * H;
        }
        const ch = cw * ratio;
        slotPx = slot;
        el.style.setProperty("--cw", `${cw.toFixed(1)}px`);
        wraps.forEach((x) => x && sizeWrap(x.w));
        cards.forEach((c) => {
          c.style.width = `${cw}px`;
          c.style.height = `${ch}px`;
          c.style.top = `${slot}px`;
          c.style.marginLeft = `${-cw / 2}px`;
        });
      };

      const render = () => {
        const t = prog.t;
        const k = Math.min(Math.floor(t), N - 1);
        const te = k >= N - 1 ? N - 1 : k + smoother(t - k);

        for (let i = 0; i < N; i++) {
          const d = i - te;
          const c = cards[i];
          let y, s, rx, op = 1, z;
          if (d >= -0.004 && wraps[i] && wraps[i].w.style.display !== "none") { const sh0 = wraps[i]; sh0.w.style.display = "none"; sh0.broken = false; sh0.pieces.forEach((p) => { p.n.style.display = "none"; p.op = -1; }); }
          if (d >= 0) {
            const r = 0.38;
            y = (-Y1 * (1 - Math.pow(r, d))) / (1 - r);
            s = 0.74 + 0.26 * Math.pow(0.5, d);
            rx = 13 * (1 - Math.pow(0.55, d));
            op = 1 - sstep(4.6, 7.2, d);
            z = 500 - i;
          } else {
            const u = -d;
            if (!reduce && !isLite()) {
              /* brittle break: the card holds, shudders, cracks, then bursts into shards that tumble away under gravity */
              y = 0; s = 1 + 0.012 * Math.min(1, u / BREAK_AT); rx = 0; z = 700 - i;
              const pre = clamp(u / BREAK_AT, 0, 1);
              const sh = wraps[i] || (wraps[i] = buildShards(i));
              const rz = u < BREAK_AT ? Math.sin(u * 330) * 0.9 * pre : 0;
              const w = clamp((u - BREAK_AT) / (1 - BREAK_AT), 0, 1);
              if (u > 0.004 && w < 1) {
                if (sh.w.style.display !== "block") sh.w.style.display = "block";
                sh.w.style.transform = `rotateX(${rx}deg) scale(${s.toFixed(4)})`;
                sh.svg.style.opacity = (sstep(0.02, BREAK_AT * 0.85, u) * (1 - sstep(BREAK_AT, BREAK_AT + 0.1, u))).toFixed(3);
                sh.flash.style.opacity = (sstep(BREAK_AT * 0.7, BREAK_AT, u) * (1 - sstep(BREAK_AT, BREAK_AT + 0.16, u)) * 0.85).toFixed(3);
                const broken = u >= BREAK_AT;
                if (broken !== sh.broken) { sh.broken = broken; sh.pieces.forEach((p) => { p.n.style.display = broken ? "block" : "none"; }); }
                if (broken) {
                  const Hh = H;
                  for (const p of sh.pieces) {
                    const q = p.sh;
                    const lw = clamp((w - q.delay) / (1 - q.delay), 0, 1);
                    const x = q.vx * cw * 1.1 * lw, yy = q.vy * cw * 0.55 * lw + Hh * 1.05 * q.g * lw * lw, zz = q.vz * cw * 0.9 * lw;
                    p.n.style.transform = `translate3d(${x.toFixed(1)}px,${yy.toFixed(1)}px,${zz.toFixed(1)}px) rotateX(${(q.rx * lw).toFixed(1)}deg) rotateY(${(q.ry * lw).toFixed(1)}deg) rotateZ(${(q.rz * lw * lw).toFixed(1)}deg)`;
                    const o = lw > 0.7 ? 1 - sstep(0.7, 1, lw) : 1;
                    const oq = Math.round(o * 100);
                    if (oq !== p.op) { p.op = oq; p.n.style.opacity = o.toFixed(2); }
                  }
                }
              } else if (sh.w.style.display !== "none") { sh.w.style.display = "none"; sh.broken = false; sh.pieces.forEach((p) => { p.n.style.display = "none"; p.op = -1; }); }
              // the intact card is only drawn until the break
              if (u >= BREAK_AT) { if (c.style.visibility !== "hidden") c.style.visibility = "hidden"; continue; }
              op = 1;
              c.style.transform = `translate3d(0, 0px, 0) rotateX(${rx}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
              c.style.opacity = "1"; c.style.zIndex = z;
              if (c.style.visibility !== "visible") c.style.visibility = "visible";
              arts[i].style.transform = "translate3d(0, 0px, 0) scale(1.12)";
              caps[i].style.opacity = "1"; shades[i].style.opacity = "0";
              continue;
            }
            // reduced motion / phones: no shards, the card just lifts away and fades (no layout shake)
            if (c.style.visibility === "hidden" && wraps[i]) wraps[i].w.style.display = "none";
            y = H * 0.18 * u;
            s = 1 + 0.05 * u;
            rx = 0;
            op = 1 - sstep(0.0, 0.55, u);
            z = 700 - i;
          }
          // the whole deck drops in from above on first view
          const iv = intro[i].v;
          y -= (1 - iv) * H * 1.15;
          op *= clamp(iv * 3, 0, 1);

          if (op <= 0.003) {
            if (c.style.visibility !== "hidden") c.style.visibility = "hidden";
            continue;
          }
          if (c.style.visibility !== "visible") c.style.visibility = "visible";
          c.style.opacity = op.toFixed(3);
          c.style.zIndex = z;
          c.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotateX(${rx.toFixed(2)}deg) scale(${s.toFixed(4)})`;
          // inner art drifts a touch against the card (parallax), captions only read on the front card
          arts[i].style.transform = `translate3d(0, ${(clamp(d, -1.5, 3) * -16).toFixed(1)}px, 0) scale(1.12)`;
          caps[i].style.opacity = (1 - clamp(d * 2.4, 0, 1)).toFixed(3);
          shades[i].style.opacity = clamp(d * 0.13, 0, 0.55).toFixed(3);
          sheens[i].style.transform = `translate3d(${(clamp(d, -1.2, 1.2) * 90).toFixed(1)}%, 0, 0)`;
        }

        // rail
        const p = t / (N - 1);
        if (fillRef.current) fillRef.current.style.transform = `scaleY(${p.toFixed(4)})`;
        if (dotRef.current) dotRef.current.style.top = `${(p * 100).toFixed(3)}%`;
        const a = clamp(Math.round(te), 0, N - 1);
        if (a !== current) {
          current = a;
          setActive(a);
          el.style.setProperty("--glow", CARDS[a].glow);
        }
      };

      layout();
      render();
      document.fonts?.ready.then(() => { layout(); render(); });

      /* ---- the pinned scroll ---- */
      if (!reduce) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${Math.round((N - 1) * window.innerHeight * 0.85 + window.innerHeight * 0.25)}`,
            pin: true,
            scrub: lite ? 0.2 : 0.35,       // Lenis already glides the scroll itself; a long scrub on top only adds trailing latency
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefreshInit: layout,
          },
        });
        st = tl.scrollTrigger;
        tl.to(prog, { t: N - 1, duration: 0.9, ease: "none", onUpdate: render });
        tl.to({}, { duration: 0.1 }); // hold on the last card
      }

      /* ---- entrance: the cards fall in, the headline letters drop ---- */
      const letters = gsap.utils.toArray("[data-letter]", el);
      const enterEls = gsap.utils.toArray("[data-enter]", el);
      let cardsIn = false, textOn = false;
      const playCards = () => {
        if (cardsIn) return;
        cardsIn = true;
        gsap.to(intro, { v: 1, duration: 1.25, ease: "power3.out", stagger: { each: 0.085, from: "end" }, onUpdate: render });
      };
      /* the headline + copy replay every time the section comes back into view */
      const playText = () => {
        if (textOn) return;
        textOn = true;
        gsap.killTweensOf(letters); gsap.killTweensOf(enterEls);
        gsap.fromTo(letters, { yPercent: -150, rotate: -16, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 1.1, ease: "bounce.out", stagger: 0.05, delay: 0.15 });
        gsap.fromTo(enterEls, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.1 });
      };
      const resetText = () => {
        if (!textOn) return;
        textOn = false;
        gsap.killTweensOf(letters); gsap.killTweensOf(enterEls);
        gsap.set(letters, { autoAlpha: 0 });
        gsap.set(enterEls, { autoAlpha: 0 });
      };
      if (!reduce) {
        gsap.set(letters, { autoAlpha: 0 });
        gsap.set(enterEls, { autoAlpha: 0 });
        const io = new IntersectionObserver((es) => {
          for (const x of es) {
            if (el.hasAttribute("data-tx")) continue;          // the work transition is still revealing the page; it fires ff:reveal itself
            if (x.intersectionRatio >= 0.25) { playCards(); playText(); }
            else if (!x.isIntersecting) resetText();
          }
        }, { threshold: [0, 0.25] });
        io.observe(el);
        const onReveal = () => { playCards(); playText(); };
        window.addEventListener("ff:reveal", onReveal);
        cleanups.push(() => { io.disconnect(); window.removeEventListener("ff:reveal", onReveal); });
      }

      /* ---- pointer: the vanishing point drifts a little with the cursor ---- */
      const po = { x: 50, y: 40 };
      const onMove = (e) => {
        if (mobile) return;
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(po, {
          x: 50 + nx * 22,
          y: 40 + ny * 16,
          duration: 0.9,
          ease: "power3.out",
          overwrite: true,
          onUpdate: () => (deck.style.perspectiveOrigin = `${po.x.toFixed(1)}% ${po.y.toFixed(1)}%`),
        });
      };
      el.addEventListener("pointermove", onMove);
      cleanups.push(() => el.removeEventListener("pointermove", onMove));

      /* ---- the button: scroll to the next card ---- */
      api.current.step = (dir = 1) => {
        if (!st) return;
        const at = Math.round(prog.t);
        const to = clamp(at + dir, 0, N - 1);
        const span = st.end - st.start;
        const target = st.start + ((to / (N - 1)) * 0.9 * span);
        window.scrollTo({ top: target, behavior: "smooth" });
      };

      const ro = new ResizeObserver(() => {
        layout();
        render();
      });
      ro.observe(el);
      cleanups.push(() => ro.disconnect());
    }, el);

    return () => {
      cleanups.forEach((f) => f());
      ctx.revert();
    };
  }, []);

  /* ---- liveliness: pointer depth rig + count-up stats ---- */
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const clean = [];

    // stats count up whenever the page is revealed / re-entered
    const nums = [...el.querySelectorAll("[data-count]")];
    const count = () => {
      nums.forEach((n, k) => {
        const to = +n.dataset.count, o = { v: 0 };
        if (reduce) { n.textContent = String(to).padStart(2, "0"); return; }
        n.textContent = "00";
        gsap.to(o, { v: to, duration: 1.3, delay: 0.55 + k * 0.12, ease: "power3.out", onUpdate: () => { n.textContent = String(Math.round(o.v)).padStart(2, "0"); } });
      });
    };
    window.addEventListener("ff:reveal", count);
    clean.push(() => window.removeEventListener("ff:reveal", count));
    const io = new IntersectionObserver((es) => { for (const x of es) { if (el.hasAttribute("data-tx")) continue; if (x.intersectionRatio >= 0.25) { if (!el._counted) { el._counted = true; count(); } } else if (!x.isIntersecting) el._counted = false; } }, { threshold: [0, 0.25] });
    io.observe(el);
    clean.push(() => io.disconnect());

    // pointer parallax: deck tilts toward the cursor, text / aurora / orbits drift at their own depths, a soft light follows
    if (!reduce && fine) {
      const deck = el.querySelector(".ff-deck"), left = el.querySelector(".ff-left"), spot = el.querySelector(".ff-spot");
      const aurA = el.querySelector(".ff-aur--a"), aurB = el.querySelector(".ff-aur--b"), orbit = el.querySelector(".ff-orbit"), ghostW = el.querySelector(".ff-ghost-word");
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, vis = false;
      /* every layer is moved with its own inline transform: no CSS variable ever changes, so the browser never has to
         re-style the (large) subtree under the deck while the pointer moves */
      const loop = () => {
        raf = 0;
        cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
        if (el.clientWidth > 900) {
          deck && (deck.style.translate = `${(cx * 14).toFixed(1)}px ${(cy * 8).toFixed(1)}px`);
          left && (left.style.translate = `${(-cx * 10).toFixed(1)}px calc(-50% + ${(-cy * 6).toFixed(1)}px)`);
          aurA && (aurA.style.translate = `${(-cx * 60).toFixed(0)}px ${(-cy * 40).toFixed(0)}px`);
          aurB && (aurB.style.translate = `${(cx * 70).toFixed(0)}px ${(cy * 50).toFixed(0)}px`);
          orbit && (orbit.style.translate = `${(cx * 26).toFixed(0)}px ${(cy * 18).toFixed(0)}px`);
          ghostW && (ghostW.style.translate = `${(-cx * 40).toFixed(0)}px 0`);
        }
        if (spot) spot.style.translate = `${((cx + 0.5) * el.clientWidth - 450).toFixed(0)}px ${((cy + 0.5) * el.clientHeight - 450).toFixed(0)}px`;
        if (vis && (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002)) raf = requestAnimationFrame(loop);
      };
      const onMove = (e) => { const r = el.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (vis && !raf) raf = requestAnimationFrame(loop); };
      const vio = new IntersectionObserver(([x]) => { vis = x.isIntersecting; el.classList.toggle("is-live", vis); if (vis && !raf) raf = requestAnimationFrame(loop); }, { threshold: 0.05 });
      vio.observe(el);
      window.addEventListener("pointermove", onMove, { passive: true });
      clean.push(() => { window.removeEventListener("pointermove", onMove); vio.disconnect(); cancelAnimationFrame(raf); });
    } else {
      const vio = new IntersectionObserver(([x]) => el.classList.toggle("is-live", x.isIntersecting), { threshold: 0.05 });
      vio.observe(el); clean.push(() => vio.disconnect());
    }
    return () => clean.forEach((f) => f());
  }, []);

  const c = CARDS[active];

  return (
    <section ref={root} className="ff" aria-label="Career journey - Where I’ve Worked">
      <div className="ff-bg" aria-hidden="true" />
      <div className="ff-glow" aria-hidden="true" />
      <div className="ff-deco" aria-hidden="true">
        <i className="ff-aur ff-aur--a" />
        <i className="ff-aur ff-aur--b" />
        <i className="ff-dots" />
        <i className="ff-spot" />
        {SPARKS.map((k, q) => (<i key={q} className="ff-spark" style={{ "--x": k[0] + "%", "--s": k[1] + "px", "--t": k[2] + "s", "--d": "-" + k[3] + "s", "--w": k[4] + "vw" }} />))}
        <i className="ff-tick-c ff-tick-c--tl" /><i className="ff-tick-c ff-tick-c--tr" /><i className="ff-tick-c ff-tick-c--bl" /><i className="ff-tick-c ff-tick-c--br" />
        <span className="ff-side ff-side--l">Experience &mdash; 2025 / 26</span>
        <span className="ff-ghost-word">Experience</span>
        <div className="ff-orbit"><i className="ff-orb ff-orb--a"><u /></i><i className="ff-orb ff-orb--b"><u /></i><i className="ff-orb ff-orb--c" /></div>
        <div className="ff-ticker">
          <div className="ff-ticker-t">
            {[0, 1].map((k) => (
              <span key={k}>
                {["East Central Railway", "Seven Hills National", "Infosys", "IISPPR"].map((n, q) => (
                  <em key={n}>{n}<b>{["IT Intern", "Web Developer", "iOS Developer", "Head of Research"][q]}</b></em>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ff-left">
        <div className="ff-eyebrow" data-enter>
          <i />
          <span>Career Journey · Internships</span>
        </div>
        <h2 className="ff-title" aria-label="Where I’ve Worked">
          <span className="ff-in" aria-hidden="true">
            {LINE1.split("").map((ch, i) => (
              <span key={i} className="ff-letter" data-letter>
                {ch}
              </span>
            ))}
          </span>
          <span className="ff-fall" aria-hidden="true">
            {WORD.map((ch, i) => (
              <span key={i} className="ff-letter" data-letter style={{ color: WORD_COLORS[i], "--i": i }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </span>
        </h2>
        <p className="ff-lede" data-enter>
          A closer look at the teams I've joined, the problems I've worked on, and the experience I've gained along the way.
        </p>
        <ol className="ff-index" data-enter aria-label="Internships">
          {CARDS.map((card, i) => (
            <li key={card.n}>
              <button type="button" className={i === active ? "is-on" : ""} onClick={() => api.current.step(i - active)}>
                <span className="ff-ix-n">{pad(i + 1)}</span>
                <span className="ff-ix-c">{card.short || card.n}</span>
                <span className="ff-ix-y">{card.yr || ""}</span>
              </button>
            </li>
          ))}
        </ol>
        <dl className="ff-stats" data-enter>
          <div><dt data-count="4">04</dt><dd>Internships</dd></div>
          <div><dt data-count="4">04</dt><dd>Organisations</dd></div>
          <div><dt data-count="3">03</dt><dd>Work modes</dd></div>
        </dl>
      </div>

      <div ref={deckRef} className="ff-deck">
        {CARDS.map((card, i) => (
          <article key={card.n} style={card.theme ? { "--g": card.theme[0] } : undefined} className={`ff-card${card.company ? " ff-card--job" : ""}`} data-card aria-label={card.company ? `${card.n} - ${card.company}` : `${card.n} - ${card.tag}`}>
            {card.theme ? (
              <div className="ff-art ff-art--job" data-art style={{ "--c1": card.theme[0], "--c2": card.theme[1], "--c3": card.theme[2] }}>
                <i className="ff-beam" />
                <i className="ff-gridl" />
                <span className="ff-motif">{MOTIFS[i]}</span>
                <i className="ff-ring ff-ring--a" />
                <i className="ff-ring ff-ring--b" />
                <b className="ff-ghost">{pad(i + 1)}</b>
                <i className="ff-grain" />
                <i className="ff-streak" />
              </div>
            ) : (
              <div className="ff-art" data-art style={{ backgroundImage: `url(${BASE}freefall/${pad(card.art)}.jpg)` }} />
            )}
            <i className="ff-sheen" data-sheen />
            <i className="ff-shade" data-shade />
            <span className="ff-chip">
              {pad(i + 1)} / {pad(N)}
            </span>
            <span className="ff-tag">{card.tag}</span>
            {card.company ? (
              <div className="ff-cap ff-cap--job" data-cap>
                <div className="ff-org">
                  <img decoding="async" className={`ff-logo${card.sq ? " ff-logo--sq" : ""}`} src={`${BASE}freefall/${card.logo}`} alt="" draggable="false" />
                  <div>
                    <b>{card.company}</b>
                    <small>{card.kind} &middot; {card.when}</small>{card.place && <small className="ff-place">{card.place}</small>}
                  </div>
                </div>
                <h3>{card.n}</h3>
                <p>{card.text}</p>
              </div>
            ) : (
              <div className="ff-cap" data-cap>
                <small>Chapter {pad(i + 1)}</small>
                <h3>{card.n}</h3>
                <p>{card.text}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="ff-pager" role="tablist" aria-label="Choose an internship">
        {CARDS.map((card, i) => (
          <button key={card.n} type="button" role="tab" aria-selected={i === active} aria-label={`${pad(i + 1)} ${card.short || card.n}`} className={i === active ? "is-on" : ""} onClick={() => api.current.step(i - active)} />
        ))}
      </div>

      <aside className="ff-rail" aria-hidden="true">
        <div className="ff-num">
          <span key={active} className="ff-num-in">
            {pad(active + 1)}
          </span>
          <small>/{pad(N)}</small>
        </div>
        <div className="ff-line">
          <i ref={fillRef} className="ff-line-fill" />
          {CARDS.map((_, i) => (
            <b key={i} className="ff-tick" style={{ top: `${(i / (N - 1)) * 100}%` }} />
          ))}
          <em ref={dotRef} className="ff-dot" />
        </div>
        <div className="ff-name">
          <span key={active}>{c.rail || c.n}</span>
        </div>
      </aside>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { pendingTasks, startStory } from "../../lib/loader.js";
import "./loader.css";

/**
 * <Loader /> — full-screen intro: a spirograph is traced by a glowing comet while planets orbit it and the counter climbs.
 * It stays up for at least MIN ms AND until every registered loader task (landing scene, fonts…) is done, so when the curtain
 * opens everything underneath is already built and warm. Only transforms / opacity / stroke-dashoffset are animated.
 */
const MIN = 6600;     // shortest time the loader is shown (ms): long enough to read the prologue
const MAX = 15000;    // never trap the visitor longer than this
const STEPS = ["Warming up the glass", "Spinning up the orbit", "Tracing the curve", "Almost there"];
// the prologue: one line at a time (ms after the loader appears), the last one lands when everything is ready
const STORY = [
  { at: 0,    t: "Every story has a beginning." },
  { at: 1700, t: "This one starts far above the clouds," },
  { at: 3400, t: "on a pale blue dot, in the dark." },
  { at: 5100, t: "Somewhere down there, I build things." },
  { at: -1,   t: "Let\u2019s go home." },
];
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * 100, y: r(2) * 100, s: 1 + r(3) * 1.8, d: 2 + r(4) * 4, o: -r(5) * 6 };
});
const SATS = [
  { c: "#ff6b8b", r: 118, s: 14, d: 7, o: 0 }, { c: "#ffc233", r: 148, s: 11, d: 10, o: -3 }, { c: "#3ddc97", r: 176, s: 16, d: 13, o: -6 },
  { c: "#b07bff", r: 132, s: 9, d: 9, o: -5, rev: 1 }, { c: "#4fd1ff", r: 188, s: 10, d: 16, o: -2, rev: 1 },
];

// hypotrochoid (R=5, r=3, d=5): a closed, flower-like spirograph after 3 turns
function spiro() {
  const R = 5, r = 3, d = 5, S = 30, pts = [];
  for (let i = 0; i <= 720; i++) {
    const t = (i / 720) * Math.PI * 6;
    pts.push([(R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t), (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)]);
  }
  return "M" + pts.map(([x, y]) => `${(x * S * 0.78).toFixed(1)} ${(y * S * 0.78).toFixed(1)}`).join("L");
}

export default function Loader() {
  const [gone, setGone] = useState(false);
  const [out, setOut] = useState(false);
  const curve = useRef(null);
  const glow = useRef(null);
  const pen = useRef(null);
  const num = useRef(null);
  const bar = useRef(null);
  const cap = useRef(null);
  const lines = useRef([]);
  const d = useMemo(spiro, []);

  useEffect(() => {
    const p = curve.current, g = glow.current;
    const len = p.getTotalLength();
    const N = 240, table = [];
    for (let i = 0; i <= N; i++) table.push(p.getPointAtLength((len * i) / N));
    [p, g].forEach((e) => { e.style.strokeDasharray = `${len} ${len + 4}`; e.style.strokeDashoffset = String(len); });
    const t0 = performance.now();
    let shown = 0, raf = 0, leaving = false, step = -1, doneAt = 0, lastPct = -1, line = -1;
    const showLine = (i) => {
      if (i === line) return;
      line = i;
      lines.current.forEach((el, k) => { if (el) el.className = "ld-line" + (k === i ? " on" : k < i ? " past" : ""); });
    };
    const loop = (now) => {
      const el = now - t0;
      const ready = el >= MIN && pendingTasks() === 0;
      // steady climb to 92%; the last stretch only once the page is truly ready (or we ran out of patience)
      let target = Math.min(0.92, (el / MIN) * 0.92);
      if (ready || el > MAX) target = 1; else if (el > MIN) target = Math.min(0.985, 0.92 + (el - MIN) / 40000);
      shown += (target - shown) * 0.12;
      if (target === 1 && shown > 0.995) shown = 1;

      p.style.strokeDashoffset = String(len * (1 - shown));
      // the glow is a short bright segment that rides on the head of the curve
      g.style.strokeDasharray = `${len * 0.06} ${len * 2}`;
      g.style.strokeDashoffset = String(-(len * shown - len * 0.06));
      const fi = Math.max(0, Math.min(N - 1, shown * N)), i0 = Math.floor(fi), f = fi - i0;
      const a = table[i0], b2 = table[i0 + 1];
      if (pen.current) { pen.current.setAttribute("cx", (a.x + (b2.x - a.x) * f).toFixed(1)); pen.current.setAttribute("cy", (a.y + (b2.y - a.y) * f).toFixed(1)); }
      const pct = Math.round(shown * 100);
      if (pct !== lastPct && num.current) { lastPct = pct; num.current.textContent = String(pct).padStart(3, "0"); }
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`;
      // prologue: time-driven, the final line waits for the page to actually be ready
      let li = 0;
      for (let k = 0; k < STORY.length - 1; k++) if (el >= STORY[k].at) li = k;
      if (shown >= 0.985 && !ready && el < MAX) li = Math.min(li, STORY.length - 2);
      if (shown >= 0.985 && (ready || el >= MAX)) li = STORY.length - 1;
      showLine(li);
      const si = Math.min(STEPS.length - 1, Math.floor(shown * STEPS.length));
      if (si !== step && cap.current) { step = si; cap.current.textContent = STEPS[si]; }

      if (shown >= 1 && !leaving) {
        if (!doneAt) doneAt = now;
        if (now - doneAt > 1300) {           // hold "let's go home" for a beat
          leaving = true;
          setOut(true);
          startStory();                       // the curtain opens onto the Earth: the story carries on from here
          setTimeout(() => setGone(true), 1700);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (gone) return null;
  return (
    <div className={"ld" + (out ? " ld--out" : "")} role="status" aria-label="Loading portfolio">
      <div className="ld-flash" aria-hidden="true" />
      <div className="ld-panel ld-top" />
      <div className="ld-panel ld-bot" />
      <div className="ld-grid" aria-hidden="true">
        {[16, 50, 84].map((x) => <i key={x} className="v" style={{ left: x + "%" }} />)}
        {[33, 67].map((y) => <i key={y} className="h" style={{ top: y + "%" }} />)}
      </div>
      <div className="ld-body">
        <div className="ld-top-row"><span>PROLOGUE</span><span>13.08°N · 80.27°E</span></div>
        <div className="ld-stars" aria-hidden="true">
          {STARS.map((s, i) => <i key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.s, height: s.s, animationDuration: s.d + "s", animationDelay: s.o + "s" }} />)}
        </div>
        <div className="ld-orbit" aria-hidden="true">
          <i className="ld-ring r1" /><i className="ld-ring r2" /><i className="ld-ring r3" />
          {SATS.map((s, i) => (
            <span key={i} className={"ld-sat" + (s.rev ? " rev" : "")} style={{ animationDuration: s.d + "s", animationDelay: s.o + "s" }}>
              <b style={{ transform: `translateX(${s.r}px)`, width: s.s, height: s.s, background: s.c, marginLeft: -s.s / 2, marginTop: -s.s / 2 }} />
            </span>
          ))}
          <svg className="ld-svg ld-spin" viewBox="-200 -200 400 400">
            <defs>
              <linearGradient id="ldInk" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#4f7dff" /><stop offset=".5" stopColor="#8b5cff" /><stop offset="1" stopColor="#ff6b8b" />
              </linearGradient>
            </defs>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path ref={curve} d={d} stroke="url(#ldInk)" strokeWidth="2.2" />
              <path ref={glow} d={d} stroke="#fff" strokeWidth="5" opacity=".9" />
            </g>
            <circle ref={pen} r="6" cx="0" cy="0" fill="#fff" stroke="#8b5cff" strokeWidth="2.5" />
          </svg>
          <div className="ld-core"><span className="ld-num"><b ref={num}>000</b>%</span></div>
        </div>
        <div className="ld-story" aria-live="polite">
          {STORY.map((l, i) => <p key={i} ref={(el) => (lines.current[i] = el)} className="ld-line">{l.t}</p>)}
        </div>
        <div className="ld-meta"><span ref={cap} className="ld-cap">Warming up the glass</span></div>
        <div className="ld-bar"><i ref={bar} /></div>
      </div>
    </div>
  );
}

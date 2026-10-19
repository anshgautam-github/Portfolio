import { useEffect, useRef, useState } from "react";
import { NAME_PATHS, MASK_W, MASK_H } from "../Landing/helloPath.js";
import { pendingTasks, release } from "../../lib/loader.js";
import "./loader.css";

/**
 * <Loader /> — full-screen intro. The name "ansh" is handwritten by a pen while stickers rain behind it and a counter climbs.
 * It stays up for at least MIN ms AND until every registered loader task (landing scene, fonts…) is done, so when the curtain
 * opens everything underneath is already built and warm. Only transforms / opacity / stroke-dashoffset are animated.
 */
const MIN = 2800;     // shortest time the loader is shown (ms)
const MAX = 9000;     // never trap the visitor longer than this
const STEPS = ["Warming up the glass", "Dropping the stickers", "Inking the name", "Almost there"];
const DROPS = [
  { c: "#ff6b8b", x: 8, s: 34, d: 3.6, l: 0 }, { c: "#ffc233", x: 22, s: 26, d: 4.4, l: 0.9 }, { c: "#5b8cff", x: 37, s: 40, d: 3.9, l: 0.3 },
  { c: "#3ddc97", x: 52, s: 28, d: 4.8, l: 1.5 }, { c: "#b07bff", x: 66, s: 36, d: 3.7, l: 0.6 }, { c: "#ff8a3d", x: 80, s: 30, d: 4.5, l: 1.2 },
  { c: "#4fd1ff", x: 92, s: 38, d: 4.1, l: 0.1 },
];

export default function Loader() {
  const [gone, setGone] = useState(false);
  const [out, setOut] = useState(false);
  const paths = useRef([]);
  const pen = useRef(null);
  const num = useRef(null);
  const bar = useRef(null);
  const cap = useRef(null);

  useEffect(() => {
    const els = paths.current.filter(Boolean);
    const lens = els.map((p) => p.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0);
    els.forEach((p, i) => { p.style.strokeDasharray = `${lens[i]} ${lens[i] + 4}`; p.style.strokeDashoffset = String(lens[i]); });
    const t0 = performance.now();
    let shown = 0, raf = 0, leaving = false, step = -1, doneAt = 0;
    const loop = (now) => {
      const el = now - t0;
      const ready = el >= MIN && pendingTasks() === 0;
      // target: a steady climb to 92%, the last stretch only once the page is truly ready (or we ran out of patience)
      let target = Math.min(0.92, (el / MIN) * 0.92);
      if (ready || el > MAX) target = 1; else if (el > MIN) target = Math.min(0.985, 0.92 + (el - MIN) / 40000);
      shown += (target - shown) * 0.12;
      if (target === 1 && shown > 0.995) shown = 1;

      // pen
      let acc = shown * total, penPt = null;
      for (let i = 0; i < els.length; i++) {
        const l = Math.max(0, Math.min(1, (acc - 0) / lens[i]));
        els[i].style.strokeDashoffset = String(lens[i] * (1 - l));
        if (l > 0 && l < 1) penPt = els[i].getPointAtLength(lens[i] * l);
        acc -= lens[i];
      }
      if (pen.current) {
        if (penPt) { pen.current.setAttribute("cx", penPt.x); pen.current.setAttribute("cy", penPt.y); pen.current.style.opacity = "1"; }
        else pen.current.style.opacity = "0";
      }
      const pct = Math.round(shown * 100);
      if (num.current) num.current.textContent = String(pct).padStart(3, "0");
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`;
      const si = Math.min(STEPS.length - 1, Math.floor(shown * STEPS.length));
      if (si !== step && cap.current) { step = si; cap.current.textContent = STEPS[si]; }

      if (shown >= 1 && !leaving) {
        if (!doneAt) doneAt = now;
        if (now - doneAt > 280) {            // hold the finished signature for a beat
          leaving = true;
          setOut(true);
          release();                          // page underneath starts its intro as the curtain opens
          setTimeout(() => setGone(true), 1500);
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
      <div className="ld-panel ld-top" />
      <div className="ld-panel ld-bot" />
      <div className="ld-grid" aria-hidden="true">
        {[16, 50, 84].map((x) => <i key={x} className="v" style={{ left: x + "%" }} />)}
        {[33, 67].map((y) => <i key={y} className="h" style={{ top: y + "%" }} />)}
      </div>
      <div className="ld-drops" aria-hidden="true">
        {DROPS.map((d, i) => (
          <i key={i} style={{ left: d.x + "%", width: d.s, height: d.s, background: d.c, animationDuration: d.d + "s", animationDelay: d.l + "s" }} />
        ))}
      </div>
      <div className="ld-body">
        <div className="ld-top-row"><span>PORTFOLIO</span><span>2026</span></div>
        <svg className="ld-sig" viewBox={`0 0 ${MASK_W} ${MASK_H}`} aria-hidden="true">
          <defs>
            <linearGradient id="ldInk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b9bff" /><stop offset="1" stopColor="#2f5fe0" /></linearGradient>
          </defs>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {NAME_PATHS.map((d, i) => <path key={"g" + i} ref={(e) => (paths.current[i] = e)} d={d} stroke="url(#ldInk)" strokeWidth="46" />)}
          </g>
          <circle ref={pen} r="30" cx="0" cy="0" fill="#fff" stroke="#2f5fe0" strokeWidth="9" style={{ opacity: 0 }} />
        </svg>
        <div className="ld-meta">
          <span ref={cap} className="ld-cap">Warming up the glass</span>
          <span className="ld-num"><b ref={num}>000</b>%</span>
        </div>
        <div className="ld-bar"><i ref={bar} /></div>
      </div>
    </div>
  );
}

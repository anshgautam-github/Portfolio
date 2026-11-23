import { useEffect, useRef, useState } from "react";
import { pendingTasks } from "../../lib/loader.js";
import { score } from "../../lib/score.js";
import "./preloader.css";

/**
 * <Preloader /> - the counter screen that covers the page BEFORE the main loader.
 *
 * Black stage, a hairline crop-mark grid, one very large counter and a quiet status line. The percentage is the real load progress (typefaces, page
 * assets and the registered loader tasks; it can only ever go up, 000 -> 100). The counter is a true odometer: each digit is a strip that rolls when
 * the count carries. The grid is lit from underneath by a soft spotlight that widens with the progress and drifts toward the pointer. At 100 the
 * number settles, the status reads READY and the whole screen lifts away onto the main loader (which has been mounting underneath meanwhile).
 *
 * Cheap on purpose: three transforms and a handful of CSS variables per frame; no blur, no blend modes, nothing that repaints the page.
 */
const MIN_MS = 2600;      // never faster than this, so the count can actually be read
const MAX_MS = 9000;      // never stuck: after this the count completes regardless
const LAUNCH_MS = 950;    // 100 reached -> the screen starts to lift (the main loader mounts underneath meanwhile)

const STAGES = [
  [0, "Booting up"],
  [14, "Loading typefaces"],
  [40, "Assembling scenes"],
  [70, "Almost there..."],
  [96, "Ready"],
];
const TICKS = 21;
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];   // the last 0 repeats the first so the 9 -> 0 roll never has to jump back

const snap = (u) => { const x = Math.max(0, Math.min(1, (u - 0.4) / 0.6)); return x * x * (3 - 2 * x); };   // dwell on the digit, then roll
// position (in digits) of the strip for decimal place k: the integer digit plus the roll, which only happens on the last unit before a carry
const place = (v, k) => {
  const f = Math.floor(v), p = Math.pow(10, k), roll = k === 0 || f % p === p - 1 ? snap(v - f) : 0;
  return (Math.floor(v / p) % 10) + roll;
};

function Digit({ refEl }) {
  return (
    <span className="pl-dg" aria-hidden="true">
      <span className="pl-strip" ref={refEl}>
        {STRIP.map((d, i) => <span className={d === 0 ? "z" : undefined} key={i}>{d}</span>)}
      </span>
    </span>
  );
}

export default function Preloader({ onReady }) {
  const [gone, setGone] = useState(false);
  const rootRef = useRef(null), barRef = useRef(null), stageRef = useRef(null), clockRef = useRef(null), pctRef = useRef(null);
  const dRefs = [useRef(null), useRef(null), useRef(null)], tickRefs = useRef([]);

  useEffect(() => {
    const root = rootRef.current;
    const t0 = performance.now();
    let fontsDone = !(document.fonts && document.fonts.ready), maxTasks = 0, raf = 0, v = 0, finished = false, tFade = 0, tGone = 0, shownN = -1, stageIdx = -1;
    if (!fontsDone) document.fonts.ready.then(() => { fontsDone = true; }, () => { fontsDone = true; });

    // pointer-led spotlight: it drifts on its own when the pointer is idle
    const ptr = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5, last: -99 };
    const onMove = (e) => { ptr.x = e.clientX / window.innerWidth; ptr.y = e.clientY / window.innerHeight; ptr.last = performance.now(); };
    window.addEventListener("pointermove", onMove, { passive: true });

    // local time in Chennai, quietly ticking in the corner
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
    const clock = () => { if (clockRef.current) clockRef.current.textContent = fmt.format(new Date()) + " IST"; };
    clock(); const ci = setInterval(clock, 15000);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const el = now - t0;
      const pend = pendingTasks(); if (pend > maxTasks) maxTasks = pend;
      const tasksFrac = maxTasks ? 1 - pend / maxTasks : (el > 800 ? 1 : 0);
      const loaded = document.readyState === "complete";
      const real = 0.3 * (fontsDone ? 1 : 0) + 0.2 * (loaded ? 1 : 0) + 0.5 * tasksFrac;
      const allReal = fontsDone && loaded && pend === 0 && el > 800;
      let target = Math.min(el / MIN_MS, real) * 100;
      const ready = allReal && el >= MIN_MS;
      if (!ready && el < MAX_MS) target = Math.min(target, 96);   // 97-100 only once everything is truly ready
      else target = 100;
      target = Math.max(0, Math.min(100, target));
      // it only ever moves forward: an easing approach to the real target, quicker for the last stretch once everything is ready
      const k = target >= 100 ? 0.3 : 0.12;
      const step = (target - v) * k + (target > v ? (target >= 100 ? 0.6 : 0.12) : 0);
      v = Math.min(target, Math.max(v, v + step));
      const vv = Math.min(100, v + 0.0001);

      // odometer
      for (let i = 0; i < 3; i++) {
        const s = dRefs[i].current; if (s) s.style.transform = "translate3d(0," + (-place(vv, 2 - i) / 11 * 100).toFixed(3) + "%,0)";
      }
      // spotlight: radius grows with the load, centre eases toward the pointer (or wanders slowly when idle)
      const idle = now - ptr.last > 2500, tx = idle ? 0.5 + 0.12 * Math.sin(now * 0.0004) : ptr.x, ty = idle ? 0.5 + 0.08 * Math.sin(now * 0.0006 + 1) : ptr.y;
      ptr.sx += (tx - ptr.sx) * 0.05; ptr.sy += (ty - ptr.sy) * 0.05;
      root.style.setProperty("--mx", (ptr.sx * 100).toFixed(2) + "%"); root.style.setProperty("--my", (ptr.sy * 100).toFixed(2) + "%");
      root.style.setProperty("--rad", (150 + (vv / 100) * 560).toFixed(0) + "px");
      if (barRef.current) barRef.current.style.transform = "scaleX(" + (v / 100).toFixed(4) + ")";
      score.setTension(v / 100 * 0.6);                              // the score tightens as the count climbs

      const n = Math.max(0, Math.min(100, Math.floor(v + 0.0001)));
      if (n !== shownN) {
        shownN = n;
        if (pctRef.current) pctRef.current.textContent = String(n).padStart(3, "0");
        let si = 0; for (let i = 0; i < STAGES.length; i++) if (n >= STAGES[i][0]) si = i;
        if (si !== stageIdx) {
          stageIdx = si;
          const sEl = stageRef.current;
          if (sEl) { sEl.textContent = STAGES[si][1]; sEl.classList.remove("is-swap"); void sEl.offsetWidth; sEl.classList.add("is-swap"); }
        }
        const lit = Math.floor(n / (100 / (TICKS - 1)) + 0.0001);
        tickRefs.current.forEach((t, i) => { if (t) t.classList.toggle("on", i <= lit && n > 0); });
      }
      if (n >= 100 && !finished) {
        finished = true;
        cancelAnimationFrame(raf);
        score.impact(0.8);                                        // the count lands on 100: a low hit under the lifting screen
        root.classList.add("is-launch");                          // the number settles on 100, the status reads Ready, the grid flares
        onReady && onReady();                                     // mount the main loader underneath while this screen is still up
        tFade = setTimeout(() => { if (rootRef.current) rootRef.current.classList.add("is-out"); window.dispatchEvent(new Event("pl:out")); }, LAUNCH_MS);   // the screen lifts away now
        tGone = setTimeout(() => setGone(true), LAUNCH_MS + 1000);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(tFade); clearTimeout(tGone); clearInterval(ci); window.removeEventListener("pointermove", onMove); };
  }, [onReady]);

  if (gone) return null;
  return (
    <div className="pl" ref={rootRef} role="status" aria-label="Loading">
      <i className="pl-grid" aria-hidden="true" />
      <i className="pl-grid pl-grid--hot" aria-hidden="true" />
      <i className="pl-vig" aria-hidden="true" />
      <i className="pl-scan" aria-hidden="true" />
      <i className="pl-rail pl-rail--l" aria-hidden="true" /><i className="pl-rail pl-rail--r" aria-hidden="true" />

      <div className="pl-top">
        <div className="pl-name">Ansh Gautam</div>
        <div className="pl-role"><i aria-hidden="true" /><span>[ AI engineer ]</span></div>
      </div>
      <div className="pl-top pl-top--r" aria-hidden="true"><span>Portfolio &rsquo;26</span><span ref={clockRef}>--:-- IST</span></div>

      <div className="pl-ruler" aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => <i key={i} ref={(el) => (tickRefs.current[i] = el)} className={i % 5 === 0 ? "major" : undefined} />)}
      </div>

      <div className="pl-count" aria-hidden="true">
        <Digit refEl={dRefs[0]} /><Digit refEl={dRefs[1]} /><Digit refEl={dRefs[2]} />
      </div>
      <span className="pl-sr" ref={pctRef}>000</span>

      <div className="pl-bottom">
        <div className="pl-status">[ <span ref={stageRef} className="is-swap">{STAGES[0][1]}</span> ]</div>
        <div className="pl-line" aria-hidden="true"><i ref={barRef} /></div>
      </div>
      <div className="pl-bottom pl-bottom--r" aria-hidden="true"><span>Chennai, India</span><span>AI &amp; Engineering</span></div>
    </div>
  );
}

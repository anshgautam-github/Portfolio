import { useEffect, useRef, useState } from "react";
import { pendingTasks } from "../../lib/loader.js";
import "./preloader.css";

/**
 * <Preloader /> - a very light counter (000 -> 100) that covers the page BEFORE the main loader.
 * It does almost no work itself (one text node + one transform per frame), so the heavy things (fonts, the landing's WebGL scene, the
 * loader's engine) can prepare behind it without a janky first impression. The main loader is mounted only when the count reaches 100
 * (onReady), and the counter then fades away on top of it, so the hand-over is seamless.
 * The count is real: fonts + page load + the landing's loader tasks, with a small minimum time so it never just flashes.
 */
const MIN_MS = 1700;      // never faster than this
const MAX_MS = 9000;      // never stuck: after this the count completes regardless
const HOLD_MS = 420;      // stay on screen this long after 100 so the main loader can mount underneath

export default function Preloader({ onReady }) {
  const [gone, setGone] = useState(false);
  const rootRef = useRef(null), numRef = useRef(null), barRef = useRef(null);

  useEffect(() => {
    const t0 = performance.now();
    let fontsDone = !(document.fonts && document.fonts.ready), maxTasks = 0, raf = 0, v = 0, finished = false, tFade = 0, tGone = 0;
    if (!fontsDone) document.fonts.ready.then(() => { fontsDone = true; }, () => { fontsDone = true; });
    let last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 32) return; last = now;   // 30 fps is plenty for a number
      const el = now - t0;
      const pend = pendingTasks(); if (pend > maxTasks) maxTasks = pend;
      const tasksFrac = maxTasks ? 1 - pend / maxTasks : (el > 800 ? 1 : 0);
      const loaded = document.readyState === "complete";
      const real = 0.3 * (fontsDone ? 1 : 0) + 0.2 * (loaded ? 1 : 0) + 0.5 * tasksFrac;
      const allReal = fontsDone && loaded && pend === 0 && el > 800;
      let target = Math.min(el / MIN_MS, real) * 100;
      if (!(allReal && el >= MIN_MS) && el < MAX_MS) target = Math.min(target, 96);   // 97-100 only once everything is truly ready
      else target = 100;
      v += (target - v) * 0.16 + (target > v ? 0.15 : 0);
      if (v > target) v = target;
      const n = Math.min(100, Math.round(v));
      if (numRef.current) numRef.current.textContent = String(n).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = "scaleX(" + (v / 100).toFixed(4) + ")";
      if (n >= 100 && !finished) {
        finished = true;
        cancelAnimationFrame(raf);
        onReady && onReady();                                   // mount the main loader underneath
        tFade = setTimeout(() => { if (rootRef.current) rootRef.current.classList.add("is-out"); }, HOLD_MS);
        tGone = setTimeout(() => setGone(true), HOLD_MS + 700);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(tFade); clearTimeout(tGone); };
  }, [onReady]);

  if (gone) return null;
  return (
    <div className="pl" ref={rootRef} role="status" aria-label="Loading">
      <div className="pl-top"><span>Ansh Gautam</span><span>Portfolio &rsquo;26</span></div>
      <div className="pl-count"><span ref={numRef} className="pl-num">000</span><span className="pl-pct">%</span></div>
      <div className="pl-bottom"><span>Loading</span><div className="pl-bar"><i ref={barRef} /></div><span>AI &amp; Engineering</span></div>
    </div>
  );
}

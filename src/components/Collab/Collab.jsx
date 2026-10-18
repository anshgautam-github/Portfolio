import { useEffect, useRef, useState } from "react";
import { createScene } from "./scene.js";
import "./collab.css";
import { skipFrame } from "../../lib/perf.js";

const EMAIL = "hello@yourname.dev"; // <- put your real address here

/**
 * <Collab /> — "press and hold to collaborate". An AI hand and a human hand reach for each other while you hold; at 100% the
 * screen flares and they lock into a handshake, then the call-to-action rises in. All drawn in canvas (see scene.js).
 */
export default function Collab() {
  const sec = useRef(null), cv = useRef(null), glc = useRef(null), ring = useRef(null), num = useRef(null), bar = useRef(null), tick = useRef(null);
  const holding = useRef(false);
  const api = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = cv.current;
    let sc = null, ro = null;
    let vis = false, raf = 0, last = performance.now(), alive = true;
    // Build the (heavy) WebGL scene only when the section is about to come into view, not at page load.
    const boot = () => {
      if (sc || !alive) return;
      sc = createScene(glc.current, canvas);
      api.current = sc;
      sc.resize();
      sc.st.onDone = () => { setDone(true); try { navigator.vibrate && navigator.vibrate([30, 40, 90]); } catch (e) { /* ignore */ } };
      sc.st.onReset = () => setDone(false);
      ro = new ResizeObserver(() => sc.resize());
      ro.observe(canvas);
      last = performance.now();
    };
    const pre = new IntersectionObserver(([e]) => { if (e.isIntersecting) { boot(); pre.disconnect(); } }, { rootMargin: "120% 0px 120% 0px" });
    pre.observe(sec.current);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) last = performance.now(); }, { threshold: 0.05 });
    io.observe(sec.current);
    const C = 2 * Math.PI * 62;
    const loop = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!vis || !sc) return;
      if (skipFrame(now, last)) return;
      const dt = (now - last) / 1000; last = now;
      sc.frame(dt, holding.current);
      const p = Math.min(1, sc.st.shown), pct = Math.round(p * 100);
      if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - p));
      if (num.current) num.current.textContent = String(pct).padStart(3, "0");
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      if (tick.current) tick.current.style.transform = `translateX(${(p - 0.5) * 100}%)`;
      sec.current.style.setProperty("--p", p.toFixed(3));
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); pre.disconnect(); ro && ro.disconnect(); };
  }, []);

  const down = (e) => {
    if (e.target.closest && e.target.closest("a, .cb-again")) return;
    holding.current = true;
    sec.current.classList.add("is-holding");
  };
  const move = (e) => { const r = sec.current.getBoundingClientRect(); if (api.current) api.current.st.mouseT = [((e.clientX - r.left) / r.width - 0.5) * 2, -((e.clientY - r.top) / r.height - 0.5) * 2]; };
  const up = () => { holding.current = false; sec.current && sec.current.classList.remove("is-holding"); };
  const key = (v) => (e) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (v && e.repeat) return; holding.current = v; sec.current.classList.toggle("is-holding", v); }
  };

  return (
    <section ref={sec} className={"cb" + (done ? " is-done" : "")} aria-label="Collaborate with Ansh"
      onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} onPointerMove={move}>
      <canvas ref={glc} className="cb-gl" aria-hidden="true" />
      <canvas ref={cv} className="cb-cv" aria-hidden="true" />

      <div className="cb-top">
        <div className="cb-chip"><i /> COLLAB&nbsp;/&nbsp;07</div>
        <div className="cb-meter" aria-hidden="true">
          <div className="cb-ruler"><span ref={tick} className="cb-tick" /></div>
          <div className="cb-sync">SYNC <b ref={num}>000</b>%</div>
        </div>
        <div className="cb-chip cb-chip--r"><em>1</em>&nbsp;HANDSHAKE</div>
      </div>

      <button type="button" className="cb-ring" onKeyDown={key(true)} onKeyUp={key(false)} onBlur={up} aria-label="Press and hold to collaborate">
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle className="cb-trk" cx="70" cy="70" r="62" />
          <circle ref={ring} className="cb-arc" cx="70" cy="70" r="62" strokeDasharray={2 * Math.PI * 62} strokeDashoffset={2 * Math.PI * 62} />
        </svg>
        <span className="cb-core" />
        <span className="cb-lbl">TAP<br />HOLD</span>
      </button>

      <p className="cb-hint">Hold to bring our ideas together</p>

      <div className="cb-win" aria-live="polite">
        <div className="cb-kicker">COLLABORATION UNLOCKED</div>
        <h2 className="cb-h"><span>Let&rsquo;s build</span><span>something <em>together.</em></span></h2>
        <div className="cb-cta">
          <a className="cb-mail" href={`mailto:${EMAIL}`}>Say hello <b>&rarr;</b></a>
          <button type="button" className="cb-again" onClick={() => api.current && api.current.reset()}>&#8634; shake again</button>
        </div>
      </div>
    </section>
  );
}

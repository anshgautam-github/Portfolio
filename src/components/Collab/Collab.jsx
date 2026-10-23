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
  const ticks = useRef([]), bars = useRef([]), stat = useRef(null), crd = useRef(null), lnk = useRef(null), lastN = useRef(-1), lastS = useRef(""), lastP = useRef(-1), lastC = useRef("");
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
    const pre = new IntersectionObserver(([e]) => { if (e.isIntersecting) { boot(); pre.disconnect(); } }, { rootMargin: "250% 0px 250% 0px" });
    pre.observe(sec.current);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; sec.current && sec.current.classList.toggle("is-live", vis); if (vis) { last = performance.now(); sc && sc.wake(); } }, { threshold: 0.05 });
    io.observe(sec.current);
    const C = 2 * Math.PI * 62; let fr = 0;
    const loop = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      if (!vis || !sc) return;
      if (skipFrame(now, last)) return;
      const dt = (now - last) / 1000; last = now;
      sc.frame(dt, holding.current);
      const p = Math.min(1, sc.st.shown), pct = Math.round(p * 100);
      if (pct !== lastP.current) {
        lastP.current = pct;
        if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - p));
        if (num.current) num.current.textContent = String(pct).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
        if (tick.current) tick.current.style.transform = `translateX(${(p - 0.5) * 100}%)`;
        if (lnk.current) lnk.current.textContent = `${pct}%`;
      }
      const n = Math.floor(p * 72);
      if (n !== lastN.current) { lastN.current = n; for (let i = 0; i < 72; i++) { const el = ticks.current[i]; if (el) el.classList.toggle("on", i < n); } }
      const st = sc.st, label = st.done ? "Connected" : p > 0.85 ? "Almost there" : p > 0.02 ? "Syncing minds" : "Ready when you are";
      if (label !== lastS.current && stat.current) { lastS.current = label; stat.current.textContent = label; }
      const T = st.t, amp = 0.16 + 0.84 * p;
      if ((fr = (fr + 1) & 1) === 0) for (let i = 0; i < 40; i++) { const el = bars.current[i]; if (!el) continue; const k = i % 20, env = Math.sin((k / 19) * Math.PI) * 0.8 + 0.2; el.style.transform = `scaleY(${(0.10 + amp * env * (0.5 + 0.5 * Math.sin(T * (3 + p * 6) + i * 0.8)) * (0.6 + 0.4 * Math.sin(T * 1.7 + i * 2.1))).toFixed(3)})`; }
      if (crd.current && fr === 0) { const s = `X ${(st.mouse[0] >= 0 ? "+" : "") + st.mouse[0].toFixed(2)}  Y ${(st.mouse[1] >= 0 ? "+" : "") + st.mouse[1].toFixed(2)}`; if (s !== lastC.current) { lastC.current = s; crd.current.textContent = s; } }
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
      <div className="cb-scrim" aria-hidden="true" />
      <div className="cb-frame" aria-hidden="true"><i /><i /><i /><i /></div>
      <span className="cb-vert cb-vert--l" aria-hidden="true">Chapter 07 &mdash; Let&rsquo;s collaborate</span>
      <span className="cb-vert cb-vert--r" aria-hidden="true">AI &times; Human &mdash; Handshake protocol</span>

      <div className="cb-top">
        <div className="cb-chip"><i /> COLLAB&nbsp;/&nbsp;07</div>
        <div className="cb-meter" aria-hidden="true">
          <div className="cb-ruler"><span ref={tick} className="cb-tick" /></div>
          <div className="cb-sync">SYNC <b ref={num}>000</b>%</div>
        </div>
        <div className="cb-chip cb-chip--r"><em>1</em>&nbsp;HANDSHAKE</div>
      </div>

      <h2 className="cb-title" aria-hidden="true"><span>Two minds,</span><span>one <em>handshake.</em></span></h2>

      <button type="button" className="cb-ring" onKeyDown={key(true)} onKeyUp={key(false)} onBlur={up} aria-label="Press and hold to collaborate">
        <svg className="cb-dial" viewBox="0 0 200 200" aria-hidden="true">
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2 - Math.PI / 2, r1 = i % 6 === 0 ? 86 : 90, r2 = 96;
            return <line key={i} ref={(el) => (ticks.current[i] = el)} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * r2} y2={100 + Math.sin(a) * r2} />;
          })}
        </svg>
        <svg className="cb-orbit" viewBox="0 0 200 200" aria-hidden="true">
          <defs><path id="cbOrb" d="M100 100m-107 0a107 107 0 1 1 214 0a107 107 0 1 1-214 0" /></defs>
          <text><textPath href="#cbOrb">PRESS &middot; HOLD &middot; CONNECT &middot; PRESS &middot; HOLD &middot; CONNECT &middot; PRESS &middot; HOLD &middot; CONNECT &middot;</textPath></text>
        </svg>
        <svg viewBox="0 0 140 140" aria-hidden="true">
          <circle className="cb-trk" cx="70" cy="70" r="62" />
          <circle ref={ring} className="cb-arc" cx="70" cy="70" r="62" strokeDasharray={2 * Math.PI * 62} strokeDashoffset={2 * Math.PI * 62} />
        </svg>
        <span className="cb-core" />
        <span className="cb-lbl">TAP<br />HOLD</span>
      </button>
      <p className="cb-stat" aria-hidden="true"><i /><span ref={stat}>Ready when you are</span></p>

      <div className="cb-eq cb-eq--l" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} ref={(el) => (bars.current[i] = el)} />)}</div>
      <div className="cb-eq cb-eq--r" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} ref={(el) => (bars.current[20 + i] = el)} />)}</div>
      <div className="cb-read cb-read--l" aria-hidden="true"><span ref={crd}>X +0.00  Y +0.00</span><span>LIVE &middot; 60 FPS</span></div>
      <div className="cb-read cb-read--r" aria-hidden="true"><span>LINK <b ref={lnk}>0%</b></span><span>AI &#8644; HUMAN</span></div>

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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BuilderScreen, TrackerScreen } from "../Projects/Screens.jsx";
import ProgramArt from "./ProgramArt.jsx";
import "./spotlight.css";

const EASE = "cubic-bezier(.2,.8,.2,1)";
const pad = (n) => String(n).padStart(2, "0");

/* the same artwork the card shows: real screenshot if set, otherwise the built-in mock interface */
function Art({ d }) {
  return (
    <div className="spot-art" data-kind={d.kind}>
      {d.kind === "program" ? (
        <ProgramArt d={d} />
      ) : d.image ? (
        <img src={d.image} alt="" draggable="false" />
      ) : d.kind === "phones" ? (
        <div className="arc-mock arc-mock--ph"><div className="arc-ph"><TrackerScreen /></div></div>
      ) : (
        <div className="arc-mock arc-mock--lp"><div className="arc-lp"><BuilderScreen {...(d.screen || {})} /></div></div>
      )}
    </div>
  );
}

const Words = ({ text }) => {
  const ws = text.split(" ");
  return (
    <>
      {ws.map((w, i) => (
        <span className={"spot-w" + (i >= ws.length - 1 ? " is-it" : "")} key={i}><span style={{ "--i": i }}>{w}</span>{" "}</span>
      ))}
    </>
  );
};

/**
 * Spotlight - opens a carousel card full-screen. The card's artwork flies from where it sits on the arc to its place
 * on the left (FLIP), the backdrop blurs in, and the description assembles on the right in a staggered sequence.
 * Props: items, index, from (DOMRect of the clicked card), getRect(i) -> DOMRect of that item's card now,
 *        onIndex(i) keeps the carousel in step while browsing, onClose() unmounts after the return flight.
 */
export default function Spotlight({ items, index, from, getRect, onIndex, onClose }) {
  const n = items.length;
  const [idx, setIdx] = useState(index);
  const [dir, setDir] = useState(1);
  const [closing, setClosing] = useState(false);
  const root = useRef(null);
  const media = useRef(null);
  const stage = useRef(null);
  const base = useRef(0.42);                    // text starts after the flight on first open, quickly afterwards
  const busy = useRef(true);
  const d = items[idx];
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // size the mock interfaces to the media box (same ratio the cards use)
  const fit = () => {
    const m = media.current; if (!m) return;
    const w = m.offsetWidth;
    m.style.setProperty("--kl", ((w * 0.94) / 640).toFixed(4));
    m.style.setProperty("--kp", ((w * 0.56) / 268).toFixed(4));
  };

  // transform that maps the media box onto another rect
  const delta = (rect) => {
    const m = media.current; if (!m || !rect) return null;
    const t = m.getBoundingClientRect();
    return { dx: rect.left - t.left, dy: rect.top - t.top, sx: rect.width / t.width, sy: rect.height / t.height };
  };
  const tf = (f) => `translate(${f.dx}px,${f.dy}px) scale(${f.sx},${f.sy})`;

  // ---- open: card -> spotlight ----
  useLayoutEffect(() => {
    fit();
    const m = media.current;
    const f = delta(from);
    requestAnimationFrame(() => root.current && root.current.classList.add("is-in"));
    if (!f || reduce) { busy.current = false; base.current = 0.05; return; }
    const a = m.animate(
      [{ transform: tf(f), borderRadius: "18px" }, { transform: "none", borderRadius: "22px" }],
      { duration: 900, easing: EASE }
    );
    a.onfinish = () => { busy.current = false; base.current = 0.05; };
    return () => a.cancel();
    // eslint-disable-next-line
  }, []);

  // pointer parallax: the whole artwork stage tilts toward the cursor, floating chips drift at their own depth
  useEffect(() => {
    if (reduce || !matchMedia("(pointer: fine)").matches) return;
    const st = { x: 0, y: 0, cx: 0, cy: 0, raf: 0 };
    const onMove = (e) => { st.x = (e.clientX / innerWidth) * 2 - 1; st.y = (e.clientY / innerHeight) * 2 - 1; };
    const tick = () => {
      st.raf = requestAnimationFrame(tick);
      const el = stage.current, r = root.current;
      if (!el || !r) return;
      const k = busy.current || r.classList.contains("is-closing") ? 0 : 1;
      st.cx += (st.x * k - st.cx) * 0.07; st.cy += (st.y * k - st.cy) * 0.07;
      el.style.setProperty("--rx", (-st.cy * 7).toFixed(2) + "deg");
      el.style.setProperty("--ry", (st.cx * 9).toFixed(2) + "deg");
      el.style.setProperty("--gx", (50 + st.cx * 40).toFixed(1) + "%");
      el.style.setProperty("--gy", (30 + st.cy * 30).toFixed(1) + "%");
      r.style.setProperty("--px", (st.cx * 26).toFixed(1) + "px");
      r.style.setProperty("--py", (st.cy * 20).toFixed(1) + "px");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    st.raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(st.raf); window.removeEventListener("pointermove", onMove); };
    // eslint-disable-next-line
  }, []);

  useEffect(fit, [idx]);
  useEffect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []);

  // ---- scroll lock ----
  useEffect(() => {
    const lenis = window.__lenis;
    lenis && lenis.stop && lenis.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; lenis && lenis.start && lenis.start(); };
  }, []);

  const close = () => {
    if (closing) return;
    setClosing(true);
    const m = media.current;
    root.current.classList.remove("is-in");
    if (stage.current) { stage.current.style.transition = "none"; stage.current.style.setProperty("--rx", "0deg"); stage.current.style.setProperty("--ry", "0deg"); }
    const f = delta(getRect(idx));
    if (!f || reduce) { setTimeout(onClose, reduce ? 0 : 350); return; }
    const a = m.animate(
      [{ transform: "none", borderRadius: "22px" }, { transform: tf(f), borderRadius: "18px" }],
      { duration: 650, easing: "cubic-bezier(.6,.05,.2,1)", fill: "forwards" }
    );
    a.onfinish = onClose;
  };

  const go = (step) => {
    if (busy.current || closing) return;
    const i = (idx + step + n) % n;
    setDir(step > 0 ? 1 : -1); setIdx(i); onIndex && onIndex(i);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); go(e.key === "ArrowRight" ? 1 : -1); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  useEffect(() => { root.current && root.current.focus({ preventScroll: true }); }, []);

  const meta = [d.year, d.category].filter(Boolean);
  const style = { "--base": base.current + "s" };

  const ACC = d.kind === "phones" ? "phones" : "laptop";
  const isProg = d.kind === "program";
  const platform = isProg ? d.mode : d.kind === "phones" ? "Mobile app" : "Web app";
  return createPortal(
    <div ref={root} className={"spot" + (closing ? " is-closing" : "")} role="dialog" aria-modal="true" aria-label={d.title} tabIndex={-1} data-dir={dir} data-acc={ACC} data-prog={isProg ? "1" : undefined} style={style}
         onClick={(e) => { if (e.target === e.currentTarget || e.target.classList.contains("spot-grid")) close(); }}>
      <div className="spot-veil" />
      <div className="spot-blobs" aria-hidden="true"><i /><i /><i /></div>
      <div className="spot-deco" aria-hidden="true">
        <u className="c1" /><u className="c2" /><u className="c3" /><u className="c4" />
        <span className="spot-side">{isProg ? "Program" : "Case study"} &mdash; {pad(idx + 1)}</span>
        <span className="spot-reg">+</span>
      </div>
      <div className="spot-marq" aria-hidden="true" key={"m" + idx}>
        <div>{Array.from({ length: 6 }, (_, k) => (<span key={k}>{d.title}&nbsp;&mdash;&nbsp;</span>))}</div>
      </div>
      <div className="spot-ghost" aria-hidden="true"><span key={idx}>{pad(idx + 1)}</span></div>

      <button type="button" className="spot-close" onClick={close} aria-label="Close"><span>Close</span><i /></button>

      <div className="spot-grid">
        <div ref={stage} className="spot-stage">
          <div ref={media} className="spot-media" data-kind={d.kind}>
            <div className="spot-art-wrap" key={idx}><Art d={d} /></div>
            <span className="spot-sheen" />
            <span className="spot-glare" />
          </div>
          {d.chips && d.chips.slice(isProg ? 1 : 0, 2).map((c, k) => (
            <div className={"spot-float spot-float--" + k} key={idx + c.k}><strong>{c.v}</strong><span>{c.k}</span></div>
          ))}
          <p className="spot-fig"><b>Fig. {pad(idx + 1)}</b> {isProg ? d.org : platform}</p>
        </div>

        <div className="spot-text" key={idx} aria-live="polite">
          <div className="spot-top">
            <b>{pad(idx + 1)}</b><span> / {pad(n)}</span>
            <i className="spot-bar"><em style={{ transform: `scaleX(${(idx + 1) / n})` }} /></i>
          </div>
          <p className="spot-meta">
            <span className="spot-pill"><i />{meta[1] || platform}</span>
            {d.year && <span>{d.year}</span>}
            {d.rating && <span className="spot-star">★ {d.rating}</span>}
          </p>
          <h2 className="spot-title"><Words text={d.title} /></h2>
          <p className="spot-desc">{d.text}</p>
          <dl className="spot-spec">
            {isProg ? (<>
              <div><dt>Organisation</dt><dd>{d.short || d.org}</dd></div>
              <div><dt>When</dt><dd>{d.year}</dd></div>
              <div><dt>Duration</dt><dd>{d.duration}</dd></div>
              <div><dt>Where</dt><dd>{d.place} · {d.mode}</dd></div>
            </>) : (<>
              {d.role && <div><dt>Role</dt><dd>{d.role}</dd></div>}
              {d.year && <div><dt>Year</dt><dd>{d.year}</dd></div>}
              <div><dt>Platform</dt><dd>{platform}</dd></div>
            </>)}
          </dl>
          {d.roles && (
            <ol className="spot-roles">
              {d.roles.map((r, k) => (<li key={r.name} style={{ "--i": k }}><b>{r.name}</b><em>{r.period}</em><span>{r.note}</span></li>))}
            </ol>
          )}
          {d.tags && d.tags.length > 0 && (
            <ul className="spot-tags">{d.tags.map((t, k) => (<li key={t} style={{ "--i": k }}>{t}</li>))}</ul>
          )}
          {d.href && <a className="spot-cta" href={d.href}><span>{d.cta || "View project"}</span><i>&rarr;</i></a>}
        </div>
      </div>

      <div className="spot-dock" role="tablist" aria-label="Projects">
        {items.map((it, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === idx} className={k === idx ? "is-on" : ""}
                  onClick={() => { if (k !== idx && !busy.current && !closing) { setDir(k > idx ? 1 : -1); setIdx(k); onIndex && onIndex(k); } }}>
            <b>{pad(k + 1)}</b><span>{it.title}</span><i />
          </button>
        ))}
      </div>
      <div className="spot-nav">
        <button type="button" onClick={() => go(-1)} aria-label="Previous project">&lsaquo;</button>
        <button type="button" onClick={() => go(1)} aria-label="Next project">&rsaquo;</button>
      </div>
      <p className="spot-keys">Esc to close &middot; &larr; &rarr; to browse</p>
    </div>,
    document.body
  );
}

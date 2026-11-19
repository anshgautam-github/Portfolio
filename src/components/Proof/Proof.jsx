import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { content } from "../../content.js";
import { programs } from "../ArcCarousel/programsData.js";
import { mountDots } from "./dots.js";
import "./proof.css";

/*
  <Proof /> - sits right after the tech stack, on the same dark.
   1. a tabbed spotlight: the experience and programs that matter, one line each, auto-advancing (hover to pause, arrow keys to move)
   2. a dot-matrix CGPA you can push around with the pointer (click for a ripple)
   3. credentials: a pointer-reactive bar strip and the certifications as a hover grid
  All copy comes from content.picked and ArcCarousel/programsData - nothing is invented here.
*/

const STOPS = ["#7ea2ff", "#a98be6", "#e98660"];
const DUR = 7000;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView(ref, threshold = 0.25) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}

/* headline: each word slides up out of its own mask when the block comes into view */
function Lines({ text }) {
  return (
    <h2 className="prf-h2" aria-label={text}>
      {text.split(" ").map((w, i) => (<span className="prf-mask" key={i} aria-hidden="true"><span style={{ "--i": i }}>{w}&nbsp;</span></span>))}
    </h2>
  );
}

/* a soft light that follows the pointer inside a block */
const follow = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/* ---------------------------------------------------------------- 1. tabs */
// the three learning programs: dates come from programsData; the wording below only restates what those entries already say
const PROGRAM_TABS = {
  "edge ai": {
    role: "Participant · Edge AI & Robotics Summer School", org: "Indian Institute of Science", skills: ["Edge AI", "Robotics"],
    headline: "Selected for IISc’s Edge AI & Robotics Summer School.",
    text: "A one-month, on-site summer school in Bengaluru focused on edge AI and robotics, attended with a cohort of 100 students from across India.",
  },
  "ios app": {
    role: "iOS App Developer · iOS Development Center", org: "SRM Institute of Science and Technology", skills: ["iOS development", "Swift"],
    headline: "Chosen from 1,000+ applicants for SRM’s iOS Development Center.",
    text: "A seven-month program on campus, run in collaboration with Apple and Infosys, where I took part as an iOS App Developer.",
  },
  "amazon ml": {
    role: "Participant · Amazon ML Summer School", org: "Amazon", skills: ["Machine learning fundamentals"],
    headline: "Machine learning fundamentals, taught by Amazon scientists and engineers.",
    text: "A two-month remote summer school: a learning program built around sessions led by Amazon scientists and engineers.",
  },
};
function buildTabs() {
  const exp = content.picked.cards.find((c) => c.entries)?.entries ?? [];
  const tabs = exp.map((e) => {
    const [org, period] = e.meta.split(" · ");
    return { label: org, role: e.role, meta: `${org} · ${period}`, org, kind: e.kind, headline: e.headline, text: e.text, skills: e.skills };
  });
  for (const [key, x] of Object.entries(PROGRAM_TABS)) {
    const p = programs.find((q) => q.title.toLowerCase().includes(key));
    if (p) tabs.push({ label: p.short || p.org, role: x.role, meta: `${x.org} · ${p.year}`, org: x.org, kind: "Learning program", headline: x.headline, text: x.text, skills: x.skills });
  }
  return tabs;
}

function Spotlight({ tabs }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  const rail = useRef(null);
  const els = useRef([]);
  const wrap = useRef(null);
  const seen = useInView(wrap, 0.3);
  const n = tabs.length;
  const go = useCallback((i) => setActive((i + n) % n), [n]);

  useLayoutEffect(() => {
    const place = () => { const el = els.current[active]; if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth }); };
    place();
    const ro = new ResizeObserver(place);
    if (rail.current) ro.observe(rail.current);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [active, n]);

  // keep the active tab in view inside the rail only: scrollIntoView would scroll the whole page (and yank it around when the tabs auto-advance)
  useEffect(() => {
    const r = rail.current, el = els.current[active];
    if (!r || !el || r.scrollWidth <= r.clientWidth) return;
    r.scrollTo({ left: Math.max(0, el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2), behavior: "smooth" });
  }, [active]);

  // the auto-advance only runs while the block is actually on screen
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1); els.current[(active + 1) % n]?.focus(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); els.current[(active - 1 + n) % n]?.focus(); }
  };

  return (
    <div ref={wrap} className={`prf-blk prf-spot${seen ? " is-in" : ""}`} onPointerMove={follow} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="prf-top">
        <div className="prf-tabs" ref={rail} role="tablist" aria-label="Experience and programs" onKeyDown={onKey}>
          <span className="prf-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}>
            <i key={active} className="prf-prog" style={{ animationDuration: `${DUR}ms`, animationPlayState: paused || !vis || reduceMotion() ? "paused" : "running" }} onAnimationEnd={() => go(active + 1)} />
          </span>
          {tabs.map((tb, i) => (
            <button key={tb.label} ref={(el) => (els.current[i] = el)} role="tab" aria-selected={i === active} tabIndex={i === active ? 0 : -1} className={`prf-tab${i === active ? " is-on" : ""}`} onClick={() => go(i)}>
              {tb.label}
            </button>
          ))}
        </div>
        <div className="prf-nav">
          <span className="prf-count">{String(active + 1).padStart(2, "0")}<em> / {String(n).padStart(2, "0")}</em></span>
          <button className="prf-arrow" aria-label="Previous" onClick={() => go(active - 1)}><svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5" /></svg></button>
          <button className="prf-arrow" aria-label="Next" onClick={() => go(active + 1)}><svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5" /></svg></button>
        </div>
      </div>
      {/* every slide is stacked in one grid cell, so the block is always as tall as the longest one and the page height never changes while the tabs advance */}
      <div className="prf-stage" aria-live="polite">
        {tabs.map((tb, k) => (
          <div key={tb.label} className={`prf-slide${k === active ? " is-on" : ""}`} aria-hidden={k !== active}>
            <p className="prf-statement">
              {(tb.headline || tb.text).split(" ").map((w, i) => (<span key={i} className="prf-w" style={{ animationDelay: `${i * 24}ms` }}>{w}&nbsp;</span>))}
            </p>
            {tb.headline && <p className="prf-desc">{tb.text}</p>}
            <div className="prf-by">
              <b>{tb.role}</b>
              <span>{tb.meta}</span>
              {tb.kind && <em className="prf-chip">{tb.kind}</em>}
              {tb.skills && tb.skills.map((sk) => (<em key={sk} className="prf-chip prf-skill">{sk}</em>))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 2. dot-matrix CGPA */
function Cgpa({ card }) {
  const ref = useRef(null);
  const cv = useRef(null);
  const ctl = useRef(null);
  const live = useRef(false);
  const [hint, setHint] = useState(true);
  const inView = useInView(ref, 0.3);
  const value = card.big.value;

  useEffect(() => {
    let dead = false;
    (async () => {
      try { await document.fonts.load('800 80px "Inter Tight"'); } catch { /* font is optional */ }
      if (dead || !cv.current) return;
      ctl.current = mountDots(cv.current, { text: value, stops: STOPS, reduce: reduceMotion(), onTouch: () => setHint(false) });
      if (live.current) ctl.current.start();
    })();
    return () => { dead = true; ctl.current?.destroy(); ctl.current = null; };
  }, [value]);
  useEffect(() => { if (inView) { live.current = true; ctl.current?.start(); } }, [inView]);

  return (
    <div className={`prf-blk prf-acad${inView ? " is-in" : ""}`} ref={ref} onPointerMove={follow}>
      <p className="prf-eyebrow">Academics</p>
      <Lines text="Fundamentals that hold up." />
      <p className="prf-lede">{card.desc}</p>
      <div className="prf-panel">
        <div className="prf-canvas">
          <canvas ref={cv} aria-label={`${card.big.label} ${value} ${card.big.suffix}`} role="img" />
          <span className={`prf-hint${hint ? "" : " is-gone"}`}>Move your cursor through the dots</span>
        </div>
        <div className="prf-foot">
          <div><strong>{card.big.label}</strong><span>{card.lines[0].t}</span></div>
          <div className="prf-foot-r"><span>Scale</span><b>{card.big.suffix.replace("/", "out of")}</b></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 3. credentials */
const BARS = 92;
const lerpHex = (stops, t) => {
  const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const n = stops.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, a = h(stops[i]), b = h(stops[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * u)).join(",")})`;
};

function Bars({ on }) {
  const box = useRef(null);
  const raf = useRef(0);
  const colors = useMemo(() => Array.from({ length: BARS }, (_, i) => lerpHex(["#f3d3c8", "#8fa5f5", "#f4f1ff"], i / (BARS - 1))), []);
  const move = (e) => {
    const r = box.current.getBoundingClientRect(), m = (e.clientX - r.left) / r.width;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const kids = box.current.children;
      for (let i = 0; i < kids.length; i++) { const d = (i / (BARS - 1) - m) * 14; kids[i].style.setProperty("--k", Math.exp(-d * d).toFixed(3)); }
    });
  };
  const leave = () => { cancelAnimationFrame(raf.current); for (const k of box.current.children) k.style.setProperty("--k", 0); };
  return (
    <div ref={box} className={`prf-bars${on ? " is-in" : ""}`} onPointerMove={move} onPointerLeave={leave} aria-hidden="true">
      {colors.map((c, i) => (<i key={i} className="prf-bar" style={{ "--i": i, "--c": c }} />))}
    </div>
  );
}

const ISSUER = { SAP: "SAP", Microsoft: "MS", AWS: "AWS", Fortinet: "FTNT", Unity: "U" };
function Mark({ code }) {
  return (
    <svg viewBox="0 0 120 120" className="prf-mark" aria-hidden="true">
      <circle cx="60" cy="60" r="50" className="r1" />
      <circle cx="60" cy="60" r="41" className="r2" />
      <text x="60" y="68" textAnchor="middle">{code}</text>
    </svg>
  );
}

function Credentials({ certs }) {
  const ref = useRef(null);
  const inView = useInView(ref, 0.25);
  const items = certs.map((c) => {
    const [issuer, what] = c.split(" — ");
    const name = issuer.replace(" Certified", "");
    return { name, what, code: ISSUER[name] || name.slice(0, 3).toUpperCase() };
  });
  return (
    <div className={`prf-blk prf-cred${inView ? " is-in" : ""}`} ref={ref} onPointerMove={follow}>
      <p className="prf-eyebrow">Credentials</p>
      <Lines text="Certified across AI, cloud and code." />
      <p className="prf-lede">Industry-recognized credentials across generative AI, cloud computing, cybersecurity, databases and interactive development.</p>
      <div className="prf-strip">
        <Bars on={inView} />
      </div>
      <div className={`prf-certs${inView ? " is-in" : ""}`} style={{ "--n": items.length }}>
        {items.map((it, i) => (
          <div className="prf-cert" key={it.name} style={{ "--d": `${i * 70}ms` }} onPointerMove={follow}>
            <Mark code={it.code} />
            <strong>{it.name}</strong>
            <span>{it.what}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Proof() {
  const tabs = useMemo(buildTabs, []);
  const picked = content.picked.cards;
  const acad = picked.find((c) => c.big);
  const certs = picked.find((c) => c.list)?.list ?? [];
  const head = useRef(null);
  const seen = useInView(head, 0.2);
  return (
    <section className={`prf${seen ? " is-in" : ""}`} aria-label="Experience, academics and credentials" data-proof>
      <div className="prf-glow" aria-hidden="true" />
      <div className="prf-col" ref={head}>
        {tabs.length > 0 && <Spotlight tabs={tabs} />}
        {acad && <Cgpa card={acad} />}
        {certs.length > 0 && <Credentials certs={certs} />}
      </div>
    </section>
  );
}

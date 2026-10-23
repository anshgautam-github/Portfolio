import { Fragment, memo, useCallback, useEffect, useRef, useState } from "react";
import Spotlight from "./Spotlight.jsx";
import "./arc-carousel.css";

import { projects } from "../Projects/projectsData.js";
import { BuilderScreen, TrackerScreen } from "../Projects/Screens.jsx";
import "../Projects/projects.css";
import ProgramArt from "./ProgramArt.jsx";
import { programs } from "./programsData.js";

/**
 * ArcCarousel - the projects as an infinite, concave-arc 3D gallery.
 * Data comes from src/components/Projects/projectsData.js (title, year, tags, role, text, href, image / images, chips).
 * Cards use your real screenshots when `image` / `images` are set there, otherwise the built-in mock interfaces.
 *
 * Geometry: every card has a signed offset `o` from the (fractional) active position. Position, depth and yaw are pure
 * functions of `o`:  x = o * spacing,  z = o^2 * depth (the arc bends toward the viewer),  rotateY = -o * yaw.
 * That keeps the curve smooth and symmetric at any moment of a drag or transition. The list is virtually repeated so
 * even a few projects loop endlessly with cards visible on both edges.
 */
const RETITLE = {
  "Designing the future of education": "Growing through community & collaboration",
  "Video game progress tracking": "Learning, building & sharing knowledge",
  "An analytics dashboard for ML teams": "Open-source contributions & collaboration",
};
const toItem = (p) => {
  const rating = (p.chips || []).find((c) => /rating/i.test(c.k));
  return {
    title: RETITLE[p.title] || p.title,
    year: p.year,
    category: "Community",
    role: p.role,
    text: p.text,
    rating: rating ? rating.v.replace(/\s*\u2605/, "") : null,
    href: p.href && p.href !== "#" ? p.href : null,
    cta: p.cta,
    kind: p.device === "phones" ? "phones" : "laptop",
    image: p.image || (p.images && p.images[1]) || null,
    screen: p.screen,
    tags: ["Community", ...(p.tags || []).slice(1)],
    chips: p.chips || [],
  };
};
const DEFAULT_ITEMS = programs;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mod = (n, m) => ((n % m) + m) % m;
const wrap = (o, n) => mod(o + n / 2, n) - n / 2;            // shortest signed distance on a ring
const pad = (n) => String(n).padStart(2, "0");

const Card = memo(function Card({ d, i, n, setRef }) {
  return (
  <figure key={i} ref={(el) => setRef(i, el)} className="arc-card" aria-hidden={i >= n ? "true" : undefined}>
    <div className="arc-img" data-kind={d.kind}>
      {d.kind === "program" ? (
        <ProgramArt d={d} />
      ) : d.image ? (
        <img src={d.image} alt="" draggable="false" loading="lazy" decoding="async" />
      ) : d.kind === "phones" ? (
        <div className="arc-mock arc-mock--ph"><div className="arc-ph"><TrackerScreen /></div></div>
      ) : (
        <div className="arc-mock arc-mock--lp"><div className="arc-lp"><BuilderScreen {...(d.screen || {})} /></div></div>
      )}
    </div>
    <span className="arc-glare" />
    <span className="arc-spot" aria-hidden="true" />
    <span className="arc-ring" aria-hidden="true" />
    <span className="arc-open" aria-hidden="true"><span>Open</span><i>↗</i></span>
    <span className="arc-num">{pad((i % n) + 1)}</span>
    <figcaption>
      {d.kind === "program" ? (<><em className="cap-org">{d.short || d.org}</em><span className="cap-title">{d.title}</span><small className="cap-when">{d.year}</small></>) : d.title}
    </figcaption>
  </figure>
  );
});

export default function ArcCarousel({
  items = DEFAULT_ITEMS,
  eyebrow = "Programs & Communities",
  heading,
  autoplay = 0,
}) {
  const n = items.length;                                           // real projects
  const reps = Math.max(1, Math.ceil(9 / n));
  const N = n * reps;                                               // virtual slots on the ring (always a multiple of n)
  const root = useRef(null);
  const stage = useRef(null);
  const ghost = useRef(null);
  const cards = useRef([]);
  const api = useRef({});
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [spot, setSpot] = useState(null);   // { i, from } while a card is open in the spotlight
  const hidden = useRef(null);
  const setCardRef = useCallback((i, el) => { cards.current[i] = el; }, []);
  const openRef = useRef(null);

  useEffect(() => {
    const el = stage.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const S = { pos: 0, vel: 0, target: 0, drag: false, lastX: 0, lastT: 0, v: 0, moved: 0, intro: reduce ? 1 : 0, introT: 0, started: false, visible: false, idleAt: performance.now(), shown: 0 };
    let W = 0, cardW = 0, spacing = 0, R = 0, dth = 0, raf = 0, last = performance.now();

    const measure = () => {
      W = el.clientWidth;
      const phone = W < 720, tablet = W >= 720 && W < 1100;
      // phones: as wide as the screen allows (neighbours still peek in), but never so tall that the card runs into the caption on short screens
      const H = (root.current && root.current.clientHeight) || window.innerHeight;
      cardW = phone ? Math.max(130, Math.min(W * 0.56, (H * 0.36) / 1.38)) : tablet ? clamp(W * 0.2, 150, 210) : clamp(W * 0.15, 170, 250);
      // cards sit on a real cylinder (viewer at the centre of the circle): arc length between cards = spacing
      spacing = cardW * (phone ? 1.12 : tablet ? 1.34 : 1.4);
      dth = (phone ? 24 : tablet ? 19 : 17) * Math.PI / 180;     // angle between neighbouring cards
      R = spacing / dth;                                          // cylinder radius
      S.rested = false;
      el.style.setProperty("--cw", cardW + "px");
      el.style.setProperty("--ch", cardW * 1.38 + "px");
      el.style.setProperty("--persp", cardW * 5.2 + "px");
      el.style.setProperty("--kl", ((cardW * 0.94) / 640).toFixed(4));   // laptop mock screen -> card width
      el.style.setProperty("--kp", ((cardW * 0.56) / 268).toFixed(4));   // phone mock screen -> card width
    };
    measure();

    const setTarget = (t) => { S.target = t; S.idleAt = performance.now(); };
    const go = (d) => { setDir(d); setTarget(Math.round(S.target) + d); };
    api.current = { go, to: (i) => { const cur = Math.round(S.target); const d = wrap(i - mod(cur, n), n); setDir(d >= 0 ? 1 : -1); setTarget(cur + d); }, toSlot: (i) => { const cur = Math.round(S.target); const d = wrap(i - mod(cur, N), N); setDir(d >= 0 ? 1 : -1); setTarget(cur + d); } };

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // nothing is moving: don't touch the DOM at all (this is what keeps scrolling past the section smooth)
      const idle = !autoplay && !S.drag && S.intro >= 1 && Math.abs(S.target - S.pos) < 4e-4 && Math.abs(S.vel) < 2e-3;
      if (idle && S.rested) return;
      S.rested = idle;
      // intro: the arc fans open and spins in the first time it scrolls into view
      if (S.started && S.intro < 1) { S.introT += dt / 1.5; S.intro = clamp(S.introT, 0, 1); }
      const ie = 1 - Math.pow(1 - S.intro, 3.2);
      // spring toward the target (or follow the finger)
      if (!S.drag) {
        const k = 70, c = 2 * Math.sqrt(k) * 0.92;
        S.vel += ((S.target - S.pos) * k - S.vel * c) * dt;
        S.pos += S.vel * dt;
        if (autoplay && S.visible && S.intro >= 1 && now - S.idleAt > autoplay) { setDir(1); setTarget(Math.round(S.target) + 1); }
      }
      const posv = S.pos + (1 - ie) * -2.6;
      const spread = 0.35 + 0.65 * ie;
      const slot = mod(Math.round(S.pos), N);
      const idx = slot % n;
      if (idx !== S.shown) { S.shown = idx; setActive(idx); }
      const speed = clamp(Math.abs(S.drag ? S.v : S.vel) / 6, 0, 1);

      for (let i = 0; i < N; i++) {
        const c = cards.current[i];
        if (!c) continue;
        const o = wrap(i - posv, N);
        const a = Math.abs(o);
        if (a > 4.6 && S.intro >= 1) {                                // far side of the ring: invisible, leave it alone
          if (!c._off) { c._off = true; c.style.opacity = "0"; c.style.pointerEvents = "none"; c.style.zIndex = "0"; c.classList.remove("is-on"); }
          continue;
        }
        c._off = false;
        const th = clamp(o * dth * spread, -1.25, 1.25);           // angle around the cylinder
        const x = R * Math.sin(th);                                 // true circle: sideways...
        const z = R * (1 - Math.cos(th));                           // ...and toward the viewer, so the arc is concave
        const y = (1 - ie) * 40 + (1 - Math.cos(th)) * cardW * 0.1;  // edges ride a touch higher, like a curved wall
        const ry = (-th * 180) / Math.PI;                           // every card faces the centre of the circle
        const fade = clamp(4 - a, 0, 1) * clamp(ie * 1.6, 0, 1);
        const sc = 1 - (1 - fade) * 0.25;
        c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        c.style.opacity = fade.toFixed(2);
        const zi = String(100 - Math.round(a * 10));
        if (c._z !== zi) { c._z = zi; c.style.zIndex = zi; }
        const pe = fade < 0.2 ? "none" : "auto";
        if (c._pe !== pe) { c._pe = pe; c.style.pointerEvents = pe; }
        c._o = o;                                                  // plain JS field (a CSS variable would force a restyle of the card subtree every frame)
        const on = i === slot && Math.abs(S.pos - Math.round(S.pos)) < 0.18;
        if (c._on !== on) { c._on = on; c.classList.toggle("is-on", on); }
      }
      if (ghost.current) ghost.current.style.transform = `translate3d(${(-(S.pos % N) * 0).toFixed(1)}px,0,0)`;
    };
    raf = requestAnimationFrame(draw);

    // ---- input ----
    const onDown = (e) => {
      if (e.button != null && e.button !== 0) return;
      S.drag = true; S.moved = 0; S.lastX = e.clientX; S.lastT = performance.now(); S.v = 0; S.vel = 0;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add("is-drag");
    };
    const onMove = (e) => {
      if (!S.drag) return;
      const now = performance.now();
      const dx = e.clientX - S.lastX;
      S.moved += Math.abs(dx);
      S.pos -= dx / (spacing * 0.92);
      const dtm = Math.max(1, now - S.lastT) / 1000;
      S.v = S.v * 0.6 + (-dx / (spacing * 0.92) / dtm) * 0.4;
      S.lastX = e.clientX; S.lastT = now;
      S.target = S.pos;
    };
    const onUp = (e) => {
      if (!S.drag) return;
      S.drag = false;
      el.classList.remove("is-drag");
      el.releasePointerCapture?.(e.pointerId);
      if (S.moved <= 6) {
        const hit = document.elementsFromPoint(e.clientX, e.clientY).map((x) => x.closest && x.closest(".arc-card")).find(Boolean);
        if (hit) { const slot = cards.current.indexOf(hit); if (slot >= 0) { S.vel = 0; S.target = Math.round(S.pos); openRef.current?.(slot); return; } }
      }
      S.vel = S.v;
      const t = Math.round(S.pos + clamp(S.v, -9, 9) * 0.22);
      setDir(t >= S.pos ? 1 : -1);
      setTarget(t);
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;            // vertical wheel keeps scrolling the page
      e.preventDefault();
      S.pos += e.deltaX / (spacing * 3.2); S.target = S.pos; S.vel = 0;
      clearTimeout(S.wt);
      S.wt = setTimeout(() => setTarget(Math.round(S.pos)), 110);
    };
    const onKey = (e) => {
      if (!S.visible || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "Enter" && document.activeElement === el) { e.preventDefault(); openRef.current?.(mod(Math.round(S.pos), N)); }
    };
    const onClickCapture = (e) => { if (S.moved > 6) { e.stopPropagation(); e.preventDefault(); S.moved = 0; } };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", onClickCapture, true);
    window.addEventListener("keydown", onKey);
    const ro = new ResizeObserver(measure); ro.observe(el); if (root.current) ro.observe(root.current);
    const io = new IntersectionObserver(([en]) => { S.visible = en.isIntersecting && en.intersectionRatio > 0.35; if (en.isIntersecting) S.started = true; root.current && root.current.classList.toggle("is-live", en.isIntersecting); }, { threshold: [0, 0.35, 0.6] });
    io.observe(root.current);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(S.wt);
      el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel); el.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("keydown", onKey); ro.disconnect(); io.disconnect();
    };
  }, [N, n, autoplay]);

  // card -> spotlight: remember where the card is so its artwork can fly out of it; the card stays hidden while it is away
  const openSpot = (slot) => {
    const el = cards.current[slot]; if (!el || spot) return;
    const k = slot % n;
    api.current.to?.(k);
    setSpot({ i: k, from: el.getBoundingClientRect() });
    el.style.visibility = "hidden";
    hidden.current = el;
  };
  // the card for item k nearest the centre right now (where the artwork lands on close)
  // hover: feed the cursor position to CSS (spotlight, tilt, magnetic pill) without touching the card's own 3D transform
  const hoverMove = (e) => {
    if (e.pointerType === "touch") return;
    const c = e.currentTarget, r = c.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1), y = clamp((e.clientY - r.top) / r.height, 0, 1);
    c.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); c.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    c.style.setProperty("--rx", (x * 2 - 1).toFixed(3)); c.style.setProperty("--ry", (y * 2 - 1).toFixed(3));
  };
  const hoverEnd = (e) => { const c = e.currentTarget; ["--rx", "--ry"].forEach((k) => c.style.setProperty(k, "0")); c.style.setProperty("--mx", "50%"); c.style.setProperty("--my", "50%"); };
  openRef.current = openSpot;
  const cardFor = useCallback((k) => {
    let best = null, bo = 1e9;
    cards.current.forEach((c, i) => { if (!c || i % n !== k) return; const o = Math.abs(c._o || 0); if (o < bo) { bo = o; best = c; } });
    return best;
  }, [n]);
  const swapHidden = (k) => { const c = cardFor(k); if (hidden.current) hidden.current.style.visibility = ""; if (c) c.style.visibility = "hidden"; hidden.current = c; };
  const closeSpot = () => { if (hidden.current) hidden.current.style.visibility = ""; hidden.current = null; setSpot(null); };

  useEffect(() => {
    const el = root.current; if (!el || matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const deco = el.querySelector(".arc-deco") || el;     // parallax vars live on the decor layer only, so the cards never restyle
    const mv = (e) => { const r = el.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => { cx += (tx - cx) * .08; cy += (ty - cy) * .08; deco.style.setProperty("--px", cx.toFixed(3)); deco.style.setProperty("--py", cy.toFixed(3)); raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .002 ? requestAnimationFrame(tick) : 0; };
    el.addEventListener("pointermove", mv);
    return () => { el.removeEventListener("pointermove", mv); cancelAnimationFrame(raf); };
  }, []);

  const it = items[active];
  const meta = [it.year, it.category, it.duration].filter(Boolean);
  return (
    <section ref={root} className="arc" aria-label="Programs and communities">
      <div className="arc-bg" aria-hidden="true"><i /><i /><i /></div>
      <div className="arc-deco" aria-hidden="true" data-acc={items[active].kind}>
        <span className="arc-blob arc-blob--a" /><span className="arc-blob arc-blob--b" /><span className="arc-blob arc-blob--c" />
        <span className="arc-grain" />
        <div className="arc-marq"><div>{Array.from({ length: 2 }, (_, r) => (<span key={r}>{items.map((d, k) => (<Fragment key={k}>{d.title}<i>✦</i></Fragment>))}</span>))}</div></div>
        <i className="arc-crop arc-crop--tl" /><i className="arc-crop arc-crop--tr" /><i className="arc-crop arc-crop--bl" /><i className="arc-crop arc-crop--br" />
        <span className="arc-side arc-side--l">Programs &amp; Communities &mdash; {new Date().getFullYear()}</span>
        <span className="arc-side arc-side--r">Community</span>
        <svg className="arc-cross" viewBox="0 0 40 40"><circle cx="20" cy="20" r="9" /><path d="M20 0v40M0 20h40" /></svg>
        <svg className="arc-squig" viewBox="0 0 160 30"><path d="M2 15q10-14 20 0t20 0 20 0 20 0 20 0 20 0 20 0" /></svg>
        <div className="arc-badge"><svg viewBox="0 0 120 120"><defs><path id="arcBadgeP" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" /></defs><text><textPath href="#arcBadgeP">EXPLORE · DISCOVER · LEARN · EXPLORE · DISCOVER · LEARN ·</textPath></text></svg><b>↔</b></div>
        <div className="arc-chip arc-chip--1"><i /> {items[active].tags?.[0] || "Product"}</div>
        <div className="arc-chip arc-chip--2">{items[active].year || "2025"}</div>
        <div className="arc-chip arc-chip--3">{items[active].tags?.[1] || "UI / UX"} <u /></div>
      </div>
      <div className="arc-head">
        <p className="arc-eyebrow"><i /> {eyebrow} <i /></p>
        <h2 className="arc-title">{heading || (<>Where I learn,<br />contribute &amp; <em>grow</em></>)}</h2>
      </div>

      <div ref={ghost} className="arc-ghost" aria-hidden="true"><span key={active}>{pad(active + 1)}</span></div>

      <div ref={stage} className="arc-stage" tabIndex={0} role="group" aria-roledescription="carousel" aria-label="Projects, use the left and right arrow keys">
        {Array.from({ length: N }, (_, i) => (<Card key={i} d={items[i % n]} i={i} n={n} setRef={setCardRef} />))}
      </div>

      <p className="arc-hint">Explore &middot; Discover &middot; Learn</p>

      <div className="arc-meta" key={active} data-dir={dir} aria-live="polite">
        <h3>{it.title}</h3>
        <p>
          {meta.map((m, k) => (<span key={k}>{k > 0 && <b aria-hidden="true">&middot;</b>}{m}</span>))}
          {it.rating && (<><b aria-hidden="true">&middot;</b><span className="arc-star"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18l-6.5 4 1.7-7.4-5.7-5L9 8.9z" fill="currentColor" /></svg>{it.rating}</span></>)}
        </p>
        {it.href && <a className="arc-link" href={it.href}>{it.cta || "View project"} &rarr;</a>}
      </div>
      <div className="arc-dots" role="tablist" aria-label="Choose a project">
        {items.map((d, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === active} aria-label={`Show ${d.title}`} className={i === active ? "is-on" : ""} onClick={() => api.current.to?.(i)} />
        ))}
      </div>

      {spot && (
        <Spotlight items={items} index={spot.i} from={spot.from}
          getRect={(k) => { const c = cardFor(k); return c ? c.getBoundingClientRect() : null; }}
          onIndex={(k) => { api.current.to?.(k); swapHidden(k); }} onClose={closeSpot} />
      )}

      <div className="arc-count"><b>{pad(active + 1)}</b><span> / {pad(n)}</span></div>
      <div className="arc-nav">
        <button type="button" aria-label="Previous project" onClick={() => api.current.go?.(-1)}>&lsaquo;</button>
        <button type="button" aria-label="Next project" onClick={() => api.current.go?.(1)}>&rsaquo;</button>
      </div>
    </section>
  );
}

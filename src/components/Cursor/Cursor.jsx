import { useEffect, useRef } from "react";
import gsap from "gsap";
import "./cursor.css";

/* A gooey little lime creature: jelly-spring head, a gooey tail that melts back into it, eyes that look where it is going,
   moods (happy on links, "wow" on draggables, squished on click, sleepy when idle) and a burst of stars on click. */

const LINK = 'a,button,[role="button"],summary,label,select,input[type="checkbox"],input[type="radio"],input[type="range"],input[type="submit"],input[type="button"],[data-cursor="link"]';
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]),textarea,[contenteditable="true"]';
const DRAG = '[data-cursor="drag"],.dr-book,.ll-st';
const N = 9; // blobs in the body (head + tail)

export default function Cursor() {
  const wrap = useRef(null);
  const goo = useRef(null);
  const face = useRef(null);
  const label = useRef(null);
  const orbit = useRef(null);
  const pulse = useRef(null);
  const plate = useRef(null);
  const cv = useRef(null);
  const eyes = useRef([]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const ctx = cv.current.getContext("2d");
    let W = 0, H = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      cv.current.width = W * dpr; cv.current.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    const blobs = [...goo.current.children];
    const R = (i) => (i === 0 ? 14 : Math.max(3.5, 12 - i * 1.15)); // radius per blob
    blobs.forEach((b, i) => { b.style.width = b.style.height = R(i) * 2 + "px"; b.style.margin = `${-R(i)}px 0 0 ${-R(i)}px`; });
    const P = blobs.map(() => ({ x: -200, y: -200 }));

    const m = { x: -200, y: -200, seen: false, down: false };
    const v = { x: 0, y: 0 };            // head velocity (spring)
    let state = "idle", magnet = null, mood = "idle", lastMove = performance.now();
    let scaleT = 1, scale = 1, look = { x: 0, y: 0 }, ang = 0;
    const sparks = [];
    let drewSparks = false;
    // the "capture plate": a springy sticker frame that snaps around small links / buttons
    const pl = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0, a: 0, on: false, r: "12px", seeded: false };
    let heartAt = 0;
    const lbl = { x: 0, y: 0, on: false };

    const classify = (t) => {
      if (!(t instanceof Element)) return { s: "idle" };
      if (t.closest(TEXT)) return { s: "text" };
      const dr = t.closest(DRAG);
      if (dr) {
        const closed = dr.closest(".dr")?.dataset.k === "0";
        return { s: "drag", text: dr.classList.contains("dr-book") ? (closed ? "OPEN" : "FLIP") : "DRAG" };
      }
      const l = t.closest(LINK);
      if (l) {
        const href = l.getAttribute?.("href") || "";
        const auto = l.dataset.cursorLabel || (/^mailto:/.test(href) ? "SAY HI" : /^https?:/.test(href) && l.target === "_blank" ? "VISIT \u2197" : l.tagName === "A" ? "GO" : l.tagName === "BUTTON" || l.getAttribute("role") === "button" ? "CLICK" : "");
        return { s: "link", el: l, text: auto };
      }
      return { s: "idle" };
    };
    const setMood = (k) => {
      if (k === mood) return;
      mood = k;
      face.current.dataset.mood = k;
    };
    const setState = (c) => {
      state = c.s;
      magnet = c.el || null;
      wrap.current.classList.toggle("cur-hide", state === "text");
      orbit.current.classList.toggle("is-on", state === "link");
      scaleT = state === "link" ? 0.9 : state === "drag" ? 1.7 : 1;
      if (c.text) { label.current.textContent = c.text; label.current.classList.add("is-on"); } else label.current.classList.remove("is-on");
    };

    const onMove = (e) => {
      m.x = e.clientX; m.y = e.clientY;
      lastMove = performance.now();
      if (!m.seen) { m.seen = true; P.forEach((p) => { p.x = m.x; p.y = m.y; }); wrap.current.classList.add("cur-on"); }
      setState(classify(e.target));
    };
    const onDown = (e) => {
      m.down = true;
      gsap.fromTo(pulse.current, { x: e.clientX, y: e.clientY, scale: 0.4, opacity: 0.9 }, { scale: 3, opacity: 0, duration: 0.75, ease: "power3.out", overwrite: true });
      if (!reduce) for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 5;
        sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, s: 3 + Math.random() * 5, c: ["#d7ff3b", "#ff8fb4", "#7fe7ff", "#fff"][i % 4] });
      }
    };
    const onUp = () => (m.down = false);
    const onLeave = () => wrap.current.classList.remove("cur-on");
    const onEnter = () => m.seen && wrap.current.classList.add("cur-on");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    // blinking
    let blinkT;
    const blink = () => {
      face.current.classList.add("blink");
      setTimeout(() => face.current.classList.remove("blink"), 130);
      blinkT = setTimeout(blink, 1800 + Math.random() * 3200);
    };
    blinkT = setTimeout(blink, 2000);

    const tick = (_, dtms) => {
      if (!m.seen) return;
      const dt = Math.min(dtms, 50) / 16.667;
      let tx = m.x, ty = m.y;
      // capture plate
      let tgt = null;
      if (state === "link" && magnet) {
        const b = magnet.getBoundingClientRect();
        if (b.width > 8 && b.width < 460 && b.height < 170) tgt = b;
      }
      // the creature never sits ON the button's text: it hops onto the plate's top-right corner and peeks at the pointer
      let perch = false;
      if (tgt) {
        perch = true;
        tx = Math.min(W - 26, Math.max(26, tgt.right + 6));
        ty = Math.min(H - 26, Math.max(26, tgt.top - 8)) + (reduce ? 0 : Math.sin(performance.now() * 0.006) * 2.2);
      }
      if (tgt) {
        const pad = 7;
        const X = tgt.left - pad, Y = tgt.top - pad, Wd = tgt.width + pad * 2, Hd = tgt.height + pad * 2;
        if (!pl.seeded || pl.a < 0.05) { pl.x = m.x; pl.y = m.y; pl.w = 6; pl.h = 6; pl.vx = pl.vy = pl.vw = pl.vh = 0; pl.seeded = true; pl.r = getComputedStyle(magnet).borderRadius || "12px"; }
        const kS = 0.2 * dt, dm = Math.pow(0.66, dt);
        pl.vx = (pl.vx + (X - pl.x) * kS) * dm; pl.x += pl.vx * dt;
        pl.vy = (pl.vy + (Y - pl.y) * kS) * dm; pl.y += pl.vy * dt;
        pl.vw = (pl.vw + (Wd - pl.w) * kS) * dm; pl.w += pl.vw * dt;
        pl.vh = (pl.vh + (Hd - pl.h) * kS) * dm; pl.h += pl.vh * dt;
        pl.a += (1 - pl.a) * 0.25;
        plate.current.style.borderRadius = pl.r;
        // little hearts float up from the button while it is hovered
        if (!reduce && performance.now() - heartAt > 520) {
          heartAt = performance.now();
          sparks.push({ heart: true, x: tgt.left + 8 + Math.random() * (tgt.width - 16), y: tgt.top - 4, vx: (Math.random() - 0.5) * 0.7, vy: -1.3 - Math.random(), life: 1, s: 9 + Math.random() * 6, c: ["#ff8fb4", "#d7ff3b", "#7fe7ff"][(Math.random() * 3) | 0] });
        }
      } else {
        pl.a += (0 - pl.a) * 0.3;
      }
      const pe = plate.current;
      pe.style.opacity = pl.a.toFixed(3);
      pe.style.width = Math.max(pl.w, 0) + "px";
      pe.style.height = Math.max(pl.h, 0) + "px";
      pe.style.transform = `translate3d(${pl.x}px,${pl.y}px,0) scale(${0.9 + pl.a * 0.1})`;

      // jelly spring for the head (overshoots a little, then settles)
      const h = P[0];
      v.x += (tx - h.x) * 0.2 * dt; v.y += (ty - h.y) * 0.2 * dt;
      const damp = Math.pow(0.68, dt);
      v.x *= damp; v.y *= damp;
      h.x += v.x * dt; h.y += v.y * dt;
      // gooey tail follows the one in front of it
      for (let i = 1; i < N; i++) {
        const k = 1 - Math.pow(1 - (0.42 - i * 0.03), dt);
        P[i].x += (P[i - 1].x - P[i].x) * k; P[i].y += (P[i - 1].y - P[i].y) * k;
      }
      const sp = Math.hypot(v.x, v.y);
      if (sp > 0.5) ang = Math.atan2(v.y, v.x);
      scale += (scaleT * (m.down ? 0.78 : 1) - scale) * (1 - Math.pow(0.8, dt));
      const st = reduce ? 0 : Math.min(sp * 0.05, 0.55);

      // goo layer is a small box that rides with the head; blobs are positioned inside it
      goo.current.style.transform = `translate3d(${h.x - 150}px,${h.y - 150}px,0)`;
      blobs.forEach((b, i) => {
        const o = P[i];
        const s = i === 0 ? scale : 1 + (scale - 1) * 0.4;
        b.style.transform = i === 0
          ? `translate3d(${150}px,${150}px,0) rotate(${ang}rad) scale(${s * (1 + st)},${s / (1 + st * 0.7)})`
          : `translate3d(${o.x - h.x + 150}px,${o.y - h.y + 150}px,0) scale(${s * (1 - i * 0.02)})`;
      });

      // face: eyes look where it is heading (or at the pointer when still), whole face leans into the motion
      let lx = Math.cos(ang) * Math.min(sp * 0.7, 1), ly = Math.sin(ang) * Math.min(sp * 0.7, 1);
      if (perch && sp < 2) { const dx = m.x - h.x, dy = m.y - h.y, dl = Math.hypot(dx, dy) || 1; lx = dx / dl; ly = dy / dl; }
      look.x += (lx - look.x) * 0.2; look.y += (ly - look.y) * 0.2;
      const idleFor = performance.now() - lastMove;
      face.current.style.transform = `translate3d(${h.x + look.x * 4}px,${h.y + look.y * 3}px,0) scale(${scale * 0.95}) rotate(${look.x * 6}deg)`;
      eyes.current.forEach((p) => p && (p.style.transform = `translate(${look.x * 2.2}px,${look.y * 2.2}px)`));
      orbit.current.style.transform = `translate3d(${h.x}px,${h.y}px,0)`;
      // label: under the plate when a button is hovered (never over its text), otherwise under the creature
      const lt = perch ? { x: tgt.left + tgt.width / 2, y: tgt.bottom + 12 - 30 } : { x: h.x, y: h.y + 14 * scale };
      if (!lbl.on) { lbl.x = lt.x; lbl.y = lt.y; lbl.on = true; }
      const lk = 1 - Math.pow(0.78, dt);
      lbl.x += (lt.x - lbl.x) * lk; lbl.y += (lt.y - lbl.y) * lk;
      label.current.style.transform = `translate3d(${lbl.x}px,${lbl.y}px,0)`;

      // mood
      if (m.down) setMood("press");
      else if (state === "link") setMood("happy");
      else if (state === "drag") setMood("wow");
      else if (idleFor > 3500) setMood("sleep");
      else setMood(sp > 9 ? "wow" : "idle");

      if (reduce) return;
      // star sparkles when it zooms around
      if (sp > 9 && Math.random() < 0.45) sparks.push({ x: h.x, y: h.y, vx: (Math.random() - 0.5) * 1.5 - v.x * 0.08, vy: (Math.random() - 0.5) * 1.5 - v.y * 0.08, life: 1, s: 2 + Math.random() * 4, c: ["#d7ff3b", "#ff8fb4", "#7fe7ff"][(Math.random() * 3) | 0] });
      // the spark canvas covers the whole viewport: touching it every frame (even to clear nothing) makes the browser re-composite
      // the entire screen at the display's refresh rate. Only draw while there are sparks, plus one last clear.
      if (!sparks.length && !drewSparks) return;
      ctx.clearRect(0, 0, W, H);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.97; s.vy = s.vy * 0.97 + 0.04; s.life -= 0.022 * dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        const q = s.s * s.life;
        ctx.globalAlpha = Math.min(1, s.life * 1.4);
        ctx.fillStyle = s.c;
        if (s.heart) {
          ctx.font = `${Math.max(6, q * 1.6)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("\u2665", s.x + Math.sin(s.life * 9) * 3, s.y);
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - q * 1.7); ctx.quadraticCurveTo(s.x, s.y, s.x + q, s.y);
        ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + q * 1.7); ctx.quadraticCurveTo(s.x, s.y, s.x - q, s.y);
        ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - q * 1.7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      drewSparks = sparks.length > 0;
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      clearTimeout(blinkT);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      root.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={wrap} className="cur-wrap" aria-hidden="true">
      <svg width="0" height="0" style={{ position: "fixed" }}>
        <defs>
          <filter id="cur-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" result="g" />
            <feMorphology in="g" operator="dilate" radius="2" result="d" />
            <feFlood floodColor="#111" result="ink" />
            <feComposite in="ink" in2="d" operator="in" result="o" />
            <feMerge>
              <feMergeNode in="o" />
              <feMergeNode in="g" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <canvas ref={cv} className="cur-canvas" />
      <div ref={plate} className="cur-plate">
        <i className="c1" /><i className="c2" /><i className="c3" /><i className="c4" />
        <span className="shine" />
      </div>
      <div ref={goo} className="cur-goo">
        {Array.from({ length: N }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div ref={orbit} className="cur-orbit">
        <span />
        <span />
        <span />
      </div>
      <div ref={face} className="cur-face" data-mood="idle">
        <div>
          <span className="cur-eye cur-eye--l"><b ref={(e) => (eyes.current[0] = e)} /></span>
          <span className="cur-eye cur-eye--r"><b ref={(e) => (eyes.current[1] = e)} /></span>
          <span className="cur-blush cur-blush--l" />
          <span className="cur-blush cur-blush--r" />
          <span className="cur-mouth" />
          <span className="cur-z">z</span>
        </div>
      </div>
      <div ref={label} className="cur-label" />
      <div ref={pulse} className="cur-pulse" />
    </div>
  );
}

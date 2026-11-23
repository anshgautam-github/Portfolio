import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { capDpr, perf, skipFrame } from "../../lib/perf.js";
import * as A from "./art.js";

gsap.registerPlugin(ScrollTrigger);

/*
  One sticky stage, one scroll progress p (0..1), one canvas. Scenes (p):
    0.00-0.24  the hill: headline, falling leaves; the hill slides away as the camera tilts up
    0.14-0.42  the sky: a big leaf tumbles down carrying a line of text
    0.38-0.66  over a sea: the leaf shrinks away, the camera dives toward the water
    0.58-0.86  the pond: the leaf lands (ripple), koi and flowers drift, "Make it reliable", leaves rain down. The pointer makes ripples
    0.82-1.00  the shore: a paper note tilts into view
  Everything on the canvas is redrawn each frame from pre-painted layers (art.js); the text is html, moved with transforms only.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;

/* [p, x, y (of W / H), rot (deg), scale] for the big leaf */
const KF = [[0.1, 0.85, -0.3, 80, 0.45], [0.18, 0.38, 0.34, 62, 1.0], [0.3, 0.47, 0.52, 44, 1.05], [0.42, 0.62, 0.56, 54, 0.78], [0.54, 0.74, 0.62, 36, 0.38], [0.64, 0.74, 0.66, 40, 0.3], [0.88, 0.74, 0.64, 40, 0.3], [0.96, 0.74, 0.3, 40, 0.3]];
const heroAt = (p) => {
  if (p <= KF[0][0]) return KF[0];
  for (let i = 0; i < KF.length - 1; i++) {
    if (p <= KF[i + 1][0]) { const a = KF[i], b = KF[i + 1], k = ease(seg(p, a[0], b[0])); return [p, lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerp(a[4], b[4], k)]; }
  }
  return KF[KF.length - 1];
};

export default function initJourney(root) {
  const q = (s) => root.querySelector(s);
  const wrap = q("[data-jr-wrap]"), stage = q("[data-jr-stage]"), cv = q("[data-jr-cv]");
  const hero = q("[data-jr-heroin]"), ltxt = q("[data-jr-ltxt]"), pondT = q("[data-jr-pond]"), note = q("[data-jr-note]");
  const dots = [...root.querySelectorAll("[data-jr-dot]")];
  const copyBtn = q("[data-jr-copy]"), copied = q("[data-jr-copied]");
  if (!wrap || !stage || !cv) return () => {};
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, buildTimer = 0, built = false;
  const L = {};
  const S = { target: 0, cur: 0, last: 0 };
  const ptr = { x: 0, y: 0 };

  /* ---------- scene state (deterministic) ---------- */
  const rnd = A.mulberry(99);
  const sky = Array.from({ length: 64 }, (_, i) => ({ x: rnd(), y: rnd(), d: 0.2 + rnd() * 0.8, ph: rnd() * TAU, w: 0.5 + rnd(), th: ((i * 37) % 64) / 64, c: A.LEAF_COLORS[(rnd() * 6) | 0], r0: rnd() * TAU }));
  const pondLeaves = Array.from({ length: 18 }, (_, i) => ({ x: 0.04 + rnd() * 0.92, y: 0.12 + rnd() * 1.3, s: 0.6 + rnd() * 0.7, th: 0.72 + (i / 18) * 0.12, r0: rnd() * TAU, c: A.LEAF_COLORS[(rnd() * 6) | 0], ph: rnd() * TAU }));
  const flowers = Array.from({ length: 8 }, () => ({ x: 0.06 + rnd() * 0.88, y: 0.1 + rnd() * 1.4, s: 0.7 + rnd() * 0.6, ph: rnd() * TAU }));
  const fish = [{ y: 0.52, sp: 40, len: 1, dir: 1, ph: 0, x0: 0.3 }, { y: 0.82, sp: 26, len: 1.15, dir: -1, ph: 2, x0: 0.7 }, { y: 1.15, sp: 34, len: 0.9, dir: 1, ph: 4, x0: 0.15 }];
  const ripples = [];
  let lastRip = 0, prevP = 0;

  const dens = (p) => (p < 0.1 ? 0.3 : p < 0.2 ? lerp(0.3, 1, seg(p, 0.1, 0.2)) : p < 0.42 ? 1 : lerp(1, 0.1, seg(p, 0.42, 0.55)));

  /* ---------- layers ---------- */
  /* painted art: drop files in public/journey/ (see ASSETS.md). Any file that is missing falls back to the code-drawn version. */
  const BASE = (import.meta.env && import.meta.env.BASE_URL) || "/";
  const FILES = { sky: "sky.jpg", hill: "hill.png", hero: "leaf-big.png", sea: "sea.jpg", pond: "pond.jpg", shore: "shore.jpg", koi: "koi.png", flower: "flower.png", l1: "leaf-1.png", l2: "leaf-2.png", l3: "leaf-3.png", l4: "leaf-4.png" };
  const IMG = {};
  let imgsP = null;
  const loadImages = () => imgsP || (imgsP = Promise.all(Object.entries(FILES).map(([k, f]) => new Promise((res) => {
    const im = new Image(); im.decoding = "async";
    im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = BASE + "journey/" + f;
  }))).then(() => { A.sprites.koi = IMG.koi || null; A.sprites.flower = IMG.flower || null; A.sprites.leaves = ["l1", "l2", "l3", "l4"].map((k) => IMG[k]).filter(Boolean); }));
  const [hw0, hh0] = A.heroSize(1000);
  const jobs = [
    ["sky", A.buildSky, (im) => A.fromImage(im, W, H * 2, dpr, "cover", 1)],
    ["hill", A.buildHill, (im) => A.fromImage(im, W, H, dpr, "cover", 1)],
    ["hero", A.buildHeroLeaf, (im) => A.fromImage(im, hw0 / 1000 * H, H, dpr, "contain")],
    ["sea", A.buildSea, (im) => A.fromImage(im, W, H, dpr, "cover", 0.5)],
    ["pond", A.buildPond, (im) => A.fromImage(im, W, H * 1.6, dpr, "cover", 0.5)],
    ["shore", A.buildShore, (im) => A.fromImage(im, W, H, dpr, "cover", 0.5)],
  ];
  let buildGen = 0;
  const rebuild = () => {
    clearTimeout(buildTimer);
    const gen = ++buildGen;
    for (const k of Object.keys(L)) delete L[k];
    built = false;
    loadImages().then(() => {
      if (gen !== buildGen) return;
      let i = 0;
      const next = () => { if (gen !== buildGen) return; if (i >= jobs.length) { built = true; return; } const [k, fn, fromImg] = jobs[i++]; L[k] = IMG[k] ? fromImg(IMG[k]) : fn(W, H, dpr); S.last = -1; buildTimer = setTimeout(next, 24); };
      next();
    });
  };
  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight; dpr = capDpr(1.75, 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };

  /* ---------- drawing ---------- */
  const drawSkyLeaves = (p, t, alpha) => {
    const Hs = H / 900, den = dens(p);
    for (const lv of sky) {
      if (lv.th >= den) continue;
      const a = clamp((den - lv.th) * 6) * alpha; if (a <= 0.01) continue;
      const size = Hs * (5 + lv.d * lv.d * 44), span = H + size * 4;
      const y = ((lv.y * H + t * (14 + lv.d * 46) + p * lv.d * H * 2.4) % span) - size * 2;
      const x = lv.x * W + Math.sin(t * 0.5 * lv.w + lv.ph) * 36 * lv.d + (p - 0.3) * W * 0.12 * (lv.d - 0.5);
      A.leaf(ctx, x, y, size, lv.r0 + t * 0.4 * lv.w, Math.cos(t * (0.9 + lv.w) + lv.ph), lv.c, a);
    }
  };

  const drawPondStuff = (p, t, alpha, shift) => {
    const Hs = H / 900;
    ctx.save(); ctx.translate(0, -shift); ctx.globalAlpha = alpha;
    for (const f of fish) {
      const len = 220 * Hs * f.len, span = W + len * 2.4, px = (((f.x0 * W + f.dir * f.sp * t) % span) + span) % span - len * 1.2, py = f.y * H + Math.sin(t * 0.5 + f.ph) * 36 * Hs;
      const vy = Math.cos(t * 0.5 + f.ph) * 18 * Hs, ang = Math.atan2(vy, f.dir * f.sp) + (f.dir < 0 ? Math.PI : 0);
      A.koi(ctx, px, py, ang, len, t, 0.9, f.ph);
    }
    for (const f of flowers) A.flower(ctx, f.x * W + Math.sin(t * 0.4 + f.ph) * 5, f.y * H + Math.cos(t * 0.35 + f.ph) * 4, 50 * Hs * f.s, f.ph + t * 0.06);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], a = (t - r.t0) / r.life;
      if (a > 1) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(235,255,240,${(1 - a) * 0.55})`; ctx.lineWidth = 2.2;
      for (let k = 0; k < 2; k++) { const aa = clamp(a - k * 0.14); if (aa <= 0) continue; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.max * easeOut(aa), r.max * easeOut(aa) * 0.8, 0, 0, TAU); ctx.stroke(); }
    }
    for (const lv of pondLeaves) {
      const k = ease(seg(p, lv.th, lv.th + 0.07)); if (k <= 0) continue;
      A.leaf(ctx, lv.x * W + Math.sin(t * 0.3 + lv.ph) * 7, lv.y * H - (1 - k) * H * 1.2, 46 * Hs * lv.s, lv.r0 + Math.sin(t * 0.25 + lv.ph) * 0.15 + (1 - k) * 2, 1, lv.c, k);
    }
    ctx.restore();
  };

  const frame = (p, t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;

    const pondA = seg(p, 0.58, 0.68), seaA = seg(p, 0.38, 0.5), shoreA = seg(p, 0.82, 0.92), skyA = 1 - seaA;
    const shift = ease(seg(p, 0.62, 0.92)) * 0.6 * H;

    if (pondA < 1) {
      if (skyA > 0 && L.sky) { const vt = lerp(H, 0, ease(seg(p, 0.06, 0.32))); ctx.drawImage(L.sky, 0, vt * dpr, L.sky.width, H * dpr, 0, 0, W, H); }
      if (L.hill && p < 0.3) ctx.drawImage(L.hill, 0, ease(seg(p, 0.05, 0.24)) * H * 1.15, W, H);
      if (seaA > 0 && L.sea) {
        const sc = 1 + 0.55 * ease(seg(p, 0.5, 0.66));
        ctx.save(); ctx.globalAlpha = seaA; ctx.translate(W / 2, H * 0.7); ctx.scale(sc, sc); ctx.translate(-W / 2, -H * 0.7); ctx.drawImage(L.sea, 0, 0, W, H); ctx.restore();
      }
      const la = 1 - seg(p, 0.5, 0.62);
      if (la > 0) drawSkyLeaves(p, t, la);
    }
    if (pondA > 0 && L.pond) {
      const sc = lerp(1.5, 1, ease(seg(p, 0.58, 0.7)));
      ctx.save(); ctx.globalAlpha = pondA; ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(L.pond, 0, shift * dpr, L.pond.width, H * dpr, 0, 0, W, H); ctx.globalAlpha = 1;
      drawPondStuff(p, t, pondA, shift);
      ctx.restore();
    }
    if (shoreA > 0 && L.shore) { ctx.globalAlpha = shoreA; ctx.drawImage(L.shore, 0, (1 - ease(shoreA)) * H * 0.08, W, H); ctx.globalAlpha = 1; }

    /* the big leaf */
    const [, hx, hy, hr, hs] = heroAt(p);
    const air = 1 - seg(p, 0.56, 0.66), ha = seg(p, 0.09, 0.14) * (1 - seg(p, 0.9, 0.95));
    const x = hx * W + Math.sin(t * 0.6) * 10 * air, y = hy * H + Math.sin(t * 0.7) * 10 * air, rot = hr + Math.sin(t * 0.8) * 5 * air;
    const flip = 1 - 0.18 * (0.5 + 0.5 * Math.sin(t * 0.9)) * air, sc = hs * 0.85;
    if (L.hero && ha > 0.01) {
      const [sw, sh] = A.heroSize(H); // sprite's css size at scale 1 == H tall
      ctx.save(); ctx.globalAlpha = ha; ctx.translate(x, y); ctx.rotate((rot * Math.PI) / 180); ctx.scale(sc * flip, sc);
      ctx.drawImage(L.hero, -sw / 2, -sh / 2, sw, sh); ctx.restore();
    }
    if (prevP < 0.62 && p >= 0.62) ripples.push({ x, y: y + shift, t0: t, life: 2.6, max: 110 * (H / 900) });
    prevP = p;

    /* html layers */
    const a1 = 1 - seg(p, 0.06, 0.16);
    setStyle(hero, `translate3d(0,${(-seg(p, 0.04, 0.18) * 70).toFixed(1)}px,0)`, a1);
    ltxt.style.fontSize = H * 0.1 + "px";
    setStyle(ltxt, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(rot - 90).toFixed(2)}deg) scale(${sc.toFixed(3)})`, seg(p, 0.15, 0.22) * (1 - seg(p, 0.6, 0.67)) * ha);
    setStyle(pondT, `translate3d(0,${(-shift * 1.05).toFixed(1)}px,0)`, seg(p, 0.64, 0.71) * (1 - seg(p, 0.82, 0.9)));
    const nk = ease(seg(p, 0.86, 0.95));
    setStyle(note, `translate3d(0,${((1 - nk) * H * 0.4).toFixed(1)}px,0) translate(-50%,-50%) perspective(1500px) rotateX(${(16 - ptr.y * 4).toFixed(2)}deg) rotateY(${(-9 + ptr.x * 5).toFixed(2)}deg) rotateZ(-7deg)`, nk);

    const idx = p < 0.2 ? 0 : p < 0.46 ? 1 : p < 0.68 ? 2 : p < 0.88 ? 3 : 4, bounds = [0, 0.2, 0.46, 0.68, 0.88, 1];
    dots.forEach((d, i) => {
      d.classList.toggle("is-on", i === idx);
      d.firstChild.style.transform = `scaleY(${i === idx ? seg(p, bounds[i], bounds[i + 1]).toFixed(3) : 0})`;
    });
  };

  const styleCache = new WeakMap();
  function setStyle(el, tf, op) {
    if (!el) return;
    const key = tf + "|" + op.toFixed(3), prev = styleCache.get(el);
    if (prev === key) return;
    styleCache.set(el, key); el.style.transform = tf; el.style.opacity = op.toFixed(3);
  }

  /* ---------- wiring ---------- */
  let inView = false, started = false;
  const io = new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (e.isIntersecting && !started) { started = true; rebuild(); }
  }, { rootMargin: "70% 0px 70% 0px" });
  io.observe(root);

  const st = ScrollTrigger.create({
    trigger: wrap, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { S.target = s.progress; },
    onRefresh: (s) => { measure(); if (started) rebuild(); S.target = s.progress; S.cur = s.progress; },
  });

  const ctxg = gsap.context(() => {
    if (reduce) return;
    gsap.set("[data-jr-w]", { yPercent: 115 }); gsap.set("[data-jr-rise]", { y: 24, opacity: 0 });
    ScrollTrigger.create({ trigger: root, start: "top 60%", once: true, onEnter: () => {
      gsap.to("[data-jr-w]", { yPercent: 0, duration: 1.1, stagger: 0.14, ease: "power4.out" });
      gsap.to("[data-jr-rise]", { y: 0, opacity: 1, duration: 0.9, delay: 0.5, ease: "power3.out" });
    } });
  }, root);

  const tick = (_, dtMs) => {
    if (!inView) return;
    const now = performance.now();
    if (skipFrame(now, tick.t || 0)) return; tick.t = now;
    const t = gsap.ticker.time, e = S.target - S.cur;
    S.cur += Math.abs(e) > 0.00005 ? e * 0.12 : e;
    if (!built && !L.sky) return;
    frame(S.cur, t);
  };

  const onMove = (e) => {
    const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    ptr.x = (x / r.width - 0.5) * 2; ptr.y = (y / r.height - 0.5) * 2;
    const now = performance.now(), p = S.cur;
    if (p > 0.66 && p < 0.9 && now - lastRip > 140 && ripples.length < 14) {
      lastRip = now; const shift = ease(seg(p, 0.62, 0.92)) * 0.6 * H;
      ripples.push({ x, y: y + shift, t0: gsap.ticker.time, life: 1.8, max: 70 * (H / 900) });
    }
  };

  const goTo = (i) => {
    const target = [0.02, 0.26, 0.5, 0.74, 0.97][i], y = st.start + target * (st.end - st.start);
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { duration: 2.2 }); else window.scrollTo({ top: y, behavior: "smooth" });
  };
  const dotHandlers = dots.map((d, i) => { const h = () => goTo(i); d.addEventListener("click", h); return [d, h]; });

  let copiedTimer = 0;
  const onCopy = async () => {
    const url = root.querySelector(".jr-pill a").href;
    try { await navigator.clipboard.writeText(url); } catch { const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
    if (copied) { copied.textContent = "Copied"; copied.classList.add("is-on"); clearTimeout(copiedTimer); copiedTimer = setTimeout(() => copied.classList.remove("is-on"), 1400); }
  };
  copyBtn && copyBtn.addEventListener("click", onCopy);

  let rz = 0;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { measure(); if (started) rebuild(); }, 220); };
  window.addEventListener("resize", onResize);

  measure();
  if (reduce) {
    root.classList.add("is-static");
    started = true; rebuild();
    const stillTimer = setInterval(() => { if (L.sky && L.hill) { frame(0, 0); clearInterval(stillTimer); } }, 120);
    return () => { clearInterval(stillTimer); buildGen++; clearTimeout(buildTimer); root.classList.remove("is-static"); st.kill(); io.disconnect(); ctxg.revert(); window.removeEventListener("resize", onResize); };
  }
  stage.addEventListener("pointermove", onMove, { passive: true });
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick); buildGen++; clearTimeout(buildTimer); clearTimeout(rz); clearTimeout(copiedTimer);
    window.removeEventListener("resize", onResize); stage.removeEventListener("pointermove", onMove);
    dotHandlers.forEach(([d, h]) => d.removeEventListener("click", h)); copyBtn && copyBtn.removeEventListener("click", onCopy);
    io.disconnect(); st.kill(); ctxg.revert();
    void perf;
  };
}

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import initLiveBg from "../../lib/liveBg.js";
import initWaveBg from "../../lib/waveBg.js";
import initContourBg from "../../lib/contourBg.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Horizon:
   - ribbon: text slides along the wavy path forever (px/s), and is shoved faster/slower by how hard you scroll
   - intro:  headline rises, chips pop, cards + big disc drift with the scroll
   - pinned: one sticky stage, the track slides sideways with the vertical scroll; cards/discs ride at their own speed (parallax),
             notes draw themselves in as their panel arrives, a progress bar + counter follow along
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));

export default function initHorizon(root) {
  const q = (s) => root.querySelector(s);
  const all = (s) => [...root.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wrap = q("[data-hz-wrap]"), stage = q("[data-hz-stage]"), track = q("[data-hz-track]");
  const tp = q("[data-hz-tp]"), ts = q("[data-hz-ts]"), topEl = q("[data-hz-top]");
  if (!wrap || !stage || !track) return () => {};

  if (reduce) {
    root.classList.add("is-static");
    return () => root.classList.remove("is-static");
  }

  const bgOff = initLiveBg(q("[data-hz-intro]"), { theme: "blue" });
  const topBgOff = initWaveBg(topEl, { theme: "light" });   // the ribbon block shares the pale silk-wave page above it, so the two read as one

  /* ---------- one-off reveals ---------- */
  const ctx = gsap.context(() => {
    gsap.set("[data-hz-word]", { yPercent: 115 });
    gsap.set("[data-hz-why]", { yPercent: 115 });
    gsap.set("[data-hz-rise]", { y: 26, opacity: 0 });
    gsap.set("[data-hz-rise2]", { y: 20, opacity: 0 });
    gsap.set("[data-hz-heroDisc]", { yPercent: 40 });
    all("[data-hz-note] path").forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    gsap.set("[data-hz-note] span", { opacity: 0, y: 8 });

    ScrollTrigger.create({ trigger: q("[data-hz-intro]"), start: "top 70%", once: true, onEnter: () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.to("[data-hz-word]", { yPercent: 0, duration: 1.1, stagger: 0.12 })
        .to("[data-hz-rise]", { y: 0, opacity: 1, duration: 0.7, stagger: 0.09 }, "-=0.7")
        .to("[data-hz-heroDisc]", { yPercent: 0, duration: 1.3, ease: "back.out(1.3)" }, "-=1");
    } });
    ScrollTrigger.create({ trigger: q(".hz-why"), start: "top 75%", once: true, onEnter: () => {
      gsap.to("[data-hz-rise2]", { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
      gsap.to("[data-hz-why]", { yPercent: 0, duration: 1, stagger: 0.12, ease: "power4.out" });
    } });
  }, root);

  /* ---------- geometry ---------- */
  let W = 0, H = 0, maxX = 0;
  const panels = all("[data-hz-panel]");
  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    maxX = Math.max(0, track.scrollWidth - W);
    wrap.style.height = (H + maxX) + "px";
  };

  /* ribbon text: make sure the path is always covered, and know the length of one repeat */
  let unitLen = 600;
  const fitRibbon = () => {
    if (!ts || !tp) return;
    const unit = ts.dataset.unit;
    const path = root.querySelector("#hz-rc");
    ts.textContent = unit;
    const text = tp.parentNode;
    unitLen = text.getComputedTextLength() || 600;
    const need = Math.ceil(((path ? path.getTotalLength() : 2400) + unitLen * 2) / unitLen);
    ts.textContent = unit.repeat(need);
  };

  /* ---------- scroll state ---------- */
  const S = { target: 0, cur: 0, drawn: -1 };
  const st = ScrollTrigger.create({
    trigger: wrap, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { S.target = s.progress; },
    onRefresh: (s) => { measure(); S.drawn = -1; S.target = s.progress; S.cur = s.progress; },
  });

  const cardsIn = all(".hz-intro [data-hz-card]").map((el) => ({ el, k: +el.dataset.k || 0 }));
  const heroDisc = q("[data-hz-heroDisc]");
  const explore = q("[data-hz-explore]");
  const cardsP = all(".hz-wrap [data-hz-card]").map((el) => ({ el, k: +el.dataset.k || 0 }));
  const notes = all("[data-hz-note]").map((el) => ({ el, panel: el.closest("[data-hz-panel]"), paths: [...el.querySelectorAll("path")], text: el.querySelector("span"), on: false }));
  const bar = q("[data-hz-bar]"), count = q("[data-hz-count]");
  const rings = all("[data-hz-ring]").map((el) => ({ el, dir: +el.dataset.dir || 1 }));

  const showNote = (n) => {
    n.on = true;
    n.paths.forEach((p, i) => gsap.to(p, { strokeDashoffset: 0, duration: 0.7, delay: i * 0.25, ease: "power2.inOut" }));
    gsap.to(n.text, { opacity: 1, y: 0, duration: 0.7, delay: 0.5, ease: "power3.out" });
  };

  let trackX = "";
  const drawPinned = (p) => {
    const x = -maxX * p;
    const tx = `translate3d(${x.toFixed(1)}px,0,0)`;
    if (tx !== trackX) { track.style.transform = tx; trackX = tx; }
    for (const c of cardsP) c.el.style.translate = `${(maxX * p * c.k).toFixed(1)}px 0`;
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (count && panels.length) {
      const n = clamp(Math.floor(p * panels.length + 0.0001) + 1, 1, panels.length);
      const t = "0" + n;
      if (count.textContent !== t) count.textContent = t;
    }
    const vx = -x;
    for (const n of notes) {
      if (n.on) continue;
      const r = n.panel.offsetLeft - vx;
      if (r < W * 0.75) showNote(n);
    }
  };

  /* ---------- ticker: ribbon, rings, parallax ---------- */
  let ribbonIn = false, rootIn = false;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.target === topEl) ribbonIn = e.isIntersecting;
    if (e.target === root) rootIn = e.isIntersecting;
  }), { rootMargin: "10% 0px" });
  if (topEl) io.observe(topEl); io.observe(root);

  let off = 0, lastY = window.scrollY, time = 0, introKey = "";
  const tick = (_, dtMs) => {
    if (!rootIn) return;
    const dt = Math.min(dtMs, 64) / 1000;
    time += dt;
    const y = window.scrollY, dy = y - lastY; lastY = y;

    if (ribbonIn && tp) {
      off -= 110 * dt + dy * 0.55;
      off = ((off % unitLen) - unitLen) % unitLen;
      tp.setAttribute("startOffset", off.toFixed(1));
    }

    const ang = time * 9 + y * 0.1;
    for (const r of rings) r.el.setAttribute("transform", `rotate(${(ang * r.dir).toFixed(1)} 150 150)`);

    // intro parallax, from the intro's position in the viewport
    const ir = q("[data-hz-intro]").getBoundingClientRect();
    if (ir.bottom > -100 && ir.top < innerHeight + 100) {
      const t = ir.top / innerHeight;
      const key = t.toFixed(3);
      if (key !== introKey) {
        introKey = key;
        for (const c of cardsIn) c.el.style.translate = `0 ${(t * c.k * -360).toFixed(1)}px`;
        if (heroDisc) heroDisc.style.translate = `0 ${(t * 120).toFixed(1)}px`;
        if (explore) explore.style.translate = `0 ${(t * -90).toFixed(1)}px`;
      }
    }

    // pinned track: ease toward the scroll target
    const e = S.target - S.cur;
    if (Math.abs(e) > 0.00004) S.cur += e * 0.14; else S.cur = S.target;
    if (S.cur !== S.drawn) { S.drawn = S.cur; drawPinned(S.cur); }
  };
  gsap.ticker.add(tick);

  const onExplore = () => {
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(wrap, { duration: 2.4 });
    else wrap.scrollIntoView({ behavior: "smooth" });
  };
  explore && explore.addEventListener("click", onExplore);

  const onResize = () => { fitRibbon(); measure(); S.drawn = -1; };
  window.addEventListener("resize", onResize);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.then(() => { fitRibbon(); measure(); S.drawn = -1; ScrollTrigger.refresh(); }) : null;
  fitRibbon(); measure(); drawPinned(0);
  const mapOffs = [
    initContourBg(q(".hz-why"), { anchor: q(".hz-why") }),
    initContourBg(stage, { anchor: wrap, panX: () => maxX * S.cur * 0.5 }),
  ];

  return () => {
    window.removeEventListener("resize", onResize);
    explore && explore.removeEventListener("click", onExplore);
    gsap.ticker.remove(tick); io.disconnect(); st.kill(); ctx.revert(); bgOff(); topBgOff(); mapOffs.forEach((f) => f());
    void fontsReady;
  };
}

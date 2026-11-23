import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  Screen stack: a deck of product screens fanned in 3D that rises, compresses and squares up into one flat screen as you scroll,
  followed by a headline that lights up word by word. Both halves are `position: sticky` stages inside tall wrappers (no ScrollTrigger pin,
  so nothing is re-parented and it behaves under Lenis). Scroll only sets a *target* progress; a ticker eases the value actually drawn toward it,
  so the motion stays buttery even when the wheel steps. Everything is transform / opacity only.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const seg = (p, a, b) => clamp((p - a) / (b - a));

export default function initScreenStack(root) {
  const q = (s) => root.querySelector(s);
  const wrapA = q("[data-ss-a]");
  const stage = q("[data-ss-stage]");
  const head = q("[data-ss-head]");
  const allCards = [...root.querySelectorAll("[data-ss-card]")];
  const amb = q("[data-ss-amb]"), floor = q("[data-ss-floor]"), bar = q("[data-ss-bar]"), count = q("[data-ss-count]");
  const notes = [...root.querySelectorAll("[data-ss-note]")], lossEl = q("[data-ss-loss]"), spark = q("[data-ss-spark]");
  const ambB = q("[data-ss-amb-b]"), barB = q("[data-ss-bar-b]"), countB = q("[data-ss-count-b]"), stickyB = q("[data-ss-sb]");
  const margin = [...root.querySelectorAll("[data-ss-mn]")];
  const RGB = { research: [126, 162, 255], engineering: [143, 123, 255], design: [78, 227, 154] };
  const wrapB = q("[data-ss-b]");
  const words = [...root.querySelectorAll("[data-ss-word]")];
  const works = [...root.querySelectorAll("[data-ss-work]")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!wrapA || !allCards.length) return () => {};

  if (reduce) {
    root.classList.add("is-static");
    return () => root.classList.remove("is-static");
  }

  let cards = allCards, n = allCards.length;
  let vw = 0, vh = 0, narrow = false, stack = false;
  const cardW = () => (narrow ? 88 * vw : Math.min(66 * vw, 1180));
  const measure = () => {
    vw = window.innerWidth / 100;
    vh = window.innerHeight / 100;
    narrow = window.innerWidth < 768;
    cards = allCards.filter((c) => getComputedStyle(c).display !== "none");   // phones show fewer cards: keep count + spacing right after a resize
    n = cards.length;
    const k = 0.9 * (narrow ? 0.9 : 0.62), w = cardW();   // the finished screen's half width / height, for the notes around it
    root.style.setProperty("--ss-hw", ((w * k) / 2).toFixed(1) + "px");
    root.style.setProperty("--ss-half", ((w * 0.625 * k) / 2).toFixed(1) + "px");
    stack = window.innerWidth <= 860; // same breakpoint as the CSS: margin notes stack under the headline
  };
  measure();

  // margin notes sit beside the word they annotate (the headline wraps differently at every width, so measure it)
  const kIdx = margin.map((el) => words.findIndex((w) => w.textContent.trim().toLowerCase().startsWith(el.dataset.key)));
  const placeNotes = () => {
    if (!stickyB) return;
    if (stack) { margin.forEach((el) => { el.style.top = el.style.left = el.style.right = ""; }); return; }
    const sr = stickyB.getBoundingClientRect(), gap = clamp(window.innerWidth * 0.03, 28, 56);
    margin.forEach((el, i) => {
      const w = words[kIdx[i]]; if (!w) return;
      const r = w.getBoundingClientRect(), cy = r.top - sr.top + r.height * 0.5;
      el.style.setProperty("--gap", gap + "px"); el.style.top = (cy - 16).toFixed(1) + "px";
      if (el.classList.contains("ss-mn-r")) { el.style.left = (r.right - sr.left + gap * 0.4).toFixed(1) + "px"; el.style.right = "auto"; }
      else { el.style.right = (sr.right - r.left + gap * 0.4).toFixed(1) + "px"; el.style.left = "auto"; }
    });
  };

  /* ---------------- part A: the deck ---------------- */
  const A = { target: 0, cur: 0 };
  const drawA = (p) => {
    const a = easeInOut(seg(p, 0.0, 0.46));      // the deck rises and the cards draw together
    const b = easeInOut(seg(p, 0.40, 0.92));     // it squares up and folds into one screen
    const sp = (1 - 0.66 * a) * (1 - b);         // spacing between cards

    const fx = lerp(narrow ? -4 * vw : -13 * vw, 0, a) * (1 - b);
    const fy = lerp(narrow ? 48 * vh : 63 * vh, narrow ? 4 * vh : 8 * vh, a) * (1 - b);
    const rx = lerp(60, 44, a) * (1 - b);
    const rz = lerp(8, 4.5, a) * (1 - b);
    const sc = lerp(1, 0.9, a) * lerp(1, narrow ? 0.9 : 0.62, b);
    const dx = (narrow ? 2.4 : 4.4) * vw * sp;
    const dy = -(narrow ? 2.6 : 3.7) * vh * sp;
    const dz = -55 * sp;

    for (let i = 0; i < n; i++) {
      const c = cards[i];
      const o = i === 0 ? 1 : 1 - easeOut(seg(b, 0.45, 0.95));
      c.style.transform = `translate3d(${(fx + i * dx).toFixed(2)}px,${(fy + i * dy).toFixed(2)}px,${(i * dz).toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      c.style.opacity = o.toFixed(3);
      c.style.setProperty("--d", (Math.min(0.6, i * 0.075) * (1 - b)).toFixed(3));
      c.style.setProperty("--r", `${lerp(18, 12, b).toFixed(1)}px`);
      c.style.visibility = o < 0.01 ? "hidden" : "visible";
    }
    // ambient light follows the stack: low and to the right while it is a fan, centred once it is a screen
    if (amb) {
      amb.style.setProperty("--ax", `${lerp(60, 50, a).toFixed(1)}%`);
      amb.style.setProperty("--ay", `${lerp(80, 52, a).toFixed(1)}%`);
      amb.style.setProperty("--ao", lerp(0.45, 1, a).toFixed(3));
      const cw = cardW(), ch = cw * 0.625;
      floor.style.setProperty("--fy", `${(50 * vh + (ch * sc) / 2 + 2.4 * vh).toFixed(1)}px`);
      floor.style.setProperty("--fw", `${(cw * sc * 1.18).toFixed(1)}px`);
      floor.style.setProperty("--fo", easeOut(seg(b, 0.55, 1)).toFixed(3));
    }
    // live labels
    if (count) { const left = Math.max(1, Math.round(lerp(n, 1, easeInOut(seg(b, 0.12, 0.95))))); const txt = `${String(left).padStart(2, "0")} / ${String(n).padStart(2, "0")} screen${left > 1 ? "s" : ""}`; if (count.textContent !== txt) count.textContent = txt; }
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    // notes from the run, once it is one screen
    const nt = seg(b, 0.9, 1);
    for (let i = 0; i < notes.length; i++) {
      const t = easeOut(seg(nt, i * 0.12, 0.5 + i * 0.12)), dir = notes[i].classList.contains("ss-note-l") ? -1 : 1;
      notes[i].style.opacity = t.toFixed(3);
      notes[i].style.transform = `translate3d(${(dir * (1 - t) * 18).toFixed(1)}px,0,0)`;
      notes[i].style.setProperty("--ln", t.toFixed(3));
    }
    if (lossEl) lossEl.textContent = lerp(9.781, 5.961, easeOut(seg(p, 0.9, 1))).toFixed(3);
    if (spark) spark.style.strokeDashoffset = (1 - easeOut(seg(p, 0.9, 1))).toFixed(3);
    const h = easeOut(seg(p, 0.0, 0.3));
    head.style.opacity = (1 - h).toFixed(3);
    head.style.transform = `translate3d(0,${(-9 * vh * h).toFixed(2)}px,0)`;
    head.style.pointerEvents = h > 0.6 ? "none" : "";
  };

  /* ---------------- part B: the headline and the cards under it ---------------- */
  const B = { target: 0, cur: 0 };
  const drawB = (p) => {
    const m = words.length;
    for (let i = 0; i < m; i++) {
      const t = seg(p, 0.06 + (i / m) * 0.74, 0.06 + ((i + 1.6) / m) * 0.74);
      words[i].style.opacity = lerp(0.16, 1, easeOut(t)).toFixed(3);
    }
    // the three disciplines: the word takes its colour, a note slides out beside it, and a counter ticks
    let lit = 0;
    margin.forEach((el, i) => {
      const wi = kIdx[i]; if (wi < 0) return;
      const t = seg(p, 0.06 + (wi / m) * 0.74, 0.06 + ((wi + 1.6) / m) * 0.74), k = easeOut(seg(t, 0.55, 1)), c = RGB[el.dataset.key], dir = el.classList.contains("ss-mn-l") ? -1 : 1;
      words[wi].style.color = `rgb(${lerp(255, c[0], k) | 0},${lerp(255, c[1], k) | 0},${lerp(255, c[2], k) | 0})`;
      el.style.opacity = k.toFixed(3); el.style.transform = stack ? `translate3d(0,${((1 - k) * 12).toFixed(1)}px,0)` : `translate3d(${(dir * (1 - k) * 16).toFixed(1)}px,0,0)`; el.style.setProperty("--ln", k.toFixed(3));
      if (k > 0.5) lit++;
    });
    if (countB) { const txt = `${String(lit).padStart(2, "0")} / 03`; if (countB.textContent !== txt) countB.textContent = txt; }
    if (barB) barB.style.transform = `scaleX(${p.toFixed(4)})`;
    if (ambB) { ambB.style.setProperty("--ax", `${lerp(30, 70, p).toFixed(1)}%`); ambB.style.setProperty("--ay", `${(52 + Math.sin(p * 6.283) * 6).toFixed(1)}%`); ambB.style.setProperty("--ao", (0.5 + 0.4 * Math.sin(p * 3.1416)).toFixed(3)); }
  };

  /* ---------------- scroll -> targets, ticker -> draw ---------------- */
  let activeA = false, activeB = false;
  const stA = ScrollTrigger.create({
    trigger: wrapA, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { A.target = s.progress; },
    onToggle: (s) => { activeA = s.isActive; },
    onRefresh: (s) => { measure(); A.target = s.progress; A.cur = s.progress; drawA(A.cur); },
  });
  const stB = ScrollTrigger.create({
    trigger: wrapB, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { B.target = s.progress; },
    onToggle: (s) => { activeB = s.isActive; },
    onRefresh: (s) => { placeNotes(); B.target = s.progress; B.cur = s.progress; drawB(B.cur); },
  });
  // the deck is also drawn a little before/after it is pinned (it sits at the bottom of the screen while the landing leaves)
  const stNear = ScrollTrigger.create({
    trigger: wrapA, start: "top bottom", end: "bottom top",
    onToggle: (s) => { stage.classList.toggle("is-near", s.isActive); },
  });

  const ptr = { x: 0, y: 0, cx: 0, cy: 0 };
  const onPtr = (e) => { ptr.x = (e.clientX / window.innerWidth) * 2 - 1; ptr.y = (e.clientY / window.innerHeight) * 2 - 1; };
  window.addEventListener("pointermove", onPtr, { passive: true });

  const tick = () => {
    if ((amb && activeA) || (ambB && activeB)) {
      ptr.cx += (ptr.x - ptr.cx) * 0.05; ptr.cy += (ptr.y - ptr.cy) * 0.05;
      const tg = activeA ? amb : ambB;
      tg.style.setProperty("--px", ptr.cx.toFixed(3)); tg.style.setProperty("--py", ptr.cy.toFixed(3));
    }
    const ea = A.target - A.cur;
    if (Math.abs(ea) > 0.00005) { A.cur += ea * 0.14; drawA(A.cur); } else if (A.cur !== A.target) { A.cur = A.target; drawA(A.cur); }
    const eb = B.target - B.cur;
    if (Math.abs(eb) > 0.00005) { B.cur += eb * 0.16; drawB(B.cur); } else if (B.cur !== B.target) { B.cur = B.target; drawB(B.cur); }
  };
  gsap.ticker.add(tick);

  /* the three cards under the headline: a small stagger rise as they enter */
  const worksCtx = gsap.context(() => {
    works.forEach((w, i) => {
      gsap.fromTo(w, { y: 70, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: i * 0.08,
        scrollTrigger: { trigger: w, start: "top 96%", toggleActions: "play none none reverse" },
      });
    });
  }, root);

  const onResize = () => { measure(); placeNotes(); drawA(A.cur); drawB(B.cur); };
  window.addEventListener("resize", onResize);
  if (spark) { spark.style.strokeDasharray = 1; spark.setAttribute("pathLength", "1"); }
  drawA(0); placeNotes(); drawB(0);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { placeNotes(); drawB(B.cur); });

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPtr);
    gsap.ticker.remove(tick);
    stA.kill(); stB.kill(); stNear.kill();
    worksCtx.revert();
  };
}

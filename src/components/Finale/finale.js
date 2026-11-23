import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import initWaveBg from "../../lib/waveBg.js";

gsap.registerPlugin(ScrollTrigger);

/* Finale: reveals (headline words, note, button, tiles, wordmark letters), a ribbon whose text slides along its curve with the scroll,
   a hanging character that swings, parallax stars, pupils that follow the pointer, and the footer character rising. */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export default function initFinale(root) {
  const all = (s) => [...root.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pupils = all("[data-fn-pupil]");
  const ribbonEl = root.querySelector("[data-fn-ribbon]");
  const tp = root.querySelector("[data-fn-tp]");
  const hang = root.querySelector("[data-fn-hang-o]");
  const hangV = root.querySelector("[data-fn-hang-v]");
  const hangI = root.querySelector("[data-fn-hang-i]");
  if (reduce) { root.classList.add("is-static"); return () => root.classList.remove("is-static"); }

  const bgOffs = [[".fn-top", "blue"], [".fn-connect", "light"], [".fn-foot", "light"]].map(([sel, theme]) => initWaveBg(root.querySelector(sel), { theme }));

  const ctx = gsap.context(() => {
    gsap.set("[data-fn-pew]", { yPercent: 115 });
    gsap.set("[data-fn-rise]", { y: 30, opacity: 0 });
    gsap.set("[data-fn-char]", { y: 90, opacity: 0, rotate: 6 });
    gsap.set("[data-fn-c]", { y: 24, opacity: 0 });
    gsap.set("[data-fn-big]", { yPercent: 115 });
    gsap.set("[data-fn-tile]", { y: 30, opacity: 0 });
    gsap.set("[data-fn-letter]", { yPercent: 115 });
    gsap.set("[data-fn-peek]", { yPercent: 70 });
    gsap.set("[data-fn-arrow]", { drawSVG: undefined });
    all("[data-fn-arrow]").forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });

    const once = (trigger, vars) => ScrollTrigger.create({ trigger, start: "top 80%", once: true, onEnter: vars });

    once(root.querySelector(".fn-top"), () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.to("[data-fn-pew]", { yPercent: 0, duration: 1.1, stagger: 0.12 })
        .to("[data-fn-rise]", { y: 0, opacity: 1, duration: 0.8, stagger: 0.12 }, "-=0.6")
        .to("[data-fn-char]", { y: 0, opacity: 1, rotate: 0, duration: 1.2, ease: "back.out(1.4)" }, "-=1");
    });
    once(root.querySelector(".fn-connect"), () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.to("[data-fn-c]", { y: 0, opacity: 1, duration: 0.7, stagger: 0.5 })
        .to("[data-fn-big]", { yPercent: 0, duration: 1, stagger: 0.12 }, 0.05)
        .to("[data-fn-tile]", { y: 0, opacity: 1, duration: 0.7, stagger: 0.1 }, "-=0.5");
      all("[data-fn-arrow]").forEach((p, i) => gsap.to(p, { strokeDashoffset: 0, duration: 0.8, delay: 1 + i * 0.5, ease: "power2.inOut" }));
    });
    once(root.querySelector(".fn-foot"), () => {
      gsap.to("[data-fn-letter]", { yPercent: 0, duration: 1, stagger: 0.05, ease: "power4.out" });
      gsap.to("[data-fn-peek]", { yPercent: 0, duration: 1.2, delay: 0.6, ease: "back.out(1.5)" });
    });

    // waving hand + idle swing for the hanging character
    const wave = root.querySelector("[data-fn-wave]");
    if (wave) gsap.to(wave, { rotate: 14, transformOrigin: "10% 90%", duration: 0.45, yoyo: true, repeat: -1, ease: "sine.inOut" });
    if (hangI) gsap.to(hangI, { rotate: 3, transformOrigin: "50% 5%", duration: 2.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }, root);

  // scroll-linked: ribbon text travels along its curve, hanging character leans with velocity, stars drift
  const decos = all("[data-fn-deco]").map((el) => ({ el, depth: +el.dataset.depth, rot: +el.dataset.rot }));
  let inView = false, lastV = 0, sway = 0;
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.target === root) inView = e.isIntersecting; }), { rootMargin: "20% 0px" });
  io.observe(root);
  let off = 0, drawnOff = null;
  const st = ScrollTrigger.create({
    trigger: root, start: "top bottom", end: "bottom top",
    onUpdate: (s) => { lastV = clamp(s.getVelocity() / 2500, -1, 1); },
  });
  const tick = () => {
    if (!inView) return;
    const y = window.scrollY;
    off = -(y * 0.45) % 1000;
    if (tp && off !== drawnOff) { tp.setAttribute("startOffset", off.toFixed(1)); drawnOff = off; }
    sway += (lastV * 10 - sway) * 0.08;
    if (hangV) hangV.setAttribute("transform", `rotate(${sway.toFixed(2)} 0 112)`);
    const top = root.getBoundingClientRect().top;
    for (const d of decos) d.el.style.transform = `translate3d(0,${(top * 0.08 * d.depth).toFixed(1)}px,0) rotate(${d.rot + top * 0.02}deg)`;
  };
  gsap.ticker.add(tick);

  // pupils follow the pointer (desktop only)
  let onMove = null;
  if (matchMedia("(pointer: fine)").matches) {
    onMove = (e) => {
      for (const p of pupils) {
        const r = p.ownerSVGElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        gsap.to(p, { x: clamp(dx, -1, 1) * 12, y: clamp(dy, -1, 1) * 10, duration: 0.5, overwrite: true });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
  }

  return () => {
    gsap.ticker.remove(tick); io.disconnect(); st.kill(); ctx.revert(); bgOffs.forEach((f) => f());
    if (onMove) window.removeEventListener("pointermove", onMove);
  };
}

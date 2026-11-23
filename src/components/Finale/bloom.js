import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import initWaveBg from "../../lib/waveBg.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Bloom: one sticky stage, one scroll progress `p`.
    0.02-0.16  a star pops in off-centre and turns slowly while the sky drifts past
    0.20-0.95  it swells exponentially (constant perceived speed), glides to the middle and keeps turning, until it covers every pixel
    0.93-0.99  the last gaps close with a flat amber fill, then the svg is dropped (it is not needed any more)
  The silk waves (waveBg) fade in over the swelling star from 0.34, so the screen is never an empty flat colour; the timeline now ends right as the star covers
  the screen (no blank tail), and the Finale's own wave field takes over seamlessly.
  The star is one svg path whose transform attribute is rewritten each frame, so its edge is re-rasterised crisp at every size.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const sine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

const INRADIUS = 16;   // the star's solid core, in its 100-unit box: the size at which that core out-reaches the screen's corners

export default function initBloom(root) {
  const q = (s) => root.querySelector(s);
  const wrap = q("[data-bl-wrap]"), stage = q("[data-bl-stage]"), svg = q("[data-bl-svg]"), star = q("[data-bl-star]"), fill = q("[data-bl-fill]");
  const sky = [...root.querySelectorAll("[data-bl-s]")].map((el) => ({ el, depth: +el.dataset.depth, base: el.style.transform }));
  if (!wrap || !stage || !svg || !star) return () => {};

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("is-static");
    return () => root.classList.remove("is-static");
  }

  let W = 0, H = 0, s0 = 1, sEnd = 50;
  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    s0 = clamp(Math.min(W, H) * 0.0016, 0.9, 1.7);
    sEnd = (1.1 * 0.5 * Math.hypot(W, H)) / INRADIUS;
  };

  const S = { target: 0, cur: 0, drawn: -1 };
  let inView = false;

  const draw = (p) => {
    const appear = easeOutBack(seg(p, 0.02, 0.16));
    const grow = seg(p, 0.2, 0.95);
    const s = p < 0.2 ? s0 * Math.max(0, appear) : s0 * Math.pow(sEnd / s0, lerp(grow, sine(grow), 0.5));
    const k = easeInOut(seg(p, 0.15, 0.7));
    const x = lerp(W * 0.64, W / 2, k), y = lerp(H * 0.4, H / 2, k);
    const rot = -14 + 70 * easeInOut(seg(p, 0.05, 0.95));
    star.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(3)})`);

    const done = seg(p, 0.93, 0.99);
    fill.style.opacity = done.toFixed(3);
    svg.style.visibility = done >= 1 ? "hidden" : "visible";

    const gone = seg(p, 0.32, 0.55);
    for (let i = 0; i < sky.length; i++) {
      const d = sky[i];
      d.el.style.transform = `translate3d(0,${(-p * d.depth * H * 0.35).toFixed(1)}px,0) ${d.base}`;
      d.el.style.opacity = (1 - gone).toFixed(3);
    }
    sky.length && (root.querySelector(".bl-sky").style.visibility = gone >= 1 ? "hidden" : "visible");
  };

  const st = ScrollTrigger.create({
    trigger: wrap, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { S.target = s.progress; },
    onRefresh: (s) => { measure(); S.drawn = -1; S.target = s.progress; S.cur = s.progress; },
  });
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { rootMargin: "15% 0px 15% 0px" });
  io.observe(root);

  const tick = () => {
    if (!inView) return;
    const e = S.target - S.cur;
    if (Math.abs(e) > 0.00005) S.cur += e * 0.14; else S.cur = S.target;
    if (S.cur === S.drawn) return;
    S.drawn = S.cur;
    draw(S.cur);
  };
  gsap.ticker.add(tick);
  const onResize = () => { measure(); S.drawn = -1; };
  window.addEventListener("resize", onResize);
  measure(); draw(0);
  const waveOff = initWaveBg(stage, { theme: "blue", front: true, alpha: () => seg(S.cur, 0.34, 0.9) });

  return () => { waveOff(); window.removeEventListener("resize", onResize); gsap.ticker.remove(tick); io.disconnect(); st.kill(); };
}

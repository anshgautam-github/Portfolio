import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/*
  Showreel: one sticky stage, one scroll progress `p` (0..1), everything drawn from it.
    0.00-0.56  a column scrolls up: label, three huge words that wipe to colour, a short paragraph, the SHOWREEL title
    0.46-0.84  seven pills rise from the bottom like an equaliser and fill with the film
    0.84-0.99  the pills widen, the gaps close and the film fills the screen
  The film is ONE media element (image or video) revealed through ONE clip-path made of the seven pill shapes, so a video decodes once.
  Scroll only sets a target; a ticker eases the drawn value toward it. Transforms, opacity and clip-path only.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const N = 7;
const TINTS = ["#e8a92f", "#e5822f", "#ead7ae", "#d9532c", "#e8a22f", "#e3ae4f", "#ecc873"];
const JIT = [0.0, 0.012, -0.01, 0.0, 0.016, -0.008, 0.01];

export default function initShowreel(root) {
  const q = (s) => root.querySelector(s);
  const wrap = q("[data-sr-wrap]");
  const stage = q("[data-sr-stage]");
  const flow = q("[data-sr-flow]");
  const title = q("[data-sr-title]");
  const media = q("[data-sr-media]");
  const tint = q("[data-sr-tint]");
  const btn = q("[data-sr-btn]");
  const hint = q("[data-sr-hint]");
  const rows = [...root.querySelectorAll("[data-sr-row]")];
  const wipes = rows.map((r) => r.querySelector("[data-sr-wipe]"));
  const note = q(".sr-note");
  const bridges = [...root.querySelectorAll("[data-sr-bridge]")];
  const video = q("video");
  if (!wrap || !stage || !flow) return () => {};

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("is-static");
    if (video) video.removeAttribute("autoplay");
    return () => root.classList.remove("is-static");
  }

  let W = 0, H = 0, flowEnd = 0, rowC = [], narrow = false;
  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    narrow = W < 768;
    rowC = rows.map((r) => r.offsetTop + r.offsetHeight / 2);
    const tc = title.offsetTop + title.offsetHeight / 2;
    flowEnd = tc - H * 0.54;
  };

  const S = { target: 0, cur: 0, last: -1 };

  const draw = (p) => {
    /* ---- the column ---- */
    const fy = -flowEnd * seg(p, 0.03, 0.56);
    flow.style.transform = `translate3d(0,${fy.toFixed(1)}px,0)`;
    for (let i = 0; i < rows.length; i++) {
      /* colour only arrives with scroll: nothing is filled at p = 0, rows wipe in turn */
      const w = easeInOutQuad(seg(p, 0.015 + i * 0.07, 0.17 + i * 0.07));
      wipes[i].style.clipPath = `inset(0 ${((1 - w) * 100).toFixed(2)}% 0 0)`;
    }
    note.style.opacity = (1 - seg(p, 0.46, 0.58)).toFixed(3);
    title.style.opacity = (1 - seg(p, 0.6, 0.74)).toFixed(3);

    /* ---- the pills ---- */
    const on = p > 0.44;
    stage.classList.toggle("is-reel", on);
    if (video) { if (on && video.paused) video.play().catch(() => {}); }
    if (!on) { S.last = p; return; }

    const m = (narrow ? 4 : 3) * W / 100, g = (narrow ? 1.6 : 1.9) * W / 100;
    const colW = (W - 2 * m - (N - 1) * g) / N;
    const wd = easeInOut(seg(p, 0.84, 0.985));
    const B = H + 6;
    let path = "";
    let stops = "";
    const L = [], R = [];
    for (let i = 0; i < N; i++) {
      const dc = Math.abs(i - (N - 1) / 2);
      const s0 = 0.46 + dc * 0.034 + JIT[i];
      const e0 = 0.80 + dc * 0.014;
      const k = easeInOut(seg(p, s0, e0));
      const top = lerp(H * 1.14, -H * 0.3, k);
      const left = lerp(m + i * (colW + g), (i * W) / N, wd);
      const width = lerp(colW, W / N + 0.6, wd);
      const r = lerp(colW / 2, 0, wd);
      const t = top;
      path += `M${left.toFixed(1)} ${B}L${left.toFixed(1)} ${(t + r).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(left + width).toFixed(1)} ${(t + r).toFixed(1)}L${(left + width).toFixed(1)} ${B}Z`;
      stops += `${i ? "," : ""}transparent ${(left - 0.5).toFixed(1)}px,${TINTS[i]} ${(left - 0.5).toFixed(1)}px,${TINTS[i]} ${(left + width + 0.5).toFixed(1)}px,transparent ${(left + width + 0.5).toFixed(1)}px`;
      L.push(left); R.push(left + width);
    }
    const cp = `path('${path}')`;
    media.style.clipPath = cp;
    const ta = 1 - easeOut(seg(p, 0.5, 0.8));
    tint.style.clipPath = cp;
    tint.style.opacity = ta.toFixed(3);
    tint.style.visibility = ta < 0.01 ? "hidden" : "visible";
    if (ta >= 0.01) tint.style.background = `linear-gradient(180deg,rgba(255,255,255,.14),rgba(110,30,0,.22)),linear-gradient(90deg,${stops})`;
    media.style.transform = `scale(${lerp(1.16, 1, easeOut(seg(p, 0.48, 1))).toFixed(4)})`;

    /* yellow bridges in the gaps while the pills are tall and still apart */
    const bo = Math.sin(Math.PI * seg(p, 0.64, 0.93));
    for (let i = 0; i < bridges.length; i++) {
      const b = bridges[i];
      const gw = L[i + 1] - R[i];
      if (gw < 0.5 || bo <= 0.01) { b.style.opacity = 0; continue; }
      b.style.opacity = Math.min(1, bo * 1.6).toFixed(3);
      b.style.transform = `translate3d(${R[i].toFixed(1)}px,0,0)`;
      b.style.width = `${gw.toFixed(1)}px`;
    }

    /* button + hint */
    const bi = easeOut(seg(p, 0.5, 0.58));
    btn.style.opacity = bi.toFixed(3);
    btn.style.transform = `translate3d(0,${(lerp(0.66, 0.86, easeInOut(seg(p, 0.5, 0.84))) * H).toFixed(1)}px,0)`;
    if (hint) hint.style.opacity = easeOut(seg(p, 0.96, 1)).toFixed(3);
    stage.classList.toggle("is-full", p > 0.97);
    S.last = p;
  };

  const st = ScrollTrigger.create({
    trigger: wrap, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { S.target = s.progress; },
    onRefresh: (s) => { measure(); S.target = s.progress; S.cur = s.progress; draw(S.cur); },
  });

  const tick = () => {
    const e = S.target - S.cur;
    if (Math.abs(e) > 0.00005) { S.cur += e * 0.14; draw(S.cur); }
    else if (S.cur !== S.target) { S.cur = S.target; draw(S.cur); }
  };
  gsap.ticker.add(tick);

  const onClick = () => { if (video && S.cur > 0.97) { video.muted = !video.muted; stage.classList.toggle("is-sound", !video.muted); } };
  stage.addEventListener("click", onClick);
  const onResize = () => { measure(); draw(S.cur); };
  window.addEventListener("resize", onResize);
  measure(); draw(0);

  return () => {
    window.removeEventListener("resize", onResize);
    stage.removeEventListener("click", onClick);
    gsap.ticker.remove(tick);
    st.kill();
  };
}

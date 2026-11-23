import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import initBg, { initNightBg } from "./bg.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Dive: one sticky stage, one scroll progress `p` (0..1), everything drawn from it.
    entry      (on arrival) the headline rises word by word and the character peeks up from the bottom edge
    0.00-0.14  the headline lifts away, the camera pushes in a little, the character blinks and watches the pointer
    0.14-0.60  the camera falls into the left eye: an exponential zoom (constant perceived speed) until the portal fills the screen
    0.60-0.68  the SVG gives way to the night on the other side, giant stars sail past, a field of stars pops in
    0.62-0.82  the featured card (tiny inside the eye the whole way down) glides to its place, straightening up
    0.78-0.92  the copy rises in beside it, line by line
  The camera is ONE transform on ONE svg group whose origin is the eye, so the art is re-rasterised crisp at every depth.
  Scroll only sets a target; a ticker eases the drawn value toward it. Everything else is transform / opacity.
*/

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const sine = (t) => (1 - Math.cos(Math.PI * t)) / 2;

// local art units (the eye is the origin): how wide the head is, and the size of the portal window inside the left eye
const FACE_W = 1360, FACE_CX = 160, IRIS_RX = 80, IRIS_RY = 120;
const P_A = 0.14, P_B0 = 0.14, P_B1 = 0.6;

export default function initDive(root) {
  const q = (s) => root.querySelector(s);
  const wrap = q("[data-dv-wrap]");
  const stage = q("[data-dv-stage]");
  const svg = q("[data-dv-svg]");
  const cam = q("[data-dv-cam]");
  const pupil = q("[data-dv-pupil]");
  const lpupil = q("[data-dv-lpupil]");
  const portal = q("[data-dv-portal]");
  const ret = q("[data-dv-ret]");
  const lids = [...root.querySelectorAll("[data-dv-lid]")];
  const hero = q("[data-dv-hero]");
  const words = [...root.querySelectorAll("[data-dv-word]")];
  const note = q("[data-dv-note]");
  const night = q("[data-dv-night]");
  const stars = [...root.querySelectorAll("[data-dv-star]")].map((el) => ({ el, x: +el.dataset.x, y: +el.dataset.y, at: +el.dataset.at, depth: +el.dataset.depth, rot: +el.dataset.rot }));
  const card = q("[data-dv-card]");
  const cardIn = q("[data-dv-card-in]");
  const slot = q("[data-dv-slot]");
  const copy = q("[data-dv-copy]");
  const kids = copy ? [...copy.children] : [];
  if (!wrap || !stage || !svg || !cam || !card || !slot) return () => {};

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // geometry (px), filled by measure()
  let W = 0, H = 0, sw = 0, sh = 0, u = 1, zA = 2, zEnd = 18, pCover = 0.58;
  let slotX = 0, slotY = 0, cardW = 0, cardH = 0, narrow = false;

  const zOf = (p) => {
    if (p < P_B0) return lerp(1, zA, easeInOut(seg(p, 0, P_A)));
    const t = seg(p, P_B0, P_B1);
    return zA * Math.pow(zEnd / zA, lerp(t, sine(t), 0.5));
  };

  const measure = () => {
    W = stage.clientWidth; H = stage.clientHeight;
    sw = svg.clientWidth || W; sh = svg.clientHeight || H;
    narrow = W < 768;
    u = ((narrow ? 0.98 : 0.62) * sw) / FACE_W;
    zA = narrow ? 1.7 : 2.1;
    // the portal must out-grow the screen's corners with room to spare
    zEnd = 1.18 * Math.sqrt(Math.pow(sw / 2 / (IRIS_RX * u), 2) + Math.pow(sh / 2 / (IRIS_RY * u), 2));
    // first progress at which the portal already covers every pixel: from there the night can be shown behind the svg
    pCover = P_B1;
    for (let p = 0.3; p <= P_B1; p += 0.004) { if (zOf(p) >= zEnd / 1.12) { pCover = p; break; } }
    const sr = slot.getBoundingClientRect(), st = stage.getBoundingClientRect();
    // phones stack the card above the copy: stars that would sit on either are dropped
    stars.forEach((s) => { s.el.style.display = narrow && s.y > 12 && s.y < 92 ? "none" : ""; });
    cardW = slot.offsetWidth; cardH = slot.offsetHeight;
    slotX = sr.left - st.left + cardW / 2; slotY = sr.top - st.top + cardH / 2;
    card.style.width = cardW + "px"; card.style.height = cardH + "px"; card.style.setProperty("--cu", (cardW / 100).toFixed(3) + "px");
  };

  // ---- state ----
  const S = { target: 0, cur: 0, drawn: -1, drawnEnded: false };
  const entry = { v: reduce ? 1 : 0, played: reduce };
  const look = { tx: 0, ty: 0, x: 0, y: 0, lastMove: -9 };
  const tilt = { tx: 0, ty: 0, x: 0, y: 0 };
  let inView = false, ended = false, lastBlink = 2.2;

  const draw = (p, time) => {
    const eA = easeInOut(seg(p, 0, P_A));
    const z = zOf(p);
    const k = easeInOut(seg(p, 0.12, 0.58));
    const calm = 1 - seg(p, 0, 0.1);
    let sx = lerp(sw / 2 - FACE_CX * u * z, sw / 2, k);
    let sy = lerp(lerp(sh * 0.96, sh * 0.64, eA), sh / 2, k);
    sy += (1 - entry.v) * sh * 0.28 + Math.sin(time * 1.5) * 5 * calm;
    cam.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)}) scale(${(u * z).toFixed(4)})`);

    // the right eye follows the pointer (and wanders on its own when nobody is pointing: phones, idle desktops)
    const idle = time - look.lastMove > 2.2;
    const wx = idle ? Math.sin(time * 0.7) * 26 : look.tx;
    const wy = idle ? Math.cos(time * 0.9) * 22 : look.ty;
    look.x += (wx - look.x) * 0.12; look.y += (wy - look.y) * 0.12;
    pupil.setAttribute("transform", `translate(${look.x.toFixed(1)} ${look.y.toFixed(1)})`);

    // the left pupil turns into the portal as the scroll begins: it stops following the pointer, swells, and the starfield opens in its place
    const m = easeInOut(seg(p, 0.03, 0.2));
    const lk = 1 - m;
    lpupil.setAttribute("transform", `translate(${(look.x * lk).toFixed(1)} ${(look.y * lk).toFixed(1)}) scale(${lerp(1, 1.3, m).toFixed(3)})`);
    lpupil.setAttribute("opacity", (1 - seg(m, 0.15, 0.85)).toFixed(3));
    portal.setAttribute("opacity", seg(m, 0.1, 0.7).toFixed(3));
    portal.setAttribute("transform", `scale(${lerp(0.8, 1, m).toFixed(3)})`);

    if (ret) ret.setAttribute("opacity", (entry.v * (1 - seg(p, 0.0, 0.06))).toFixed(3));

    // blink, only while the character is still just a face
    if (calm > 0.4) {
      let b = 0;
      const since = time - lastBlink;
      if (since > 3.6) lastBlink = time;
      if (since >= 0 && since < 0.2) b = 1 - Math.abs(since / 0.1 - 1);
      lids[0].setAttribute("ry", (153 * b).toFixed(1));
      lids[1].setAttribute("ry", (153 * b).toFixed(1));
    } else if (lids[0].getAttribute("ry") !== "0") { lids[0].setAttribute("ry", "0"); lids[1].setAttribute("ry", "0"); }

    // headline + button + nudge
    const lift = easeIn(seg(p, 0, 0.13));
    hero.style.transform = `translate3d(0,${(-lift * (H + 80)).toFixed(1)}px,0)`;
    hero.style.visibility = lift >= 1 ? "hidden" : "visible";
    note.style.opacity = (1 - seg(p, 0, 0.04)).toFixed(3);

    // the night behind the eye
    const showNight = p >= pCover;
    night.style.visibility = showNight ? "visible" : "hidden";
    const fade = seg(p, P_B1, 0.68);
    svg.style.opacity = (1 - easeOut(fade)).toFixed(3);
    svg.style.visibility = fade >= 1 ? "hidden" : "visible";

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const a = easeOutBack(seg(p, s.at, s.at + 0.07));
      const d = Math.max(0, p - P_B1);
      const tf = `translate3d(0,${(-d * s.depth * H * (narrow ? 0.1 : 0.2)).toFixed(1)}px,0) rotate(${(s.rot + d * s.depth * 70).toFixed(1)}deg) scale(${Math.max(0, a).toFixed(3)})`;
      if (tf !== s.tf) { s.tf = tf; s.el.style.transform = tf; }
    }

    // the card: tiny in the eye -> full size on the far side -> glides to its place
    const mv = easeInOut(seg(p, 0.62, 0.82));
    const c = Math.min(1, z / zEnd);
    const cx = lerp(sx, slotX, mv);
    const cy = lerp(sy, slotY, mv);
    const rot = lerp(-13, -6, mv);
    card.style.transform = `translate3d(${(cx - cardW / 2).toFixed(1)}px,${(cy - cardH / 2).toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg) scale(${c.toFixed(4)})`;
    card.style.opacity = (entry.v * seg(p, 0.1, 0.22)).toFixed(3);

    // the copy
    const base = narrow ? 0.76 : 0.78;
    kids.forEach((el, i) => {
      const t = easeOut(seg(p, base + i * 0.03, base + 0.07 + i * 0.03));
      el.style.opacity = t.toFixed(3);
      el.style.transform = `translate3d(${narrow ? 0 : ((1 - t) * 46).toFixed(1)}px,${narrow ? ((1 - t) * 26).toFixed(1) : 0}px,0)`;
    });

    const nowEnded = p > 0.9;
    if (nowEnded !== ended) { ended = nowEnded; stage.classList.toggle("is-end", ended); cardIn.tabIndex = -1; }
  };

  // 3-D tilt of the card once it has landed
  const drawTilt = (p) => {
    const on = seg(p, 0.86, 0.92);
    tilt.x += (tilt.tx * on - tilt.x) * 0.1; tilt.y += (tilt.ty * on - tilt.y) * 0.1;
    cardIn.style.transform = `perspective(1100px) rotateX(${(-tilt.y * 7).toFixed(2)}deg) rotateY(${(tilt.x * 9).toFixed(2)}deg)`;
  };

  // ---- reduced motion: a calm, fully laid-out version (no pin, no zoom) ----
  if (reduce) {
    root.classList.add("is-static");
    stars.forEach((s) => { s.el.style.transform = `rotate(${s.rot}deg)`; });
    const lay = () => {
      measure();
      cam.setAttribute("transform", `translate(${(sw / 2 - FACE_CX * u).toFixed(1)} ${(sh * 0.96).toFixed(1)}) scale(${u})`);
      card.style.transform = `translate3d(${(slotX - cardW / 2).toFixed(1)}px,${(slotY - cardH / 2).toFixed(1)}px,0) rotate(-6deg)`;
      card.style.opacity = "1";
    };
    lay();
    window.addEventListener("resize", lay);
    const st = ScrollTrigger.create({ trigger: root, start: "top bottom", onRefresh: lay });
    return () => { window.removeEventListener("resize", lay); st.kill(); root.classList.remove("is-static"); };
  }

  // ---- entry: words rise, character peeks up ----
  const playEntry = (instant) => {
    if (entry.played) return;
    entry.played = true;
    root.classList.add("is-in");
    if (instant) { entry.v = 1; return; }
    gsap.to(entry, { v: 1, duration: 1.25, ease: "power3.out", delay: 0.15 });
  };
  const entrySt = ScrollTrigger.create({ trigger: root, start: "top 82%", onEnter: () => playEntry(false), onEnterBack: () => playEntry(true) });

  const st = ScrollTrigger.create({
    trigger: wrap, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
    onUpdate: (s) => { S.target = s.progress; },
    onRefresh: (s) => { measure(); S.drawn = -1; S.target = s.progress; S.cur = s.progress; if (s.progress > 0.001 || s.scroll() > s.start) playEntry(true); },
  });

  // visibility governor: tick only when the section is near the screen
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; root.classList.toggle("is-live", inView); }, { rootMargin: "20% 0px 20% 0px" });
  io.observe(root);

  const t0 = performance.now();
  const tick = () => {
    if (!inView) return;
    const e = S.target - S.cur;
    if (Math.abs(e) > 0.00005) S.cur += e * 0.14; else S.cur = S.target;
    const time = (performance.now() - t0) / 1000;
    const alive = S.cur < 0.2 || S.cur > 0.84;          // the eyes / bob / blink and the card tilt move on their own
    if (S.cur === S.drawn && !alive && S.drawnEnded) return;
    S.drawn = S.cur; S.drawnEnded = true;
    draw(S.cur, time);
    drawTilt(S.cur);
  };
  gsap.ticker.add(tick);

  const onMove = (ev) => {
    const r = stage.getBoundingClientRect();
    const nx = clamp(((ev.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1, 1);
    const ny = clamp(((ev.clientY - r.top) / Math.max(1, r.height)) * 2 - 1, -1, 1);
    look.tx = nx * 36; look.ty = ny * 48; look.lastMove = (performance.now() - t0) / 1000;
    tilt.tx = nx; tilt.ty = ny;
  };
  window.addEventListener("pointermove", onMove, { passive: true });


  const onResize = () => { measure(); S.drawn = -1; };
  window.addEventListener("resize", onResize);
  measure(); draw(0, 0);
  const bgOff = initBg(stage, () => S.cur, () => inView);
  const nightOff = initNightBg(night, () => S.cur, () => inView && night.style.visibility === "visible");

  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onMove);
    bgOff(); nightOff();
    gsap.ticker.remove(tick);
    gsap.killTweensOf(entry);
    io.disconnect();
    entrySt.kill();
    st.kill();
  };
}

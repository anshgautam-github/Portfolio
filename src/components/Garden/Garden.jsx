import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { World, Critters } from "./Scenery.jsx";
import "./garden.css";
import { perf } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

/*
  "Let's grow your next idea" garden.
  - The cursor becomes a watering can inside this section.
  - Click a plant: the can tips, water pours onto it, and it grows a step taller (up to a limit).
  - All art is inline SVG, drawn procedurally - no image assets.
*/

const VB_W = 2000;
const VB_H = 760;
const STEP = 0.2; // growth added per watering
const START = 0.4; // how grown the plants are after the intro
const MAX = 1; // the limit

// ---- deterministic randomness so SSR/HMR renders stay stable ----
const mulberry = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// the back hill the plants stand on
const ground = (x) => 618 + 26 * Math.sin(x / 310 + 0.6) + 12 * Math.sin(x / 97) - 0.018 * Math.max(0, x - 1500);

const hillPath = (() => {
  let d = `M0 ${VB_H} L0 ${ground(0)}`;
  for (let x = 20; x <= VB_W; x += 20) d += ` L${x} ${ground(x).toFixed(1)}`;
  return d + ` L${VB_W} ${VB_H} Z`;
})();

// ---- plant definitions (x in viewBox units, h = fully grown height) ----
const RAW = [
  // grass tufts first (behind)
  { k: "grass", x: 60, h: 62, s: 1 },
  { k: "grass", x: 560, h: 74, s: 1.1 },
  { k: "grass", x: 842, h: 118, s: 1.5 },
  { k: "grass", x: 1112, h: 112, s: 1.5 },
  { k: "grass", x: 1222, h: 72, s: 1.2 },
  { k: "grass", x: 1330, h: 52, s: 0.9 },
  { k: "grass", x: 1425, h: 66, s: 1 },
  { k: "grass", x: 1815, h: 92, s: 1.3 },
  { k: "grass", x: 1770, h: 66, s: 1.1 },
  // lavender
  { k: "lav", x: 66, h: 205, lean: 0.4, curve: -0.5 },
  { k: "lav", x: 176, h: 235, lean: -0.3, curve: 0.4 },
  { k: "lav", x: 430, h: 215, lean: 0.2, curve: -0.3 },
  { k: "lav", x: 638, h: 130, lean: 0.1, curve: 0.3 },
  { k: "lav", x: 726, h: 165, lean: -0.2, curve: -0.3 },
  // daisies
  { k: "daisy", x: 50, h: 235, size: 0.8, lean: 0.2, curve: 0.5 },
  { k: "daisy", x: 560, h: 205, size: 1.2, lean: -0.15, curve: 0.4 },
  { k: "daisy", x: 826, h: 185, size: 0.85, lean: 0.1, curve: -0.3 },
  { k: "daisy", x: 1250, h: 262, size: 1.05, lean: 0.1, curve: -0.2 },
  { k: "daisy", x: 1318, h: 232, size: 0.9, lean: -0.1, curve: 0.5 },
  { k: "daisy", x: 1393, h: 170, size: 0.65, lean: 0.25, curve: -0.4 },
  { k: "daisy", x: 1432, h: 275, size: 1.05, lean: 0.05, curve: 0.3 },
];

const rand = mulberry(11);
const PLANTS = RAW.map((r, i) => {
  const p = { ...r, i, by: ground(r.x) + 10, phase: rand() * 6.28, lean: r.lean ?? 0, curve: r.curve ?? 0 };
  p.wind = 0.6 + rand() * 0.8;
  if (r.k === "grass") {
    const blades = 9;
    let d = "";
    for (let b = 0; b < blades; b++) {
      const t = b / (blades - 1) - 0.5;
      const bx = t * 30 * r.s;
      const len = r.h * (0.55 + 0.45 * rand());
      const dx = t * r.h * 1.15 + (rand() - 0.5) * 14;
      d += `M${bx - 7} 2 Q${bx + dx * 0.3 - 5} ${-len * 0.55} ${dx} ${-len} Q${bx + dx * 0.3 + 7} ${-len * 0.5} ${bx + 7} 2 Z `;
    }
    p.grassD = d;
    p.tone = rand() > 0.5 ? "#434a27" : "#3a4023";
  }
  if (r.k === "lav") {
    p.blobs = Array.from({ length: 15 }, (_, j) => {
      const taper = 1 - j / 18;
      return {
        x: (rand() - 0.5) * 26 * taper,
        y: j * 8.5,
        r: 6.5 + rand() * 3 - j * 0.12,
        c: ["#7b5fb2", "#6a4f9c", "#8e75c9", "#5f4690"][Math.floor(rand() * 4)],
      };
    });
    let d = "";
    for (let b = 0; b < 5; b++) {
      const t = b / 4 - 0.5;
      d += `M0 2 Q${t * 40} ${-r.h * 0.18} ${t * 90} ${-r.h * 0.34} `;
    }
    p.leafD = d;
  }
  if (r.k === "daisy") {
    p.dots = Array.from({ length: 9 }, () => ({ x: (rand() - 0.5) * 16, y: (rand() - 0.5) * 16 }));
    let d = "";
    for (let b = 0; b < 4; b++) {
      const t = b / 3 - 0.5;
      const len = 48 + rand() * 26;
      const dx = t * 100;
      d += `M${t * 16 - 6} 2 Q${dx * 0.4} ${-len * 0.6} ${dx} ${-len} Q${dx * 0.4 + 9} ${-len * 0.5} ${t * 16 + 6} 2 Z `;
    }
    p.leafD = d;
  }
  return p;
});

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function Garden({ embedded = false, ctl = null }) {
  const root = useRef(null);
  const svg = useRef(null);
  const cursor = useRef(null);
  const can = useRef(null);
  const drops = useRef(null);
  const refs = useRef(PLANTS.map(() => ({})));
  const [label, setLabel] = useState(content.garden.hint);
  const [night, setNight] = useState(false);
  const [over, setOver] = useState(false);
  const [sound, setSound] = useState(true);
  const soundOn = useRef(true);
  const api = useRef({});
  const { garden } = content;

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const ctx = gsap.context(() => {
      const state = PLANTS.map(() => ({ g: 0, target: START, kick: 0, pop: 0, busy: false, tx: 0, ty: 0 }));
      let visible = false;
      let time = 0;

      /* ---------------- plant renderer ---------------- */
      const render = (i) => {
        const p = PLANTS[i];
        const s = state[i];
        const r = refs.current[i];
        const g = s.g;
        const wind = reduce ? 0 : Math.sin(time * 0.9 * p.wind + p.phase) * 6 * g;

        if (p.k === "grass") {
          const sy = 0.05 + 0.95 * g;
          const sx = 0.45 + 0.55 * g;
          r.leaves.setAttribute("transform", `skewX(${(-wind * 0.9 + s.kick * 6).toFixed(2)}) scale(${(sx * (1 + 0.1 * s.pop)).toFixed(3)} ${(sy * (1 + 0.14 * s.pop)).toFixed(3)})`);
          s.tx = 0;
          s.ty = -p.h * sy * 0.8;
          return;
        }

        const H = p.h * g;
        const tx = p.lean * H * 0.12 + wind + s.kick * 10;
        const cx = p.curve * H * 0.16;
        r.stem.setAttribute("d", `M0 2 Q${cx.toFixed(1)} ${(-H * 0.5).toFixed(1)} ${tx.toFixed(1)} ${(-H).toFixed(1)}`);
        const ls = 0.15 + 0.85 * clamp(g * 1.4);
        r.leaves.setAttribute("transform", `skewX(${(-wind * 0.6).toFixed(2)}) scale(${(0.5 + 0.5 * ls).toFixed(3)} ${ls.toFixed(3)})`);
        r.stem.setAttribute("stroke-width", ((p.k === "daisy" ? 3.5 : 2.5) + (p.k === "daisy" ? 3.5 : 2.5) * g).toFixed(2));
        s.tx = tx;
        s.ty = -H;
        const hs = easeOut(clamp((g - 0.08) / 0.5)) * (p.size ?? 1) * (1 + 0.22 * s.pop);
        const rot = ((tx - cx) / Math.max(H, 1)) * 26 + s.kick * 9;
        r.head.setAttribute("transform", `translate(${tx.toFixed(1)} ${(-H).toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${hs.toFixed(3)})`);
        r.head.style.opacity = hs < 0.01 ? 0 : 1;
      };
      const renderAll = () => PLANTS.forEach((_, i) => render(i));
      renderAll();

      let acc = 0;
      const tick = (_, dt) => {
        if (!visible || document.hidden) return;
        acc += dt;
        if (acc < (perf.frameMs ? 66 : 32)) return; // idle sway at ~30fps; growth tweens still render every frame
        time += acc / 1000;
        acc = 0;
        renderAll();
      };
      gsap.ticker.add(tick);

      /* ---------------- intro: plants sprout when the section arrives ---------------- */
      const grow = (i, to, opts = {}) =>
        gsap.to(state[i], {
          g: to,
          duration: reduce ? 0 : 2.2,
          ease: "back.out(1.15)",
          overwrite: "auto",
          onUpdate: () => render(i),
          ...opts,
        });

      const intro = () => {
        PLANTS.forEach((_, i) => grow(i, START, { duration: reduce ? 0 : 1.9, ease: "power3.out", delay: reduce ? 0 : 0.15 + Math.random() * 0.7 }));
        if (!reduce) {
          gsap.from(root.current.querySelectorAll("[data-rise]"), { y: 38, autoAlpha: 0, duration: 1.1, ease: "power3.out", stagger: 0.12 });
        }
      };
      if (embedded) {
        // living inside another section's pinned scroll (Toolkit finale): that section drives the intro + the live flag
        let played = false;
        if (ctl) ctl.current = {
          intro: () => { if (!played) { played = true; intro(); } },
          live: (on) => { visible = on; if (root.current) root.current.dataset.live = on ? "1" : "0"; },
        };
      } else {
        ScrollTrigger.create({
          trigger: root.current,
          start: "top 72%",
          once: true,
          onEnter: intro,
        });
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            visible = self.isActive;
            if (root.current) root.current.dataset.live = self.isActive ? "1" : "0";
          },
        });
      }

      /* ---------------- watering can cursor ---------------- */
      const secRect = () => root.current.getBoundingClientRect();
      const cx = gsap.quickTo(cursor.current, "x", { duration: 0.28, ease: "power3.out" });
      const cy = gsap.quickTo(cursor.current, "y", { duration: 0.28, ease: "power3.out" });
      const pos = { x: 0, y: 0 };
      const rest = () => {
        const r = secRect();
        return { x: r.width * 0.37, y: r.height * 0.26 };
      };
      if (fine) {
        const r0 = rest();
        pos.x = r0.x;
        pos.y = r0.y;
        gsap.set(cursor.current, { x: r0.x, y: r0.y, xPercent: 0, yPercent: -50, autoAlpha: 0 });
        gsap.to(cursor.current, { autoAlpha: 1, duration: 0.6, delay: 0.5 });
      }

      let raf = 0;
      let onUi = false;
      const layers = ["far", "mid", "near"].map((n) => root.current.querySelector(`.gd-hills--${n}`));
      const DEPTH = [7, 16, 28];
      const parallax = (nx, ny) =>
        layers.forEach((el, k) => {
          if (el) el.style.transform = `translate3d(${(-nx * DEPTH[k]).toFixed(1)}px, ${(-ny * DEPTH[k] * 0.35).toFixed(1)}px, 0)`;
        });
      const onMove = (e) => {
        const r = secRect();
        pos.x = e.clientX - r.left;
        pos.y = e.clientY - r.top;
        const ui = !!(e.target.closest && e.target.closest("a,button"));
        if (fine && ui !== onUi) {
          onUi = ui;
          gsap.to(cursor.current, { autoAlpha: ui ? 0 : 1, duration: ui ? 0.15 : 0.3, overwrite: "auto" });
        }
        if (!reduce && !raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            const rr = secRect();
            parallax(clamp((pos.x / rr.width) * 2 - 1, -1, 1), clamp((pos.y / rr.height) * 2 - 1, -1, 1));
          });
        }
        if (fine) {
          cx(pos.x);
          cy(pos.y);
        }
      };
      const onEnter = () => fine && gsap.to(cursor.current, { autoAlpha: 1, scale: 1, duration: 0.3 });
      const onLeave = () => {
        parallax(0, 0);
        if (!fine) return;
        const p = rest();
        cx(p.x);
        cy(p.y);
      };
      const unlock = () => audio();
      root.current.addEventListener("pointerdown", unlock);
      root.current.addEventListener("click", unlock);
      root.current.addEventListener("pointermove", onMove);
      root.current.addEventListener("pointerenter", onEnter);
      root.current.addEventListener("pointerleave", onLeave);

      /* ---------------- watering ---------------- */
      const toScreen = (X, Y) => {
        const m = svg.current.getScreenCTM();
        const r = secRect();
        return { x: m.a * X + m.e - r.left, y: m.d * Y + m.f - r.top };
      };

      /* ---------------- sound (synthesised with Web Audio: no files) ---------------- */
      let ac = null;
      let master = null;
      let noiseBuf = null;
      const audio = () => {
        if (!ac) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ac = new AC();
          master = ac.createGain();
          master.gain.value = 3;
          const comp = ac.createDynamicsCompressor();
          comp.threshold.value = -22;
          comp.knee.value = 18;
          comp.ratio.value = 6;
          comp.attack.value = 0.003;
          comp.release.value = 0.2;
          master.connect(comp);
          comp.connect(ac.destination);
          noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
        }
        if (ac.state === "suspended") ac.resume();
        return ac;
      };
      const noise = (t, dur, { type = "bandpass", f0, f1, q = 1, g = 0.1, a = 0.05, r = 0.2 }) => {
        const src = ac.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const flt = ac.createBiquadFilter();
        flt.type = type;
        flt.Q.value = q;
        flt.frequency.setValueAtTime(f0, t);
        flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const gn = ac.createGain();
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(g, t + a);
        gn.gain.setValueAtTime(g, t + Math.max(a, dur - r));
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(flt);
        flt.connect(gn);
        gn.connect(master);
        src.start(t, Math.random());
        src.stop(t + dur + 0.05);
      };
      const tone = (t, f, dur, { type = "sine", g = 0.1, f1 } = {}) => {
        const o = ac.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const gn = ac.createGain();
        gn.gain.setValueAtTime(0.0001, t);
        gn.gain.exponentialRampToValueAtTime(g, t + 0.012);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gn);
        gn.connect(master);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568];
      const ready = (fn) => {
        if (!soundOn.current) return;
        const a = audio();
        if (!a) return;
        if (a.state === "running") fn(a);
        else a.resume().then(() => fn(a)).catch(() => {});
      };
      const sfxWater = (step, full) =>
        ready((a) => {
        const t = a.currentTime + 0.03;
        // water leaving the can the moment it tips: loud pouring hiss + sloshing glugs
        noise(t, 1.25, { f0: 2400, f1: 1700, q: 0.6, g: 0.3, a: 0.06, r: 0.4 });
        noise(t, 1.25, { type: "highpass", f0: 3800, f1: 3800, q: 0.5, g: 0.1, a: 0.06, r: 0.35 });
        noise(t, 1.25, { type: "lowpass", f0: 900, f1: 500, q: 0.8, g: 0.16, a: 0.1, r: 0.4 });
        for (let k = 0; k < 22; k++) {
          const f = 450 + Math.random() * 650;
          tone(t + 0.04 + Math.random() * 1.1, f, 0.08, { g: 0.1, f1: f * (1.6 + Math.random() * 0.7) });
        }
        // every drop that lands on the leaves and soil: little plinks + tiny sprays
        for (let k = 0; k < 20; k++) {
          const dt = t + 0.3 + Math.random() * 1.0;
          const f = 1500 + Math.random() * 1800;
          tone(dt, f, 0.05, { g: 0.07, f1: f * 0.55 });
          if (k % 2) noise(dt, 0.07, { f0: 5000, f1: 3000, q: 0.8, g: 0.05, a: 0.005, r: 0.05 });
        }
        // splash where it lands
        noise(t + 0.3, 0.35, { f0: 3400, f1: 1300, q: 0.9, g: 0.22, a: 0.01, r: 0.3 });
        for (let k = 0; k < 8; k++) tone(t + 0.32 + k * 0.04, 900 + Math.random() * 900, 0.06, { g: 0.09 });
        // plant rustles and grows
        noise(t + 0.45, 0.95, { f0: 500, f1: 2800, q: 1.3, g: 0.05, a: 0.3, r: 0.4 });
        tone(t + 0.45, 196, 0.95, { type: "triangle", g: 0.05, f1: 392 });
        // pop + chime when it lands (matches the sparkle burst)
        const b = Math.min(step, 5);
        [0, 2, 4].forEach((n, k) => {
          tone(t + 1.35 + k * 0.085, NOTES[b + n > 8 ? 8 : b + n], 0.7, { g: 0.085 });
          tone(t + 1.35 + k * 0.085, NOTES[b + n > 8 ? 8 : b + n] * 2, 0.45, { type: "triangle", g: 0.025 });
        });
        if (full) [3, 4, 5, 6, 8].forEach((n, k) => tone(t + 1.65 + k * 0.09, NOTES[n] * 2, 0.8, { g: 0.05 }));
        });
      api.current.plink = () =>
        ready((a) => {
          const t = a.currentTime + 0.01;
          [1800, 1300, 2200].forEach((f, k) => tone(t + k * 0.11, f, 0.09, { g: 0.12, f1: f * 0.55 }));
          noise(t, 0.3, { f0: 3000, f1: 1500, q: 0.8, g: 0.1, a: 0.01, r: 0.2 });
        });
      const sfxBoing = () => {
        ready((a) => {
          const t = a.currentTime + 0.01;
          tone(t, 330, 0.16, { g: 0.12, f1: 560 });
          tone(t + 0.16, 560, 0.2, { g: 0.1, f1: 340 });
        });
      };

      const pour = (i, fromX, fromY) => {
        const p = PLANTS[i];
        const s = state[i];
        const tip = toScreen(p.x, p.by - (p.k === "grass" ? p.h * s.g * 0.8 : p.h * s.g));
        const base = toScreen(p.x, p.by);
        const n = 14;
        for (let k = 0; k < n; k++) {
          const d = document.createElement("span");
          d.className = "absolute left-0 top-0 block rounded-full";
          d.style.cssText = "width:7px;height:11px;background:linear-gradient(#bfe6f6,#7fc1e3);opacity:0;border-radius:50% 50% 55% 55%";
          drops.current.appendChild(d);
          const tx = tip.x + (Math.random() - 0.5) * 40;
          const ty = tip.y + Math.random() * (base.y - tip.y) * 0.5;
          gsap.set(d, { x: fromX + (Math.random() - 0.5) * 6, y: fromY + Math.random() * 6 });
          gsap
            .timeline({ onComplete: () => d.remove() })
            .to(d, { opacity: 0.95, duration: 0.08 }, k * 0.045)
            .to(d, { x: tx, y: ty, duration: 0.5 + Math.random() * 0.2, ease: "power2.in" }, k * 0.045)
            .to(d, { opacity: 0, scale: 0.4, duration: 0.18 }, ">-0.12");
        }
        // a real stream: arcs out of the spout, lands on the plant, splashes, soaks the soil
        {
          const NS = "http://www.w3.org/2000/svg";
          const sv = document.createElementNS(NS, "svg");
          sv.setAttribute("class", "absolute left-0 top-0 h-full w-full overflow-visible");
          sv.style.filter = "drop-shadow(0 0 5px rgba(150,210,245,.65))";
          const dd = `M${fromX} ${fromY} Q${fromX + (tip.x - fromX) * 0.7 + 8} ${fromY - 6} ${tip.x} ${tip.y}`;
          const mk = (w, col, op) => {
            const e = document.createElementNS(NS, "path");
            e.setAttribute("d", dd);
            e.setAttribute("fill", "none");
            e.setAttribute("stroke", col);
            e.setAttribute("stroke-width", w);
            e.setAttribute("stroke-linecap", "round");
            e.setAttribute("opacity", op);
            sv.appendChild(e);
            return e;
          };
          const a = mk(8, "#8fd0ee", 0.85);
          const b = mk(3, "#f4fcff", 0.95);
          const c = mk(3.4, "#ffffff", 0);
          c.style.strokeDasharray = "5 13";
          drops.current.appendChild(sv);
          const L = a.getTotalLength() + 2;
          [a, b].forEach((e) => {
            e.style.strokeDasharray = `${L}`;
            e.style.strokeDashoffset = `${L}`;
          });
          gsap
            .timeline({ onComplete: () => sv.remove() })
            .to([a, b], { strokeDashoffset: 0, duration: 0.3, ease: "power1.out" })
            .to(c, { opacity: 0.7, duration: 0.1 }, 0.26)
            .to(c, { strokeDashoffset: -90, duration: 0.9, ease: "none" }, 0.26)
            .to(a, { attr: { "stroke-width": 3.5 }, duration: 0.35, ease: "power1.in" }, 0.7)
            .to(c, { opacity: 0, duration: 0.2 }, 0.85)
            .to([a, b], { strokeDashoffset: -L, duration: 0.35, ease: "power1.in" }, 0.85);
          // splash droplets leap up from the plant and fall back
          for (let k = 0; k < 16; k++) {
            const d = document.createElement("span");
            d.className = "absolute left-0 top-0 block rounded-full";
            const sz = 3 + Math.random() * 4;
            d.style.cssText = `width:${sz}px;height:${sz * 1.3}px;background:radial-gradient(circle at 35% 30%,#fff,#9bd5f0);opacity:0;box-shadow:0 0 6px rgba(170,220,245,.8)`;
            drops.current.appendChild(d);
            const dx = (Math.random() - 0.5) * 110;
            gsap.set(d, { x: tip.x, y: tip.y });
            gsap
              .timeline({ delay: 0.3 + Math.random() * 0.08, onComplete: () => d.remove() })
              .set(d, { opacity: 1 })
              .to(d, { x: tip.x + dx * 0.6, y: tip.y - (20 + Math.random() * 46), duration: 0.22, ease: "power2.out" })
              .to(d, { x: tip.x + dx, y: tip.y + 8 + Math.random() * 24, duration: 0.34, ease: "power2.in" })
              .to(d, { opacity: 0, duration: 0.12 });
          }
          // mist puff at the plant
          const m = document.createElement("span");
          m.className = "absolute left-0 top-0 block rounded-full";
          m.style.cssText = "width:70px;height:70px;margin:-35px 0 0 -35px;background:radial-gradient(circle,rgba(220,242,255,.7),transparent 70%);opacity:0";
          drops.current.appendChild(m);
          gsap.set(m, { x: tip.x, y: tip.y });
          gsap.timeline({ delay: 0.3, onComplete: () => m.remove() }).to(m, { opacity: 1, scale: 1.8, duration: 0.3, ease: "power2.out" }).to(m, { opacity: 0, scale: 2.6, y: tip.y - 20, duration: 0.7 });
        }
        // the plant and the soil visibly get wet, then dry slowly
        {
          const rr = refs.current[i];
          gsap.fromTo(rr.head, { filter: "brightness(1.45) saturate(1.3)" }, { filter: "brightness(1) saturate(1)", duration: 2.2, delay: 0.35, ease: "power2.out" });
          gsap.fromTo(rr.wet, { attr: { rx: 6, ry: 2 }, opacity: 0 }, { attr: { rx: 64, ry: 14 }, opacity: 0.6, duration: 0.7, delay: 0.45, ease: "power2.out" });
          gsap.to(rr.wet, { opacity: 0, duration: 6, delay: 1.3, ease: "power1.in" });
        }
        // ripple on the soil
        const rp = refs.current[i].ripple;
        gsap.fromTo(rp, { attr: { rx: 4, ry: 1.5 }, opacity: 0.9 }, { attr: { rx: 46, ry: 11 }, opacity: 0, duration: 1.1, ease: "power2.out", delay: 0.55 });
      };

      // sparkle + pop when a plant finishes a growth step
      const burst = (i) => {
        const s = state[i];
        const r = refs.current[i];
        gsap.fromTo(s, { pop: 1 }, { pop: 0, duration: 1.4, ease: "elastic.out(1,0.4)", onUpdate: () => render(i) });
        if (reduce) return;
        gsap.set(r.sparks, { attr: { transform: `translate(${s.tx.toFixed(1)} ${s.ty.toFixed(1)})` } });
        const bits = r.sparks.querySelectorAll("circle[data-spark]");
        bits.forEach((c, k) => {
          const a = (k / bits.length) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 36 + Math.random() * 30;
          gsap.fromTo(c, { x: 0, y: 0, scale: 0, opacity: 1 }, { x: Math.cos(a) * dist, y: Math.sin(a) * dist - 8, scale: 1, opacity: 0, duration: 1.1, ease: "power2.out" });
        });
        gsap.fromTo(r.sparks.querySelector("circle[data-ring]"), { scale: 0.3, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 1, ease: "power2.out" });
      };

      const water = (i, e) => {
        const s = state[i];
        const p = PLANTS[i];
        const r = secRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;

        if (s.target >= MAX - 1e-3) {
          // already at the limit: happy wiggle only
          if (!s.busy) {
            s.busy = true;
            sfxBoing();
            gsap.fromTo(s, { kick: 1 }, { kick: 0, duration: 1.2, ease: "elastic.out(1,0.35)", onUpdate: () => render(i), onComplete: () => (s.busy = false) });
          }
          return;
        }
        if (s.busy) return;
        s.busy = true;
        s.target = Math.min(MAX, s.target + STEP);
        const reached = s.target >= MAX - 1e-3;

        // can tips forward
        if (fine) {
          gsap.timeline().to(can.current, { rotation: 26, duration: 0.25, ease: "power2.out", transformOrigin: "40% 60%" }).to(can.current, { rotation: 0, duration: 0.5, ease: "power2.inOut" }, 1.0);
        }
        const spout = fine ? { x: pos.x + can.current.getBoundingClientRect().width * 0.45, y: pos.y + 4 } : { x: px, y: py - 60 };
        pour(i, spout.x, spout.y);
        sfxWater(Math.round((s.target - START) / STEP) - 1, reached);

        // growth lands as the water arrives; the pop + sparkles hit near the end of the rise
        gsap.delayedCall(reduce ? 0 : 1.35, () => burst(i));
        grow(i, s.target, {
          delay: 0.45,
          onUpdate: () => render(i),
          onComplete: () => {
            s.busy = false;
            if (reached) {
              gsap.fromTo(s, { kick: 1 }, { kick: 0, duration: 1.4, ease: "elastic.out(1,0.3)", onUpdate: () => render(i) });
              setLabel(garden.full);
            }
          },
        });
        gsap.fromTo(s, { kick: 0.6 }, { kick: 0, duration: 1.3, ease: "elastic.out(1,0.35)", delay: 0.45, onUpdate: () => render(i) });
      };

      // bind per-plant events (refs.hit)
      const offs = [];
      PLANTS.forEach((p, i) => {
        const el = refs.current[i].hit;
        const click = (e) => water(i, e);
        const enter = () => {
          setLabel(state[i].target >= MAX - 1e-3 ? garden.full : garden.hint);
          setOver(true);
        };
        el.addEventListener("click", click);
        const leave = () => {
          setLabel(garden.hint);
          setOver(false);
        };
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        offs.push(() => {
          el.removeEventListener("pointerleave", leave);
          el.removeEventListener("click", click);
          el.removeEventListener("pointerenter", enter);
        });
      });

      return () => {
        gsap.ticker.remove(tick);
        cancelAnimationFrame(raf);
        root.current?.removeEventListener("pointermove", onMove);
        root.current?.removeEventListener("pointerdown", unlock);
        root.current?.removeEventListener("click", unlock);
        root.current?.removeEventListener("pointerenter", onEnter);
        root.current?.removeEventListener("pointerleave", onLeave);
        offs.forEach((f) => f());
      };
    }, root);
    return () => ctx.revert();
  }, [garden.full, garden.hint]);

  const set = (i, key) => (el) => (refs.current[i][key] = el);

  return (
    <section
      ref={root}
      className={`gd relative h-screen min-h-[620px] w-full overflow-hidden bg-[#bcd8f2] ${night ? "text-[#f1ecff]" : "text-black"}`}
      data-night={night ? "1" : "0"}
      style={{ cursor: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent" }}
      onMouseDown={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <World />

      {/* ---------------- copy ---------------- */}
      <div className="gd-copy pointer-events-none absolute inset-x-0 top-[22%] z-10 flex flex-col items-center px-6 text-center md:top-[26%]">
        <p data-rise className="max-w-[min(90vw,52vw)] font-display text-[clamp(1.05rem,1.45vw,1.75rem)] leading-[1.4] tracking-[-0.01em] text-balance max-md:max-w-[88vw]">
          {garden.blurb}
        </p>
        <h2 data-rise className="mt-[4.5vw] font-serif text-[clamp(2.6rem,6.2vw,8.5rem)] leading-[1.02] tracking-[-0.015em] [word-spacing:0.1em] text-balance max-md:mt-10">
          {garden.title}
        </h2>
      </div>

      {/* ---------------- garden ---------------- */}
      <svg
        ref={svg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 z-20 h-[38vw] min-h-[260px] w-full"
        aria-label="A small garden. Click a plant to water it."
      >

        {/* back hill */}
        <path d={hillPath} fill="#34302a" />
        <path d={hillPath} fill="#0d0f1e" className="gd-night-ground" />

        {/* plants */}
        {PLANTS.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.by})`}>
            {p.k === "grass" && (
              <g ref={set(i, "leaves")}>
                <path d={p.grassD} fill={p.tone} />
              </g>
            )}
            {p.k === "lav" && (
              <>
                <g ref={set(i, "leaves")}>
                  <path d={p.leafD} fill="none" stroke="#78a05a" strokeWidth="4" strokeLinecap="round" />
                </g>
                <path ref={set(i, "stem")} fill="none" stroke="#6c9552" strokeWidth="5" strokeLinecap="round" />
                <g ref={set(i, "head")}>
                  {p.blobs.map((b, j) => (
                    <circle key={j} cx={b.x} cy={b.y - 10} r={b.r} fill={b.c} />
                  ))}
                </g>
              </>
            )}
            {p.k === "daisy" && (
              <>
                <g ref={set(i, "leaves")}>
                  <path d={p.leafD} fill="#464a27" />
                </g>
                <path ref={set(i, "stem")} fill="none" stroke="#b06a50" strokeWidth="7" strokeLinecap="round" />
                <g ref={set(i, "head")}>
                  {Array.from({ length: 12 }, (_, k) => (
                    <ellipse key={k} cx="0" cy="-27" rx="10" ry="25" transform={`rotate(${k * 30})`} fill="#fbf7e8" stroke="#eadfc2" strokeWidth="1.2" />
                  ))}
                  <circle r="15" fill="#e9a82a" />
                  {p.dots.map((d, k) => (
                    <circle key={k} cx={d.x} cy={d.y} r="1.7" fill="#c98a1a" />
                  ))}
                </g>
              </>
            )}
            <g ref={set(i, "sparks")} pointerEvents="none">
              <circle data-ring r="14" fill="none" stroke="#f7c948" strokeWidth="3" opacity="0" />
              {["#fff3b0", "#f7c948", "#a8d672", "#fff3b0", "#f7c948", "#a8d672", "#fff3b0", "#f7c948"].map((c, k) => (
                <circle key={k} data-spark r="5" fill={c} opacity="0" />
              ))}
            </g>
            <ellipse ref={set(i, "wet")} cx="0" cy="4" rx="0" ry="0" fill="#16384a" opacity="0" pointerEvents="none" />
            <ellipse ref={set(i, "ripple")} cx="0" cy="3" rx="0" ry="0" fill="none" stroke="#8ec9e8" strokeWidth="3" opacity="0" />
            <rect
              ref={set(i, "hit")}
              x={p.k === "grass" ? -50 * p.s : -52}
              y={-(p.h + 56)}
              width={p.k === "grass" ? 100 * p.s : 104}
              height={p.h + 76}
              fill="transparent"
              style={{ cursor: "none" }}
            />
          </g>
        ))}

      </svg>

      {/* front hills + sketch outline: its own layer so its filters are painted once, not on every plant frame */}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMax slice" className="pointer-events-none absolute bottom-0 left-0 z-[21] h-[38vw] min-h-[260px] w-full" aria-hidden="true">
        <defs>
          <filter id="g-rough" x="-5%" y="-30%" width="110%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="7" />
          </filter>
          <filter id="g-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.35" />
          </filter>
          <clipPath id="g-valley">
            <path d="M470 770 C700 722 900 700 1050 705 C1250 712 1420 740 1580 770 Z" />
          </clipPath>
        </defs>
        {/* front hills */}
        <path d="M0 700 C180 704 360 722 520 770 L0 770 Z" fill="#0f0e0c" />
        <path d="M2000 654 C1850 668 1700 694 1570 748 L1520 770 L2000 770 Z" fill="#0f0e0c" />
        <path d="M470 770 C700 722 900 700 1050 705 C1250 712 1420 740 1580 770 Z" fill="#2b2a27" />
        <g clipPath="url(#g-valley)">
          <rect x="400" y="680" width="1300" height="100" filter="url(#g-grain)" opacity="0.4" />
        </g>
        <g filter="url(#g-rough)" fill="none" stroke="#fbf7ea" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 700 C180 704 360 722 520 770" strokeWidth="6" />
          <path d="M2000 654 C1850 668 1700 694 1570 748" strokeWidth="6" />
          <path d="M470 770 C700 722 900 700 1050 705 C1250 712 1420 740 1580 770" strokeWidth="5" />
          <path d="M1040 708 C1200 710 1360 728 1500 762" strokeWidth="2" strokeDasharray="30 22" opacity="0.7" />
        </g>
      </svg>

      <Critters />

      {/* ---------------- day / night ---------------- */}
      <button
        type="button"
        className="gd-toggle font-display"
        aria-pressed={night}
        aria-label={night ? "Switch to daytime" : "Switch to night"}
        onClick={() => setNight((n) => !n)}
      >
        <span className="gd-tg-track">
          <i className="gd-tg-knob" />
        </span>
        <span className="gd-tg-label">{night ? "Night" : "Day"}</span>
      </button>

      <button
        type="button"
        className="gd-snd"
        aria-pressed={sound}
        aria-label={sound ? "Mute sound" : "Turn sound on"}
        onClick={() => {
          const v = !sound;
          soundOn.current = v;
          setSound(v);
          if (v && api.current.plink) api.current.plink();
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
          {sound ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5a9 9 0 0 1 0 13" />
            </>
          ) : (
            <path d="m16 9 5 6m0-6-5 6" />
          )}
        </svg>
      </button>

      {/* ---------------- footer line ---------------- */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-5 pb-5 font-display text-[clamp(0.875rem,1.05vw,1.25rem)] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.7)] md:px-7 md:pb-7">
        <span className="tracking-[-0.01em]">{garden.credit}</span>
        <nav className="flex gap-[2.2vw] max-md:gap-4">
          {garden.links.map((l) => (
            <a key={l.label} href={l.href} className="transition-opacity duration-300 hover:opacity-60" style={{ cursor: "pointer" }}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ---------------- water drops ---------------- */}
      <div ref={drops} className="pointer-events-none absolute inset-0 z-40" aria-hidden="true" />

      {/* ---------------- watering-can cursor ---------------- */}
      <div ref={cursor} style={{ marginLeft: "calc(clamp(54px, 4.2vw, 92px) * -0.4)" }} className="pointer-events-none absolute left-0 top-0 z-50 flex select-none items-center gap-[0.9vw] [@media(hover:none)]:hidden" aria-hidden="true">
        <svg
          ref={can}
          viewBox="0 0 92 70"
          className="block w-[clamp(54px,4.2vw,92px)] overflow-visible"
          style={{ filter: "drop-shadow(0 10px 12px rgba(150,95,75,0.35))" }}
        >
          {/* handle */}
          <path d="M20 22 C4 14 -2 38 14 48" fill="none" stroke="#d6987f" strokeWidth="6" strokeLinecap="round" />
          {/* spout */}
          <path d="M56 36 L84 14" fill="none" stroke="#d6987f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="86" cy="12" r="5" fill="#c8836b" />
          {/* body */}
          <path d="M18 22 h38 a7 7 0 0 1 7 7 v22 a10 10 0 0 1 -10 10 h-32 a10 10 0 0 1 -10 -10 v-22 a7 7 0 0 1 7 -7 z" fill="#e0a891" />
          <path d="M18 22 h38 a7 7 0 0 1 7 7 v4 h-52 v-4 a7 7 0 0 1 7 -7 z" fill="#cd8d75" />
          {/* heart */}
          <path d="M37 49 c-6 -4 -7 -8 -4 -10 c2 -1.2 3.5 0 4 1.2 c0.5 -1.2 2 -2.4 4 -1.2 c3 2 2 6 -4 10 z" fill="#b5584c" />
        </svg>
        <span className={`whitespace-nowrap origin-left rounded-full px-3 py-1 font-display text-[clamp(0.7rem,0.95vw,1.2rem)] font-semibold uppercase tracking-[0.14em] backdrop-blur-md transition-all duration-300 ${over ? "scale-100 opacity-100" : "scale-75 opacity-0"} ${night ? "bg-[#0b1230]/55 text-white" : "bg-white/60 text-black"}`}>
          {label}
        </span>
      </div>
    </section>
  );
}

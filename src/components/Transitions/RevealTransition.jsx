import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <RevealTransition /> - the landing's scene -> the Kimi block.
 *
 * The little "LEARN . BUILD . TEST . SHIP" badge floating in the lower-left of the signature scene takes over the scroll:
 *   1. it leaves its corner and spirals round the screen on a circular path, spinning, and settles in the centre
 *   2. holding there it swells and slowly turns from frosted white to deep blue while the scene behind sinks into navy
 *   3. it then opens like an aperture, growing until it fills the screen - the four words streaming out of it - and the next block is what's inside
 * Everything is a pure function of scroll progress, so it plays backwards just as cleanly.
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;
const LAG = 0.12;
const DONE_AT = 0.86;
const RING = "LEARN · BUILD · TEST · SHIP · ";
const GOLD = Math.PI * (3 - Math.sqrt(5));
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export default function RevealTransition({ from = "section[data-reveal]", to = "section.kimi" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const lite = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
    const NB = lite ? 8 : 14, NS = lite ? 30 : 76;
    const dprCap = lite ? 1.5 : 2;

    let A = null, B = null, st = null, cv = null, ctx = null, veil = null, badge = null, cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0, cw = 0, ch = 0, dpr = 1;

    const WORDS = [["LEARN", "#4b6bff"], ["BUILD", "#7a4dff"], ["TEST", "#0f9ad6"], ["SHIP", "#e0457b"], ["✦", "#3f72ee"]];
    const bubs = Array.from({ length: NB }, (_, i) => ({
      name: WORDS[i % WORDS.length][0], bg: WORDS[i % WORDS.length][1], fg: "#fff",
      a: i * GOLD + 0.4, t0: 0.6 + 0.2 * rnd(i, 2), sp: 0.85 + 0.5 * rnd(i, 3), r0: 0.9 + 0.35 * rnd(i, 4), sz: 0.8 + 0.5 * rnd(i, 5),
    }));
    const streaks = Array.from({ length: NS }, (_, i) => ({ a: rnd(i, 7) * Math.PI * 2, t0: 0.58 + 0.26 * rnd(i, 8), len: 0.08 + 0.22 * rnd(i, 9), sp: 0.7 + 0.8 * rnd(i, 10), h: rnd(i, 11) }));

    const overlay = () => {
      if (cv && cv.isConnected) return;
      cv = document.createElement("canvas");
      cv.setAttribute("aria-hidden", "true");
      cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:41;pointer-events:none;display:none";
      document.body.appendChild(cv);
      ctx = cv.getContext("2d");
      veil = document.createElement("div");
      veil.setAttribute("aria-hidden", "true");
      veil.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:37;pointer-events:none;display:none;background:#e9eff9";
      document.body.appendChild(veil);
      cw = 0;
    };

    const fit = () => {
      const W = window.innerWidth, H = window.innerHeight, d = Math.min(window.devicePixelRatio || 1, dprCap);
      if (W === cw && H === ch && d === dpr) return;
      cw = W; ch = H; dpr = d;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    };

    const clear = () => {
      if (A) { A.style.transform = ""; A.style.pointerEvents = ""; }
      if (B) { B.style.transform = ""; B.style.transformOrigin = ""; B.style.clipPath = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; B.style.opacity = ""; B.removeAttribute("data-tx"); }
      if (badge) badge.style.visibility = "";
      homeC = null;
      if (cv) cv.style.display = "none";
      if (veil) veil.style.display = "none";
    };

    // where the real badge sits: measured once, on the first frame of a run (before the section is held), so the overlay starts exactly there
    let homeC = null;
    const home = (W, H, sp) => {
      if (homeC) return homeC;
      if (!badge) return { x: W * 0.16, y: H * 0.82, d: 84 };
      const r = badge.getBoundingClientRect();
      if (!r.width) return { x: W * 0.16, y: H * 0.82, d: 84 };
      homeC = { x: r.left + r.width / 2, y: r.top + r.height / 2 + H * sp, d: r.width };
      return homeC;
    };

    const ringText = (g, cx, cy, r, rot, size, spacing) => {
      const pitch = size * spacing;
      const reps = Math.max(1, Math.round((2 * Math.PI * r) / pitch / RING.length));
      const str = RING.repeat(reps);
      const step = (Math.PI * 2) / str.length;
      g.font = `700 ${size}px "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      for (let i = 0; i < str.length; i++) {
        if (str[i] === " ") continue;
        g.save(); g.translate(cx, cy); g.rotate(rot + i * step); g.translate(0, -r); g.fillText(str[i], 0, 0); g.restore();
      }
    };

    const bubble = (g, x, y, r, b, alpha) => {
      g.save(); g.globalAlpha = alpha;
      g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = r * 0.5; g.shadowOffsetY = r * 0.18;
      g.fillStyle = b.bg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.shadowColor = "transparent";
      const sh = g.createRadialGradient(x - r * 0.4, y - r * 0.5, 0, x - r * 0.2, y - r * 0.2, r * 1.1);
      sh.addColorStop(0, "rgba(255,255,255,.55)"); sh.addColorStop(0.35, "rgba(255,255,255,.08)"); sh.addColorStop(0.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.32)");
      g.fillStyle = sh; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 1; g.stroke();
      g.fillStyle = b.fg; g.textAlign = "center"; g.textBaseline = "middle";
      const fs = Math.max(8, Math.min(r * 0.42, (r * 2 * 0.86) / Math.max(3.2, b.name.length * 0.62)));
      g.font = `700 ${fs}px "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
      g.fillText(b.name, x, y + r * 0.04);
      g.restore();
    };

    const apply = (p) => {
      if (!A || !A.isConnected) { clear(); A = document.querySelector(from); badge = A && A.querySelector(".rv-gl.g3"); }
      if (!B || !B.isConnected) { clear(); B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;
      if (p <= 0 && sp <= 0) { clear(); return; }
      if (p >= 1 && sp >= 1) { clear(); return; }
      const H = window.innerHeight, W = window.innerWidth;
      overlay(); fit();
      cv.style.display = "block"; veil.style.display = "block";
      if (badge) badge.style.visibility = "hidden";

      const cxp = W / 2, cyp = H * 0.5;
      const hm = home(W, H, sp);
      const Rmax = Math.hypot(Math.max(cxp, W - cxp), Math.max(cyp, H - cyp)) * 1.06;
      const rC = Math.max(hm.d * 0.5 * 1.7, Math.min(W, H) * 0.16);          // badge radius once it has swollen in the middle

      // --- phase 1: spiral from the corner into the centre ---
      const t1 = smoother(clamp01(p / 0.4));
      const rel = [hm.x - cxp, hm.y - cyp];
      const r0 = Math.hypot(rel[0], rel[1]);
      const th0 = Math.atan2(rel[1], rel[0]);
      const pathAt = (t) => { const rr = r0 * Math.pow(1 - t, 1.15), th = th0 - Math.PI * 2 * 1.1 * t; return [cxp + Math.cos(th) * rr, cyp + Math.sin(th) * rr]; };
      const [bx, by] = pathAt(t1);
      // --- phase 2: swell + turn blue ---
      const t2 = smoother(clamp01((p - 0.32) / 0.3));
      const colour = 0;                                                        // light theme: the badge stays frosted white, it never turns blue
      const rb = mix(hm.d * 0.5, rC, Math.max(t2, smoother(clamp01(p / 0.4)) * 0.55));
      // --- phase 3: aperture ---
      const eo = smoother(clamp01((p - 0.6) / 0.4));
      const R = eo > 0 ? mix(rb, Rmax, Math.pow(eo, 1.25)) : 0;
      const grow = clamp01(R / Rmax);

      A.style.pointerEvents = "none";
      A.style.transform = `translate3d(0, ${(H * sp).toFixed(2)}px, 0)`;
      B.setAttribute("data-tx", "1");
      B.style.zIndex = "40"; B.style.pointerEvents = "none";
      B.style.transformOrigin = `${cxp}px ${cyp}px`;
      B.style.transform = `translate3d(0, ${(-H * (1 - sp)).toFixed(2)}px, 0) scale(${(1 + 0.1 * (1 - eo)).toFixed(4)})`;
      B.style.clipPath = `circle(${R.toFixed(1)}px at ${cxp}px ${cyp}px)`;
      const bIn = smoother(clamp01(eo / 0.22));                               // the Arsenal fades up inside the blue disc as it opens
      B.style.opacity = bIn.toFixed(3);

      veil.style.opacity = (0.72 * smoother(clamp01((p - 0.15) / 0.4)) * (1 - smoother(clamp01((grow - 0.55) / 0.35)))).toFixed(3);

      const g = ctx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (R >= Rmax * 0.97 && p > 0.9) { cv.style.display = "none"; veil.style.display = "none"; return; }

      const fade = 1 - smoother(clamp01((p - 0.88) / 0.12));
      const diag = Math.hypot(W, H) * 0.62;

      // trail: the spiral the badge has just flown, as a fading dotted line
      if (t1 > 0.01 && t1 < 0.999) {
        const n = 46;
        for (let i = 0; i < n; i++) {
          const k = i / n, t = t1 * k;
          const [px, py] = pathAt(t);
          g.fillStyle = `rgba(70,110,220,${(0.1 + 0.5 * k * k) * (1 - clamp01((t1 - 0.8) / 0.2))})`;
          g.beginPath(); g.arc(px, py, 1 + 2.2 * k, 0, 7); g.fill();
        }
      }

      // hyperspace streaks leave the badge as it opens
      g.lineCap = "round";
      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        const u = clamp01((p - s.t0) / 0.5);
        if (u <= 0) continue;
        const head = rb * 0.8 + Math.pow(u, 1.5) * diag * s.sp;
        const tail = Math.max(rb * 0.8, head - (14 + s.len * diag * 0.7 * u));
        const al = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.7 * fade;
        if (al < 0.02) continue;
        const ca = Math.cos(s.a), sa = Math.sin(s.a);
        g.strokeStyle = s.h > 0.66 ? `rgba(40,130,200,${al})` : s.h > 0.33 ? `rgba(90,100,220,${al})` : `rgba(40,56,110,${al * 0.8})`;
        g.lineWidth = 0.8 + 1.6 * u;
        g.beginPath(); g.moveTo(cxp + ca * tail, cyp + sa * tail); g.lineTo(cxp + ca * head, cyp + sa * head); g.stroke();
      }

      // edge of the aperture: ripples, glow and a bright rim
      const edge = Math.sin(Math.PI * clamp01(eo)) * 0.9 + (eo > 0 ? 0.1 : 0);
      if (R > 2) {
        for (let k = 3; k >= 1; k--) {
          const rr = R - k * (30 + 26 * eo) * (0.6 + eo);
          if (rr > rb) { g.strokeStyle = `rgba(70,100,170,${edge * (0.4 - k * 0.1)})`; g.lineWidth = 1.5 - k * 0.3; g.beginPath(); g.arc(cxp, cyp, rr, 0, 7); g.stroke(); }
        }
        g.strokeStyle = `rgba(90,130,230,${edge * 0.28})`; g.lineWidth = 28; g.beginPath(); g.arc(cxp, cyp, R, 0, 7); g.stroke();
        g.strokeStyle = `rgba(60,90,160,${Math.min(1, edge * 1.6)})`; g.lineWidth = 1.5; g.beginPath(); g.arc(cxp, cyp, R, 0, 7); g.stroke();
      }

      // the badge itself: frosted white disc -> deep blue, ring type turning with it
      const discA = (1 - bIn) * fade;
      if (discA > 0.01) {
        const bpx = eo > 0 ? cxp : bx, bpy = eo > 0 ? cyp : by;               // once it opens it is already at the centre
        g.save(); g.globalAlpha = discA;
        const halo = g.createRadialGradient(bpx, bpy, rb * 0.9, bpx, bpy, rb * (1.5 + 0.7 * colour));
        halo.addColorStop(0, `rgba(90,130,230,${0.16 + 0.1 * Math.sin(p * 9)})`); halo.addColorStop(1, "rgba(80,140,255,0)");
        g.fillStyle = halo; g.beginPath(); g.arc(bpx, bpy, rb * (1.5 + 0.7 * colour), 0, 7); g.fill();
        g.shadowColor = "rgba(30,50,110,.28)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
        const gr = g.createRadialGradient(bpx - rb * 0.3, bpy - rb * 0.4, rb * 0.05, bpx, bpy, rb);
        const c0 = [mix(250, 108, colour), mix(252, 160, colour), mix(255, 255, colour)];
        const c1 = [mix(228, 18, colour), mix(236, 52, colour), mix(250, 170, colour)];
        gr.addColorStop(0, `rgb(${c0.map(Math.round)})`); gr.addColorStop(1, `rgb(${c1.map(Math.round)})`);
        g.fillStyle = gr; g.beginPath(); g.arc(bpx, bpy, rb, 0, 7); g.fill();
        g.shadowColor = "transparent";
        g.strokeStyle = "rgba(40,70,150,.35)"; g.lineWidth = 1.4; g.stroke();
        const tc = [mix(26, 255, colour), mix(41, 255, colour), mix(106, 255, colour)].map(Math.round);
        g.fillStyle = `rgb(${tc})`;
        ringText(g, bpx, bpy, rb * 0.77, -p * 16, Math.max(8, rb * 0.185), 1.12);
        // arrow in the middle (same glyph as the real badge)
        g.font = `600 ${Math.max(14, rb * 0.36)}px "Inter Tight", Arial, sans-serif`;
        g.fillText("↔", bpx, bpy + rb * 0.02);
        g.restore();
      }

      // ring type rides the rim as the aperture grows
      if (eo > 0) {
        const rt = R + 24;
        const ringOp = (1 - smoother(clamp01((R - Rmax * 0.3) / (Rmax * 0.3)))) * fade * bIn;
        if (ringOp > 0.01) { g.save(); g.globalAlpha = ringOp; g.fillStyle = "#1a2a5a"; ringText(g, cxp, cyp, rt, -p * 12, lite ? 10 : 11, 1.5); g.restore(); }
      }

      // the tools stream out of the opening
      for (let i = 0; i < bubs.length; i++) {
        const b = bubs[i];
        const u = clamp01((p - b.t0) / (0.4 / b.sp));
        if (u <= 0) continue;
        const dist = rb * 0.3 + Math.pow(u, 1.35) * diag * 1.05 * b.r0;
        const rr = (lite ? 15 : 19) * b.sz * (0.5 + 3.6 * Math.pow(u, 1.15));
        const al = Math.min(1, u * 5) * fade * (1 - smoother(clamp01((u - 0.78) / 0.22)));
        if (al < 0.02) continue;
        const wob = Math.sin(p * 9 + i) * 0.05;
        bubble(g, cxp + Math.cos(b.a + wob) * dist, cyp + Math.sin(b.a + wob) * dist, rr, b, al);
      }

      // caption while the badge is in the centre
      const capOp = smoother(clamp01((p - 0.3) / 0.12)) * (1 - smoother(clamp01((p - 0.6) / 0.08)));
      if (capOp > 0.01) {
        g.save(); g.globalAlpha = capOp; g.fillStyle = "#1a2a5a"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
        if ("letterSpacing" in g) g.letterSpacing = "5px";
        g.fillText("NEXT CHAPTER", cxp, cyp + rb + 46);
        g.restore();
      }
    };

    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      cur = Math.min(tgt + LAG, Math.max(tgt - LAG, cur));
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else { const v = d * (1 - Math.exp(-8 * dt)); const m = 1.8 * dt; cur += Math.max(-m, Math.min(m, v)); }
      try { apply(cur); } catch (e) {  }
      raf = cur !== tgt ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) { lt = performance.now(); raf = requestAnimationFrame(tick); } };

    const build = () => {
      A = document.querySelector(from); B = document.querySelector(to);
      badge = A && A.querySelector(".rv-gl.g3");
      if (!A || !B) return;
      st = ScrollTrigger.create({
        trigger: B, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = clamp01(self.progress / DONE_AT); wake(); },
        onLeave: () => { tgt = 1; cur = 1; wake(); },
        onLeaveBack: () => { tgt = 0; cur = 0; wake(); },
      });
    };
    const onInit = () => clear();
    const onDone = () => { if (st) { cur = tgt = clamp01(st.progress / DONE_AT); apply(cur); } };
    ScrollTrigger.addEventListener("refreshInit", onInit);
    ScrollTrigger.addEventListener("refresh", onDone);
    boot = requestAnimationFrame(() => { build(); ScrollTrigger.refresh(); });

    return () => {
      cancelAnimationFrame(boot); cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refreshInit", onInit);
      ScrollTrigger.removeEventListener("refresh", onDone);
      if (st) st.kill();
      clear();
      if (cv) cv.remove();
      if (veil) veil.remove();
    };
  }, [from, to]);

  return null;
}

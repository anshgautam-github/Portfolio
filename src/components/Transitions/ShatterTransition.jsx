import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <ShatterTransition /> - "Where I've Worked" -> programs & communities.
 *
 * After the last internship card the whole screen cracks. A white flash blooms at the point of impact, hairline cracks race out
 * across the glass, and then the page breaks into shards - the ones nearest the impact go first - that tumble toward you and drop
 * away, uncovering the next section underneath, which settles from slightly zoomed to rest.
 *
 * The shards are real clones of the live section (frozen mid-animation), so what shatters is exactly what you were looking at.
 * Everything is a pure function of scroll progress, so scrolling back up reassembles the glass.
 */
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const DONE_AT = 0.86;
const NS = "http://www.w3.org/2000/svg";
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// every shard is a full copy of the section, so the copies drop the costly paint effects (blurs, noise filters, blend modes, backdrop blur);
// the soft gradients underneath carry the same look at a fraction of the cost
// (clones also run no animations and request no will-change layers: with ~14 headline letters, 4 cards and the decor per piece, those used to
//  add up to hundreds of extra GPU layers while the glass was on screen. Moving loops are frozen at their snapshot value instead - see prepare())
const LITE_CSS = `.sh-clone .ff-bg::after,.sh-clone .ff-grain{display:none!important}
.sh-clone .ff-aur,.sh-clone .ff-glow,.sh-clone .ff-beam,.sh-clone .ff-motif{filter:none!important}
.sh-clone,.sh-clone *,.sh-clone *::before,.sh-clone *::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;mix-blend-mode:normal!important;animation:none!important;transition:none!important;will-change:auto!important}`;
const ensureCss = () => {
  if (document.getElementById("sh-lite-css")) return;
  const st = document.createElement("style"); st.id = "sh-lite-css"; st.textContent = LITE_CSS; document.head.appendChild(st);
};

export default function ShatterTransition({ from = ".ff", to = "section.arc" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const lite = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

    let A = null, B = null, st = null, st2 = null, st3 = null, root = null, flash = null, shards = null, sw = 0, sh = 0, hidden = false;
    let cur = 0, tgt = 0, raf = 0, lt = 0, boot = 0;
    let wantBack = false;          // the visitor is scrolling back up towards the glass: it is worth having it ready again

    /* ---------- geometry: a radial crack pattern around the impact point ---------- */
    const makeShards = (W, H) => {
      const ix = W * (W < H ? 0.5 : 0.54), iy = H * 0.5;
      const RAYS = lite ? 7 : 9;
      const rings = lite ? [0.2] : [0.22];       // one ring of cracks: 18 shards (was 27) read just as clearly as glass at far lower cost
      const maxD = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy));
      const rays = [];
      for (let k = 0; k < RAYS; k++) {
        const ang = ((k + (rnd(k, 3) - 0.5) * 0.55) / RAYS) * Math.PI * 2 - Math.PI / 2;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        // distance to the viewport edge along this ray
        const tx = dx > 0 ? (W - ix) / dx : dx < 0 ? -ix / dx : Infinity;
        const ty = dy > 0 ? (H - iy) / dy : dy < 0 ? -iy / dy : Infinity;
        const edge = Math.min(tx, ty) * 1.002;
        const pts = [[ix, iy]];
        rings.forEach((rf, j) => {
          const r = Math.min(edge * 0.9, maxD * rf * (0.82 + rnd(k * 7 + j, 5) * 0.4));
          const wob = (rnd(k * 5 + j, 9) - 0.5) * 0.16;
          pts.push([ix + Math.cos(ang + wob) * r, iy + Math.sin(ang + wob) * r]);
        });
        pts.push([ix + dx * edge, iy + dy * edge]);
        rays.push({ ang, pts });
      }
      const corners = [[0, 0], [W, 0], [W, H], [0, H]].map((c) => ({ c, a: Math.atan2(c[1] - iy, c[0] - ix) }));
      const norm = (a) => { while (a < -Math.PI / 2) a += Math.PI * 2; while (a >= Math.PI * 1.5) a -= Math.PI * 2; return a; };
      const out = [];
      for (let k = 0; k < RAYS; k++) {
        const r0 = rays[k], r1 = rays[(k + 1) % RAYS];
        const a0 = norm(r0.ang); let a1 = norm(r1.ang); if (a1 <= a0) a1 += Math.PI * 2;
        const last = r0.pts.length - 1;
        // innermost wedge, then one band per ring
        for (let j = 0; j <= last - 1; j++) {
          let poly;
          if (j === 0) poly = [r0.pts[0], r0.pts[1], r1.pts[1]];
          else poly = [r0.pts[j], r0.pts[j + 1], r1.pts[j + 1], r1.pts[j]];
          if (j === last - 1) {
            // outermost band: pick up any viewport corner that falls between the two rays
            const extra = [];
            for (const cn of corners) { let a = cn.a; while (a < a0) a += Math.PI * 2; if (a > a0 && a < a1) extra.push(cn.c); }
            if (extra.length) poly = [r0.pts[j], r0.pts[j + 1], ...extra, r1.pts[j + 1], r1.pts[j]];
          }
          let cx = 0, cy = 0; poly.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
          const d = Math.hypot(cx - ix, cy - iy);
          out.push({ poly, cx, cy, d: d / maxD, dx: (cx - ix) / (d + 1e-3), dy: (cy - iy) / (d + 1e-3), i: out.length });
        }
      }
      return { shards: out, ix, iy, maxD };
    };

    /* ---------- build the overlay: one clone of the section per shard, each clipped to its piece ---------- */
    /* ---------- building the glass, in small slices ---------- */
    // Cloning the section once per shard is the expensive part of this transition, so it is never done while the page is moving:
    // the snapshot is prepared slice by slice (a few ms each) while the viewer is still on the last internship card, and kept for
    // reuse. When the glass is actually needed it is already there; the slices are only forced synchronously as a last resort.
    let bld = null;
    const prepare = () => {
      if (!A || !A.isConnected) A = document.querySelector(from);
      if (!A) return false;
      const W = window.innerWidth, H = window.innerHeight;
      if (root && sw === W && sh === H && root.isConnected && !bld) return true;
      teardown();
      const wasHidden = A.style.visibility === "hidden";
      if (wasHidden) A.style.visibility = "";      // measure the section as the viewer saw it
      sw = W; sh = H;
      const geo = makeShards(W, H);
      root = document.createElement("div");
      root.setAttribute("aria-hidden", "true");
      // resting at 1% opacity (never display:none / visibility:hidden) keeps every shard's layer rasterised and in GPU memory, so
      // showing and re-showing the glass is only an opacity change - no re-painting of 27 copies of the section each time
      root.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:41;pointer-events:none;opacity:.01;will-change:opacity;perspective:${Math.round(W * 0.9)}px;perspective-origin:${geo.ix}px ${geo.iy}px;overflow:hidden`;
      document.body.appendChild(root);

      // ONE frozen, pruned copy of the section. Every shard clones this small template: cloning the live section once per shard (together with
      // the ~70 hidden card clones the deck carries) was a multi-hundred-millisecond hitch right when the glass cracked.
      const tpl = A.cloneNode(true);
      const liveAll = [A, ...A.querySelectorAll("*")], tplAll = [tpl, ...tpl.querySelectorAll("*")];
      // CSS loops (ticker, orbit, sparks, headline wave...) are frozen at the instant of the snapshot by writing their current value inline
      try {
        for (const an of A.getAnimations({ subtree: true })) {
          const t = an.effect && an.effect.target;
          if (!t || !an.animationName || an.effect.pseudoElement) continue;
          const i = liveAll.indexOf(t);
          if (i < 0) continue;
          const cs = getComputedStyle(t), d = tplAll[i].style;
          d.transform = cs.transform; d.translate = cs.translate; d.rotate = cs.rotate; d.scale = cs.scale; d.opacity = cs.opacity;
        }
      } catch (e) { /* older engines: the clones simply show their loops at rest */ }
      tpl.querySelectorAll(".ff-shards").forEach((n) => n.remove());      // the card-break pieces are display:none: not part of the picture
      tpl.removeAttribute("style");
      tpl.removeAttribute("data-wtx");
      tpl.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      tpl.setAttribute("aria-hidden", "true");
      tpl.classList.add("sh-clone");
      lastSig = sig();
      ensureCss();
      const ab = A.getBoundingClientRect();
      const relRect = (n) => { const b = n.getBoundingClientRect(); return { l: b.left - ab.left, t: b.top - ab.top, r: b.right - ab.left, b: b.bottom - ab.top }; };
      const deckEl = A.querySelector(".ff-deck");
      const shown = (n) => { const c = getComputedStyle(n); return c.display !== "none" && c.visibility !== "hidden" && parseFloat(c.opacity) > 0.02; };
      bld = {
        geo, W, H, tpl, i: 0, glow: A.style.getPropertyValue("--glow"),
        top: [...A.children].map(relRect), deckIdx: deckEl ? [...A.children].indexOf(deckEl) : -1,
        cards: deckEl ? [...deckEl.children].map((n) => ({ ...relRect(n), on: shown(n) })) : [],
      };
      shards = [];

      flash = document.createElementNS(NS, "svg");
      flash.setAttribute("aria-hidden", "true");
      flash.style.cssText = `position:fixed;left:0;top:0;width:100%;height:100%;height:100svh;z-index:42;pointer-events:none;display:none`;
      flash.innerHTML = `<defs><radialGradient id="shFlash"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="#cfd8ff" stop-opacity=".55"/><stop offset="1" stop-color="#6f8cff" stop-opacity="0"/></radialGradient></defs>` +
        `<circle data-f="1" cx="${geo.ix}" cy="${geo.iy}" r="10" fill="url(#shFlash)"/>` +
        `<g data-ring="1" fill="none" stroke="#fff"><circle cx="${geo.ix}" cy="${geo.iy}" r="10"/><circle cx="${geo.ix}" cy="${geo.iy}" r="10"/></g>`;
      document.body.appendChild(flash);
      flash._f = flash.querySelector("[data-f]");
      flash._r = [...flash.querySelectorAll("[data-ring] circle")];
      flash._maxD = geo.maxD;
      return true;
    };

    const makeShard = (s) => {
      const { W, H, tpl, glow, top, deckIdx, cards } = bld;
      const hit = (r, x0, y0, x1, y1) => r.r > x0 && r.l < x1 && r.b > y0 && r.t < y1;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      s.poly.forEach((p) => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1; x1 = Math.ceil(x1) + 1; y1 = Math.ceil(y1) + 1;
      const w = x1 - x0, h = y1 - y0;
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;left:${x0}px;top:${y0}px;width:${w}px;height:${h}px;overflow:hidden;contain:strict;transform-origin:${(s.cx - x0).toFixed(1)}px ${(s.cy - y0).toFixed(1)}px;` +
        `clip-path:polygon(${s.poly.map((p) => `${(p[0] - x0).toFixed(1)}px ${(p[1] - y0).toFixed(1)}px`).join(",")})`;
      const clone = tpl.cloneNode(true);
      // prune parts that are entirely outside this shard (decor that fills the screen is kept)
      [...clone.children].forEach((k, ki) => {
        const r = top[ki]; if (!r) return;
        if (ki === deckIdx) [...k.children].forEach((cEl, ci) => { const cr = cards[ci]; if (cr && (!cr.on || !hit(cr, x0, y0, x1, y1))) cEl.remove(); });
        else if (!hit(r, x0, y0, x1, y1)) k.remove();
      });
      clone.style.cssText = `position:absolute;left:${-x0}px;top:${-y0}px;width:${W}px;height:${H}px;margin:0;transition:none;` + (glow ? `--glow:${glow};` : "");
      el.appendChild(clone);
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("width", w); svg.setAttribute("height", h);
      // the crack outline and the sheen fade on every frame: each is its own compositor layer (will-change: opacity) and the fade is set on the
      // element itself, so the piece's picture (a whole copy of the page) is painted once instead of being re-painted on every frame of the break
      svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;opacity:0;will-change:opacity";
      const pg = document.createElementNS(NS, "polygon");
      pg.setAttribute("points", s.poly.map((p) => `${(p[0] - x0).toFixed(1)},${(p[1] - y0).toFixed(1)}`).join(" "));
      pg.setAttribute("fill", "none"); pg.setAttribute("stroke", "#fff"); pg.setAttribute("stroke-width", "1.6"); pg.setAttribute("stroke-linejoin", "round");
      svg.appendChild(pg);
      const sheen = document.createElement("i");
      sheen.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;will-change:opacity;background:linear-gradient(120deg,rgba(255,255,255,.55),rgba(255,255,255,0) 45%,rgba(120,150,255,.28))";
      el.appendChild(sheen);
      el.appendChild(svg);
      root.appendChild(el);
      return { ...s, el, edge: svg, sheen, clone, w, h };
    };

    // build shards until the time budget is spent; true once every shard exists
    const step = (budgetMs) => {
      if (!bld) return true;
      const t0 = performance.now();
      const list = bld.geo.shards;
      while (bld.i < list.length) {
        shards.push(makeShard(list[bld.i++]));
        if (budgetMs > 0 && performance.now() - t0 > budgetMs) break;
      }
      if (bld.i >= list.length) { bld = null; return true; }
      return false;
    };
    const build = () => {                     // synchronous: only reached when the glass is needed and was not ready in time
      if (!prepare()) return false;
      step(0);
      return true;
    };
    let pre = 0;
    const prebuild = () => {
      if (pre) return;
      if (tgt >= 1 && cur >= 1 && !wantBack) return;      // already past the glass: nothing to prepare unless the visitor heads back up
      if (root && !bld) return;                // already built
      if (!prepare()) return;
      const go = () => { pre = 0; if (!bld) return; if (!step(8)) pre = requestAnimationFrame(go); };
      pre = requestAnimationFrame(go);
    };
    const cancelPre = () => { if (pre) { cancelAnimationFrame(pre); pre = 0; } };

    let lastSig = "";
    const sig = () => {
      if (!A) return "";
      const d = A.querySelector(".ff-deck");
      const ls = A.querySelectorAll("[data-letter]"), en = A.querySelector("[data-enter]");
      return (d ? [...d.children].map((n) => n.style.transform + n.style.opacity).join("|") : "") + A.style.getPropertyValue("--glow") +
        (ls.length ? ls[0].style.opacity + ls[ls.length - 1].style.opacity : "") + (en ? en.style.opacity : "");
    };

    const teardown = () => {
      cancelPre(); bld = null;
      const dead = [root, flash];
      root = null; flash = null; shards = null; hidden = false;
      const kill = () => dead.forEach((n) => n && n.remove());
      if (window.requestIdleCallback) requestIdleCallback(kill, { timeout: 800 }); else setTimeout(kill, 120);
    };

    const clear = () => {
      if (A) { A.style.visibility = ""; }
      hidden = false;
      if (B) { B.style.transform = ""; B.style.transformOrigin = ""; B.style.zIndex = ""; B.style.pointerEvents = ""; B.style.willChange = ""; B.removeAttribute("data-tx"); }
      if (root) root.style.opacity = ".01";
      if (flash) flash.style.display = "none";
    };

    /* ---------- one frame, as a pure function of progress ---------- */
    const apply = (p) => {
      if (!A || !A.isConnected) { A = document.querySelector(from); }
      if (!B || !B.isConnected) { B = document.querySelector(to); }
      if (!A || !B) return;
      const sp = st ? st.progress : p;
      if (p <= 0 && sp <= 0) { clear(); return; }                 // the snapshot is kept for reuse; it is dropped when the viewer leaves the last card
      // the glass is done and the next section is in place: release all of its layers now (they used to stay resting at 1% opacity over the
      // whole page for another ~1600px of scrolling, i.e. on top of the carousel); it is rebuilt in idle slices if the visitor scrolls back up
      if (p >= 1 && sp >= 1) { clear(); wantBack = false; if (root) teardown(); return; }
      // if the last card is still settling when the glass cracks (a fast flick), retake the snapshot until it has - cracks are barely visible by then
      if (root && !bld && p < 0.05 && sig() !== lastSig) teardown();
      if (bld) { cancelPre(); step(0); }                          // the slices were not finished in time: finish them now
      else if (!root && !build()) return;
      const H = window.innerHeight, W = window.innerWidth;

      if (!hidden) { A.style.visibility = "hidden"; hidden = true; }
      root.style.opacity = "1";

      // the next section waits underneath, held in place, settling from a slight zoom
      const eo = smoother(clamp01((p - 0.16) / 0.7));
      B.setAttribute("data-tx", "1");
      B.style.zIndex = "40";
      B.style.pointerEvents = "none";
      B.style.transformOrigin = `50% 50%`;
      // without this hint the browser re-rasterises the whole next section (3-D cards, gradients, grain) at every new scale as it settles from 1.1x to 1x
      B.style.willChange = "transform";
      B.style.transform = `translate3d(0, ${(-H * (1 - sp)).toFixed(2)}px, 0) scale(${(1 + 0.1 * (1 - eo)).toFixed(4)})`;

      // the impact: a flash, two shock rings and a little judder before anything lets go
      const imp = clamp01(p / 0.1);
      const bloom = smoother(clamp01((p - 0.02) / 0.1)) * (1 - smoother(clamp01((p - 0.14) / 0.22)));
      flash.style.display = bloom > 0.004 ? "block" : "none";
      flash._f.setAttribute("r", (40 + 520 * smoother(clamp01(p / 0.3))).toFixed(1));
      flash._f.setAttribute("opacity", bloom.toFixed(3));
      flash._r.forEach((c, k) => {
        const e = smoother(clamp01((p - 0.03 - k * 0.04) / 0.3));
        c.setAttribute("r", (20 + e * flash._maxD * 0.9).toFixed(1));
        c.setAttribute("opacity", (0.7 * (1 - e) * (e > 0 ? 1 : 0)).toFixed(3));
        c.setAttribute("stroke-width", (2.4 - k * 0.9).toFixed(2));
      });
      const shake = Math.sin(p * 260) * 3.2 * imp * (1 - smoother(clamp01((p - 0.1) / 0.1)));
      root.style.transform = `translate3d(${shake.toFixed(2)}px, ${(shake * 0.6).toFixed(2)}px, 0)`;

      let alive = 0;
      for (const s of shards) {
        // cracks run outward from the impact, shards nearest it let go first
        const crack = clamp01((p / 0.18) * 1.6 - s.d * 1.1);
        const q = clamp01((p - 0.11 - s.d * 0.17 - rnd(s.i, 1) * 0.06) / (0.5 - s.d * 0.06));
        if (q >= 0.999) { if (!s.off) { s.el.style.opacity = "0"; s.off = true; } continue; }
        s.off = false;
        alive++;
        const out = Math.pow(q, 1.05);
        const fall = Math.pow(q, 1.7);
        const dist = (0.25 + rnd(s.i, 2) * 0.45) * W;
        const tx = s.dx * dist * out * 0.7 + (rnd(s.i, 6) - 0.5) * 60 * out;
        const ty = s.dy * dist * out * 0.35 + fall * H * (0.55 + rnd(s.i, 4) * 0.7);
        const tz = (0.15 + rnd(s.i, 8) * 0.9) * W * 0.55 * out;
        const rz = (rnd(s.i, 3) - 0.5) * 70 * out;
        const rx = (rnd(s.i, 10) - 0.5) * 120 * out;
        const ry = (rnd(s.i, 12) - 0.5) * 120 * out;
        // the instant before release the shard lifts a hair, as though the glass has bowed
        const lift = Math.sin(Math.PI * clamp01(q * 6)) * (q < 0.17 ? 1 : 0) * 4;
        s.el.style.transform = q <= 0
          ? "none"
          : `translate3d(${tx.toFixed(1)}px, ${(ty - lift).toFixed(1)}px, ${tz.toFixed(1)}px) rotateX(${rx.toFixed(1)}deg) rotateY(${ry.toFixed(1)}deg) rotateZ(${rz.toFixed(1)}deg)`;
        s.el.style.opacity = (1 - smoother(clamp01((q - 0.6) / 0.4))).toFixed(3);
        s.edge.style.opacity = (Math.min(crack, 1) * (0.9 - 0.4 * q)).toFixed(3);
        s.sheen.style.opacity = (Math.min(1, q * 5) * (1 - q) * 0.9).toFixed(3);
      }
    };

    // The break plays on its own clock: however fast the page is scrolled, the glass takes at least ~2s to go
    // (progress may only advance SPEED per second), so a hard flick still shows the whole shatter.
    const SPEED = 0.5;
    const tick = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lt) / 1000)); lt = now;
      const d = tgt - cur;
      if (Math.abs(d) < 0.0005) cur = tgt;
      else { const v = d * (1 - Math.exp(-5 * dt)); const m = SPEED * dt; cur += Math.max(-m, Math.min(m, v)); }
      apply(cur);
      raf = cur !== tgt || (cur > 0 && cur < 0.1) ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) { lt = performance.now(); raf = requestAnimationFrame(tick); } };

    const setup = () => {
      A = document.querySelector(from); B = document.querySelector(to);
      if (!A || !B) return;
      st = ScrollTrigger.create({
        trigger: B, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => { tgt = clamp01(self.progress / DONE_AT); wake(); },
        onLeave: () => { tgt = 1; wake(); },
        onLeaveBack: () => { tgt = 0; wake(); },
      });
    };
    // prepare the glass while the viewer is still on the last card; drop it once they leave it (the snapshot would be stale)
    const watchEnd = () => {
      const sp = A && A.parentElement && A.parentElement.classList.contains("pin-spacer") ? A.parentElement : A;
      if (!sp) return;
      st2 = ScrollTrigger.create({
        trigger: sp, start: "top top", end: "bottom bottom", invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (self.progress > 0.9) prebuild();
          else if (self.progress < 0.5 && (root || bld) && tgt <= 0) { teardown(); }   // only when well back among the cards
        },
      });
    };
    const watchPast = () => {
      st3 = ScrollTrigger.create({
        trigger: B, start: "top top", end: "+=1600", invalidateOnRefresh: true,
        onLeave: () => { if (tgt >= 1 && cur >= 1) teardown(); },
        onEnterBack: () => { wantBack = true; prebuild(); },
      });
    };
    // the clones are a snapshot, so drop them whenever the page is re-measured; they are rebuilt (fresh) the next time the glass is needed
    const onInit = () => { clear(); teardown(); };
    const onDone = () => { if (st) { cur = tgt = clamp01(st.progress / DONE_AT); if (cur > 0 && cur < 1) apply(cur); } if (st2 && st2.progress > 0.9) prebuild(); };
    ScrollTrigger.addEventListener("refreshInit", onInit);
    ScrollTrigger.addEventListener("refresh", onDone);
    boot = requestAnimationFrame(() => { setup(); watchEnd(); watchPast(); ScrollTrigger.refresh(); });

    return () => {
      cancelAnimationFrame(boot); cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refreshInit", onInit);
      ScrollTrigger.removeEventListener("refresh", onDone);
      if (st) st.kill();
      if (st2) st2.kill();
      if (st3) st3.kill();
      clear(); teardown();
    };
  }, [from, to]);

  return null;
}

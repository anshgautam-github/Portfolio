import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IS_MOBILE, IS_SAFARI } from "../../lib/perf.js";
import { createBitmapWindow } from "./frameCache.js";
import { lossAt } from "./art.js";
import { WAYPOINTS } from "./chapters.js";
import { createEarth } from "./earth.js";
import { createCampus } from "./campus.js";
import { createPlaza } from "./plaza.js";
import { createRocket, descent, CH } from "./rocket.js";
import { createFigure } from "./figure.js";

/* Freefall: the scroll engine for <FreefallStory />, ported from the standalone Freefall site.
   One ticker callback reads the scroll position and drives both films, the 3D type world and every section after it.
   Everything is scoped to `root`; mountFreefallStory returns destroy(). Nothing global is touched (no <html> classes, no Lenis of its own,
   no custom cursor): the portfolio's own smooth scroll, cursor and frame stay in charge. */
// mode: undefined = the old in-page scroll film; 'page' = the same film minus the descent (the descent lives in the loader overlay now,
// so the page version starts right after the landing); 'loader' = only the descent, driven by a virtual progress (setProgress), not by scroll.
const PAGE_P0 = 0.515;   // 'page': story progress at the top of the block (just after the impact flash has cleared)
export function mountFreefallStory(root, { base, mode }) {
  const LOADER = mode === 'loader', PAGE = mode === 'page';
  const NO_PORTAL = !!root.querySelector('#fs-portal[hidden]');   // the closing portal scene is switched off (SHOW_PORTAL in markup.js)
  const offs = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push([t, ev, fn, o]); };
  const html = document.documentElement;
  // ---------- helpers ----------
  const $ = (s, el = root) => el.querySelector(s);
  const $$ = (s, el = root) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const norm = (v, a, b) => clamp((v - a) / (b - a));
  const sstep = (a, b, v) => { const t = norm(v, a, b); return t * t * (3 - 2 * t); };
  const fract = (v) => v - Math.floor(v);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // 0 → 1 → 0 across [a, b] with the top at `peak`
  const bell = (v, a, peak, b) => (v <= a || v >= b ? 0 : v < peak ? sstep(a, peak, v) : 1 - sstep(peak, b, v));
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const f1 = (v) => v.toFixed(1);
  const f2 = (v) => v.toFixed(2);

  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = {
    W: innerWidth, H: innerHeight, y: 0, vel: 0,
    mx: 0, my: 0, smx: 0, smy: 0, cx: innerWidth / 2, cy: innerHeight / 2,
    t: 0, entered: true, lastP: 0, storyP: 0, portalOpen: 0, vp: 0,
  };

  
  // ---------- frame sequences ----------
  const DISSOLVE_STEPS = IS_MOBILE ? 20 : 50;
  const FALL_N = 465;   // 15.5 s at 30 fps
  const PORTAL_N = 239; // 10 s at 24 fps

  class Seq {
    constructor(dir, count, stride = 1) {
      this.count = count;
      this.stride = stride;
      // only the frames this device will actually fetch get a url (phones: every 3rd / 4th frame, from the lighter *-m sets)
      const want = (i) => i % stride === 0 || i === count - 1;
      this.urls = Array.from({ length: count }, (_, i) => (want(i) ? `${dir}/${String(i).padStart(3, '0')}.webp` : null));
      this.imgs = new Array(count);
      this.ok = new Uint8Array(count);
      this.loaded = 0;
      this.dead = false;
      // Coarse-to-fine order, so scrubbing works before every frame has arrived
      const seen = new Uint8Array(count);
      this.order = [];
      const push = (i) => { if (want(i) && !seen[i]) { seen[i] = 1; this.order.push(i); } };
      push(0);
      for (const s of [32, 16, 8]) for (let i = 0; i < count; i += s) push(i);
      push(count - 1);
      this.gate = this.order.length;
      for (const s of [4, 2, 1]) for (let i = 0; i < count; i += s) push(i);
      // phones: a sliding window of ready-decoded bitmaps around the playhead, so scrubbing never decodes a frame mid-scroll (see frameCache.js)
      this.win = IS_MOBILE && typeof createImageBitmap === 'function'
        ? createBitmapWindow({ count, stride, getImg: (i) => (this.ok[i] ? this.imgs[i] : null), back: 2, fwd: 4, keepBack: 3, keepFwd: 6 })   // small window: every decoded frame is GPU memory, and a high-res phone has little to spare
        : null;
    }
    src(i) { return this.win ? this.win.src(i, this.imgs[i]) : this.imgs[i]; }
    prime(f) { if (this.win) this.win.prime(f); }
    free() { if (this.win) this.win.free(); }
    load(conc, onTick) {
      let next = 0;
      let gateDone = false;
      let resolveGate;
      const gateP = new Promise((r) => { resolveGate = r; });
      const pump = () => {
        if (this.dead || next >= this.order.length) return;
        const i = this.order[next++];
        const img = new Image();
        img.decoding = 'async';
        const fin = (ok) => {
          if (ok) { this.imgs[i] = img; this.ok[i] = 1; }
          this.loaded++;
          if (onTick) onTick(Math.min(1, this.loaded / this.gate));
          if (!gateDone && this.loaded >= this.gate) { gateDone = true; resolveGate(); }
          pump();
        };
        // decode ahead of drawing, but never let a stalled decode (background tabs) block the queue
        img.onload = () => { if (img.decode) img.decode().catch(() => {}); fin(true); };
        img.onerror = () => fin(false);
        img.src = this.urls[i];
      };
      for (let k = 0; k < conc; k++) pump();
      return gateP;
    }
    has(i) { return this.ok[i] === 1; }
    // the two loaded frames that surround fractional frame f, and how far between them it is (gap > 4 = still loading: no ghosting dissolve)
    bracket(f) {
      const n = this.count;
      let a = clamp(Math.floor(f), 0, n - 1);
      while (a > 0 && !this.ok[a]) a--;
      if (!this.ok[a]) {
        a = clamp(Math.floor(f), 0, n - 1);
        while (a < n - 1 && !this.ok[a]) a++;
        return this.ok[a] ? [a, a, 0] : null;
      }
      let b = a + 1;
      while (b < n && !this.ok[b]) b++;
      if (b >= n || b - a > 4) return [a, a, 0];
      return [a, b, clamp((f - a) / (b - a))];
    }
    get(i) {
      i = clamp(Math.round(i), 0, this.count - 1);
      if (this.ok[i]) return this.imgs[i];
      for (let d = 1; d < this.count; d++) {
        if (i - d >= 0 && this.ok[i - d]) return this.imgs[i - d];
        if (i + d < this.count && this.ok[i + d]) return this.imgs[i + d];
      }
      return null;
    }
  }

  function drawCover(ctx, img, w, h, ax, ay) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, (w - dw) * ax, (h - dh) * ay, dw, dh);
  }

  // Draws a fractional frame: frame n, then frame n+1 on top at the leftover alpha
  class Film {
    constructor(canvas, seq, ax, ay, maxDpr) {
      this.c = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
      this.seq = seq; this.ax = ax; this.ay = ay; this.maxDpr = maxDpr; this.key = '';
    }
    resize() {
      // offsetWidth/Height = layout size (unaffected by the scale transforms the story plays on this canvas).
      // Assigning canvas.width clears + reallocates the bitmap, so skip it when nothing changed (it ran on every URL-bar resize / refresh).
      const d = Math.min(devicePixelRatio || 1, this.maxDpr);
      const w = Math.max(2, Math.round(this.c.offsetWidth * d));
      const h = Math.max(2, Math.round(this.c.offsetHeight * d));
      if (w === this.c.width && h === this.c.height) return;
      this.c.width = w; this.c.height = h;
      this.key = '';
    }
    render(f, snap) {
      const { seq, ctx, c } = this;
      const br = seq.bracket(f);
      if (!br) return null;
      let [ia, ib, t0] = br;
      if (snap && ib !== ia) { if (t0 >= 0.5) ia = ib; ib = ia; t0 = 0; }   // fast fling: one frame, one draw (the dissolve returns as soon as the scroll slows)
      seq.prime(f);
      const a = seq.src(ia);
      const t = Math.round(t0 * DISSOLVE_STEPS) / DISSOLVE_STEPS;   // phones: coarser steps = far fewer redraws while scrubbing
      const blend = t > 0.03 && ib !== ia;
      const key = ia + (blend ? '|' + ib + '|' + t : '');
      if (key === this.key) return a;
      this.key = key;
      ctx.globalAlpha = 1;
      // a bitmap that was closed under us (never expected) must not take the film down: the <img> is always there as the fallback
      const put = (s, i) => { try { drawCover(ctx, s, c.width, c.height, this.ax, this.ay); } catch (e) { drawCover(ctx, seq.imgs[i], c.width, c.height, this.ax, this.ay); } };
      put(a, ia);
      if (blend) {
        ctx.globalAlpha = t;
        put(seq.src(ib), ib);
        ctx.globalAlpha = 1;
      }
      return a;
    }
  }

  // Tiny blurred copy of the current frame stretched behind everything
  class Ambient {
    constructor(canvas) { this.c = canvas; this.ctx = canvas.getContext('2d'); this.img = null; }
    resize() {
      const h = Math.max(2, Math.round(72 * S.H / S.W));
      if (this.c.width === 72 && this.c.height === h) return;
      this.c.width = 72; this.c.height = h; this.img = null;
    }
    draw(img) {
      if (!img || img === this.img) return;
      this.img = img;
      const { ctx, c } = this;
      ctx.filter = 'blur(3px)';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      // scale the frame up so its golden core spreads to the screen edges
      const s = 1.6;
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.scale(s, 1.1);
      ctx.translate(-c.width / 2, -c.height / 2);
      drawCover(ctx, img, c.width, c.height, 0.5, 0.5);
      ctx.restore();
      ctx.filter = 'none';
    }
  }

  // Phones used to decode ~1.5 GB of full-size frames (233 x 720x1280 + 120 x 1600x900): the browser evicted and re-decoded them while
  // scrubbing = flicker + lag. They now get lighter sets (public/freefall-story/{fall,portal}-m: every 3rd / 4th frame, 396x704 / 880x495),
  // about 270 MB decoded; Film.render dissolves between the nearest loaded frames so the scrub stays smooth.
  const fall = new Seq(base + (IS_MOBILE ? 'fall-m' : 'fall-d'), FALL_N, IS_MOBILE ? 3 : 2);
  const portal = new Seq(base + (IS_MOBILE ? 'portal-m' : 'portal-d'), PORTAL_N, IS_MOBILE ? 4 : 3);
  const filmFall = new Film($('#fs-filmCanvas'), fall, 0.5, 0.5, IS_MOBILE ? 1.25 : 1.75);
  const filmPortal = new Film($('#fs-portalCanvas'), portal, 0.5, 0.45, IS_MOBILE ? 1.1 : 1.5);
  const ambient = new Ambient($('#fs-ambient'));
  const plaza = createPlaza(), PL = { n: 0, last: -1 };   // the landing plaza: students with backpacks, drawn live in place of the crowd footage

  // ---------- story timeline (in story progress 0..1) ----------
  const CUT = 0.47;     // hard cut from the shaft to the crowd, hidden in the flash
  const SHOCK = 0.585;  // fire ring leaves the figure
  // the film (the golden shaft) takes over once the clouds break: frame 0 is held until then
  const FILM_IN = [0.466, 0.476];   // the loader now plays on through the crowd, the noise, RISE and the index tiles, so the film is shown there too
  const FRAME_KEYS = [[0, 217], [CUT, 217], [0.58, 270], [0.67, 312], [0.86, 464], [1, 464]];
  const frameAt = (p) => {
    for (let i = 1; i < FRAME_KEYS.length; i++) {
      const [p1, v1] = FRAME_KEYS[i];
      if (p <= p1) { const [p0, v0] = FRAME_KEYS[i - 1]; return lerp(v0, v1, (p - p0) / (p1 - p0)); }
    }
    return FALL_N - 1;
  };

  // ---------- 3D type world ----------
  const WORLD = {
    fall: {
      back: [
        ['SRM', 'xl ghost'], ['trust the gradient', 'serif'], ['Machine learning', 'tag'], ['Chennai', 'xl'],
        ['from orbit to a campus', 'serif molten'], ['Kattankulathur', 'l ghost molten'], ['LLMs from scratch', 'tag'],
        ['Lock on', 'xl molten'], ['Bay of Bengal', 'serif'], ['Full-stack AI', 'tag'], ['B.Tech', 'l ghost'],
      ],
      front: [['Fall', 'xxl ghost'], ['Deeper', 'xxl ghost']],
    },
    crowd: {
      back: [
        ['just call the API', 'serif ash'], ['Noise', 'xl ghost ash'], ['can we add AI to it?', 'serif ash'],
        ['like ChatGPT, but free', 'serif ash'], ['B.Tech', 'l ash'], ["it's basically magic", 'serif ash'], ['hype', 'm ash'],
        ['ship it by friday?', 'serif ash'], ['SRM', 'l ghost ash'], ['do we need to understand it?', 'serif ash'], ['10x, instantly', 'm ash'],
      ],
      front: [['Noise', 'xxl ghost']],
    },
    rise: {
      back: [
        ['Stand up', 'xl ghost ember'], ['built, not borrowed', 'serif'], ['Shipped', 'xl molten'], ['still running', 'serif molten'],
        ['Chennai', 'l ghost'], ['signal over noise', 'serif'], ['CS at SRM', 'l ember'],
      ],
      front: [],
    },
  };
  const LINES = [
    ['You land at SRM, in the noise of a campus.', 0.485, 0.6, 0],
    ['The noise clears. A CS student is still glowing.', 0.62, 0.74, 0],
    ['Good engineering is whatever is left standing.', 0.765, 0.88, 0],
  ];
  const CTAS = [
    ['Read the descent', 'work', 'fall', -0.3], ["Let's build", 'contact', 'fall', 0.32],
    ['Read the descent', 'work', 'rise', 0.3], ["Let's build", 'contact', 'rise', -0.28],
  ];

  const P = 900; // must match .world perspective
  const items = [];
  const rand = rng(11);

  function makeItem(cam, text, kind, o) {
    const el = document.createElement(o.jump ? 'a' : 'div');
    el.className = 'wi ' + kind;
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (o.jump) {
      el.href = '#' + o.jump;
      el.dataset.jump = o.jump;
      el.dataset.cursor = 'Go';
    }
    cam.appendChild(el);
    items.push(Object.assign({ el, vis: false, ry: 0 }, o));
  }

  function buildWorld() {
    const back = $('.world--back .cam'), front = $('.world--front .cam'), ui = $('.world--ui .cam');
    for (const [set, def] of Object.entries(WORLD)) {
      def.back.forEach(([text, kind], i, arr) => {
        if (IS_MOBILE && i % 3 === 2) return;   // phones: a third fewer 3D text layers (both sides stay populated)
        const side = i % 2 ? 1 : -1;
        const depth = rand();
        makeItem(back, text, kind, {
          set, loop: true, depth,
          xs: side * (0.16 + rand() * 0.28),
          z: -120 - depth * 1300, zIn: 260, zOut: -700,
          rate: lerp(1.15, 0.6, depth), phase: i / arr.length + rand() * 0.03,
          ry: Math.round((rand() * 22 + 6) * -side),
        });
      });
      // big outlined words that rush past the lens, mostly off the figure
      def.front.forEach(([text, kind], i, arr) => {
        makeItem(front, text, kind, {
          set, loop: true, depth: 0,
          xs: (i % 2 ? 1 : -1) * (0.12 + rand() * 0.12),
          z: 60, zIn: 320, zOut: -260,
          rate: 2.2, phase: i / arr.length + 0.17, cap: 0.75,
          ry: Math.round((rand() - 0.5) * 20),
        });
      });
    }
    LINES.forEach(([text, p0, p1, xs]) => {
      makeItem(front, text, 'line', { set: 'line', loop: false, p0, p1, xs, z: 0, zIn: 180, zOut: -420 });
    });
    CTAS.forEach(([text, jump, set, xs], i) => {
      makeItem(ui, text, 'cta', {
        set: 'ui-' + set, loop: true, jump, xs,
        z: -60, zIn: 200, zOut: -420, rate: 0.55, phase: i * 0.5 + 0.12,
        ry: xs > 0 ? -14 : 14,
      });
    });
  }

  function placeWorld(p, travel, alpha, shockT) {
    const { W, H } = S;
    // S.vel is a raw per-frame delta and jumps around when two clocks drive it (the loader's rAF vs the ticker), so on phones the words
    // don't stretch/skew with it: that wobble made every word shimmer and drop in and out
    const stretch = (IS_MOBILE || IS_SAFARI) ? 1 : 1 + Math.min(Math.abs(S.vel), 70) * 0.004;
    const skew = (IS_MOBILE || IS_SAFARI) ? 0 : clamp(S.vel * 0.05, -5, 5);
    for (const it of items) {
      let a = alpha[it.set] || 0;
      let t;
      if (it.loop) t = fract(it.phase + travel * it.rate);
      else { t = (p - it.p0) / (it.p1 - it.p0); if (t <= 0 || t >= 1) a = 0; }
      if (a > 0) a *= sstep(0, 0.1, t) * (1 - sstep(0.86, 1, t)) * (it.cap || 1) * (1 - (it.depth || 0) * 0.55);

      let z = it.z + lerp(it.zIn, it.zOut, t);
      let xs = it.xs, rz = 0;
      if (it.set === 'crowd' && shockT > 0) {
        // the fire ring blows the crowd's voices out of frame
        const dir = xs >= 0 ? 1 : -1;
        const e = easeOut(shockT);
        xs += dir * (0.35 + Math.abs(xs)) * e * 1.2;
        z += e * 650;
        rz = dir * e * 38;
        a *= 1 - shockT;
      }
      if (a <= 0.004) {
        if (it.vis) { it.el.style.visibility = 'hidden'; it.vis = false; }
        continue;
      }
      if (!it.vis) { it.el.style.visibility = 'visible'; it.vis = true; }
      z = Math.min(z, P - 140);
      const k = (P - z) / P;
      const x = xs * W * k;
      const y = lerp(0.72, -0.72, t) * H * k;
      const rx = lerp(-16, 34, t);
      it.el.style.opacity = f2(a);
      it.el.style.transform =
        `translate3d(${f1(x)}px,${f1(y)}px,${f1(z)}px) rotateX(${f2(rx)}deg) rotateY(${it.ry}deg) rotateZ(${f2(rz)}deg) skewY(${f2(skew)}deg) scaleY(${stretch.toFixed(3)})`;
    }
  }

  // ---------- DOM refs ----------
  const stageInner = $('.stage-inner');
  const filmEl = $('#fs-film');
  const vignette = $('.vignette');
  const ambientEl = $('#fs-ambient');
  const cams = $$('.world .cam');
  const hero = $('#fs-hero');
  const flash = $('.flash:not(.flash--ember)');
  const flashWord = $('.flash b');
  const flashEmber = $('.flash--ember');
  const shock = $('.shock');
  const riseEls = $$('.rise span');
  const riseSeeds = riseEls.map((_, i) => ({
    x: (i - 1.5) * 0.5 + (rand() - 0.5) * 0.3, y: (rand() - 0.5) * 1.2, rx: (rand() - 0.5) * 160, ry: (rand() - 0.5) * 120,
  }));
  const indexName = $('.index-name');
  const campusEl = $('#fs-campus');
  const canvasShow = (on) => { campusEl.style.visibility = on ? 'visible' : 'hidden'; };
  const earthEl = $('#fs-earth'), figure = $('#fs-figure'), breach = $('.breach');
  const fig = createFigure($("#fs-figureCanvas"), base), figHint = $('.figure-hint');
  figHint.textContent = fine ? 'Move to steer \u00b7 Click to spin' : 'Tap to spin';
  const FG = { cx: 0, cy: 0, size: 0, on: false, t: 0 };
  let figBase = 0;
  const figCanvas = $('#fs-figureCanvas');
  // click / tap on the falling figure: barrel roll + sparks
  on(window, 'pointerdown', (e) => {
    if (!FG.on) return;
    if (Math.hypot(e.clientX - FG.cx, e.clientY - FG.cy) < Math.max(70, FG.size * 0.95)) { fig.spin(); Sound.tick(); }
  }, { passive: true });
  const earth = PAGE ? null : createEarth(earthEl, base, { maxDpr: IS_MOBILE ? 1 : 1.5, regions: !IS_MOBILE, hold: false, scale: IS_MOBILE ? 0.7 : 1, adaptive: IS_MOBILE, minScale: 0.55 });
  const campus = createCampus($('#fs-campus'), base);
  const rocket = createRocket($('#fs-rocket'));
  const rocketEl = $('#fs-rocket'); let rocketOn = true;   // a full-screen layer: out of the compositor as soon as the capsule is gone
  const caps = $$('.cap').map((el) => { const [a, b] = el.dataset.w.split(',').map(Number); return { el, a, b, o: -1 }; });
  if (earth && earth.loadRegions) earth.loadRegions();
  else stageFallback();
  function stageFallback() { root.classList.add('no-gl'); }
  let earthFade = 0, earthOn = false, campusOn = false, rocketDirty = true;
  const hud = {
    el: $('#fs-hud'), num: $('.hud-num'), unit: $('.hud-unit'), place: $('.hud-place'), sub: $('.hud-sub'),
    vel: $('.hud-vel'), clock: $('.hud-clock'), velT: '', ck: '',
    ladder: $('#fs-ladder'), fill: $('.ladder-fill'), dot: $('.ladder-dot'), stops: $$('#fs-ladder li'),
    on: -2, n: '', o: -1,
  };
  const tilesEl = $('#fs-tiles');
  const tiles = $$('.tile', tilesEl).map((el) => ({
    el, x: +el.dataset.x, y: +el.dataset.y, s: +el.dataset.s, ar: +el.dataset.ar, z: +el.dataset.z, d: +el.dataset.d, vis: false,
  }));

  const screens = $$('.screen').map((el) => ({
    el, title: $('.screen-title span', el), ring: $('.disc-ring', el), dim: $('.screen-dim', el), disc: $('.disc', el), meta: $('.screen-meta', el), vis: true, p: -1, tf: '', tt: '', rt: '', dv: -1,
  }));
  const workStageEl = $('.work-stage');
  const flatMQ = window.matchMedia('(max-width: 760px)');
  let workSkew = 0;  // eased lean of the big word while scrolling
  let workAI = -1;   // active card: its accent colour is mirrored onto the stage (--ac) so the stage glow changes with it
  // the loss curve along the bottom of the chapters: a ball rolls down it as the story goes on
  const rail = {
    el: $('.rail'), svg: $('.rail-svg'), base: $('.rail-base'), trail: $('.rail-trail'), ball: $('.rail-ball'),
    ticks: $$('.rail-ticks li'), w: 0, h: 0, on: -1,
  };
  const portalCanvas = $('#fs-portalCanvas');
  const tunnelCam = $('.tunnel-cam');
  const portalLines = $$('.portal-line').map((el) => {
    const [a, b] = el.dataset.w.split(',').map(Number);
    return { el, a, b };
  });
  const portalCta = $('.portal-cta');

  const layout = {};
  let rootBox = { top: 0, h: 0 };
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  let baseFeather = 18;

  // ---------- arches for the portal tunnel ----------
  const arches = [];
  (() => {
    const words = ['step through', '', 'this way', '', 'come in', '', 'step through', '', 'almost there', ''];
    words.forEach((w, wi) => {
      if (IS_MOBILE && wi % 2) return;   // phones: the unlabeled arches are skipped (half the glowing 3D layers; the tunnel still reads the same)
      const el = document.createElement('div');
      el.className = 'arch';
      if (w) { const s = document.createElement('span'); s.textContent = w; el.appendChild(s); }
      tunnelCam.appendChild(el);
      arches.push({ el });
    });
  })();

  // ---------- manifesto words ----------
  const MANIFESTO_KEYS = { why: 'k-c k-i', assumptions: 'k-g k-i', again: 'k-b k-i', curiosity: 'k-b k-i', deeply: 'k-c k-i', useful: 'k-g k-i' };
  const manifesto = $('#fs-manifesto');
  const words = [];
  (() => {
    const text = manifesto.textContent.trim().split(/\s+/);
    manifesto.textContent = '';
    text.forEach((w, i) => {
      if (w === '\u00b6') { const br = document.createElement('span'); br.className = 'pb'; br.setAttribute('aria-hidden', 'true'); manifesto.appendChild(br); return; }   // paragraph break
      const s = document.createElement('span');
      s.className = 'w';
      // the few words that carry the idea get the landing page's blue treatment (see .k-* in freefallStory.css)
      const kc = MANIFESTO_KEYS[w.toLowerCase().replace(/[^a-z]/g, '')];
      if (kc) s.className += ' ' + kc;
      s.textContent = w;
      manifesto.appendChild(s);
      if (i < text.length - 1 && text[i + 1] !== '\u00b6') manifesto.appendChild(document.createTextNode(' '));
      words.push({ el: s, o: -1 });
    });
  })();

  // ---------- marquee ----------
  const marquees = $$('.marquee-row').map((row) => {
    const track = $('.marquee-track', row);
    const clone = track.innerHTML;
    track.insertAdjacentHTML('beforeend', clone);
    $$('span', track).slice(track.children.length / 2).forEach((s) => s.setAttribute('aria-hidden', 'true'));
    return { track, dir: +row.dataset.dir, x: 0, half: 0 };
  });

  // ---------- services preview ----------
  const svcPreview = $('.svc-preview');
  const svcImg = $('img', svcPreview);
  const pv = { x: S.W / 2, y: S.H / 2, on: false, s: 0.6 };
  $$('.svc').forEach((li) => {
    li.addEventListener('mouseenter', () => { svcImg.src = li.dataset.img; pv.on = true; svcPreview.classList.add('is-on'); Sound.tick(); });
  });
  $('.svc-list').addEventListener('mouseleave', () => { pv.on = false; svcPreview.classList.remove('is-on'); });

  // ---------- measure ----------
  function measure() {
    S.W = innerWidth; S.H = innerHeight;
    // offsetTop chain, not getBoundingClientRect: the Reveal -> here transition transforms this block while it plays
    rootBox = { top: docTop(root), h: root.offsetHeight };
    for (const id of ['story', 'work', 'about', 'services', 'portal']) {
      const el = $('#fs-' + id);
      layout[id] = { top: docTop(el), h: el.offsetHeight };
    }
    if (workStageEl) layout.work.sh = workStageEl.offsetHeight || S.H;
    const portalStage = $('.portal-stage');
    if (portalStage) layout.portal.sh = portalStage.offsetHeight || S.H;   // pinned stage height (100lvh on phones)   // the pinned stage's real height (100lvh on phones: stable while the URL bar moves)
    filmFall.resize(); filmPortal.resize(); ambient.resize();
    if (earth) earth.resize();
    campus.resize(); rocket.resize();
    baseFeather = S.W / S.H < 0.8 ? 0 : 22;

    const base = Math.min(S.H, S.W * 1.25);
    tiles.forEach((tl) => {
      const w = tl.s * base;
      tl.el.style.width = f1(w) + 'px';
      tl.el.style.height = f1(w / tl.ar) + 'px';
    });

    // the fire ring sits where the figure lands in the crowd shot (43% down the frame)
    const fw = Math.min(S.W, S.H * 0.72), fh = S.H;
    const sc = Math.max(fw / 720, fh / 1280);
    const dh = 1280 * sc;
    shock.style.top = f1((fh - dh) / 2 + 0.43 * dh) + 'px';

    // the portal's centre in the walk-out shot
    const ps = Math.max(S.W / 1600, S.H / 900);
    const pdh = 900 * ps;
    const doorY = (S.H - pdh) * 0.45 + 0.44 * pdh;
    tunnelCam.style.top = f1(doorY) + 'px';
    portalCanvas.style.transformOrigin = '50% ' + f1(doorY) + 'px';   // the push-in zooms straight into the doorway

    marquees.forEach((m) => { m.half = m.track.scrollWidth / 2; });
    buildRail();
  }

  const RAIL_PAD = 7;
  // career curve: climbs from bottom-left to top-right, with small plateaus and dips so it reads as real progress, never a flat line or a drop
  const growthAt = (t) => {
    const base = t * t * (3 - 2 * t) * 0.55 + t * 0.45;
    const wob = Math.sin(t * Math.PI * 5) * 0.035 * Math.sin(t * Math.PI);
    return Math.min(1, Math.max(0, base + wob));
  };
  const railY = (t) => RAIL_PAD + (1 - growthAt(t)) * (rail.h - RAIL_PAD * 2);
  function buildRail() {
    if (!rail.el) return;
    rail.w = rail.svg.clientWidth; rail.h = rail.svg.clientHeight;
    if (!rail.w || !rail.h) return;
    rail.svg.setAttribute('viewBox', `0 0 ${rail.w} ${rail.h}`);
    let d = '';
    const n = 90;
    for (let i = 0; i <= n; i++) { const t = i / n; d += `${i ? 'L' : 'M'}${f1(t * rail.w)} ${f1(railY(t))} `; }
    rail.base.setAttribute('d', d);
    rail.trail.setAttribute('d', d);
    rail.t = -1;
  }

  // ---------- story update ----------
  function updateStory() {
    const L = layout.story;
    let p;
    if (LOADER) p = S.vp;
    else {
      if (S.y > L.top + L.h) return;
      p = clamp((S.y - L.top) / (L.h - S.H));
      if (PAGE) p = PAGE_P0 + (1 - PAGE_P0) * p;
    }
    const { W, H } = S;

    // film + ambient (the film is hidden while we are still above the clouds)
    const filmVis = sstep(FILM_IN[0], FILM_IN[1], p);
    if (filmVis !== S.filmVis) {
      S.filmVis = filmVis;
      filmEl.style.opacity = f2(filmVis);
      filmEl.style.visibility = filmVis > 0 ? 'visible' : 'hidden';
    }
    let img = null;
    if (p >= CUT - 0.0005) {                                         // the landing: a night plaza in front of the arch gate, drawn live
      if (filmVis > 0 && (S.t - PL.last > 0.028 || PL.last < 0 || filmFall.key !== 'plaza')) {
        const fc = filmFall.c;
        const br = fall.bracket(frameAt(p));                         // the footage's glowing figure + fire ring are lifted out of these frames
        plaza.draw(filmFall.ctx, fc.width, fc.height, clamp((p - CUT) / (0.86 - CUT)), S.t, br && fall.imgs[br[0]], br && br[1] !== br[0] ? fall.imgs[br[1]] : null, br ? br[2] : 0, frameAt(p), null);
        filmFall.key = 'plaza'; PL.last = S.t;
        if (++PL.n % 24 === 1) { ambient.img = null; ambient.draw(fc); }
      }
    } else { img = filmFall.render(frameAt(p)); PL.last = -1; if (img) ambient.draw(img); }

    // camera follows the pointer
    const camT = `rotateX(${f2(-S.smy * 7)}deg) rotateY(${f2(S.smx * 10)}deg)`;
    for (const c of cams) c.style.transform = camT;

    // the type world
    const travel = (S.y - L.top) / H * 0.2 + S.t * 0.004;
    const shockT = norm(p, SHOCK, 0.64);
    const alpha = {
      fall: 0,
      crowd: sstep(CUT, CUT + 0.03, p),
      rise: sstep(0.655, 0.7, p) * (1 - sstep(0.84, 0.875, p)),
      line: 1,
      'ui-fall': 0,
      'ui-rise': sstep(0.68, 0.71, p) * (1 - sstep(0.84, 0.87, p)),
    };
    placeWorld(p, travel, alpha, shockT);

    if (!PAGE) { updateHud(p); updateDescent(p); }

    // hero tips backwards into the shaft
    const he = sstep(0, 0.05, p);
    hero.style.transform = `perspective(900px) translate3d(0,${f1(-he * 26)}vh,${f1(-he * 700)}px) rotateX(${f1(he * 48)}deg)`;
    hero.style.opacity = f2(1 - sstep(0.012, 0.05, p));
    hero.style.visibility = p > 0.06 ? 'hidden' : 'visible';

    // impact flash at the cut
    const fl = bell(p, 0.463, CUT, 0.51);
    flash.style.opacity = f2(fl);
    if (fl > 0) {
      flashWord.style.opacity = f2(bell(p, 0.466, CUT, 0.492));
      flashWord.style.transform = `scale(${f2(lerp(0.72, 1.28, norm(p, 0.44, 0.51)))})`;
      stageInner.style.transform = fl > 0.6 && !reduce && !IS_MOBILE && !IS_SAFARI
        ? `translate(${f1((Math.random() - 0.5) * 18 * fl)}px,${f1((Math.random() - 0.5) * 18 * fl)}px)` : '';
    } else if (stageInner.style.transform) stageInner.style.transform = '';

    // fire ring shockwave
    flashEmber.style.opacity = f2(bell(p, SHOCK - 0.004, SHOCK + 0.01, 0.625) * 0.42);
    if (shockT > 0 && shockT < 1) {
      const e = easeOut(shockT);
      shock.style.opacity = f2((1 - shockT) * sstep(0, 0.06, shockT));
      shock.style.transform = `scale(${f2(lerp(0.12, 7.5, e))}, ${f2(lerp(0.12, 7.5, e) * 0.5)})`;
    } else shock.style.opacity = '0';

    // R I S E assembles out of the depth, then tips back and away
    const rq = norm(p, 0.685, 0.8), ex = sstep(0.815, 0.865, p);
    riseEls.forEach((el, i) => {
      const lt = easeOut(norm(rq, i * 0.1, i * 0.1 + 0.6));
      if (lt <= 0 || ex >= 1) { el.style.opacity = '0'; return; }
      const r = riseSeeds[i];
      const tx = lerp(r.x * W, 0, lt), ty = lerp(r.y * H, 0, lt) - ex * H * 0.5;
      const tz = lerp(-2600, 0, lt) - ex * 1600;
      el.style.transform = `translate3d(${f1(tx)}px,${f1(ty)}px,${f1(tz)}px) rotateX(${f1(lerp(r.rx, 0, lt) + ex * 55)}deg) rotateY(${f1(lerp(r.ry, 0, lt))}deg)`;
      el.style.opacity = f2(lt * (1 - ex));
    });

    // index: the film shrinks into one tile among the work
    const iq = easeInOut(norm(p, 0.86, 0.97));
    const drift = norm(p, 0.975, 1);
    filmEl.style.transform = `translateX(-50%) translate3d(${f1(S.smx * -14 * iq)}px,${f1(-drift * H * 0.08)}px,0) scale(${(lerp(1, 0.36, iq)).toFixed(4)})`;
    filmEl.style.setProperty('--f', f1(lerp(baseFeather, 0, iq)) + '%');
    vignette.style.opacity = f2(1 - iq * 0.7);
    ambientEl.style.opacity = f2(0.5 * (1 - iq * 0.75) * filmVis);

    const q = norm(p, 0.865, 0.975);
    indexName.style.opacity = f2(q * 0.9);
    if (q > 0) indexName.style.transform = `translate(-50%,-50%) translate3d(${f1(S.smx * -26)}px,${f1(S.smy * -14 - drift * H * 0.1)}px,0) scale(${f2(lerp(1.35, 1, easeOut(q)))})`;
    tilesEl.classList.toggle('is-live', q > 0.7);
    const TP = 1200;
    for (const tl of tiles) {
      const tq = easeOut(norm(q, tl.d, tl.d + 0.55));
      if (tq <= 0) { if (tl.vis) { tl.el.style.opacity = '0'; tl.vis = false; } continue; }
      tl.vis = true;
      const z = lerp(-3200, tl.z, tq) + drift * 500 * (1 + tl.d);
      const k = (TP - z) / TP;
      const x = tl.x * W * k + S.smx * (30 + tl.d * 90);
      const y = (tl.y * H - drift * H * (0.12 + tl.d * 0.2)) * k + S.smy * (20 + tl.d * 60);
      tl.el.style.opacity = f2(tq);
      tl.el.style.transform = `translate(-50%,-50%) translate3d(${f1(x)}px,${f1(y)}px,${f1(z)}px) rotateY(${f2(S.smx * -9)}deg) rotateX(${f2(S.smy * 7)}deg)`;
    }

    // one-shot hits when crossing the cut and the shockwave going down
    if (S.lastP < CUT && p >= CUT && p - S.lastP < 0.05) impact(1);
    if (S.lastP < SHOCK && p >= SHOCK && p - S.lastP < 0.05) impact(0.7);
    S.lastP = p;
    S.storyP = p;
  }

  // ---------- the descent: camera path from orbit to the clouds over Chennai, the figure, the scope, the breach ----------
  // altitude keys (km): shared by the camera and the readout so the numbers always match what you see. Smoothed in log space.
  const ALT = [[0, 6500], [0.03, 6500], [0.10, 3000], [0.17, 1000], [0.22, 300], [0.265, 100], [0.30, 22], [0.36, 4], [0.42, 0.6], [CUT - 0.003, 0.03], [CUT, 0.02]].map(([p, h]) => [p, Math.log(h)]);
  // camera keys: p, lat, lon, tilt (deg from straight down, toward north), fov, roll
  const CAM = [
    [0.00, -7, 80.6, 29, 50, 0], [0.06, -5, 80.4, 29, 50, -1.5], [0.11, 3.5, 78.3, 31, 52, 1.2], [0.17, 9, 78.0, 19, 54, -1],
    [0.22, 11.8, 79.2, 9, 56, 2], [0.265, 12.7, 80.05, 3.5, 58, -2], [0.30, 12.95, 80.12, 0, 60, 0], [0.36, 12.95, 80.12, 0, 60, 0],
  ];
  // Catmull-Rom through keys [p, v...] -> values at p (clamped at both ends)
  function spline(keys, p) {
    const n = keys.length;
    if (p <= keys[0][0]) return keys[0].slice(1);
    if (p >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 1; while (keys[i][0] < p) i++;
    const k0 = keys[Math.max(i - 2, 0)], k1 = keys[i - 1], k2 = keys[i], k3 = keys[Math.min(i + 1, n - 1)];
    const t = (p - k1[0]) / (k2[0] - k1[0]), t2 = t * t, t3 = t2 * t;
    return k1.slice(1).map((_, j) => {
      const a = k0[j + 1], b = k1[j + 1], c = k2[j + 1], d = k3[j + 1];
      return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    });
  }
  const altAt = (p) => Math.exp(spline(ALT, p)[0]);
  const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const SRM_KM_START = 120, SRM_KM_END = 0.8;

  function updateDescent(p) {
    const { W, H } = S;
    const h = altAt(p);

    // --- the planet
    const eo = (earth && earth.ready ? 1 : 0) * (1 - sstep(0.315, 0.345, p));
    earthFade = lerp(earthFade, eo, eo > earthFade ? 0.2 : 0.06);   // fades IN fast (the planet should be there the moment the curtain lifts), out at the old pace
    const showEarth = !!earth && p < 0.36 && earthFade > 0.003;
    if (showEarth !== earthOn) { earthOn = showEarth; earthEl.style.visibility = showEarth ? 'visible' : 'hidden'; if (showEarth && earth) earth.invalidate(); }
    if (showEarth) {
      earthEl.style.opacity = f2(earthFade);
      const [lat, lon, tilt, fov, roll] = spline(CAM, p);
      const heat = bell(p, 0.215, 0.285, 0.335) * 1.0;
      const fog = sstep(0.255, 0.318, p);
      const detail = clamp((Math.log(3500) - Math.log(h)) / (Math.log(3500) - Math.log(12)), 0, 1);
      earth.draw({
        lat, lon: lon + S.smx * 0.7, h, tilt: tilt + S.smy * 1.2, fov: fov + Math.min(Math.abs(S.vel), LOADER ? 30 : 60) * 0.05, roll: roll + S.smx * 0.8 + Math.sin(S.t * 0.2) * 0.5,
        heat, fog, detail, speed: sstep(0.17, 0.27, p) * (1 - sstep(0.30, 0.335, p)) * 0.45, exp: 1.18, time: S.t,
      });
    }

    // --- the figure: a live rig (figure.js). Small in the dark, growing as the planet rushes up, glowing as the air thickens;
    //     he steers toward the pointer, reaches for it, tucks in when you scroll fast, spins on click. The film takes over at the breach.
    const fo = sstep(0.094, 0.104, p) * (1 - sstep(0.466, 0.474, p));
    const emerge = easeOut(norm(p, 0.096, 0.15)), chute = sstep(0.40, 0.466, p);
    if (fo > 0.003) {
      const k = easeInOut(norm(p, 0.05, 0.34));
      const size = H * lerp(0.2, 0.32, k) * lerp(0.16, 1, emerge) * lerp(1, 0.72, chute);
      const heat = bell(p, 0.215, 0.285, 0.335);
      const bx0 = (0.5 + Math.sin(p * 31) * 0.018) * W, by0 = (0.47 + Math.sin(p * 17) * 0.02) * H;
      let bx = lerp(rocket.hatch.x, bx0, emerge), by = lerp(rocket.hatch.y, by0, emerge), rot = 0;
      const dts = Math.min(0.05, Math.max(0.001, S.t - (FG.t || S.t - 0.016))); FG.t = S.t;
      const r = fig.frame({ t: S.t, dt: dts, size, heat, vel: S.vel, baseX: bx, baseY: by, px: S.cx, py: S.cy, hasPtr: fine && (S.mx !== 0 || S.my !== 0), W, H });
      FG.cx = bx + r.ox; FG.cy = by + r.oy; FG.size = size; FG.on = true;
      figure.style.opacity = f2(fo);
      // The figure's size changes on every frame while scrubbing. Writing width/height here forced a layout of the figure + its 340% canvas each frame
      // (and the browser reported it as layout shift: CLS ~0.2 while scrolling this scene). The box is now a constant FIG_BASE (the largest the figure
      // ever gets) and the size is a transform: scale(), which only touches the compositor. The picture on screen is identical.
      const fb = Math.round(H * 3.2) / 10;
      if (fb !== figBase) {
        figBase = fb;
        figure.style.width = fb + 'px'; figure.style.height = f1(fb * 0.82) + 'px';
      }
      const sc = size / fb;
      figure.style.transform = `translate3d(${f1(FG.cx - fb / 2)}px,${f1(FG.cy - fb * 0.41)}px,0) rotate(${f1(rot)}deg)`;
      figCanvas.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(4)})`;
      figHint.style.transform = `translate(-50%,${f1(0.41 * (size - fb))}px)`;   // keeps the hint just under the (scaled) figure
      figure.style.visibility = 'visible';
      figHint.style.opacity = f2(fo * (fig.interacted ? 0 : 1) * (1 - sstep(0.2, 0.26, p)) * sstep(0.07, 0.1, p));
    } else { FG.on = false; if (figure.style.visibility !== 'hidden') { figure.style.visibility = 'hidden'; figure.style.opacity = '0'; } }

    // --- the capsule stack at the start, the parachute at the end
    if (p < 0.17) { if (!rocketOn) { rocketOn = true; rocketEl.style.visibility = 'visible'; } rocket.draw({ p, t: S.t, W, H, fig: FG, px: S.smx }); rocketDirty = true; }
    else if (rocketDirty) { rocket.draw({ p: 1, t: S.t, W, H, fig: null }); rocketDirty = false; if (rocketOn) { rocketOn = false; rocketEl.style.visibility = 'hidden'; } }

    // --- breaking through the cloud deck
    const br = bell(p, 0.292, 0.316, 0.345);
    breach.style.opacity = f2(br * 0.8);

    // --- the campus: below the cloud the ground is a night city, and it rushes up. Pointer swings the camera.
    const ca = sstep(0.30, 0.322, p) * (1 - sstep(0.466, 0.474, p));
    if (ca > 0.003) {
      if (!campusOn) { campusOn = true; canvasShow(true); }
      const u = norm(p, 0.305, 0.47);
      campus.draw({
        alt: Math.max(25, altAt(Math.max(p, 0.305)) * 1000),
        tilt: lerp(1.0, 0.42, easeOut(u)) * (1 - 0.6 * sstep(0.445, 0.468, p)) + S.smy * 0.07,
        yaw: lerp(-0.6, 0.32, easeInOut(u)) + S.smx * 0.3,
        t: S.t, a: ca, lock: sstep(0.35, 0.46, p),
      });
      campusEl.style.opacity = f2(ca);
    } else if (campusOn) { campusOn = false; canvasShow(false); }

    // --- editorial captions (they replace the flying lines for the fall): one at a time, left column
    for (const c of caps) {
      const o = Math.round(bell(p, c.a, (c.a + c.b) / 2, c.b) * 100) / 100;
      const t = clamp((p - c.a) / (c.b - c.a));
      if (o !== c.o) { c.o = o; c.el.style.opacity = o; c.el.style.visibility = o > 0 ? 'visible' : 'hidden'; }
      if (o > 0) c.el.style.transform = `translate3d(0,${f1(lerp(26, -26, t))}px,0)`;
    }
  }

  // the readout: altitude + place, from orbit to the SRM campus. The number eases down the way a real descent does (fast up high,
  // slow near the ground), the place text swaps at each waypoint, the ladder on the right shows how far down you are.
  function updateHud(p) {
    const W = WAYPOINTS;
    const first = W[0].p0, last = W[W.length - 1].p1;
    const o = Math.round(sstep(first - 0.01, first + 0.02, p) * (1 - sstep(last - 0.02, last, p)) * 50) / 50;
    if (o !== hud.o) {
      hud.o = o;
      hud.el.style.opacity = o; hud.ladder.style.opacity = o;
      hud.el.style.visibility = hud.ladder.style.visibility = o > 0 ? 'visible' : 'hidden';
    }
    if (o <= 0) return;
    let k = 0;
    for (let i = 0; i < W.length; i++) if (p >= W[i].p0) k = i;
    const w = W[k];
    const u = clamp((p - w.p0) / (w.p1 - w.p0));
    // altitude: the same curve the camera follows. Speed falls from orbital-ish to terminal velocity (about 55 m/s) as the air thickens
    const alt = p >= CUT ? 0 : altAt(p);
    const km = alt >= 1;
    const nStr = km ? (alt >= 100 ? fmtInt(alt) : alt.toFixed(1)) : String(Math.round(alt * 1000));
    if (nStr !== hud.n) { hud.n = nStr; hud.num.textContent = nStr; hud.unit.textContent = km ? 'km' : 'm'; }
    const vel = p >= CUT ? 0 : (55 + 7545 * Math.pow(clamp(Math.log(Math.max(alt, 0.02) / 0.02) / Math.log(6500 / 0.02)), 2.4)) * lerp(1, 0.035, sstep(0.4, 0.43, p));
    const vs = p >= CUT ? '0' : fmtInt(vel);
    if (vs !== hud.velT) { hud.velT = vs; hud.vel.textContent = vs; }
    const sec = Math.floor(Math.max(0, p - first) * 640), ck = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    if (ck !== hud.ck) { hud.ck = ck; hud.clock.textContent = ck; }
    if (k !== hud.on) {
      hud.on = k;
      hud.place.textContent = w.place; hud.sub.textContent = w.sub;
      hud.el.classList.remove('is-swap'); void hud.el.offsetWidth; hud.el.classList.add('is-swap');
      hud.stops.forEach((li, i) => { li.classList.toggle('is-on', i === k); li.classList.toggle('is-past', i < k); });
    }
    const t = (k + (k < W.length - 1 ? u : 1)) / (W.length - 1);
    const tt = Math.round(clamp(t) * 1000) / 1000;
    hud.fill.style.transform = `scaleY(${tt})`;
    hud.dot.style.top = tt * 100 + '%';
  }

  function impact(power) {
    if (!reduce && !IS_MOBILE) {
      stageInner.classList.remove('is-shake');
      void stageInner.offsetWidth;
      stageInner.classList.add('is-shake');
    }
    Sound.boom(power);
  }

  // ---------- work: stacked screens that slide in and recede backwards ----------
  function updateWork() {
    const L = layout.work;
    if (S.y + S.H < L.top || S.y > L.top + L.h) return;
    const w = clamp((S.y - L.top) / (L.h - (L.sh || S.H)));
    const n = screens.length;
    const k = norm(w, 0, 0.88) * (n - 1);
    updateRail(k / (n - 1), Math.round(k));
    const ai = Math.round(k);
    if (ai !== workAI && workStageEl && screens[ai]) { workAI = ai; screens.forEach((sc, j) => sc.el.classList.toggle('is-act', j === ai)); workStageEl.style.setProperty('--ac', screens[ai].el.style.getPropertyValue('--c')); }
    // the first chapter draws itself as the section scrolls into view; the others as they slide in and settle
    const entry = clamp((S.y + S.H - L.top) / S.H);
    
    // the giant word leans with scroll speed. S.vel is a raw per-frame delta (it jumps around when Lenis and the ticker
    // are a frame out of step), so the lean is eased separately, kept small and snapped to 0.1deg: no more shimmer
    workSkew += ((IS_MOBILE || flatMQ.matches ? 0 : clamp(-S.vel * 0.06, -6, 6)) - workSkew) * 0.12;
    if (Math.abs(workSkew) < 0.05) workSkew = 0;
    workSkew = Math.round(workSkew * 10) / 10;

    const flat = IS_MOBILE || flatMQ.matches;   // phones / tablets: a flat slide, no 3D flip
    screens.forEach((sc, i) => {
      const d = k - i;
      if (d < -1 || d > (flat ? 1.05 : 2.4)) {
        if (sc.vis) { sc.el.style.visibility = 'hidden'; sc.vis = false; }
        return;
      }
      if (!sc.vis) { sc.el.style.visibility = 'visible'; sc.vis = true; }
      let tf, dim;
      if (flat) {
        if (d < 0) { const e = easeOut(d + 1); tf = `translate3d(0,${f1((1 - e) * 125)}%,0)`; dim = 0; }
        else { tf = `translate3d(0,${f1(-d * 2.4)}%,0) scale(${(1 - d * 0.06).toFixed(3)})`; dim = Math.min(d, 1) * 0.55; }
      } else {
        let ty = 0, tz = 0, rx = 0, rz = 0;
        const side = i % 2 ? 1 : -1;
        if (d < 0) {
          const e = easeOut(d + 1);
          ty = (1 - e) * 115; rx = (1 - e) * 24; rz = (1 - e) * 7 * side;
        } else {
          const r = d;
          tz = -r * 420; ty = -r * 6; rz = -r * 2.6 * side; rx = r * 5;
          dim = Math.min(r, 1.4) * 0.6;
        }
        tf = `translate3d(0,${f2(ty)}%,${f1(tz)}px) rotateX(${f2(rx)}deg) rotateZ(${f2(rz)}deg)`;
      }
      if (tf !== sc.tf) { sc.tf = tf; sc.el.style.transform = tf; }
      const dv = Math.round(dim * 50) / 50;
      if (dv !== sc.dv) { sc.dv = dv; sc.dim.style.opacity = dv; }
      const local = clamp((d + 1) / 2.4);
      const tt = flat ? `translate3d(${f1(lerp(4, -42, local))}%,0,0)` : `translate3d(${f2(lerp(4, -42, local))}%,0,0) skewX(${f2(workSkew)}deg)`;
      if (tt !== sc.tt) { sc.tt = tt; sc.title.style.transform = tt; }
      const ap = Math.round((i === 0 ? norm(entry, 0.15, 1) : clamp((d + 0.85) / 1.2)) * 100) / 100;
      // --p only on the two subtrees that read it (the disc and the copy), not on the whole card: it no longer restyles every descendant
      if (ap !== sc.p) { sc.p = ap; sc.disc.style.setProperty('--p', ap); sc.meta.style.setProperty('--p', ap); }
      const rt = `rotate(${f1(-S.y * 0.05)}deg)`;
      if (rt !== sc.rt) { sc.rt = rt; sc.ring.style.transform = rt; }
    });
  }

  function updateRail(t, active) {
    if (!rail.w) return;
    const tt = Math.round(t * 1000) / 1000;
    if (tt !== rail.t) {
      rail.t = tt;
      rail.ball.setAttribute('cx', f1(tt * rail.w));
      rail.ball.setAttribute('cy', f1(railY(tt)));
      rail.trail.style.strokeDashoffset = f2(1 - tt);
    }
    if (active !== rail.on) {
      rail.on = active;
      rail.ticks.forEach((li, i) => li.classList.toggle('is-on', i === active));
    }
  }

  // ---------- about ----------
  function updateAbout() {
    const L = layout.about;
    if (S.y + S.H < L.top || S.y > L.top + L.h) return;
    const m = norm(S.y, L.top - S.H * 0.7, L.top + L.h * 0.5 - S.H * 0.35);
    const N = words.length;
    const head = m * (N + 5);
    for (let i = 0; i < N; i++) {
      const o = Math.round(lerp(0.13, 1, clamp((head - i) / 5)) * 50) / 50;
      if (o !== words[i].o) { words[i].o = o; words[i].el.style.opacity = o; }
    }
  }

  // ---------- marquee: speeds up and flips with your scroll ----------
  let marqueeDir = 1;
  const marqBlock = $('.marquee-row') && $('.marquee-row').parentElement;
  let marqueeVis = true;
  const ioMarq = marqBlock ? new IntersectionObserver(([en]) => { marqueeVis = en.isIntersecting; }, { rootMargin: '120px' }) : null;
  if (ioMarq) ioMarq.observe(marqBlock);
  function updateMarquee(dt) {
    if (!marqueeVis) return;   // off screen: nothing to move (it wrote two transforms every frame, from the first pixel of the page)
    if (Math.abs(S.vel) > 0.5) marqueeDir = S.vel > 0 ? 1 : -1;
    const held = document.documentElement.dataset.motion === 'paused';   // the page-wide "Pause motion" button: no self-running drift
    const speed = (reduce || held ? 0 : 0.7) + Math.min(Math.abs(S.vel), 80) * 0.35;
    for (const m of marquees) {
      if (!m.half) continue;
      m.x += speed * m.dir * marqueeDir * (dt / 16.67);
      if (m.x <= -m.half) m.x += m.half;
      if (m.x > 0) m.x -= m.half;
      m.track.style.transform = `translate3d(${f1(m.x)}px,0,0)`;
    }
  }

  // ---------- services hover preview ----------
  function updateServices() {
    if (!fine) return;
    const L = layout.services;
    if (S.y + S.H < L.top || S.y > L.top + L.h) return;
    const px = pv.x;
    pv.x = lerp(pv.x, S.cx, 0.14);
    pv.y = lerp(pv.y, S.cy, 0.14);
    pv.s = lerp(pv.s, pv.on ? 1 : 0.6, 0.12);
    const rot = clamp((pv.x - px) * 0.6, -14, 14);
    const w = svcPreview.offsetWidth, h = svcPreview.offsetHeight;
    svcPreview.style.transform = `translate3d(${f1(pv.x - w / 2)}px,${f1(pv.y - h / 2)}px,0) rotate(${f2(rot)}deg) scale(${f2(pv.s)})`;
  }

  // ---------- portal: he walks out, the tunnel flies past you ----------
  let pTf = '', pCam = '', pCta = -1, pCtaT = '', pDrift = 0, pLast = 0;
  function updatePortal() {
    if (NO_PORTAL) { S.portalOpen = 0; return; }
    const L = layout.portal;
    if (S.y + S.H < L.top || S.y > L.top + L.h) { S.portalOpen = 0; return; }
    const w = clamp((S.y - L.top) / (L.h - (L.sh || S.H)));
    const fast = IS_MOBILE && Math.abs(S.vel) > 14;
    filmPortal.render(norm(w, 0.02, 0.76) * (PORTAL_N - 1), fast);

    const push = sstep(0.76, 1, w);
    const k1 = 1 + push * 0.32;
    const tf = `scale(${k1.toFixed(4)}) translate3d(${f1(S.smx * -10)}px,${f1(S.smy * -8)}px,0)`;
    if (tf !== pTf) { pTf = tf; portalCanvas.style.transform = tf; }
    // the arches' vanishing point is the doorway, so it must drift and zoom exactly with the film (same shift, same push-in)
    const cam = `translate3d(${f1(S.smx * -10 * k1)}px,${f1(S.smy * -8 * k1)}px,0)`;
    if (cam !== pCam) { pCam = cam; tunnelCam.style.transform = cam; }

    // the tunnel shows while the door opens, steps aside while he walks out,
    // then returns and speeds up as you push through the door yourself
    const open = Math.max(sstep(0.1, 0.24, w) * (1 - sstep(0.4, 0.52, w)), sstep(0.78, 0.9, w));
    S.portalOpen = Math.max(open, sstep(0.1, 0.3, w) * (1 - sstep(0.9, 1, w)));
    const rush = w * 2.4 + push * 3;
    // the idle drift of the tunnel: desktop always; phones only while the page is moving (an idle phone then repaints nothing at all)
    const nowS = S.t;
    if (!IS_MOBILE || Math.abs(S.vel) > 0.3) pDrift += (nowS - (pLast || nowS)) * 0.012;
    pLast = nowS;
    const drift = IS_MOBILE ? pDrift : S.t * 0.012;
    const n = arches.length;
    for (let i = 0; i < n; i++) {
      const a = arches[i];
      const z = -3600 + fract(i / n + rush + drift) * 4300;
      const o = open * sstep(-3600, -2300, z) * (1 - sstep(220, 680, z));
      const os = f2(o);
      if (os !== a.o) { a.o = os; a.el.style.opacity = os; }
      if (o > 0) {
        const t = `translate3d(${f1(S.smx * -12)}px,${f1(S.smy * -8)}px,${f1(z)}px)`;
        if (t !== a.t) { a.t = t; a.el.style.transform = t; }
      }
    }

    for (const l of portalLines) {
      const t = norm(w, l.a, l.b);
      const o = sstep(0, 0.25, t) * (1 - sstep(0.75, 1, t));
      if (o <= 0 && l.o === '0.00') continue;   // fully faded out and still so: nothing to write
      const os = f2(o), ts = `translate3d(-50%,${f1(lerp(50, -50, t))}px,0)`;
      if (os !== l.o) { l.o = os; l.el.style.opacity = os; }
      if (ts !== l.t) { l.t = ts; l.el.style.transform = ts; }
    }

    const c = sstep(0.8, 0.9, w);
    const cs = f2(c);
    if (cs !== pCta) { pCta = cs; portalCta.style.opacity = cs; portalCta.style.transform = `translateY(${f1((1 - c) * 50)}px)`; portalCta.classList.toggle('is-live', c > 0.5); }
  }

  // ---------- magnetic buttons ----------
  if (fine) {
    $$('.magnet').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.classList.add('is-pull');
        el.style.transform = `translate(${f1(x * 0.22)}px,${f1(y * 0.34)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-pull'); el.style.transform = ''; });
    });
  }

  // ---------- sound: synthesised, so it can follow your scroll ----------
  const Sound = {
    ctx: null, on: false,
    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const c = (this.ctx = new AC());
      this.master = c.createGain();
      this.master.gain.value = 0;
      this.master.connect(c.destination);

      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      this.windF = c.createBiquadFilter();
      this.windF.type = 'bandpass'; this.windF.frequency.value = 400; this.windF.Q.value = 0.8;
      this.windG = c.createGain(); this.windG.gain.value = 0;
      src.connect(this.windF).connect(this.windG).connect(this.master);
      src.start();

      this.droneLP = c.createBiquadFilter();
      this.droneLP.type = 'lowpass'; this.droneLP.frequency.value = 300;
      this.droneG = c.createGain(); this.droneG.gain.value = 0;
      [55, 55.6, 82.4, 110.3].forEach((f) => {
        const o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f;
        o.connect(this.droneLP); o.start();
      });
      this.droneLP.connect(this.droneG).connect(this.master);
      return true;
    },
    set(on) {
      if (on && !this.ctx && !this.init()) return;
      this.on = on;
      if (this.ctx) {
        if (on) this.ctx.resume();
        this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.25);
      }
      const btn = $('.fs-sound');
      btn.setAttribute('aria-pressed', String(on));
      $('span', btn).textContent = on ? 'Sound on' : 'Sound off';
      root.classList.toggle('sound-on', on);
    },
    update() {
      if (!this.on) return;
      const t = this.ctx.currentTime;
      const v = Math.min(Math.abs(S.vel), 80) / 80;
      const st = layout.story;
      const inStory = S.y < st.top + st.h;
      const p = S.storyP || 0;
      let wind = 0.02 + v * 0.35, freq = 260 + v * 900;
      if (inStory && p < CUT) { wind = 0.06 + v * 0.6; freq = 380 + v * 1500 + p * 600; }
      else if (inStory && p < 0.86) { wind = 0.04 + v * 0.3; freq = 180 + v * 400; }
      this.windG.gain.setTargetAtTime(wind, t, 0.08);
      this.windF.frequency.setTargetAtTime(freq, t, 0.12);
      const open = S.portalOpen || 0;
      this.droneG.gain.setTargetAtTime(open * 0.09, t, 0.4);
      this.droneLP.frequency.setTargetAtTime(220 + open * 900, t, 0.4);
    },
    quiet() {
      if (!this.on || !this.windG) return;
      const t = this.ctx.currentTime;
      this.windG.gain.setTargetAtTime(0, t, 0.15);
      this.droneG.gain.setTargetAtTime(0, t, 0.3);
    },
    boom(power) {
      if (!this.on) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9 * power, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 1.8);
      const n = c.createBufferSource();
      n.buffer = this.noise;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(4000, t);
      f.frequency.exponentialRampToValueAtTime(120, t + 1);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.5 * power, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      n.connect(f).connect(ng).connect(this.master);
      n.start(t); n.stop(t + 1.2);
    },
    tick() {
      if (!this.on) return;
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
      const g = c.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + 0.08);
    },
  };
  $('.fs-sound').addEventListener('click', () => Sound.set(!Sound.on));

  
  // ---------- smooth scroll: the site's own Lenis (lib/smooth.js) drives the page, so we only read the scroll position ----------
  const lenis = window.__lenis || null;

  // ---------- navigation ----------
  function targetY(key) {
    if (key === 'top') return layout.story.top;
    if (key.startsWith('story:')) {
      const L = layout.story;
      return L.top + parseFloat(key.slice(6)) * (L.h - S.H);
    }
    if (key.startsWith('case:')) {
      const L = layout.work;
      const i = +key.slice(5);
      return L.top + (i / (screens.length - 1)) * 0.88 * (L.h - S.H);
    }
    // "contact" is the site's own Contact block at the very end of the page
    if (key === 'contact') return document.documentElement.scrollHeight - S.H;
    return layout[key] ? layout[key].top : 0;
  }
  function jump(key) {
    const y = targetY(key);
    const dist = Math.abs(y - scrollY);
    if (lenis) lenis.scrollTo(y, { duration: clamp((dist / S.H) * 0.22, 1.2, 5), easing: easeInOut, force: true });
    else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  on(root, 'click', (e) => {
    const go = e.target.closest('[data-go]');
    const a = e.target.closest('[data-jump]');
    if (!go && !a) return;
    e.preventDefault();
    if (go) {
      const g = go.dataset.go;
      jump(/^\d+$/.test(g) ? 'case:' + g : g);
    } else jump(a.dataset.jump);
  });

  // (no copy-email button: the closing buttons just jump to the portfolio's <Contact /> section / back to the top)
  let copyT = 0;   // still cleared in destroy()

  // pointer drives the camera tilt
  on(window, 'pointermove', (e) => {
    S.cx = e.clientX; S.cy = e.clientY;
    S.mx = (e.clientX / S.W) * 2 - 1;
    S.my = (e.clientY / S.H) * 2 - 1;
  }, { passive: true });

  // ---------- entrance + frame loading ----------
  $$('.hn').forEach((el, i) => { el.style.transitionDelay = `${0.25 + i * 0.055}s`; });
  // loader: the name is written when the loader decides (after the counter has faded and the main thread is calm), not the moment the markup is mounted
  const ioEnter = new IntersectionObserver((es) => { if (!LOADER && es.some((e) => e.isIntersecting)) root.classList.add('is-entered'); }, { threshold: 0.02 });
  ioEnter.observe(root);

  // the ~22 MB of frames wait until the page has finished loading and the landing has had its moment. They start when the visitor has
  // actually scrolled toward this block, or a few idle seconds AFTER the window "load" event (images created before "load" hold that
  // event open, so starting them at boot kept the tab's loading state on until all ~650 frames had arrived and starved the landing).
  let loading = false;
  const startLoad = () => {
    if (loading) return;
    loading = true;
    if (PAGE) { if (!NO_PORTAL) portal.load(3); return; }   // the page no longer plays the crowd film (it lives in the loader): only the doorway film is needed here
    fall.load(IS_MOBILE ? 4 : 8).then(() => { if (!fall.dead && !LOADER && !NO_PORTAL) portal.load(3); });
  };
  let idleT = 0;
  const armIdle = () => { idleT = setTimeout(startLoad, 3500); };
  if (!LOADER) { if (document.readyState === 'complete') armIdle(); else on(window, 'load', armIdle, { once: true }); }
  const nearBlock = () => { if (!LOADER && window.scrollY > 240) startLoad(); };     // reload mid-page / first scroll: do not wait for the timer
  on(window, 'scroll', nearBlock, { passive: true });
  nearBlock();
  const ioLoad = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) nearBlock(); }, { rootMargin: '250% 0px 250% 0px' });
  ioLoad.observe(root);

  // ---------- measure + main loop ----------
  buildWorld();
  measure();
  const remeasure = () => measure();
  let lastW = innerWidth;
  on(window, 'resize', () => {
    clearTimeout(measure.t);
    measure.t = setTimeout(() => {
      // touch: the URL bar collapsing only changes the height; re-measuring then is wasted work mid-scroll
      if (!fine && innerWidth === lastW) return;
      lastW = innerWidth;
      measure();
    }, 120);
  });
  on(window, 'load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  // pinned sections above (the landing) add scroll height: re-measure whenever ScrollTrigger does
  ScrollTrigger.addEventListener('refresh', remeasure);

  let last = 0;
  function step(ms) {
    const y = LOADER ? S.vp * S.H * 17 : window.scrollY;
    // phones: while the page isn't moving, the ambient drift (words, marquee, tunnel) runs at ~25 fps instead of 60: far fewer re-composites
    if (IS_MOBILE && last && y === S.y && Math.abs(S.vel) < 0.05 && ms - last < 40) return;
    const dt = last ? Math.min(64, ms - last) : 16;
    last = ms;
    // loader: the progress comes in uneven steps (wheel bursts, trackpad inertia, the idle cruise), so the raw per-frame delta pulses; the camera FOV, the words' stretch and the figure's dive all read it,
    // which is what made the planet 'breathe' and the scene shimmer while falling. A slow ease keeps the speed feel without the pulsing.
    S.vel = lerp(S.vel, y - S.y, LOADER ? 0.035 : 0.3);
    S.y = y;
    S.t = ms / 1000;
    // far above or below this block: nothing here is on screen, so nothing is updated
    if (!LOADER && (y + S.H * 1.5 < rootBox.top || y > rootBox.top + rootBox.h + S.H * 0.5)) { Sound.quiet(); return; }
    if (!fine) {
      // touch has no pointer to follow: tablets get a slow sway, phones none (it re-composited every 3D layer on every frame for no gain)
      if (IS_MOBILE) { S.mx = 0; S.my = 0; } else { S.mx = Math.sin(S.t * 0.4) * 0.35; S.my = Math.cos(S.t * 0.3) * 0.25; }
    }
    S.smx = lerp(S.smx, S.mx, 0.06);
    S.smy = lerp(S.smy, S.my, 0.06);

    if (!PAGE) updateStory();
    if (LOADER) { Sound.update(); return; }
    updateWork();
    updateAbout();
    updateMarquee(dt);
    updateServices();
    updatePortal();
    Sound.update();
  }
  // after lib/smooth.js's ticker (it was added first), so Lenis has already moved the page this frame
  const tickFn = (time) => step(time * 1000);
  // loader mode: ONE clock. The loader writes the progress in its own requestAnimationFrame; if this engine also redrew on gsap's ticker, a frame could
  // draw before the new progress, twice, or not at all (the scene lags the readout, S.vel jumps, words/figure/camera shimmer). So the loader calls
  // destroy.render(now) right after setProgress and the ticker is not used at all.
  if (!LOADER) gsap.ticker.add(tickFn);

  const destroy = function destroy() {
    if (!LOADER) gsap.ticker.remove(tickFn);
    ScrollTrigger.removeEventListener('refresh', remeasure);
    for (const [t, ev, fn, o] of offs) t.removeEventListener(ev, fn, o);
    ioEnter.disconnect(); ioLoad.disconnect(); if (ioMarq) ioMarq.disconnect();
    clearTimeout(idleT); clearTimeout(copyT); clearTimeout(measure.t); clearTimeout(S.campusT);
    fall.dead = true; portal.dead = true; fall.free(); portal.free();
    if (earth) earth.destroy();
    if (Sound.ctx) Sound.ctx.close().catch(() => {});
  };
  destroy.setProgress = (v) => { S.vp = v; };
  destroy.render = (ms) => step(ms);                                     // loader: draw exactly one frame for the progress just set (see above)
  destroy.preload = () => startLoad();                                   // loader: start fetching the film frames early (the ending needs them)
  // loader: the map data of the campus is fetched early (it used to start only when the fall reached the campus, so on a phone connection the ground was a dark void
  // for seconds, then the parse froze the page). Idle time, spaced after the planet's textures have been asked for.
  // destroy.settle() is called once the intro (the name) has played: only then the planet's uploads, the campus parse and the film frames start
  destroy.settle = () => {
    if (earth && earth.release) earth.release();
    const kick = () => { try { campus.load(); } catch (e) { /* ignore */ } };
    S.campusT = setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(kick, { timeout: 1500 }) : kick()), 400);
    startLoad();
  };
  // how far the fall may go right now: it waits (briefly, the loader never traps anybody) for the planet and the campus to be ready, instead of showing black
  destroy.limit = () => (earth && !earth.ready && !earth.dead ? 0.03 : !campus.ready() ? 0.29 : 1);
  destroy.filmReady = () => fall.loaded >= fall.gate;                    // loader: the coarse set of frames has arrived, so the film can be scrubbed
  return destroy;
}

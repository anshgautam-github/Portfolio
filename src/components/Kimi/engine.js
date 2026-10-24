/* =====================================================================
   Kimi Antonelli — the engine behind <KimiAntonelli />
   Vanilla motion engine (springs, shared ticker, scroll triggers, text reveals), the WebGL hero,
   the season circuit, timeline, paddock and footer. mountKimi(root) wires it to the server-rendered markup and
   returns a destroy() that removes every listener, observer, timer and GL resource it created.
   three.js is loaded from the CDN through the import map in index.html.
   ===================================================================== */
export function mountKimi(root) {
  let dead = false;
  const cleanups = [];
  const __timers = new Set();
  const __obs = [];

  /* tracked versions of the globals the engine touches, so destroy() can undo everything */
  const track = (target) => new Proxy(target, {
    get(t, p) {
      if (p === "addEventListener") return (type, fn, opt) => { t.addEventListener(type, fn, opt); cleanups.push(() => t.removeEventListener(type, fn, opt)); };
      const v = Reflect.get(t, p);
      return typeof v === "function" ? v.bind(t) : v;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  const window = track(globalThis.window);
  const document = track(globalThis.document);
  const IntersectionObserver = class extends globalThis.IntersectionObserver { constructor(...a) { super(...a); __obs.push(this); } };
  const ResizeObserver = class extends globalThis.ResizeObserver { constructor(...a) { super(...a); __obs.push(this); } };
  const setTimeout = (fn, ms, ...a) => { const id = globalThis.setTimeout(() => { __timers.delete(id); fn(...a); }, ms); __timers.add(id); return id; };
  const clearTimeout = (id) => { __timers.delete(id); globalThis.clearTimeout(id); };

  if (!document.querySelector("link[data-kimi-fonts]")) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700;800&display=swap";
    l.setAttribute("data-kimi-fonts", "");
    document.head.appendChild(l);
  }

  (async () => {
/* =====================================================================
   Kimi Antonelli — single-file driver site
   three.js + Lenis are the only external code; everything else is here.
   ===================================================================== */

const ASSET_BASE_URL = "https://storage.getlayers.ai/assets/kimi-04a9449ab2";
const A = (p) => `${ASSET_BASE_URL}/${p}`;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mq = (q) => window.matchMedia(q).matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const $ = (s, r = root) => r.querySelector(s);
const $$ = (s, r = root) => Array.from(r.querySelectorAll(s));
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ---------- a failed load must be visible ---------- */
let banner = null;
function fail(url) {
  console.error("Asset failed to load:", url);
  if (!banner) {
    banner = document.createElement("div");
    banner.setAttribute("role", "alert");
    banner.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:100;background:#ff6b00;color:#090a0b;padding:.75rem 1rem;font:500 13px/1.35 'Inter Tight',system-ui,sans-serif;max-height:30vh;overflow:auto";
    document.body.appendChild(banner);
    cleanups.push(() => { banner && banner.remove(); banner = null; });
  }
  const line = document.createElement("div");
  line.textContent = "Failed to load: " + url;
  banner.appendChild(line);
}
window.__fail = fail;
const guard = (url, promise) => promise.catch((e) => { fail(url); throw e; });

/* ---------- libraries: three.js comes from the CDN through the import map in index.html ---------- */
let T = {};
let DRACOLoader = null, GLTFLoader = null, mergeGeometries = null, HdrLoader = null;
const bare = (name) => import(/* @vite-ignore */ name);
try { T = await bare("three"); } catch (e) { fail("three (cdn.jsdelivr.net)"); }
if (T.WebGLRenderer) {
  try {
    DRACOLoader = (await bare("three/addons/loaders/DRACOLoader.js")).DRACOLoader;
    GLTFLoader = (await bare("three/addons/loaders/GLTFLoader.js")).GLTFLoader;
    mergeGeometries = (await bare("three/addons/utils/BufferGeometryUtils.js")).mergeGeometries;
    try { HdrLoader = (await bare("three/addons/loaders/RGBELoader.js")).RGBELoader; } catch (e) {}
    if (!HdrLoader) HdrLoader = (await bare("three/addons/loaders/HDRLoader.js")).HDRLoader;
  } catch (e) { fail("three/addons (cdn.jsdelivr.net)"); }
}
if (dead) return;
const {
  ACESFilmicToneMapping, Box3, BufferGeometry, Color, FrontSide, Group, LinearMipmapLinearFilter,
  Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  RepeatWrapping, Scene, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3,
  WebGLRenderer,
} = T;

/* ---------- root font-size above 1920 ---------- */
const setRoot = () => {
  if (window.innerWidth > 1920) root.style.setProperty("--rem", (16 * window.innerWidth) / 1920 + "px");
  else root.style.removeProperty("--rem");
};
setRoot();
window.addEventListener("resize", setRoot);

/* ---------- asset hydration ---------- */
/* the no-WebGL fallback images are only fetched if the fallback is actually used: loading the portrait through a plain <img>
   would cache a copy without CORS headers, which then blocks the WebGL texture request for the same URL */
const loadImg = (img, cors) => {
  img.addEventListener("error", () => fail(img.src));
  if (cors) img.crossOrigin = "anonymous";
  img.src = A(img.dataset.src);
  img.removeAttribute("data-src");
};
$$("img[data-src]").forEach((img) => { if (!img.closest(".hero-fallback")) loadImg(img, false); });

/* =====================================================================
   The motion engine
   ===================================================================== */

/* ---- one reference-counted rAF loop ---- */
const subs = new Set();
let rafId = 0;
const loop = (time) => {
  rafId = requestAnimationFrame(loop);
  for (const s of Array.from(subs)) {
    if (!subs.has(s)) continue;
    if (time - s.last > s.fr()) {
      s.last = time;
      s.cb(time);
    }
  }
};
cleanups.push(() => { cancelAnimationFrame(rafId); subs.clear(); live.clear(); });
function subscribe(cb, getFramerate = () => 0) {
  const s = { cb, fr: getFramerate, last: -Infinity };
  subs.add(s);
  if (subs.size === 1) rafId = requestAnimationFrame(loop);
  return () => {
    subs.delete(s);
    if (subs.size === 0) cancelAnimationFrame(rafId);
  };
}

/* the site owns the smooth scroller (src/lib/smooth.js); we only pause it while the menu sheet is open */
const lenisRef = () => window.__lenis || null;

/* ---- spring configs ---- */
const CFG = {
  REVEAL: { tension: 90, friction: 26 }, ITEM: { tension: 170, friction: 24 }, ROW: { tension: 170, friction: 24 },
  SHEET: { tension: 190, friction: 26 }, FIGURE: { tension: 200, friction: 24 }, TYPE: { tension: 210, friction: 24 },
  YEAR: { tension: 190, friction: 24 }, COPY: { tension: 110, friction: 26 }, COPY2: { tension: 150, friction: 24 },
  NAME: { tension: 190, friction: 24 }, VEIL: { tension: 70, friction: 24 }, CLEAR: { tension: 140, friction: 26 },
  LABEL: { tension: 110, friction: 26 }, PROGRESS_WAIT: { tension: 10, friction: 30 }, PROGRESS_READY: { tension: 170, friction: 26 },
  YEAR_SETTLE: { tension: 32, friction: 26 }, TRIGGER: { tension: 140, friction: 30 }, SMOOTH: { tension: 120, friction: 26 },
};

/* ---- react-spring's damped spring: 1ms substeps, 64ms frame cap, mass 1 ---- */
const live = new Set();
let liveUnsub = null;
const liveTick = (time) => {
  for (const sp of Array.from(live)) sp.step(time);
  if (live.size === 0 && liveUnsub) { liveUnsub(); liveUnsub = null; }
};
function Spring(cfg, apply, init = 0, eps = 0.001) {
  let value = init, velocity = 0, target = init, last = null, timer = 0, t0 = 0, from = init;
  const api = {
    get value() { return value; },
    get target() { return target; },
    step(time) {
      if (last === null) { last = time; t0 = time; from = value; return; }
      const dt = Math.min(64, Math.max(0, time - last));
      last = time;
      if (cfg.duration) {
        const u = Math.min(1, (time - t0) / cfg.duration);
        value = from + (target - from) * (cfg.easing ? cfg.easing(u) : u);
        apply(value);
        if (u >= 1) { live.delete(api); last = null; }
        return;
      }
      const n = Math.ceil(dt);
      for (let i = 0; i < n; i++) {
        const f = -cfg.tension * (value - target) - cfg.friction * velocity;
        velocity += f * 0.001;
        value += velocity * 0.001;
      }
      if (Math.abs(velocity) < 0.01 && Math.abs(target - value) < eps) {
        value = target; velocity = 0; apply(value);
        live.delete(api); last = null;
        return;
      }
      apply(value);
    },
    to(v, delay = 0) {
      clearTimeout(timer);
      const run = () => {
        if (v === target && !live.has(api) && v === value) return;
        target = v;
        if (cfg.duration || !live.has(api)) last = null;
        live.add(api);
        if (!liveUnsub) liveUnsub = subscribe(liveTick, () => 0);
      };
      if (delay > 0) timer = setTimeout(run, delay); else run();
    },
    set(v) { clearTimeout(timer); live.delete(api); value = target = v; velocity = 0; last = null; apply(v); },
  };
  apply(init);
  return api;
}

/* ---- in-view gates ---- */
function gate(el, { rootMargin = "0px", once = false, forward = false, threshold = 0 } = {}, cb) {
  let on = false;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        if (!on) { on = true; cb(true); if (once) io.disconnect(); }
      } else if (on) {
        if (forward && el.getBoundingClientRect().top <= 0) continue;
        on = false; cb(false);
      }
    }
  }, { rootMargin, threshold });
  io.observe(el);
  return io;
}

/* ---- "loop in view": in view plus ten frames after it leaves ---- */
function inViewLoop(el, fn, framerate = () => 0, opts = {}) {
  let inView = false, grace = 0, wasIn = false;
  const io = new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; if (!inView) grace = 10; }, opts);
  io.observe(el);
  return subscribe((t) => {
    if (inView) { wasIn = true; fn(t); }
    else if (grace > 0) { grace--; fn(t); }
  }, framerate);
}

/* ---- scroll triggers ---- */
function posesOf(bb, vh) {
  return {
    top_top: bb.top, center_top: bb.top + bb.height / 2, bottom_top: bb.bottom,
    top_bottom: bb.top - vh, center_bottom: bb.top + bb.height / 2 - vh, bottom_bottom: bb.bottom - vh,
    top_center: bb.top - vh / 2, center_center: bb.top + bb.height / 2 - vh / 2, bottom_center: bb.bottom - vh / 2,
  };
}
function scrubProgress(el, start, end) {
  const bb = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const poses = posesOf(bb, vh);
  const scrollStart = poses[start.replace(" ", "_")], scrollEnd = poses[end.replace(" ", "_")];
  const length = Math.abs(scrollStart - scrollEnd) || 1;
  return Math.min(Math.max(0, 1 - (scrollStart + length) / length), 1);
}
/* cb(progress 0..1) — computed in the ticker, only while in view (+10 frames) */
function trigger(el, { start, end }, cb) {
  const compute = () => cb(scrubProgress(el, start, end));
  compute();
  const unsub = inViewLoop(el, compute, () => 10);
  return { compute, unsub };
}
const lerp = (a, b, t) => a + (b - a) * t;

/* ---- text engine ---- */
const EMPH = /^(curiosity|complex|problems|ideas|engineering|better|build|building|mentoring|research|experimentation|language|model)[.,]?$/i;
function revealText(host, text, o = {}) {
  const unit = o.unit || "word";
  const cfg = o.cfg || CFG.REVEAL;
  const stagger = o.stagger ?? 110;
  const delayIn = o.delayIn ?? 0;
  const y = unit === "word" ? 0.35 : 0.3;
  host.textContent = "";
  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  const wrap = document.createElement("span");
  wrap.className = "k-rv";
  wrap.setAttribute("aria-hidden", "true");
  if (o.gap != null) wrap.style.columnGap = o.gap + "em";
  if (o.nowrap) wrap.style.flexWrap = "nowrap";
  if (o.justify) wrap.style.justifyContent = o.justify;
  const units = [];
  text.split(/(\n)|[^\S\n]+/).filter(Boolean).forEach((word) => {
    if (word === "\n") {   /* explicit line break (word mode): a zero-height full-width flex item */
      if (unit === "word") { const br = document.createElement("span"); br.setAttribute("aria-hidden", "true"); br.style.cssText = "flex-basis:100%;height:.9em"; wrap.appendChild(br); }
      return;
    }
    if (unit === "word") {
      const u = document.createElement("span");
      u.className = "u"; u.textContent = word; u.style.opacity = "0";
      if (EMPH.test(word)) u.classList.add("em");
      wrap.appendChild(u); units.push(u);
    } else {
      const w = document.createElement("span");
      w.className = "w";
      for (const ch of word) {
        const u = document.createElement("span");
        u.className = "u"; u.textContent = ch; u.style.opacity = "0";
        w.appendChild(u); units.push(u);
      }
      wrap.appendChild(w);
    }
  });
  host.append(sr, wrap);
  const springs = units.map((u) => Spring(cfg, (v) => {
    u.style.opacity = String(clamp01(v));
    u.style.transform = `translateY(${((1 - v) * y).toFixed(4)}em)`;
  }));
  let started = false;
  return {
    el: host,
    play(extra = 0) { springs.forEach((s, i) => s.to(1, extra + delayIn + i * stagger)); started = true; },
    reset() { springs.forEach((s) => s.to(0, 0)); started = false; },
    get started() { return started; },
  };
}

/* ---- block rise ---- */
function rise(el, o = {}) {
  const kind = o.kind || "y";
  const cfg = o.cfg || CFG.REVEAL;
  const sp = Spring(cfg, (v) => {
    el.style.opacity = String(clamp01(v));
    if (kind === "y") el.style.transform = `translateY(calc(${o.y || "0.75rem"} * ${(1 - v).toFixed(4)}))`;
    else if (kind === "scaleX") el.style.transform = `scaleX(${Math.max(0, v).toFixed(4)})`;
  });
  return { el, play(extra = 0) { sp.to(1, extra + (o.delay || 0)); }, reset() { sp.to(0, 0); } };
}

/* ---- entrance (the veil's handover) ---- */
let handedOver = false;
const handoverCbs = [];
const onHandover = (fn) => { if (handedOver) fn(); else handoverCbs.push(fn); };
const doHandover = () => { if (handedOver) return; handedOver = true; handoverCbs.splice(0).forEach((f) => f()); };

/* ---- wire up declarative data-* reveals ---- */
const plateCtls = [];
function wire(ctl, el, spec) {
  // spec: when ('hero'|'view'|'plate'), at, delay, margin, forward
  if (spec.when === "hero") {
    onHandover(() => ctl.play(spec.at || 0));
  } else if (spec.when === "plate") {
    plateCtls.push(ctl);
  } else {
    const delay = spec.delay || 0;
    gate(el, { rootMargin: spec.margin || "0px", forward: spec.forward !== false }, (on) => (on ? ctl.play(delay) : ctl.reset()));
  }
}
$$("[data-rise]").forEach((el) => {
  const v = el.dataset.rise;
  const cfg = CFG[el.dataset.cfg] || CFG.REVEAL;
  let ctl;
  if (v === "fade") ctl = rise(el, { kind: "fade", cfg });
  else if (v === "scaleX") ctl = rise(el, { kind: "scaleX", cfg });
  else ctl = rise(el, { y: v, cfg });
  wire(ctl, el, { when: el.dataset.when, at: +(el.dataset.at || 0), delay: +(el.dataset.delay || 0) });
});
$$("[data-rv]").forEach((el) => {
  const ctl = revealText(el, el.textContent.trim(), {
    unit: el.dataset.rv, stagger: +el.dataset.stagger, cfg: CFG[el.dataset.cfg] || CFG.REVEAL,
    delayIn: el.dataset.when === "hero" || el.dataset.when === "plate" ? +(el.dataset.delay || 0) : 0,
    gap: el.dataset.gap ? +el.dataset.gap : undefined, nowrap: el.dataset.rv === "letter",
  });
  const spec = { when: el.dataset.when, at: +(el.dataset.at || 0), delay: el.dataset.when === "view" ? +(el.dataset.delay || 0) : 0, forward: true };
  wire(ctl, el, spec);
});
/* ---- headlines: authored lines, word reveals, and a coloured full stop ---- */
function headline(h2, lines, { gateEl = h2, margin = "0px", justify } = {}) {
  h2.setAttribute("aria-label", lines.join(" ") + ".");
  h2.textContent = "";
  const ctls = [];
  lines.forEach((line, i) => {
    const row = document.createElement("span");
    row.className = "hl";
    row.setAttribute("aria-hidden", "true");
    row.style.display = "flex";
    const host = document.createElement("span");
    row.appendChild(host);
    h2.appendChild(row);
    const ctl = revealText(host, line, { unit: "word", stagger: 110, cfg: CFG.REVEAL, delayIn: i * 130, justify: "flex-start" });
    ctls.push(ctl);
    if (i === lines.length - 1) {
      const stop = document.createElement("span");
      stop.className = "stop";
      stop.textContent = ".";
      stop.style.opacity = "0";
      row.appendChild(stop);
      const sp = Spring(CFG.REVEAL, (v) => { stop.style.opacity = String(clamp01(v)); });
      ctls.push({ play(extra = 0) { sp.to(1, extra + i * 130 + 110); }, reset() { sp.to(0, 0); } });
    }
  });
  gate(gateEl, { rootMargin: margin, forward: true }, (on) => ctls.forEach((c) => (on ? c.play(0) : c.reset())));
  return ctls;
}


/* =====================================================================
   The hero scene (three.js) — tier module + scene.ts
   ===================================================================== */
const CAP_60 = 1000 / 60 - 2;
const isEnergySaver = () => {
  const nav = navigator;
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
};
const getSceneTier = () => {
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const width = window.innerWidth;
  const name = width < 768 || (coarse && width < 1024) ? "mobile" : coarse || width < 1280 ? "tablet" : "desktop";
  const mobile = name === "mobile";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saver = isEnergySaver();
  return {
    name, mobile, coarsePointer: coarse, reducedMotion: reduced,
    maxDpr: mobile ? 1 : name === "tablet" ? 1.25 : 1.5,
    frameInterval: name === "desktop" ? 0 : CAP_60,
    pointerEnabled: !coarse && !reduced,
    antialias: name === "desktop",
    trailSamples: mobile ? 28 : name === "tablet" ? 44 : 72,
    outline: !mobile,
    reveal: !mobile,
    freeze: reduced || (mobile && saver),
  };
};

const SCENE_ASSETS = A("hero/scene");
const DRACO_PATH = "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/draco/gltf/";

const readToken = (token) => {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${token})`;
  root.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
};

const HEAD_HEIGHT = 5.4;
const DEG = Math.PI / 180;
const swing = (v, ampDeg, curve) => {
  const amp = ampDeg * DEG;
  if (curve < 1e-3) return amp * v;
  return (amp * Math.tanh(curve * v)) / Math.tanh(curve);
};
const HELMET_WORN_OFFSET = T.Vector3 ? new Vector3(0, -0.56, 0.35) : null;
const HEAD_EXTEND = 0.14;
const STATIC_POSE = { x: 0.3, y: 0.1 };
const CAMERA_FOV = 35;
const CAMERA_Y = 0.1;
const visibleWorldHeight = (cameraZ) => 2 * cameraZ * Math.tan((CAMERA_FOV * Math.PI) / 360);
const fitSubjectToBox = (params, box, canvasHeight) => {
  if (canvasHeight <= 0 || box.height <= 0) return { subjectScale: params.subjectScale, subjectY: params.subjectY };
  const ratio = box.height / canvasHeight;
  const world = visibleWorldHeight(params.cameraZ);
  const centreShift = canvasHeight / 2 - (box.top + box.height / 2);
  return {
    subjectScale: params.subjectScale * ratio,
    subjectY: CAMERA_Y + (params.subjectY - CAMERA_Y) * ratio + (centreShift * world) / canvasHeight,
  };
};
const OUTLINE_MAX_WAVES = 8;
const BACKDROP_Z = -3;
const REFERENCE_ASPECT = 1.778;
const PORT_WIDTH = 1440;
const MIN_FIT = 0.9;
const NARROW_STEP = 0.25;
const STEP_UNDER = 1280;
const AUTO_SWEEP_PATH = [
  { x: -0.85, y: -0.62 },
  { x: 0.78, y: -0.2 },
  { x: -0.7, y: 0.2 },
  { x: 0.82, y: 0.6 },
];

const revealTrailFunction = (name, trail, boundsMin, boundsMax, pace, warp, length, radius, samples) => /* glsl */ `
  float ${name}(vec2 ndc) {
    float gate = smoothstep(uGateStart, uGateStart + uGateWidth, ${pace});
    if (gate <= 0.0) return 0.0;

    vec2 bounded = vec2(ndc.x * uAspect, ndc.y);
    if (any(lessThan(bounded, ${boundsMin})) || any(greaterThan(bounded, ${boundsMax}))) {
      return 0.0;
    }

    vec2 point = bounded;
    if (${warp} > 0.001) {
      vec2 noiseUv = ndc * 0.5 + 0.5;
      float nx = texture2D(uNoiseTex, noiseUv * uWarpScale + vec2(uTime * 0.07, uTime * 0.05)).r;
      float ny = texture2D(uNoiseTex, noiseUv * uWarpScale * 1.4 - vec2(uTime * 0.06, uTime * 0.09)).r;
      point += (vec2(nx, ny) - 0.5) * ${warp} * 0.22;
    }

    float radius = ${radius} * mix(uIdleScale, 1.0, ${pace});
    float taper = uTaper * mix(uTaperIdle, uTaperFast, ${pace});

    float span = max(${length} * float(${samples} - 1), 1.0);
    float ceiling = uThreshold + uEdge;
    float trail = 0.0;
    for (int i = 0; i < ${samples} - 1; i++) {
      if (float(i) >= span) break;
      float weight = pow(1.0 - float(i) / span, taper);
      if (weight <= trail) break;

      vec2 a = vec2(${trail}[i].x * uAspect, ${trail}[i].y);
      vec2 b = vec2(${trail}[i + 1].x * uAspect, ${trail}[i + 1].y);
      float r = radius * weight;
      trail = max(trail, weight * smoothstep(r, r * 0.35, revealSegment(point, a, b)));

      if (trail >= ceiling) break;
    }

    return smoothstep(uThreshold - uEdge, uThreshold + uEdge, trail) * gate;
  }
`;

const buildRevealDeclarations = (samples) => /* glsl */ `
  uniform vec2 uTrail[${samples}];
  uniform vec2 uTrailMin;
  uniform vec2 uTrailMax;
  uniform float uPace;
  uniform vec2 uSweep[${samples}];
  uniform vec2 uSweepMin;
  uniform vec2 uSweepMax;
  uniform float uSweepPace;
  uniform float uSweepWarp;
  uniform float uSweepLength;
  uniform float uSweepRadius;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uIdleScale;
  uniform float uTaper;
  uniform float uTaperIdle;
  uniform float uTaperFast;
  uniform float uLength;
  uniform float uGateStart;
  uniform float uGateWidth;
  uniform float uWarpScale;
  uniform float uTime;
  uniform float uEdge;
  uniform float uThreshold;
  uniform float uWarp;
  uniform float uRevealMix;
  uniform sampler2D uNoiseTex;

  float revealSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  ${revealTrailFunction("revealCursorTrail", "uTrail", "uTrailMin", "uTrailMax", "uPace", "uWarp", "uLength", "uRadius", samples)}
  ${revealTrailFunction("revealSweepTrail", "uSweep", "uSweepMin", "uSweepMax", "uSweepPace", "uSweepWarp", "uSweepLength", "uSweepRadius", samples)}

  float revealTrail(vec2 ndc) {
    float cursor = revealCursorTrail(ndc);
    if (cursor >= 1.0) return 1.0;
    return max(cursor, revealSweepTrail(ndc));
  }
`;

const DEFAULT_PARAMS = {
  cameraZ: 6.5,
  subjectScale: 1.15,
  subjectX: 0,
  subjectY: 0.42,
  subjectParallax: 0.02,
  riseDistance: 200,
  riseDuration: 2,
  headScale: 0.8,
  headY: 0.58,
  headParallax: 0.005,
  headRelight: 0.32,
  helmetScale: 0.69,
  helmetX: -0.08,
  helmetY: 0.45,
  helmetZ: 0,
  helmetFollow: 0.01,
  helmetAmpX: 2.5,
  helmetCurveX: 0,
  helmetAmpY: 2.1,
  helmetCurveY: 0,
  helmetBrightness: 1,
  trailRadius: 0.46,
  trailIdleScale: 0.28,
  trailTaper: 1.9,
  trailTaperIdle: 1.6,
  trailTaperFast: 1.25,
  trailLength: 0.64,
  revealThreshold: 0.08,
  revealEdge: 0.005,
  revealWarp: 1.29,
  revealWarpScale: 2.9,
  revealSpeed: 1.25,
  pointerLerp: 0.17,
  pacePeak: 0.029,
  paceAttack: 0.09,
  paceRelease: 0.205,
  paceThreshold: 0.06,
  paceRamp: 0.15,
  outlinePeriod: 3.1,
  sweepWarp: 0.86,
  sweepLength: 0.67,
  sweepRadius: 0.33,
  outlineStagger: 1.2,
  outlineOpacity: 0.09,
  outlineWidth: 0.15,
  outlineBase: 0,
  outlineLightness: 0.64,
  bgLineScale: 3.8,
  bgLineCount: 2.5,
  bgLineThickness: 1.4,
  bgLineOpacity: 0.85,
  bgWaveAmount: 0.37,
  bgWaveSpeed: 1.66,
  bgRevealLightness: 0.62,
  bgRevealLightnessAlt: 0.44,
  bgRevealOpacity: 1,
  introDuration: 4,
  burnStart: 0.14,
  burnSoftness: 0.02,
  burnGlow: 4,
  autoSweepAmount: 0,
  autoSweepPeriod: 5,
  autoSweepStroke: 0.45,
  autoSweepHold: 0,
};

const outlineVertex = /* glsl */ `
  varying float vHeight;
  uniform float uMinY;
  uniform float uRangeY;
  void main() {
    vHeight = (position.y - uMinY) / max(uRangeY, 0.0001);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const outlineFragment = /* glsl */ `
  varying float vHeight;
  uniform float uTime;
  uniform float uPeriod;
  uniform float uStagger;
  uniform float uOpacity;
  uniform float uBase;
  uniform float uWidth;
  uniform float uLightness;
  uniform float uRevealMix;
  uniform vec3 uColor;

  void main() {
    float width = max(uWidth, 0.0001);
    float period = max(uPeriod, 0.0001);
    float stagger = max(uStagger, 0.0001);

    float start = 1.0 + width * 3.0;
    float travel = 1.0 + width * 6.0;

    float wave = 0.0;
    for (int i = 0; i < ${OUTLINE_MAX_WAVES}; i++) {
      float age = mod(uTime, stagger) + float(i) * stagger;
      if (age > period) break;
      float centre = start - (age / period) * travel;
      float d = (vHeight - centre) / width;
      wave = max(wave, exp(-d * d));
    }

    vec3 stroke = mix(uColor, vec3(1.0), uLightness);
    gl_FragColor = vec4(stroke, (uBase + wave * uOpacity) * uRevealMix);
  }
`;

const backdropVertex = /* glsl */ `
  varying vec4 vBackdropClip;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vBackdropClip = clip;
    gl_Position = clip;
  }
`;

const buildBackdropFragment = (samples) => /* glsl */ `
  varying vec4 vBackdropClip;
  uniform vec3 uBackground;
  uniform vec3 uLineColor;
  uniform vec3 uRevealColor;
  uniform vec3 uRevealColorAlt;
  uniform float uLineScale;
  uniform float uLineCount;
  uniform float uLineThickness;
  uniform float uLineOpacity;
  uniform float uWaveAmount;
  uniform float uWaveSpeed;
  uniform float uRevealOpacity;
  ${buildRevealDeclarations(samples)}

  float backdropField(vec2 p, float t) {
    float f = sin(p.x * 1.00 + t * 0.60) * 0.50;
    f += sin(p.y * 0.85 - t * 0.45) * 0.45;
    f += sin((p.x + p.y) * 0.65 + t * 0.35) * 0.35;
    f += sin((p.x - p.y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  }

  void main() {
    vec2 ndc = vBackdropClip.xy / vBackdropClip.w;
    vec2 p = vec2(ndc.x * uAspect, ndc.y) * uLineScale;

    float t = uTime * uWaveSpeed;
    vec2 q = p;
    q.x += sin(p.y * 0.8 + t * 0.7) * uWaveAmount;
    q.y += cos(p.x * 0.7 - t * 0.6) * uWaveAmount;

    float scaled = backdropField(q, t) * uLineCount;

    float w = max(fwidth(scaled) * uLineThickness, 1e-5);
    float line = 1.0 - smoothstep(0.0, w, abs(fract(scaled) - 0.5));

    vec3 color = mix(uBackground, uLineColor, line * uLineOpacity * uRevealMix);

    float parity = mod(floor(scaled + 0.5), 2.0);
    vec3 revealShade = mix(uRevealColor, uRevealColorAlt, parity);

    if (uRevealOpacity > 0.001) {
      color = mix(
        color,
        revealShade,
        revealTrail(ndc) * uRevealMix * uRevealOpacity
      );
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

const headVertex = /* glsl */ `
  uniform float uExtend;
  varying vec2 vUv;
  void main() {
    vUv = vec2(uv.x, 1.0 - (1.0 - uv.y) * (1.0 + uExtend));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const headFragment = /* glsl */ `
  uniform sampler2D uDiffuse;
  uniform sampler2D uDepth;
  uniform sampler2D uAlpha;
  uniform sampler2D uNormal;
  uniform vec2 uParallax;
  uniform float uReveal;
  uniform float uDepthScale;
  uniform float uRelight;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 offset = uParallax * (depth - 0.5) * uDepthScale;
    vec2 uv = vUv + offset;
    vec4 color = texture2D(uDiffuse, uv);
    float alpha = texture2D(uAlpha, uv).r;

    vec3 normal = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
    vec3 lightDir = normalize(vec3(uParallax * 1.6, 1.0));
    float lambert = max(dot(normal, lightDir), 0.0) - 0.72;
    vec3 lit = color.rgb * (1.0 + lambert * uRelight);

    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), alpha * uReveal);
    #include <colorspace_fragment>
  }
`;

class HeroScene {
  constructor(canvas) {
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    this.headMaterial = null;
    this.headMesh = null;
    this.shellMaterial = null;
    this.helmetTextures = [];
    this.revealUniforms = null;
    this.outlineMaterial = null;
    this.outlineMesh = null;
    this.helmetGroup = new Group();
    this.helmetPivot = new Group();
    this.subjectGroup = new Group();
    this.backdropMesh = null;
    this.backdropMaterial = null;
    this.params = { ...DEFAULT_PARAMS };
    this.pointer = { x: 0, y: 0 };
    this.smoothed = { x: 0, y: 0 };
    this.lastSmoothed = { x: 0, y: 0 };
    this.pointerSeen = false;
    this.tilt = 0;
    this.yaw = 0;
    this.pace = 0;
    this.readyAt = null;
    this.intro = 0;
    this.viewportHeight = 1;
    this.viewportWidth = 1;
    this.riseStarted = false;
    this.riseAt = null;
    this.sweepPointer = { x: AUTO_SWEEP_PATH[0].x, y: AUTO_SWEEP_PATH[0].y };
    this.sweepSmoothed = { ...this.sweepPointer };
    this.sweepLast = { ...this.sweepPointer };
    this.sweepPace = 0;
    this.sweepCycle = 0;
    this.aspect = 1;
    this.reveal = 0;
    this.settled = false;
    this.disposed = false;
    this.startTime = null;
    this.ready = false;
    this.onReady = null;
    this.onError = null;

    this._tier = getSceneTier();
    this.samples = this._tier.trailSamples;
    this.trail = Array.from({ length: this.samples }, () => new Vector2(STATIC_POSE.x, -STATIC_POSE.y));
    this.sweepTrail = Array.from({ length: this.samples }, () => new Vector2(AUTO_SWEEP_PATH[0].x, -AUTO_SWEEP_PATH[0].y));
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: false,
      antialias: this._tier.antialias,
      stencil: false,
      powerPreference: this._tier.mobile ? "default" : "high-performance",
    });
    this.renderer.setClearColor(new Color(getComputedStyle(root).backgroundColor));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._tier.maxDpr));
    this.renderer.toneMapping = ACESFilmicToneMapping;

    if (!this._tier.pointerEnabled) this.parkPointer();

    this.camera.position.set(0, CAMERA_Y, 6.5);
    this.helmetGroup.add(this.helmetPivot);
    this.subjectGroup.add(this.helmetGroup);
    this.scene.add(this.subjectGroup);

    this.load().catch((e) => { console.error(e); this.onError?.(e); });
  }

  get tier() { return this._tier; }

  retune() {
    const fresh = getSceneTier();
    const previous = this._tier;
    const tier = { ...fresh, antialias: previous.antialias, trailSamples: previous.trailSamples };
    this._tier = tier;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.maxDpr));
    if (this.outlineMesh) this.outlineMesh.visible = tier.outline;
    if (!tier.pointerEnabled) this.parkPointer();
    else if (!previous.pointerEnabled) this.pointerSeen = false;
    if (!tier.freeze) this.settled = false;
    return tier;
  }

  parkPointer() {
    this.pointer = { ...STATIC_POSE };
    this.smoothed = { ...STATIC_POSE };
    this.lastSmoothed = { ...STATIC_POSE };
    this.tilt = this.pitchFor(STATIC_POSE.y);
    this.yaw = this.yawFor(STATIC_POSE.x);
    this.pointerSeen = false;
  }

  beginRise() { this.riseStarted = true; }

  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (!this.pointerSeen) {
      this.pointerSeen = true;
      this.smoothed.x = x;
      this.smoothed.y = y;
      this.lastSmoothed.x = x;
      this.lastSmoothed.y = y;
      this.tilt = this.pitchFor(y);
      this.yaw = this.yawFor(x);
    }
  }

  pitchFor(y) { return swing(y, this.params.helmetAmpX, this.params.helmetCurveX); }
  yawFor(x) { return swing(x, this.params.helmetAmpY, this.params.helmetCurveY); }

  setParams(partial) {
    Object.assign(this.params, partial);
    this.settled = false;
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.viewportHeight = Math.max(height, 1);
    this.viewportWidth = Math.max(width, 1);
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    if (this.revealUniforms) this.revealUniforms.uAspect.value = this.aspect;
  }

  update(time) {
    if (this.disposed || this.settled) return;
    if (this.startTime === null) this.startTime = time;
    const t = (time - this.startTime) / 1000;
    const p = this.params;

    if (this._tier.freeze && this.reveal > 0.995 && this.intro >= 1) this.settled = true;

    const autoEnabled = p.autoSweepAmount > 0 && !this._tier.freeze && this.intro >= 1;
    if (autoEnabled) {
      const cycle = t % Math.max(p.autoSweepPeriod, 0.001);
      if (cycle < this.sweepCycle) this.resetSweep();
      this.sweepCycle = cycle;

      const legs = AUTO_SWEEP_PATH.length - 1;
      const stroke = Math.max(p.autoSweepStroke, 0.05);
      const slot = stroke + Math.max(p.autoSweepHold, 0);
      const leg = Math.floor(cycle / slot);

      if (leg < legs) {
        const local = Math.min(1, (cycle - leg * slot) / stroke);
        const eased = 1 - (1 - local) * (1 - local);
        const from = AUTO_SWEEP_PATH[leg];
        const to = AUTO_SWEEP_PATH[leg + 1];
        this.sweepPointer.x = (from.x + (to.x - from.x) * eased) * p.autoSweepAmount;
        this.sweepPointer.y = (from.y + (to.y - from.y) * eased) * p.autoSweepAmount;
      }
    }

    this.sweepSmoothed.x += (this.sweepPointer.x - this.sweepSmoothed.x) * p.pointerLerp;
    this.sweepSmoothed.y += (this.sweepPointer.y - this.sweepSmoothed.y) * p.pointerLerp;

    const sweepStep = Math.hypot(this.sweepSmoothed.x - this.sweepLast.x, this.sweepSmoothed.y - this.sweepLast.y);
    const sweepTarget = autoEnabled ? Math.min(1, sweepStep / Math.max(p.pacePeak, 1e-5)) : 0;
    this.sweepPace += (sweepTarget - this.sweepPace) * (sweepTarget > this.sweepPace ? p.paceAttack : p.paceRelease);
    this.sweepLast.x = this.sweepSmoothed.x;
    this.sweepLast.y = this.sweepSmoothed.y;

    const oldestSweep = this.sweepTrail.pop();
    if (oldestSweep) {
      oldestSweep.set(this.sweepSmoothed.x, -this.sweepSmoothed.y);
      this.sweepTrail.unshift(oldestSweep);
    }

    this.smoothed.x += (this.pointer.x - this.smoothed.x) * p.pointerLerp;
    this.smoothed.y += (this.pointer.y - this.smoothed.y) * p.pointerLerp;

    if (this.ready) {
      if (this.readyAt === null) this.readyAt = t;
      this.intro = Math.min(1, (t - this.readyAt) / Math.max(p.introDuration, 0.001));
      if (this._tier.freeze) this.intro = 1;
    }

    this.camera.position.z = p.cameraZ;

    this.subjectGroup.scale.setScalar(p.subjectScale * this.narrowFit());
    this.subjectGroup.position.x =
      p.subjectX +
      (this.viewportWidth < STEP_UNDER && this.aspect >= 1.2 ? NARROW_STEP : 0) +
      this.smoothed.x * p.subjectParallax;
    this.subjectGroup.position.y = p.subjectY - this.smoothed.y * p.subjectParallax - this.riseOffset(t, p);

    if (this.headMaterial) {
      this.headMaterial.uniforms.uParallax.value.set(this.smoothed.x, -this.smoothed.y);
      this.headMaterial.uniforms.uReveal.value = this.reveal;
      this.headMaterial.uniforms.uDepthScale.value = p.headParallax;
      this.headMaterial.uniforms.uRelight.value = p.headRelight;
    }
    if (this.headMesh) {
      this.headMesh.scale.setScalar(p.headScale);
      this.headMesh.position.y = -0.55 + p.headY - (HEAD_HEIGHT * HEAD_EXTEND * p.headScale) / 2;
    }

    this.tilt += (this.pitchFor(this.smoothed.y) - this.tilt) * p.pointerLerp;
    this.yaw += (this.yawFor(this.smoothed.x) - this.yaw) * p.pointerLerp;
    this.helmetPivot.rotation.x = this.tilt;
    this.helmetPivot.rotation.y = this.yaw;
    this.helmetGroup.position.x = p.helmetX + this.smoothed.x * p.helmetFollow;
    this.helmetGroup.position.y = p.helmetY - this.smoothed.y * p.helmetFollow * 0.8;
    this.helmetGroup.position.z = p.helmetZ;
    this.helmetGroup.scale.setScalar(p.helmetScale);

    const step = Math.hypot(this.smoothed.x - this.lastSmoothed.x, this.smoothed.y - this.lastSmoothed.y);
    if (this._tier.pointerEnabled) {
      const target = Math.min(1, step / Math.max(p.pacePeak, 1e-5));
      this.pace += (target - this.pace) * (target > this.pace ? p.paceAttack : p.paceRelease);
    } else if (!autoEnabled && this.intro >= 1 && this._tier.reveal) {
      this.pace = 1;
    }
    this.lastSmoothed.x = this.smoothed.x;
    this.lastSmoothed.y = this.smoothed.y;

    const oldest = this.trail.pop();
    if (oldest) {
      oldest.set(this.smoothed.x, -this.smoothed.y);
      this.trail.unshift(oldest);
    }

    if (this.revealUniforms) {
      const u = this.revealUniforms;
      u.uAspect.value = this.aspect;
      u.uRadius.value = p.trailRadius;
      u.uIdleScale.value = p.trailIdleScale;
      u.uTaper.value = p.trailTaper;
      u.uTaperIdle.value = p.trailTaperIdle;
      u.uTaperFast.value = p.trailTaperFast;
      u.uLength.value = p.trailLength;
      u.uPace.value = this.pace;
      u.uGateStart.value = p.paceThreshold;
      u.uGateWidth.value = p.paceRamp;
      u.uWarpScale.value = p.revealWarpScale;
      u.uTime.value = t * p.revealSpeed;
      u.uRevealMix.value = this.reveal;
      u.uThreshold.value = p.revealThreshold;
      u.uEdge.value = p.revealEdge;
      u.uWarp.value = p.revealWarp;
      u.uIntro.value = this.intro;
      u.uBurnStart.value = p.burnStart;
      u.uBurnSoft.value = p.burnSoftness;
      u.uBurnGlow.value = p.burnGlow;
      u.uSweepPace.value = this.sweepPace;
      u.uSweepWarp.value = p.sweepWarp;
      u.uSweepLength.value = p.sweepLength;
      u.uSweepRadius.value = p.sweepRadius;
      this.writeTrailBounds(this.trail, p.trailLength, p.revealWarp, p.trailRadius, u.uTrailMin.value, u.uTrailMax.value);
      this.writeTrailBounds(this.sweepTrail, p.sweepLength, p.sweepWarp, p.sweepRadius, u.uSweepMin.value, u.uSweepMax.value);
    }

    if (this.backdropMesh && this.backdropMaterial) {
      const distance = this.camera.position.z - BACKDROP_Z;
      const height = 2 * distance * Math.tan((this.camera.fov * Math.PI) / 360) * 1.06;
      this.backdropMesh.scale.set(height * this.aspect, height, 1);
      const bg = this.backdropMaterial.uniforms;
      bg.uLineScale.value = p.bgLineScale;
      bg.uLineCount.value = p.bgLineCount;
      bg.uLineThickness.value = p.bgLineThickness;
      bg.uLineOpacity.value = p.bgLineOpacity;
      bg.uWaveAmount.value = p.bgWaveAmount;
      bg.uWaveSpeed.value = p.bgWaveSpeed;
      bg.uRevealOpacity.value = p.bgRevealOpacity;
      bg.uRevealColor.value.setScalar(p.bgRevealLightness);
      bg.uRevealColorAlt.value.setScalar(p.bgRevealLightnessAlt);
    }

    if (this.outlineMaterial) {
      const o = this.outlineMaterial.uniforms;
      o.uTime.value = t;
      o.uPeriod.value = p.outlinePeriod;
      o.uStagger.value = p.outlineStagger;
      o.uOpacity.value = p.outlineOpacity;
      o.uWidth.value = p.outlineWidth;
      o.uLightness.value = p.outlineLightness;
      o.uBase.value = p.outlineBase;
      o.uRevealMix.value = this.reveal * this.burnProgress(p);
    }

    this.shellMaterial?.color.setScalar(p.helmetBrightness);
    this.renderer.render(this.scene, this.camera);
  }

  riseOffset(t, p) {
    if (this._tier.freeze || p.riseDistance === 0) return 0;
    let remaining = 1;
    if (this.riseStarted) {
      if (this.riseAt === null) this.riseAt = t;
      const u = Math.min(1, (t - this.riseAt) / Math.max(p.riseDuration, 0.001));
      remaining = 1 - (1 - (1 - u) * (1 - u));
    }
    if (remaining <= 0) return 0;
    const visible = 2 * p.cameraZ * Math.tan((this.camera.fov * Math.PI) / 360);
    return remaining * p.riseDistance * (visible / this.viewportHeight);
  }

  burnProgress(p) {
    const span = Math.max(1 - p.burnStart, 1e-4);
    const x = Math.min(1, Math.max(0, (this.intro - p.burnStart) / span));
    return x * x * (3 - 2 * x);
  }

  resetSweep() {
    const start = AUTO_SWEEP_PATH[0];
    const amount = this.params.autoSweepAmount;
    const x = start.x * amount;
    const y = start.y * amount;
    this.sweepPointer.x = x; this.sweepPointer.y = y;
    this.sweepSmoothed.x = x; this.sweepSmoothed.y = y;
    this.sweepLast.x = x; this.sweepLast.y = y;
    this.sweepPace = 0;
    for (const sample of this.sweepTrail) sample.set(x, -y);
  }

  narrowFit() {
    if (this.viewportWidth >= PORT_WIDTH) return 1;
    if (this.aspect < 1.2) return 1;
    return Math.max(MIN_FIT, Math.min(1, this.aspect / REFERENCE_ASPECT));
  }

  writeTrailBounds(trail, length, warp, radius, min, max) {
    const active = Math.min(trail.length, Math.ceil(length * (this.samples - 1)) + 1);
    const margin = radius + warp * 0.22 + 0.05;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < active; i++) {
      const sample = trail[i];
      const x = sample.x * this.aspect;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (sample.y < minY) minY = sample.y;
      if (sample.y > maxY) maxY = sample.y;
    }
    min.set(minX - margin, minY - margin);
    max.set(maxX + margin, maxY + margin);
  }

  dispose() {
    this.disposed = true;
    this.scene.traverse((object) => {
      const mesh = object;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
        material.dispose();
      }
    });
    this.renderer.dispose();
  }

  async load() {
    const textureLoader = new TextureLoader();
    const loadTexture = (file, srgb = false) =>
      guard(`${SCENE_ASSETS}/${file}`, new Promise((resolve, reject) => {
        textureLoader.load(`${SCENE_ASSETS}/${file}`, (texture) => {
          if (srgb) texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.generateMipmaps = true;
          resolve(texture);
        }, undefined, reject);
      }));

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const [env, headMaps, helmetGltf, noise] = await Promise.all([
      guard(`${SCENE_ASSETS}/studio-light.hdr`, new HdrLoader().loadAsync(`${SCENE_ASSETS}/studio-light.hdr`)),
      Promise.all([
        loadTexture("person-diffuse.webp", true),
        loadTexture("person-depth.webp"),
        loadTexture("person-alpha.webp"),
        loadTexture("person-normal.webp"),
      ]),
      guard(`${SCENE_ASSETS}/helmet3.glb`, gltfLoader.loadAsync(`${SCENE_ASSETS}/helmet3.glb`)),
      loadTexture("noise.webp"),
    ]);
    if (this.disposed) return;

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromEquirectangular(env).texture;
    env.dispose();
    pmrem.dispose();

    this.buildHead(headMaps[0], headMaps[1], headMaps[2], headMaps[3]);
    this.buildHelmet(helmetGltf.scene, noise);
    this.buildBackdrop(noise);

    this.reveal = 1;

    for (const texture of [...headMaps, noise, ...this.helmetTextures]) this.renderer.initTexture(texture);
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);

    this.ready = true;
    this.onReady?.();
  }

  buildHead(diffuse, depth, alpha, normal) {
    this.headMaterial = new ShaderMaterial({
      vertexShader: headVertex,
      fragmentShader: headFragment,
      uniforms: {
        uDiffuse: { value: diffuse },
        uDepth: { value: depth },
        uAlpha: { value: alpha },
        uNormal: { value: normal },
        uParallax: { value: new Vector2() },
        uReveal: { value: 0 },
        uDepthScale: { value: DEFAULT_PARAMS.headParallax },
        uRelight: { value: DEFAULT_PARAMS.headRelight },
        uExtend: { value: HEAD_EXTEND },
      },
      transparent: true,
    });
    const geometry = new PlaneGeometry(HEAD_HEIGHT, HEAD_HEIGHT * (1 + HEAD_EXTEND));
    const head = new Mesh(geometry, this.headMaterial);
    head.position.set(0, -0.55, 0);
    this.headMesh = head;
    this.subjectGroup.add(head);
  }

  buildHelmet(root, noise) {
    noise.wrapS = RepeatWrapping;
    noise.wrapT = RepeatWrapping;

    this.revealUniforms = {
      uTrail: { value: this.trail },
      uTrailMin: { value: new Vector2(-1e3, -1e3) },
      uTrailMax: { value: new Vector2(1e3, 1e3) },
      uSweep: { value: this.sweepTrail },
      uSweepMin: { value: new Vector2(-1e3, -1e3) },
      uSweepMax: { value: new Vector2(1e3, 1e3) },
      uSweepPace: { value: 0 },
      uSweepWarp: { value: DEFAULT_PARAMS.sweepWarp },
      uSweepLength: { value: DEFAULT_PARAMS.sweepLength },
      uSweepRadius: { value: DEFAULT_PARAMS.sweepRadius },
      uAspect: { value: this.aspect },
      uRadius: { value: DEFAULT_PARAMS.trailRadius },
      uIdleScale: { value: DEFAULT_PARAMS.trailIdleScale },
      uTaper: { value: DEFAULT_PARAMS.trailTaper },
      uTaperIdle: { value: DEFAULT_PARAMS.trailTaperIdle },
      uTaperFast: { value: DEFAULT_PARAMS.trailTaperFast },
      uLength: { value: DEFAULT_PARAMS.trailLength },
      uPace: { value: 0 },
      uGateStart: { value: DEFAULT_PARAMS.paceThreshold },
      uGateWidth: { value: DEFAULT_PARAMS.paceRamp },
      uWarpScale: { value: DEFAULT_PARAMS.revealWarpScale },
      uTime: { value: 0 },
      uThreshold: { value: DEFAULT_PARAMS.revealThreshold },
      uEdge: { value: DEFAULT_PARAMS.revealEdge },
      uWarp: { value: DEFAULT_PARAMS.revealWarp },
      uRevealMix: { value: 0 },
      uNoiseTex: { value: noise },
      uIntro: { value: 0 },
      uBurnStart: { value: DEFAULT_PARAMS.burnStart },
      uBurnSoft: { value: DEFAULT_PARAMS.burnSoftness },
      uBurnGlow: { value: DEFAULT_PARAMS.burnGlow },
      uBurnColor: { value: new Color(readToken("--accent")) },
    };

    root.traverse((object) => {
      if (!object.isMesh) return;
      const mesh = object;
      const shell = mesh.material;
      shell.side = FrontSide;
      shell.transparent = true;
      shell.depthWrite = false;
      shell.envMapIntensity = 1.3;

      this.injectRevealMask(shell);
      mesh.renderOrder = 1;
      this.shellMaterial = shell;

      for (const map of [shell.map, shell.normalMap, shell.roughnessMap, shell.metalnessMap]) {
        if (map && !this.helmetTextures.includes(map)) this.helmetTextures.push(map);
      }
    });

    const bounds = new Box3().setFromObject(root);
    const size = bounds.getSize(new Vector3());
    const scale = (HEAD_HEIGHT * 0.56) / size.y;
    root.scale.setScalar(scale);
    bounds.setFromObject(root);
    const center = bounds.getCenter(new Vector3());
    root.position.sub(center);
    this.helmetPivot.position.copy(HELMET_WORN_OFFSET);

    this.helmetPivot.add(root);
    this.helmetGroup.updateMatrixWorld(true);
    this.buildOutline(root);
  }

  buildOutline(root) {
    const toGroupLocal = this.helmetPivot.matrixWorld.clone().invert();
    const geometries = [];
    root.traverse((object) => {
      const mesh = object;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(new Matrix4().multiplyMatrices(toGroupLocal, mesh.matrixWorld));
      for (const name of Object.keys(geometry.attributes)) {
        if (name !== "position") geometry.deleteAttribute(name);
      }
      geometries.push(geometry);
    });
    if (!geometries.length) return;

    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) return;

    merged.computeBoundingBox();
    const bounds = merged.boundingBox;
    const minY = bounds?.min.y ?? 0;
    const rangeY = bounds ? bounds.max.y - bounds.min.y : 1;

    this.outlineMaterial = new ShaderMaterial({
      vertexShader: outlineVertex,
      fragmentShader: outlineFragment,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPeriod: { value: DEFAULT_PARAMS.outlinePeriod },
        uStagger: { value: DEFAULT_PARAMS.outlineStagger },
        uOpacity: { value: DEFAULT_PARAMS.outlineOpacity },
        uWidth: { value: DEFAULT_PARAMS.outlineWidth },
        uLightness: { value: DEFAULT_PARAMS.outlineLightness },
        uBase: { value: DEFAULT_PARAMS.outlineBase },
        uRevealMix: { value: 0 },
        uColor: { value: new Color(readToken("--foreground")) },
        uMinY: { value: minY },
        uRangeY: { value: rangeY },
      },
    });

    const outline = new Mesh(merged, this.outlineMaterial);
    outline.renderOrder = 3;
    outline.visible = this._tier.outline;
    this.outlineMesh = outline;
    this.helmetPivot.add(outline);
  }

  injectRevealMask(material) {
    const uniforms = this.revealUniforms;
    if (!uniforms) return;
    const samples = this.samples;

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec4 vRevealClip;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvRevealClip = gl_Position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           varying vec4 vRevealClip;
           uniform float uIntro;
           uniform float uBurnStart;
           uniform float uBurnSoft;
           uniform float uBurnGlow;
           uniform vec3 uBurnColor;
           ${buildRevealDeclarations(samples)}`,
        )
        .replace(
          "#include <alphamap_fragment>",
          `#include <alphamap_fragment>
           vec2 revealNdc = vRevealClip.xy / vRevealClip.w;

           float burnFront = smoothstep(uBurnStart, 1.0, uIntro);
           float burnNoise = texture2D(uNoiseTex, revealNdc * 0.5 + 0.5).r;
           float burnHeight = 1.0 - (revealNdc.y * 0.5 + 0.5);
           float burnAt = mix(burnHeight, burnNoise, 0.45);
           float intact = smoothstep(
             burnFront - uBurnSoft,
             burnFront + uBurnSoft,
             burnAt
           );

           float mask = max(revealTrail(revealNdc), intact);
           diffuseColor.a *= mask * uRevealMix;

           float burnEdge = 4.0 * intact * (1.0 - intact);
           diffuseColor.rgb += uBurnColor * burnEdge * uBurnGlow * uRevealMix;`,
        );
    };
  }

  buildBackdrop(noise) {
    const uniforms = this.revealUniforms;
    if (!uniforms) return;

    this.backdropMaterial = new ShaderMaterial({
      vertexShader: backdropVertex,
      fragmentShader: buildBackdropFragment(this.samples),
      depthWrite: false,
      uniforms: {
        ...uniforms,
        uNoiseTex: { value: noise },
        uBackground: { value: new Color(readToken("--background")) },
        uLineColor: { value: new Color(readToken("--surface-soft")) },
        uRevealColor: { value: new Color().setScalar(DEFAULT_PARAMS.bgRevealLightness) },
        uRevealColorAlt: { value: new Color().setScalar(DEFAULT_PARAMS.bgRevealLightnessAlt) },
        uLineScale: { value: DEFAULT_PARAMS.bgLineScale },
        uLineCount: { value: DEFAULT_PARAMS.bgLineCount },
        uLineThickness: { value: DEFAULT_PARAMS.bgLineThickness },
        uLineOpacity: { value: DEFAULT_PARAMS.bgLineOpacity },
        uWaveAmount: { value: DEFAULT_PARAMS.bgWaveAmount },
        uWaveSpeed: { value: DEFAULT_PARAMS.bgWaveSpeed },
        uRevealOpacity: { value: DEFAULT_PARAMS.bgRevealOpacity },
      },
    });

    const backdrop = new Mesh(new PlaneGeometry(1, 1), this.backdropMaterial);
    backdrop.position.z = BACKDROP_Z;
    backdrop.renderOrder = -1;
    this.backdropMesh = backdrop;
    this.scene.add(backdrop);
  }
}


/* =====================================================================
   Season map — vector data (map-vector.ts)
   ===================================================================== */
const MAP_VIEW = { width: 2560, height: 1440, band: 11.67 };

const TRACK_RIBBON =
  "M1739.98 200.38C1750.67 207.68 1753.87 215.16 1752.98 229.76C1751.91 245.43 1747.46 251.84 1726.27 267.52C1704.73 283.54 1698.68 289.24 1694.58 297.26C1687.82 310.43 1691.91 329.49 1703.31 337.68C1706.16 339.64 1716.13 344.09 1725.38 347.48C1759.21 359.58 1764.02 364.21 1770.61 389.68C1776.66 412.83 1781.29 418.53 1806.39 434.38C1832.74 450.76 1844.67 462.52 1854.11 481.22C1858.02 489.05 1865.5 503.48 1870.66 513.27C1881.17 533.04 1883.13 541.59 1879.92 552.98C1873.87 576.13 1842.54 589.49 1820.81 578.27C1810.13 572.75 1808.71 571.33 1788.94 546.04C1770.25 521.82 1758.32 510.96 1742.83 503.83C1734.29 499.74 1730.55 499.2 1714.35 499.2C1695.83 499.02 1684.08 501.52 1665.39 509.71C1662.54 510.96 1652.39 514.52 1643.13 517.72C1633.87 520.75 1624.97 523.78 1623.55 524.31C1622.12 524.85 1619.63 525.56 1618.21 525.91C1616.78 526.27 1609.12 528.41 1601.29 530.9C1593.46 533.22 1579.93 537.31 1571.02 539.98C1562.3 542.48 1551.8 545.68 1547.88 547.11C1543.96 548.53 1535.24 550.85 1528.3 552.63C1521.53 554.23 1514.76 556.37 1513.52 557.44C1512.27 558.33 1510.85 558.68 1510.31 558.15C1509.78 557.61 1503.9 558.86 1497.49 560.64C1490.91 562.6 1479.87 565.27 1472.75 566.69C1441.59 572.75 1425.57 589.49 1417.02 624.93C1415.06 633.12 1412.93 647.01 1412.21 655.92C1410.08 689.04 1423.07 710.59 1453.52 724.12C1458.5 726.26 1464.02 728.93 1465.98 730C1467.94 731.07 1482.72 736.59 1498.92 742.11C1515.12 747.81 1529.54 752.79 1530.97 753.5C1532.39 754.04 1538.26 755.64 1543.96 757.07C1549.48 758.49 1554.82 760.09 1555.71 760.63C1556.6 761.16 1561.59 762.76 1566.75 764.19C1576.01 766.68 1616.96 780.93 1635.12 787.88C1652.92 794.64 1673.04 806.22 1682.65 814.94C1702.24 832.75 1705.44 852.16 1695.12 886.18C1687.46 910.93 1687.28 925.18 1694.41 936.4C1701.88 947.97 1710.79 954.92 1730.01 964.36C1807.64 1001.57 1822.24 1011.37 1832.21 1032.2C1839.86 1048.05 1836.66 1059.09 1816.01 1087.59C1811.38 1094 1800.34 1109.49 1791.79 1122.31C1774.17 1147.96 1769.54 1152.77 1756.36 1159.89C1742.65 1167.01 1726.27 1167.55 1699.21 1161.49C1658.62 1152.41 1615 1135.49 1585.62 1117.15C1546.46 1092.75 1517.79 1062.3 1456.72 980.74C1413.82 923.4 1393.16 901.49 1363.08 881.72C1341.53 867.48 1303.97 852.16 1284.74 849.85C1280.64 849.31 1273.34 848.25 1268.36 847.18C1246.1 843.08 1213.34 846.82 1190.55 855.9C1183.43 858.75 1168.83 865.34 1157.97 870.33C1118.09 889.2 1089.43 901.13 1060.94 910.75C1053.64 913.24 1046.88 915.92 1045.99 916.81C1044.92 917.7 1042.78 918.41 1041.18 918.41C1039.4 918.41 1031.74 920.37 1024.09 922.68C997.56 930.87 985.1 934.44 954.65 942.45C917.26 952.25 905.16 952.96 893.94 945.66C885.57 940.14 882.9 934.44 882.9 921.26C882.9 911.11 879.7 904.88 872.75 902.2C867.77 900.42 861.72 902.92 849.25 912.53C843.2 916.98 840.88 917.88 839.1 916.45C837.68 915.38 836.61 915.03 836.61 915.74C836.61 916.45 835.37 916.09 833.94 914.85C830.38 912 830.56 909.68 834.48 908.26C836.08 907.72 842.13 903.99 847.65 900.24C853.17 896.33 860.65 892.41 864.39 891.7C880.23 888.13 893.58 901.31 893.58 920.37C893.58 942.81 904.98 945.12 953.23 931.94C962.13 929.45 979.76 924.64 992.75 921.08C1015.9 914.85 1036.19 908.79 1041.36 906.48C1042.78 905.94 1044.38 905.23 1044.92 905.05C1045.45 904.88 1048.66 903.99 1052.04 902.92C1072.34 896.86 1107.77 882.08 1165.09 855.55C1192.69 842.9 1204.98 839.34 1230.08 836.49C1256.61 833.46 1292.39 838.63 1321.41 849.67C1334.41 854.48 1367.88 871.39 1372.33 875.14C1373.94 876.56 1381.41 882.44 1389.07 888.49C1410.79 905.41 1431.44 929.09 1474.71 986.97C1531.86 1063.19 1567.64 1097.92 1612.69 1120.71C1644.38 1136.56 1705.98 1155.26 1726.99 1155.26C1741.76 1155.26 1754.05 1150.81 1763.48 1141.9C1767.58 1137.99 1777.55 1124.81 1785.74 1112.52C1793.75 1100.23 1804.44 1085.09 1809.24 1078.86C1820.64 1064.08 1827.22 1050.01 1825.62 1043.25C1823.31 1032.2 1814.76 1022.41 1798.38 1011.37C1789.48 1005.49 1776.3 997.83 1769.18 994.45C1709.18 965.78 1704.2 963.11 1695.3 954.74C1679.27 939.78 1674.64 921.62 1680.7 899.35C1682.48 892.59 1685.5 882.08 1687.64 876.03C1692.63 860.36 1692.27 848.07 1686.75 837.2C1674.64 813.87 1648.83 800.87 1555 771.49C1447.64 737.83 1421.29 724.48 1409.19 697.76C1399.22 675.33 1398.86 654.49 1408.12 618.52C1413.1 598.93 1418.62 587.71 1427.88 578.27C1439.63 566.34 1451.56 560.82 1482.54 553.16C1497.85 549.42 1517.79 544.08 1526.51 541.59C1542.72 536.95 1563.73 531.26 1583.49 525.74C1589.36 524.13 1595.42 522.35 1596.84 521.82C1598.26 521.28 1600.4 520.57 1601.65 520.22C1608.77 518.79 1647.4 505.61 1669.12 497.07C1702.42 484.24 1726.63 484.6 1753.69 498.13C1766.87 504.9 1785.21 522.89 1803.72 547.28C1814.4 561.35 1819.21 566.16 1825.62 569.37C1836.12 574.35 1847.52 573.28 1857.49 566.16C1870.84 556.72 1874.4 542.65 1866.93 528.23C1864.61 523.96 1856.6 508.82 1849.12 494.57C1833.45 465.19 1829.72 460.91 1803.72 445.06C1786.1 434.02 1771.32 421.2 1766.87 412.65C1765.44 409.98 1763.13 402.5 1761.7 395.91C1756.01 371.87 1751.02 366.89 1723.25 357.63C1696.54 348.72 1683.9 336.97 1681.41 318.27C1678.56 297.08 1687.28 283.19 1718.8 260.39C1733.4 249.71 1737.85 245.43 1740.87 239.02C1745.33 229.58 1745.5 225.84 1742.12 217.83C1738.92 210.35 1733.04 206.08 1725.38 206.08C1719.15 206.08 1694.76 216.23 1694.76 218.9C1694.76 219.61 1693.34 220.32 1691.56 220.32C1689.78 220.32 1687.64 221.04 1686.75 221.93C1685.68 222.82 1630.49 250.95 1563.9 284.43C1497.32 318.09 1442.12 346.05 1441.06 346.76C1440.17 347.48 1407.58 364.04 1368.95 383.27C1330.32 402.5 1296.13 420.31 1292.93 422.63C1289.9 424.94 1286.52 426.9 1285.63 426.9C1284.74 426.9 1276.37 432.24 1267.29 438.83C1223.14 470 1204.98 479.97 1157.97 498.13C1112.4 515.76 1070.73 536.78 1046.34 554.59C1036.02 562.24 1015.9 578.63 1001.83 591.09C966.94 621.9 948.42 637.22 933.64 647.55C917.26 658.94 891.98 671.94 882.55 673.72C870.8 676.04 843.02 686.55 835.72 691.53C820.41 701.68 807.41 717.53 771.63 770.07C764.33 780.93 749.19 797.49 722.67 824.03C653.05 893.66 647 902.56 601.6 999.44C596.08 1011.01 578.63 1047.7 567.59 1070.85C558.34 1090.08 557.62 1094.36 562.43 1100.59C564.57 1103.26 567.59 1105.4 569.2 1105.4C572.4 1105.4 579.17 1101.3 587.18 1094.71C589.67 1092.57 631.51 1061.23 679.94 1024.9C728.36 988.57 776.26 952.6 786.05 945.12C801.72 933.19 804.56 931.59 806.7 933.73C808.84 936.04 809.73 935.86 812.58 932.66C815.25 929.81 815.43 928.74 813.47 926.42C811.33 923.93 810.8 923.93 808.13 926.42C805.45 928.92 804.92 928.92 802.78 926.42C800.65 923.75 801 921.79 804.92 916.27C806.7 913.6 806.7 912.53 804.03 910.04C801.18 907.19 801.18 906.83 804.92 902.92L808.84 898.82L812.76 903.63C816.49 908.44 816.85 908.44 820.05 905.41C823.44 902.56 823.79 902.56 826.82 905.94C830.2 909.68 830.2 909.68 825.22 913.6C820.77 917.16 820.59 917.88 823.08 920.01C824.51 921.26 826.46 921.79 827.35 921.26C828.42 920.72 830.02 921.44 831.27 922.86C833.23 925.35 833.94 925.35 836.97 922.68C839.99 919.83 840.35 919.83 842.66 923.04C844.8 925.89 844.8 926.78 842.66 929.27C840.53 931.59 840.71 932.48 843.02 936.04C845.69 939.78 845.69 940.31 843.2 942.98C840.53 945.48 839.99 945.48 836.61 942.45C833.23 939.42 833.23 939.07 836.08 935.86C838.75 932.83 838.75 932.3 836.08 929.63C833.58 927.14 832.87 927.14 830.2 929.27C827.89 931.23 827 931.23 826.46 929.45C825.4 926.42 821.48 926.78 818.81 929.98C815.78 933.73 819.88 939.07 823.44 936.04C826.46 933.55 831.27 935.15 831.27 938.53C831.27 939.96 830.02 942.09 828.6 943.34C826.29 945.3 825.4 945.12 823.44 942.27C821.3 939.6 820.59 939.42 818.1 941.38C815.96 943.16 814.71 943.34 812.76 941.74C810.08 939.42 810.08 939.6 760.05 978.07C751.69 984.48 724.8 1004.78 700.23 1023.3C675.66 1041.64 654.3 1057.67 653.05 1058.74C642.37 1067.82 580.06 1112.34 576.67 1113.59C574.18 1114.3 570.44 1115.19 568.13 1115.19C562.08 1115.37 551.75 1105.75 550.15 1098.27C548.19 1089.01 551.04 1081.53 578.45 1024.37C585.22 1009.94 590.92 998.01 590.92 997.66C590.92 995.34 619.05 937.64 629.2 919.3C645.22 889.92 664.63 866.23 703.62 828.3C729.79 802.83 747.59 784.13 755.6 773.81C761.83 765.97 786.76 729.29 786.76 727.86C786.76 727.15 787.47 726.08 788.19 725.72C788.9 725.37 793.17 720.38 797.8 714.51C818.81 687.08 831.98 677.82 861.54 669.09C907.12 655.74 928.84 642.2 987.77 590.02C998.81 580.05 1010.38 569.72 1013.58 567.05C1022.84 558.86 1045.27 541.94 1056.49 534.64C1066.46 528.23 1111.33 505.08 1115.24 504.19C1116.31 504.01 1126.99 499.74 1139.28 494.75C1151.56 489.59 1169.55 482.11 1179.34 478.19C1189.13 474.09 1203.91 466.97 1212.28 462.16C1231.5 451.12 1230.97 451.48 1252.87 436.16C1278.86 418 1282.07 416.04 1312.51 400.37C1355.06 378.46 1632.63 237.95 1698.32 205.01C1720.93 193.61 1729.12 192.72 1739.98 200.38Z";

const LAP_CENTRELINE =
  "M813.87 936.41L803.19 936.95L794.47 942.82L576.98 1105.84L561.86 1106.02L553.67 1093.21L563.46 1063.13L641.23 905.8L680.74 855.61L755.85 779.8L801.76 714.66L827.57 687.79L841.09 679.42L896.62 660.91L919.94 648.1L958.56 619.62L1031.17 556.8L1075.48 527.26L1197.39 474.22L1296.52 411.93L1710.49 202.81L1720.63 199.97L1736.12 202.64L1745.73 215.27L1747.51 230.93L1738.07 249.8L1703.9 275.25L1689.66 291.09L1683.97 311.38L1687.71 326.86L1702.12 342.34L1741.63 358.18L1754.62 367.08L1774.73 415.67L1837.38 464.43L1874.58 535.09L1875.29 545.59L1868.53 560L1856.96 570.86L1847.17 574.95L1825.99 574.24L1812.29 566.05L1801.61 554.31L1775.45 520.85L1754.98 503.59L1730.6 493.44L1699.27 491.66L1613.85 520.32L1445.49 568.55L1428.94 581.89L1417.55 599.87L1404.73 656.46L1406.51 677.64L1413.81 697.58L1423.6 710.03L1440.86 722.67L1484.64 741.89L1621.32 786.38L1664.75 806.67L1684.86 823.94L1694.47 848.32L1694.11 864.34L1682.37 910.43L1683.08 926.27L1690.02 940.68L1709.42 958.48L1776.87 990.87L1804.1 1007.6L1819.94 1021.66L1829.02 1040.88L1829.19 1051.38L1822.25 1065.62L1782.92 1122.75L1762.81 1147.49L1748.75 1155.14L1711.91 1157.63L1680.94 1150.51L1620.97 1129.33L1579.14 1106.02L1549.78 1082.88L1523.44 1056.54L1403.66 906.69L1375.19 882.49L1343.51 862.91L1288.34 843.69L1246.51 837.82L1194.37 846.36L1067.47 901.53L991.48 925.38L914.24 943.89L903.74 943.53L890.39 934.99L883.81 904.2L876.69 896.37L866.37 894.59L838.07 910.61L813.87 936.41";

const LAP_MASK_WIDTH = 30;
const LAP_LENGTH = 4805.57;

const ART_BOX = { top: 2, width: 1438.43, height: 796 };
const ART_SCALE_X = MAP_VIEW.width / ART_BOX.width;
const ART_SCALE_Y = (MAP_VIEW.height - MAP_VIEW.band * 2) / ART_BOX.height;
const mapToArtboard = (x, y) => [x / ART_SCALE_X, (y - MAP_VIEW.band) / ART_SCALE_Y + ART_BOX.top];
const artboardToMap = (x, y) => [x * ART_SCALE_X, MAP_VIEW.band + (y - ART_BOX.top) * ART_SCALE_Y];

const GRID_AXES_X = [645.31, 1276.96, 1908.61];
const GRID_AXIS_Y = 697.98;
const GRID_DASH = "12.15 8.35";
const GRID_STROKE = 2.13;
const HUB = { x: 1278.48, y: 699.5, r: 10.63 };
const RINGS = [
  { r: 69.85, width: 3.04, ghost: false },
  { r: 356.06, width: 2.13, ghost: true },
  { r: 442.61, width: 2.13, ghost: true },
];
const CORNER_MARKS = [
  [65.29, 76.96], [2471.93, 76.96], [65.29, 931.81], [2471.93, 931.81],
  [65.29, 1343.3], [1155.49, 1343.3], [1384.77, 1343.3],
];
const CORNER_MARK_SIZE = 16.7;
const TURN_POINTS = "13.69,0 -6.85,11.86 -6.85,-11.86";
const TURNS = [
  { x: 1349.96, y: 351.98, angle: 73.5 },
  { x: 1862.23, y: 611.24, angle: 30.5 },
  { x: 1732.95, y: 903.82, angle: 89.5 },
  { x: 585.43, y: 916.65, angle: 17.5 },
];
const FLAG_CUT = { x: 822.96, y: 921.57, along: 36, across: 40, angle: 144 };
const FLAG_DIAMONDS = "M807.78 899.17L813.85 905.24L807.78 911.31L801.71 905.24ZM822.21 902.21L828.28 908.28L822.21 914.35L816.14 908.28ZM807.02 915.88L813.09 921.95L807.02 928.02L800.95 921.95ZM821.45 915.88L827.52 921.95L821.45 928.02L815.38 921.95ZM835.87 915.88L841.94 921.95L835.87 928.02L829.8 921.95ZM826.0 931.82L832.07 937.89L826.0 943.96L819.93 937.89ZM838.91 931.82L844.98 937.89L838.91 943.96L832.84 937.89Z";


/* circuit-path.ts — 1440x800 authoring space, clockwise from the flag */
const CIRCUIT_PATH = [
  [457.3, 521.6], [454.3, 521.6], [451.3, 521.9], [448.8, 523.5],
  [446.4, 525.2], [444.0, 527.0], [441.6, 528.9], [439.1, 530.6],
  [436.9, 532.5], [434.4, 534.3], [432.1, 536.1], [429.6, 537.8],
  [427.2, 539.6], [424.8, 541.5], [422.5, 543.4], [420.1, 545.1],
  [417.9, 547.1], [415.4, 548.7], [412.9, 550.5], [410.5, 552.2],
  [408.1, 554.1], [405.8, 555.9], [403.4, 557.7], [401.1, 559.7],
  [398.6, 561.4], [396.2, 563.1], [393.9, 565.0], [391.5, 566.8],
  [389.0, 568.5], [386.7, 570.4], [384.3, 572.2], [381.9, 574.1],
  [379.5, 575.7], [377.1, 577.6], [374.6, 579.3], [372.2, 581.1],
  [369.9, 583.0], [367.6, 584.8], [365.1, 586.5], [362.8, 588.4],
  [360.4, 590.2], [357.9, 591.8], [355.4, 593.6], [353.0, 595.4],
  [350.7, 597.2], [348.3, 599.1], [345.9, 600.9], [343.5, 602.6],
  [341.1, 604.4], [338.7, 606.3], [336.2, 607.9], [333.9, 609.8],
  [331.5, 611.6], [329.0, 613.3], [326.7, 615.2], [324.2, 616.8],
  [321.4, 618.0], [318.4, 618.0], [315.7, 616.9], [313.3, 615.1],
  [311.6, 612.7], [311.1, 609.7], [311.4, 606.7], [311.9, 603.8],
  [312.9, 601.0], [314.2, 598.3], [315.5, 595.6], [316.6, 592.8],
  [318.0, 590.2], [319.5, 587.6], [320.6, 584.8], [321.9, 582.1],
  [323.4, 579.5], [324.6, 576.8], [325.9, 574.1], [327.0, 571.3],
  [328.4, 568.6], [329.6, 565.9], [330.9, 563.2], [332.2, 560.5],
  [333.4, 557.7], [334.6, 555.0], [335.9, 552.3], [337.3, 549.7],
  [338.5, 547.0], [339.9, 544.3], [340.9, 541.5], [342.2, 538.8],
  [343.3, 536.0], [344.9, 533.5], [346.3, 530.8], [347.4, 528.0],
  [348.9, 525.4], [350.2, 522.8], [351.5, 520.1], [352.9, 517.4],
  [354.3, 514.8], [355.6, 512.1], [357.3, 509.6], [358.8, 507.0],
  [360.3, 504.4], [362.0, 501.9], [363.8, 499.5], [365.4, 497.0],
  [367.3, 494.7], [369.1, 492.3], [370.7, 489.8], [372.6, 487.4],
  [374.6, 485.1], [376.7, 483.1], [378.6, 480.8], [380.6, 478.5],
  [382.5, 476.2], [384.6, 474.0], [386.7, 471.9], [388.8, 469.8],
  [390.9, 467.6], [393.2, 465.6], [395.4, 463.6], [397.5, 461.5],
  [399.6, 459.4], [401.8, 457.4], [404.0, 455.4], [406.2, 453.3],
  [408.3, 451.1], [410.4, 449.0], [412.5, 446.9], [414.6, 444.8],
  [416.8, 442.6], [418.7, 440.4], [420.7, 438.1], [422.7, 435.9],
  [424.7, 433.6], [426.4, 431.2], [428.2, 428.8], [430.0, 426.4],
  [431.8, 424.0], [433.4, 421.5], [435.1, 419.0], [436.7, 416.5],
  [438.5, 414.1], [440.0, 411.5], [442.0, 409.2], [443.5, 406.7],
  [445.3, 404.3], [447.0, 401.9], [449.0, 399.6], [450.5, 397.0],
  [452.5, 394.8], [454.3, 392.4], [456.3, 390.2], [458.4, 388.0],
  [460.6, 386.0], [462.7, 383.9], [465.0, 381.9], [467.5, 380.3],
  [470.1, 378.8], [472.6, 377.2], [475.5, 376.2], [478.3, 375.4],
  [481.1, 374.3], [484.0, 373.6], [486.9, 372.7], [489.7, 371.7],
  [492.6, 371.0], [495.5, 370.3], [498.3, 369.1], [501.0, 367.9],
  [503.8, 366.8], [506.4, 365.4], [509.1, 364.0], [511.8, 362.7],
  [514.4, 361.2], [516.9, 359.6], [519.4, 357.9], [521.9, 356.2],
  [524.4, 354.6], [526.9, 352.9], [529.2, 351.0], [531.6, 349.2],
  [533.9, 347.3], [536.2, 345.4], [538.6, 343.6], [540.9, 341.6],
  [543.2, 339.7], [545.5, 337.8], [547.7, 335.8], [549.9, 333.8],
  [552.3, 331.9], [554.6, 330.0], [556.8, 328.0], [559.0, 326.0],
  [561.2, 323.9], [563.5, 321.9], [565.8, 320.0], [568.0, 318.0],
  [570.3, 316.1], [572.6, 314.1], [574.7, 312.0], [577.0, 310.2],
  [579.4, 308.3], [581.8, 306.6], [584.3, 304.9], [586.7, 303.1],
  [589.1, 301.2], [591.5, 299.5], [594.0, 297.9], [596.6, 296.4],
  [599.2, 294.8], [601.7, 293.2], [604.3, 291.7], [607.0, 290.4],
  [609.7, 289.1], [612.4, 287.7], [615.0, 286.4], [617.8, 285.1],
  [620.4, 283.7], [623.2, 282.7], [625.9, 281.4], [628.7, 280.4],
  [631.4, 279.0], [634.1, 277.7], [636.9, 276.6], [639.6, 275.4],
  [642.5, 274.4], [645.2, 273.2], [648.0, 272.3], [650.8, 271.1],
  [653.6, 270.1], [656.3, 268.7], [659.1, 267.7], [661.9, 266.6],
  [664.6, 265.4], [667.4, 264.3], [670.1, 263.1], [672.8, 261.9],
  [675.4, 260.4], [678.1, 259.1], [680.8, 257.7], [683.4, 256.2],
  [686.0, 254.7], [688.6, 253.3], [691.0, 251.6], [693.6, 250.0],
  [696.1, 248.4], [698.6, 246.7], [701.1, 245.0], [703.5, 243.3],
  [705.9, 241.5], [708.4, 239.8], [710.8, 238.0], [713.2, 236.2],
  [715.8, 234.7], [718.3, 233.0], [720.9, 231.5], [723.4, 229.9],
  [725.9, 228.3], [728.5, 226.9], [731.2, 225.5], [733.8, 224.1],
  [736.6, 223.0], [739.1, 221.4], [741.9, 220.2], [744.6, 219.0],
  [747.3, 217.7], [749.9, 216.2], [752.5, 214.6], [755.2, 213.3],
  [757.8, 212.0], [760.5, 210.6], [763.2, 209.3], [765.9, 208.0],
  [768.6, 206.6], [771.3, 205.3], [774.0, 204.1], [776.7, 202.7],
  [779.3, 201.2], [782.0, 199.9], [784.6, 198.6], [787.3, 197.2],
  [790.0, 195.9], [792.7, 194.5], [795.4, 193.2], [798.1, 191.9],
  [800.7, 190.5], [803.4, 189.2], [806.1, 187.8], [808.8, 186.5],
  [811.3, 184.9], [814.0, 183.5], [816.7, 182.1], [819.3, 180.8],
  [822.0, 179.5], [824.7, 178.1], [827.4, 176.8], [830.1, 175.4],
  [832.7, 174.1], [835.4, 172.7], [838.1, 171.4], [840.8, 170.1],
  [843.5, 168.7], [846.2, 167.4], [848.9, 166.0], [851.6, 164.7],
  [854.2, 163.3], [856.9, 162.0], [859.6, 160.7], [862.3, 159.3],
  [865.0, 158.0], [867.6, 156.7], [870.3, 155.3], [873.0, 154.0],
  [875.6, 152.4], [878.3, 151.3], [881.0, 150.0], [883.6, 148.5],
  [886.4, 147.3], [889.0, 145.9], [891.7, 144.6], [894.4, 143.3],
  [897.0, 141.7], [899.6, 140.3], [902.4, 139.2], [905.0, 137.8],
  [907.6, 136.3], [910.3, 135.1], [913.0, 133.8], [915.6, 132.2],
  [918.3, 130.9], [921.1, 129.8], [923.6, 128.2], [926.3, 126.9],
  [929.1, 125.7], [931.7, 124.2], [934.3, 122.9], [937.0, 121.5],
  [939.7, 120.2], [942.4, 118.8], [945.0, 117.4], [947.7, 116.0],
  [950.2, 114.5], [952.9, 113.2], [955.6, 111.8], [958.4, 110.7],
  [961.1, 109.4], [963.9, 108.4], [966.8, 107.8], [969.8, 107.8],
  [972.8, 108.1], [975.5, 109.3], [977.7, 111.3], [979.5, 113.7],
  [980.9, 116.4], [981.8, 119.2], [982.0, 122.2], [981.9, 125.2],
  [981.1, 128.1], [980.0, 130.9], [978.3, 133.3], [976.6, 135.8],
  [974.3, 137.7], [971.9, 139.6], [969.5, 141.4], [967.1, 143.1],
  [964.7, 144.9], [962.4, 146.8], [959.9, 148.4], [957.4, 150.1],
  [955.2, 152.1], [953.0, 154.2], [951.1, 156.5], [949.4, 159.0],
  [948.1, 161.7], [947.2, 164.5], [946.8, 167.5], [946.2, 170.4],
  [946.9, 173.3], [947.4, 176.3], [948.3, 179.1], [949.8, 181.7],
  [951.7, 184.1], [953.9, 186.1], [956.4, 187.8], [959.0, 189.1],
  [961.7, 190.4], [964.5, 191.5], [967.3, 192.5], [970.2, 193.4],
  [973.0, 194.4], [975.8, 195.6], [978.6, 196.7], [981.2, 198.1],
  [983.7, 199.7], [985.9, 201.7], [987.7, 204.2], [989.1, 206.8],
  [990.3, 209.6], [991.2, 212.4], [991.5, 215.4], [992.2, 218.2],
  [993.0, 221.1], [994.2, 223.9], [995.5, 226.6], [997.2, 229.0],
  [999.2, 231.2], [1001.3, 233.4], [1003.6, 235.3], [1006.1, 237.0],
  [1008.6, 238.7], [1011.1, 240.3], [1013.7, 241.8], [1016.2, 243.5],
  [1018.7, 245.0], [1021.3, 246.6], [1023.8, 248.2], [1026.1, 250.0],
  [1028.4, 251.9], [1030.4, 254.3], [1032.4, 256.4], [1034.2, 258.8],
  [1035.8, 261.4], [1037.2, 264.0], [1038.4, 266.8], [1039.6, 269.5],
  [1041.2, 272.1], [1042.5, 274.7], [1043.9, 277.4], [1045.3, 280.0],
  [1046.6, 282.7], [1048.3, 285.2], [1049.7, 287.9], [1051.1, 290.5],
  [1052.3, 293.2], [1053.3, 296.1], [1053.7, 299.0], [1053.7, 302.0],
  [1052.8, 304.9], [1051.5, 307.6], [1049.9, 310.1], [1048.2, 312.5],
  [1045.9, 314.4], [1043.4, 316.2], [1040.8, 317.5], [1037.9, 318.5],
  [1035.0, 318.5], [1032.0, 318.5], [1029.0, 318.5], [1026.0, 318.1],
  [1023.3, 316.8], [1020.7, 315.3], [1018.3, 313.5], [1016.1, 311.5],
  [1014.3, 309.1], [1012.3, 306.9], [1010.5, 304.5], [1008.6, 302.2],
  [1006.9, 299.7], [1005.1, 297.3], [1003.3, 295.0], [1001.4, 292.7],
  [999.4, 290.4], [997.6, 288.1], [995.4, 285.9], [993.3, 283.8],
  [990.9, 282.1], [988.5, 280.2], [986.1, 278.4], [983.6, 276.9],
  [980.9, 275.6], [978.1, 274.5], [975.3, 273.4], [972.4, 272.7],
  [969.4, 272.3], [966.5, 271.6], [963.5, 271.4], [960.7, 271.0],
  [957.8, 271.6], [954.8, 271.7], [951.9, 272.5], [949.0, 273.3],
  [946.2, 274.1], [943.4, 275.0], [940.5, 275.8], [937.7, 276.8],
  [934.9, 277.9], [932.1, 278.9], [929.4, 280.1], [926.5, 281.0],
  [923.7, 281.9], [920.9, 283.1], [918.1, 284.1], [915.3, 285.2],
  [912.5, 285.9], [909.6, 286.9], [906.8, 287.8], [903.9, 288.6],
  [901.0, 289.4], [898.2, 290.4], [895.3, 291.1], [892.5, 292.1],
  [889.6, 292.9], [886.7, 293.7], [883.8, 294.6], [881.0, 295.5],
  [878.1, 296.2], [875.3, 297.1], [872.4, 297.8], [869.6, 298.8],
  [866.7, 299.6], [863.8, 300.2], [860.9, 301.2], [858.0, 301.8],
  [855.2, 302.8], [852.3, 303.5], [849.4, 304.2], [846.5, 305.1],
  [843.6, 305.8], [840.8, 306.6], [837.8, 307.1], [835.0, 308.1],
  [832.1, 308.8], [829.2, 309.4], [826.2, 310.0], [823.3, 310.7],
  [820.5, 311.4], [817.7, 312.5], [814.9, 313.6], [812.2, 314.9],
  [809.6, 316.4], [807.3, 318.3], [805.0, 320.2], [802.9, 322.4],
  [801.0, 324.7], [799.5, 327.3], [797.9, 329.8], [796.5, 332.5],
  [795.5, 335.3], [794.5, 338.1], [793.7, 341.0], [792.9, 343.9],
  [792.3, 346.8], [791.7, 349.7], [791.0, 352.6], [790.8, 355.5],
  [790.0, 358.4], [790.0, 361.4], [789.3, 364.3], [789.2, 367.3],
  [789.4, 370.3], [790.0, 373.2], [790.3, 376.2], [791.1, 379.0],
  [792.1, 381.9], [793.3, 384.6], [794.4, 387.4], [796.1, 389.9],
  [797.9, 392.2], [799.9, 394.4], [802.2, 396.4], [804.6, 398.2],
  [807.1, 399.9], [809.6, 401.5], [812.2, 403.0], [815.0, 404.1],
  [817.6, 405.5], [820.3, 406.8], [823.1, 407.8], [825.9, 409.0],
  [828.7, 410.1], [831.5, 411.1], [834.2, 412.3], [837.1, 413.2],
  [839.9, 414.2], [842.8, 415.1], [845.6, 416.1], [848.5, 417.1],
  [851.2, 418.2], [854.0, 419.1], [856.9, 419.9], [859.8, 420.8],
  [862.6, 421.8], [865.5, 422.7], [868.3, 423.5], [871.2, 424.4],
  [874.0, 425.3], [876.9, 426.2], [879.7, 427.2], [882.6, 427.9],
  [885.4, 428.9], [888.3, 429.7], [891.1, 430.9], [893.9, 431.6],
  [896.8, 432.6], [899.6, 433.6], [902.4, 434.7], [905.2, 435.7],
  [908.1, 436.4], [911.0, 437.3], [913.7, 438.5], [916.5, 439.6],
  [919.2, 440.9], [922.0, 441.9], [924.8, 443.1], [927.6, 444.2],
  [930.1, 445.8], [932.7, 447.3], [935.4, 448.7], [937.9, 450.3],
  [940.4, 452.0], [942.6, 454.0], [944.7, 456.1], [946.7, 458.4],
  [948.4, 460.9], [949.8, 463.5], [951.1, 466.2], [951.9, 469.1],
  [952.1, 472.1], [952.1, 475.1], [952.1, 478.1], [951.9, 481.1],
  [951.3, 484.0], [950.3, 486.8], [949.6, 489.7], [948.6, 492.5],
  [947.7, 495.4], [947.0, 498.2], [946.2, 501.1], [945.8, 504.0],
  [945.3, 507.0], [945.3, 510.0], [945.3, 513.0], [945.7, 515.9],
  [946.9, 518.7], [948.1, 521.4], [949.6, 524.0], [951.4, 526.4],
  [953.4, 528.6], [955.7, 530.5], [958.0, 532.4], [960.5, 534.0],
  [963.2, 535.4], [965.9, 536.8], [968.6, 538.1], [971.3, 539.4],
  [973.9, 540.8], [976.6, 542.2], [979.3, 543.5], [982.1, 544.5],
  [984.8, 545.8], [987.5, 547.2], [990.3, 548.3], [992.9, 549.6],
  [995.7, 550.8], [998.4, 552.2], [1000.9, 553.8], [1003.6, 555.2],
  [1006.1, 556.7], [1008.7, 558.3], [1011.2, 559.9], [1013.7, 561.6],
  [1015.9, 563.6], [1018.4, 565.3], [1020.5, 567.3], [1022.6, 569.5],
  [1024.3, 572.0], [1025.6, 574.7], [1026.8, 577.4], [1027.7, 580.3],
  [1028.1, 583.2], [1027.8, 586.2], [1026.6, 588.9], [1025.2, 591.6],
  [1023.9, 594.2], [1022.3, 596.8], [1020.6, 599.3], [1018.8, 601.6],
  [1017.0, 604.0], [1015.3, 606.5], [1013.4, 608.8], [1011.7, 611.3],
  [1010.1, 613.8], [1008.4, 616.3], [1006.8, 618.8], [1005.1, 621.3],
  [1003.3, 623.7], [1001.8, 626.3], [999.9, 628.6], [998.2, 631.1],
  [996.6, 633.6], [994.7, 636.0], [992.6, 638.1], [990.5, 640.2],
  [988.0, 641.9], [985.4, 643.4], [982.6, 644.5], [979.7, 645.3],
  [976.9, 646.1], [973.9, 646.1], [970.9, 646.1], [967.9, 646.1],
  [964.9, 646.1], [961.9, 645.9], [959.0, 645.3], [956.2, 644.4],
  [953.2, 643.9], [950.3, 643.5], [947.4, 642.7], [944.5, 641.9],
  [941.7, 641.0], [938.8, 640.0], [936.0, 639.2], [933.1, 638.3],
  [930.3, 637.4], [927.5, 636.4], [924.7, 635.4], [921.9, 634.3],
  [919.2, 633.3], [916.4, 632.2], [913.6, 631.0], [910.8, 630.0],
  [908.1, 628.6], [905.4, 627.4], [902.6, 626.3], [900.0, 624.8],
  [897.4, 623.3], [894.9, 621.6], [892.3, 620.2], [889.8, 618.5],
  [887.3, 616.9], [884.8, 615.2], [882.5, 613.4], [880.0, 611.6],
  [877.7, 609.7], [875.4, 607.8], [873.2, 605.8], [870.8, 603.9],
  [868.6, 601.9], [866.5, 599.8], [864.4, 597.6], [862.3, 595.5],
  [860.1, 593.4], [858.0, 591.3], [856.0, 589.1], [854.2, 586.7],
  [852.2, 584.5], [850.3, 582.1], [848.3, 579.9], [846.4, 577.6],
  [844.5, 575.2], [842.5, 573.0], [840.8, 570.6], [839.0, 568.2],
  [837.0, 565.9], [835.3, 563.5], [833.4, 561.2], [831.5, 558.8],
  [829.7, 556.4], [827.9, 554.0], [826.1, 551.6], [824.4, 549.2],
  [822.5, 546.9], [820.7, 544.5], [818.9, 542.0], [817.1, 539.6],
  [815.3, 537.3], [813.4, 534.9], [811.6, 532.6], [809.8, 530.2],
  [808.0, 527.7], [806.2, 525.4], [804.3, 523.1], [802.5, 520.7],
  [800.5, 518.4], [798.5, 516.3], [796.6, 513.9], [794.6, 511.6],
  [792.7, 509.3], [790.8, 507.0], [788.7, 504.9], [786.4, 503.0],
  [784.1, 501.1], [781.9, 499.0], [779.7, 497.0], [777.4, 495.0],
  [775.1, 493.1], [772.7, 491.3], [770.2, 489.7], [767.7, 488.0],
  [765.2, 486.3], [762.7, 484.8], [760.1, 483.3], [757.4, 481.9],
  [754.9, 480.3], [752.1, 479.3], [749.4, 478.0], [746.7, 476.7],
  [743.8, 475.7], [741.1, 474.6], [738.2, 473.6], [735.3, 472.8],
  [732.6, 471.7], [729.6, 471.2], [726.8, 470.3], [723.9, 469.5],
  [721.0, 469.0], [718.0, 468.7], [715.1, 467.9], [712.1, 467.7],
  [709.2, 467.0], [706.2, 467.0], [703.2, 467.0], [700.4, 466.2],
  [697.4, 466.6], [694.5, 467.0], [691.5, 467.0], [688.6, 467.5],
  [685.6, 467.8], [682.7, 468.6], [679.8, 469.0], [676.8, 469.5],
  [673.9, 470.3], [671.1, 471.0], [668.2, 472.0], [665.5, 473.2],
  [662.8, 474.5], [660.0, 475.6], [657.3, 476.8], [654.7, 478.3],
  [651.9, 479.5], [649.2, 480.8], [646.4, 481.9], [643.8, 483.3],
  [641.1, 484.5], [638.4, 485.8], [635.7, 487.1], [632.9, 488.2],
  [630.2, 489.5], [627.5, 490.8], [624.7, 491.9], [622.0, 493.0],
  [619.3, 494.3], [616.5, 495.5], [613.7, 496.5], [610.9, 497.6],
  [608.1, 498.6], [605.3, 499.6], [602.5, 500.7], [599.8, 502.0],
  [597.0, 502.9], [594.2, 503.9], [591.3, 504.8], [588.4, 505.5],
  [585.7, 506.7], [582.9, 507.8], [580.0, 508.6], [577.1, 509.5],
  [574.3, 510.4], [571.4, 511.1], [568.6, 512.1], [565.7, 512.9],
  [562.8, 513.7], [559.9, 514.4], [557.1, 515.4], [554.2, 516.0],
  [551.3, 516.7], [548.4, 517.4], [545.5, 518.2], [542.7, 519.0],
  [539.8, 519.9], [537.0, 520.7], [534.1, 521.5], [531.2, 522.2],
  [528.4, 522.9], [525.4, 523.6], [522.5, 524.1], [519.6, 524.9],
  [516.7, 525.4], [513.7, 525.8], [510.7, 525.8], [507.8, 525.6],
  [505.0, 524.5], [502.4, 522.9], [500.3, 520.8], [499.1, 518.1],
  [498.2, 515.2], [498.2, 512.2], [498.1, 509.2], [497.4, 506.3],
  [496.6, 503.5], [494.8, 501.1], [492.6, 499.1], [489.7, 498.5],
  [486.8, 498.1], [483.9, 498.7], [481.3, 500.3], [478.8, 501.9],
  [476.4, 503.7], [474.0, 505.4], [471.4, 506.9], [470.9, 507.1],
  [469.0, 509.2], [467.0, 511.2], [465.1, 513.3], [463.1, 515.4],
  [461.2, 517.5], [459.2, 519.5], [457.3, 521.6]
];

const CIRCUIT_MARKERS = [
  { x: 328.9, y: 510.6, d: 278.4 },
  { x: 758.4, y: 193.2, d: 811.7 },
  { x: 1046.6, y: 338.9, d: 1323.7 },
  { x: 973.7, y: 503.3, d: 1867.7 },
];
const CIRCUIT_LENGTH = 2707.9;
const CIRCUIT_STEP = 3;


/* map-dots.ts — the halftone as lattice indices */
const DOT_LATTICE = { pitchX: 7.8, pitchY: 7.7, originX: 5.0, originY: 16.64 };
const DOT_RADIUS = 1.75;
const PACKED =
  "-1:163;1:228;8:233;6:218,1,1,1;1:215,1,1,1,1,1,1,1,1,1,1;1:82,126,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,16;1:206,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1;1:205,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1;1:154,1,21,27,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:151,1,1,1,1,1,1,1,1,1,12,1," +
  "1,1,1,26,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:149,1,1,1,1" +
  ",1,1,2,1,1,1,2,4,2,1,1,1,1,1,1,1,1,1,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:149,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,24,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ";1:149,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,23,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1;1:150,1,1,1,1,1,1,1,1,1,4,1,1," +
  "1,1,1,1,1,1,1,1,20,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1," +
  "1,1,1;1:149,1,1,1,1,1,1,1,1,1,1,4,2,1,1,1,2,1,1,1,19,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,7,1,5,1,1,1,1,1,1,1,1;1:143,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,18,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1," +
  "1,4,1,1,1,1,1,1,1,1,1,1;1:141,1,1,1,3,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "17,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,4,1,1,1,1,1,1,1" +
  ",1,1,1;1:141,1,1,1,9,1,1,1,1,1,1,1,1,1,1,2,2,1,1,17,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1;1:141,1,1,1,9,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,15,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1" +
  ",1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1;1:141,1,1,1,8,1,1,4,1,1,1,1,1,1,1,1" +
  ",1,1,1,14,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,5,1,1," +
  "1,1,1,1,1,1,1,1,1,1;1:140,1,1,1,1,1,6,1,1,5,1,1,1,1,1,2,2,1,1,12,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ";1:139,1,1,1,1,1,1,4,1,1,7,1,1,1,1,1,2,3,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:139,1,1,1" +
  ",1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,7,1,1,1,4,1,2,1,1,1,1,1;1:137,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,5,1,1,3,1,1,1;1:136,1,1,1,1,1,1" +
  ",1,1,1,1,1,5,1,1,1,2,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,9,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,7,1,4,1,1;1:134,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,5,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,13;1:132,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1" +
  ",1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,1,1,1,1,1,1,1,1,3,1," +
  "1,1,1,1,3,1,1,1,1,1,1,1,7;1:110,21,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,12," +
  "1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,7,1,1,1,1,5,1,1,1,1,1,1," +
  "1,1,1,1,1;1:107,1,1,1,1,16,3,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,8,5,1,1,1" +
  ",1,1,4,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,6,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1;1:104,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,7,1,1," +
  "1,1,5,1,1,1,1,1,1,1,2,1,1,1,6,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1," +
  "1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:103,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1," +
  "1,1,1,1,1,6,1,1,1,1,1,7,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,8,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1;1:102,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,8,1,1,4,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,7,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,11,1,1,1,1,1,1,1,1,1;1:101,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1" +
  ",1,6,1,1,1,1,1,8,1,1,3,1,1,1,1,1,1,1,1,1,1,1,20,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,12,1,1,1,1,1,1,1;1:100,1,1,1,1,1,2,1,1,1,1,1,1" +
  ",1,1,1,6,1,1,1,1,1,1,1,1,1,6,1,2,1,7,1,1,1,1,3,1,1,1,1,1,1,1,1,21,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,13,1,1,1,1,1;1:99,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,6,1,1,1,7,1,1,1,1,1,3," +
  "1,1,1,1,1,1,21,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,10,2,1,1,1,1;1:100,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,14,1,1,1,1,1,1,4,1,1,1,1,1,5,15,1,1,1,1,1,1,1,1,1,13,1,1,1,1,1,1,1,1" +
  ",1,2,1,2,1,1,1,1,1,1,8,1,1,1,1,1,7;1:100,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,3" +
  ",1,1,1,1,1,1,1,1,12,1,1,1,3,1,4,1,1,1,1,4,1,1,1,1,11,1,1,1,1,1,1,1,1,20,2,1," +
  "1,1,1,1,1,1,1,1,1,2,1,1,1,8,1,1,1,1,7,1,1,1;1:98,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",8,1,3,1,1,1,1,1,1,1,1,11,1,10,1,1,1,1,3,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,1" +
  ",26,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,6,1,1,1,1,1,1;1:95,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,12,1,1,1,1,1,1,1,1,22,1,1,1,4,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,3" +
  "1,1,1,1,1,1,1,1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:94,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,22,1,1,1,3,1,1,1,1,1,8,1,1,1,1" +
  ",1,1,1,1,25,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1" +
  ":94,1,1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,22,1,1,3,1,1,1,1,7" +
  ",1,1,1,1,1,1,1,1,1,28,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1;1:107,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,21,1,1,3,1,1,8,1,1,1," +
  "1,1,1,1,1,33,1,1,2,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:83" +
  ",27,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,20,1,3,1,1,6,1,1,1,1,1,1,1,1,1,36,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,1;1:126,1,1,1,1,1,1,1,1" +
  ",18,1,1,4,7,1,1,1,1,1,42,1,1,1,1,1,2,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1;1:127,1,1,1,19,1,2,11,1,1,28,1,1,11,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1," +
  "1,1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:147,1,1,1,1,11,27,1,1,1,1,1,1," +
  "1,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1;1:82,9,1,1,59,1,1,6,25,1,1,1,1,1,4,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:9" +
  "1,1,1,1,65,23,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:90,1,1,1" +
  ",1,63,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:90,1," +
  "1,1,1,1,38,1,1,1,4,1,5,9,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1;1:89,1,1,1,1,1,1,1,37,1,1,1,1,1,1,1,4,9,1,1,20,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1," +
  "1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1;1:89,1,1,1,1,1,1,1,1,36,1,1,1,1,1,1,1,1,10" +
  ",1,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,16,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1;1:89,1,1,1,1,1,1,1,1,1,14,1" +
  ",1,1,18,1,1,1,1,1,1,1,9,1,1,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,9,1,1,1,8,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1,1;1:88,1," +
  "1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,17,1,1,1,1,1,8,1,1,1,1,25,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,5,1," +
  "1,1,1,1,1,1,1,1;1:90,1,1,1,1,1,1,1,1,1,10,1,1,3,1,17,1,1,1,1,8,1,1,1,1,1,27," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,6" +
  ",1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1;1:92,1,1,1,1,1,1,11,1,3,1,1,16,1,1,1,7,1," +
  "1,1,1,1,1,1,29,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,2,1,1," +
  "1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1;1:93,1,1,1,1,1,9,1,1,4,1,1" +
  "7,1,1,7,1,1,1,1,1,1,32,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1;1:93,1,1,1,1,9,1" +
  ",1,4,1,18,7,1,1,1,1,1,1,35,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,3,1,1,1,1,5,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1,1,1;1:93,1,1,1,1,9,6" +
  ",24,1,1,1,1,1,1,39,1,1,1,1,1,1,13,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7,1,1," +
  "5,1,1,1,1,1,1,4,1,1,1,1,1,1,1,1;1:93,1,1,1,1,38,1,1,1,1,1,1,40,1,1,1,12,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,1,1,5,1,1,1,1,5,1,1,1,1,1,1,1,1;1:93" +
  ",1,1,1,1,1,35,1,1,46,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,12,1,1" +
  ",6,6,1,1,1,1,1,1,1,1;1:92,1,1,1,1,1,1,34,1,1,45,1,1,7,1,1,1,2,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,2,1,1,15,1,11,1,1,1,1,1,1,1;1:92,1,1,1,1,17,1,17,1,1,1,4" +
  "5,1,6,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,19,1,8,1,1,1,1,1,1,2;1" +
  ":93,1,1,1,18,1,15,1,1,1,45,1,5,1,1,1,1,1,42,1,1,1,1,1,1,1,1,1,1,3;1:94,1,1,1" +
  "8,1,14,1,1,1,1,44,1,1,5,1,1,1,1,1,42,1,1,1,1,1,1,1;1:94,34,1,1,1,1,1,44,1,1," +
  "4,1,1,1,1,1;1:109,1,1,15,1,1,1,1,1,1,1,44,1,1,4,1,1,1,1;1:107,1,1,1,1,1,1,1," +
  "1,1,1,1,7,1,1,1,1,1,1,1,44,1,1,4,1,1,1,1,1;1:106,1,1,1,1,1,1,1,1,1,1,1,1,1,5" +
  ",1,1,1,1,1,1,1,1,44,1,1,4,1,1,1,1;1:82,23,1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1," +
  "1,1,1,1,29,6,10,1,1,4,1,1,1,1;1:105,1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1," +
  "46,1,1,3,1,1,1,1,1;1:84,20,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,1,1,1,1,1,1,46,1,1," +
  "4,1,1,1,1;1:82,2,1,1,17,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,47,1,1,3,1,1,1" +
  ",1,1,1,2;1:84,1,1,1,1,15,1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,43,4,1,1,1,3,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1;1:85,1,1,1,14,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,44,5," +
  "1,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,48;1:86,1,1,1,11,1,1,1,1,8,1,1,1,1,1,1,4" +
  ",1,1,1,1,49,1,1,1,4,1,1,1,1,1,1,1,1,1,1,2,1,1;1:87,1,11,1,1,1,1,7,1,1,1,1,1," +
  "1,7,1,1,51,1,1,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:90,1,7,1,1,1,6,1,1,1,1,1,1,11" +
  ",52,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:10,14,64,1,1,1,1,2,1,1,1,1,1,1,1,5" +
  ",1,1,1,1,1,5,18,13,27,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,17,10," +
  "47,8,21;1:88,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,64,1,1,1,1,1,6,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1;1:88,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,66,1,1,1,1," +
  "1,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,30;1:87,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1," +
  "1,1,1,1,63,3,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:87,1,1,1,1,1," +
  "1,1,1,1,1,1,5,1,1,1,1,1,1,46,16,5,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,20;1:87,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,67,1,1,1,1,1,1,1" +
  ",1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:91,1,1,1,1,1,1,4,1,1,1,1,1," +
  "1,1,1,69,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,18;1:92,1,1,1," +
  "1,5,1,1,3,1,1,50,21,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,17;1:" +
  "91,1,1,1,1,5,1,1,5,1,72,1,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1" +
  "8;1:91,1,1,1,5,1,61,1,1,18,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1;1:90,1,1" +
  ",1,1,5,81,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1;1:88,1,1,1,1,1,5,59,1" +
  ",1,1,21,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,2,1,1;1:87,1,1,1,1,1,5,55,1,1,1,1,1," +
  "1,1,1,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:86,1,1,1,1,1,5,54" +
  ",1,1,1,1,1,1,1,1,1,1,2,1,2,19,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1," +
  "20;1:84,1,1,1,1,1,1,5,51,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,18,3,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:83,1,1,1,1,1,1,5,6,44,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,27,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:8" +
  "2,1,1,1,1,1,1,5,8,41,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,30,1,1,1,1,1,1,1,1,1,1,1,1;1:81,1,1,1,1,1,1,5,9,39,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,13,1,1,1,1,1,1,1,30,1,1,1,1,1,1,1,1,1,1,1,11;1:80,1,1,1,1,2,5,11,37,1,1," +
  "1,1,1,1,1,1,1,1,20,1,1,1,1,33,1,1,1,1,1,1,1,1;1:79,1,1,1,1,1,1,5,1,12,35,1,1" +
  ",1,1,1,1,1,1,1,1,24,1,1,32,1,1,1,1,1,1,1,1,1;1:78,1,1,1,1,1,1,5,49,1,1,1,1,1" +
  ",1,1,9,1,1,1,1,1,1,1,1,1,11,1,32,1,1,1,1,1,1,1,8;1:78,1,1,1,1,1,5,21,1,1,26," +
  "1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,7,1,21,1,8,1,1,1,1,1,1,1,1;1:78," +
  "1,1,2,26,1,2,1,1,21,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,7,1,16," +
  "1,1,1,1,1,6,1,2,1,1,1,1,1,1,1,6,24;1:77,1,1,1,2,5,6,1,8,1,4,1,1,1,1,1,1,1,19" +
  ",1,1,1,1,1,9,1,1,2,1,1,1,1,2,1,1,1,1,1,1,1,1,4,1,1,1,6,17,1,1,1,1,4,1,1,1,1," +
  "1,1,1,1,2,1;1:77,1,2,1,6,3,1,1,1,1,1,5,1,1,1,1,1,1,1,1,5,1,1,16,1,1,1,1,1,1," +
  "9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,23,1,1,1,1,1,1,1,1,2,1,1" +
  ",1,1,1,1,1,1,15;1:85,1,1,1,1,1,1,1,1,1,12,8,1,15,1,1,1,1,10,2,1,1,1,1,1,1,1," +
  "1,1,2,1,1,1,1,1,1,1,1,3,1,1,1,1,1,1,23,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,14,1,1," +
  "1,1;1:84,1,1,1,1,1,1,1,1,1,1,21,13,1,1,12,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1," +
  "1,1,1,2,3,1,1,1,1,1,1,1,1,21,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,11,1,1,1,1,1,1;1:" +
  "84,1,1,1,1,1,1,1,1,1,1,21,9,1,1,1,1,12,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,9,1,12,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1" +
  ",1,1,1,1,1;1:83,1,1,1,1,1,1,1,1,1,19,4,1,7,1,11,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,14,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,8,2,1,1,1,1,1,1,1;1:82,1,1,1,1,1,1,1,1,1,20,4,1,1,3,1,11," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,5,1,1,15,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1;1:78" +
  ",4,1,1,1,1,1,1,1,22,5,1,12,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,15,1,1,1,1,1,1,1,1,1," +
  "1,1,1,9,1,1,1,1,1,1,1,1,1,1;1:77,5,1,1,1,1,1,1,23,1,13,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,6,1,1,1,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,15,1,1,1," +
  "1,1,1,1,2,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1;1:76,1,4,1,1,1,1,1,11,6,8,1,10,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,24,1,1,1,1,3,1,1,1,1,1,5,16,1,1,1,1" +
  ",1,1,2,1,1,1,1,5,1,1,1,1,1,1,1,1,1,1,1,1,1;1:75,1,4,1,1,1,1,1,10,1,6,9,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,35,1,1,1,1,1,19,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1,1,1,1,1;1:74,1,1,4,1,1,1,1,10,1,18,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,38,1,1,1,1,1,18,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1;1:72,1,1,1,4,1,1,1,1,9,1,6,15,1,2,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,42,1,1,1,1,1,18,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,9,1,1,1,1,1,1;1:72,1,1,1,4,1,1,1,8,1,1,27,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,45,1,1,1,1,18,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,9,1,1,1,1,1;1:70,1,1,1,1,5," +
  "1,8,1,1,1,20,1,1,1,1,3,1,1,1,1,1,1,1,1,1,1,2,1,1,1,49,1,1,1,20,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,9,1,1,1,1;1:69,1,1,1,1,1,4,1,1,7,1,1,21,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,52,1,1,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1" +
  ";1:68,1,1,1,1,1,5,1,6,1,1,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,52,1," +
  "1,1,21,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,6,1,1,6;1:67,1,1,1,1,1,1,4,1,4," +
  "2,1,1,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,57,1,1,25,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,6,1,1,1,2,1,1;1:64,1,1,1,1,1,1,1,1,1,4,5,1,1,1,1,5,17,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,48,1,1,1,14,2,2,1,1,9,1,1,1,1,1,1,1,1,1,1,1," +
  "1,6,1,1,1,1,1;1:64,1,1,1,1,1,1,1,1,4,1,4,1,1,1,6,13,3,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,16,46,1,1,1,13,1,1,1,1,1,1,1,1,10,1,1,1,1,1,1,1,1,1,1,1,5,1,1," +
  "1,1,1;1:57,1,1,1,3,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,1,6,14,1,1,1,1,1,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,18,45,1,1,1,6,7,1,2,1,1,1,1,1,1,1,1,1,9,1,1,1,1,1,1,1," +
  "1,1,4,1,1,1,1,1;1:56,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,1,6,1,14,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,65,1,1,1,1,5,7,10,1,1,1,10,1,1,1,1,1,1,1,4" +
  ",1,1,1,1,1;1:56,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,6,1,14,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,32,36,1,1,1,1,12,11,1,1,1,1,10,1,1,1,1,1,4,1,1,1,1,1;" +
  "1:57,1,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,1,1,6,16,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,1,69,1,1,1,1,1,6,16,1,1,1,1,1,1,1,1,8,1,1,1,4,2,1,1,1;1:58,2,1,1,1,1,1,1,1" +
  ",1,1,5,1,1,1,6,1,15,1,1,1,1,1,1,1,1,1,2,1,1,1,1,72,1,1,1,1,1,1,17,5,1,1,1,1," +
  "1,1,1,1,1,1,6,1,5,1,1,1,1,1;1:57,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,1,6,16,1,1,1," +
  "1,1,1,1,1,1,1,1,1,1,76,1,1,1,1,1,1,1,6,1,8,1,5,1,1,1,1,1,1,1,1,1,1,1,9,1,1,1" +
  ",1,1,1;1:57,1,1,1,1,1,1,1,1,1,1,1,1,4,1,1,6,16,1,1,1,1,1,1,1,1,1,1,1,79,1,1," +
  "1,1,1,1,1,1,6,8,1,5,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1;1:56,1,1,2,1,1,1,1,1" +
  ",1,2,5,6,18,1,1,1,1,1,1,1,84,1,1,1,1,1,1,1,1,6,7,1,5,1,1,1,2,1,1,1,1,1,1,8,1" +
  ",1,1,1,1,1,4;1:57,1,1,1,1,1,1,1,1,1,1,1,1,10,18,1,1,1,1,1,1,86,1,1,1,1,1,1,1" +
  ",1,5,6,1,1,5,1,1,1,1,1,1,1,1,1,1,1,7,1,1,1,1,1,1;1:57,1,2,1,1,1,1,1,1,2,10,1" +
  "9,1,1,1,1,1,88,1,1,1,1,1,1,1,10,1,1,5,1,1,1,1,1,1,1,1,1,1,2,7,1,1,1,1,1;1:58" +
  ",2,1,1,1,1,1,1,1,1,1,7,20,1,1,1,1,91,1,1,1,1,1,1,1,1,6,1,1,1,5,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,5,1,1,1,1,1;1:58,1,1,1,1,1,1,1,1,1,1,1,1,5,1,13,1,1,3,1,1,1,1" +
  ",1,94,1,1,1,1,1,1,1,7,1,7,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1;1:58,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,2,1,1,1,1,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,96,1,1,1,1,1,1,1,1," +
  "13,1,1,1,1,1,1,1,1,1,1,1,5,1,1,1,1,1,1;1:58,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1," +
  "1,7,1,1,1,1,1,1,1,1,1,1,103,1,1,1,1,1,1,1,15,1,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1" +
  ";1:58,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,10,1,1,1,1,1,105,1,1,1,1,1,1,1,1" +
  ",1,12,1,1,1,1,1,1,5,1,1,1,1,1,1,1,1,1;1:58,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,1,1,10,1,1,1,107,1,1,1,1,1,1,1,1,1,1,11,1,1,1,7,1,1,1,1,1,1,1,1;1:59,1,1," +
  "1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,111,1,1,1,1,1,1,1,1,1,1,1,17,1,1,1,1,1," +
  "1,1,1;1:59,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,119,1,1,1,1,1,1,1,1,1,1,1" +
  ",1,12,1,1,1,1,1,1,3;1:61,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,120,1,1,1,1,1" +
  ",1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1;1:62,1,1,1,1,1,1,1,1,1,1,1,1,1,1," +
  "1,7,123,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:64,1,1,1,1,1,1,1,1" +
  ",1,1,1,1,1,1,6,1,124,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:66,1,1,1,1," +
  "1,1,1,1,1,1,1,1,1,6,127,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1;1:70,2,1,1,1,1,1,1" +
  ",1,1,137,1,1,1,1,1,1,1,1,1,1,1;1:72,1,1,1,3,1,1,1,1,3,1,1,1,128,1,1,1,1,1,1," +
  "1,1,1,1;1:72,1,1,1,4,1,1,1,1,1,1,1,1,1,128,1,1,1,1,1,1,1,1,1,19;1:82,1,1,1,1" +
  ",1,129,1,1,1,1,1,1,1;1:84,1,1,128,1,1,1,1,1,1,1,1;1:215,1,1,1,1;1:215,1,1;13" +
  ":82;1:82";

const DOTS = (() => {
  const xs = [], cols = [], rws = [];
  let j = 0;
  for (const row of PACKED.split(";")) {
    const [head, body] = row.split(":");
    j += Number(head);
    let i = 0;
    const deltas = body.split(",");
    for (let k = 0; k < deltas.length; k += 1) {
      i = k === 0 ? Number(deltas[k]) : i + Number(deltas[k]);
      xs.push(DOT_LATTICE.originX + i * DOT_LATTICE.pitchX, DOT_LATTICE.originY + j * DOT_LATTICE.pitchY);
      cols.push(i);
      rws.push(j);
    }
  }
  return { points: Float32Array.from(xs), columns: Int16Array.from(cols), rows: Int16Array.from(rws), count: cols.length };
})();


/* =====================================================================
   Sticky stack — the covered block recedes
   ===================================================================== */
(function stack() {
  const RECEDE_SCALE = 0.9;
  const RECEDE_SHADE = 0.55;
  const layers = $$("[data-layer]");
  const last = $("[data-last]");
  const pinned = layers.map((layer, i) => ({
    inner: $("[data-inner]", layer),
    shade: $(".shade", layer),
    next: layers[i + 1] || last,
  }));
  const phone = window.matchMedia("(max-width: 639px)");
  const apply = () => {
    const view = window.innerHeight || 1;
    const shrink = phone.matches ? 0 : 1 - RECEDE_SCALE;
    for (const { inner, shade, next } of pinned) {
      const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / view));
      inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : "";
      inner.style.willChange = p > 0 && shrink > 0 ? "transform" : "";
      shade.style.opacity = `${RECEDE_SHADE * p}`;
      inner.style.visibility = p >= 1 ? "hidden" : "visible";
    }
  };
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  apply();
})();

/* =====================================================================
   The loading veil
   ===================================================================== */
function createVeil(host) {
  const el = document.createElement("div");
  el.className = "veil";
  el.setAttribute("role", "status");
  el.setAttribute("aria-label", "Loading Grido1 Racing Systems");
  el.innerHTML = `<div class="vc"><div class="helm"><div class="shell"></div><div class="sheet"></div></div><div class="vname">kimi antonelli</div></div><div class="meter"><i></i></div>`;
  host.appendChild(el);
  const helm = $(".helm", el), sheet = $(".sheet", el), vc = $(".vc", el), vname = $(".vname", el);
  const meter = $(".meter", el), fill = $(".meter i", el);
  const maskUrl = `url("${A("hero/ui/helmet-mask.png")}")`;
  helm.style.maskImage = maskUrl;
  helm.style.webkitMaskImage = maskUrl;
  const probe = new Image();
  probe.onerror = () => fail(A("hero/ui/helmet-mask.png"));
  probe.src = A("hero/ui/helmet-mask.png");

  const progCfg = { ...CFG.PROGRESS_WAIT };
  const prog = Spring(progCfg, (v) => {
    sheet.style.transform = `scaleY(${clamp01(v)})`;
    fill.style.transform = `scaleX(${clamp01(v)})`;
  });
  prog.to(0.7);
  const nameSp = Spring({ tension: 110, friction: 26 }, (v) => {
    vname.style.opacity = String(clamp01(v));
    vname.style.transform = `translateY(${(1 - v) * 0.6}rem)`;
  });
  nameSp.to(1, 260);
  const clearSp = Spring(CFG.CLEAR, (v) => {
    vc.style.opacity = String(clamp01(1 - v));
    vc.style.transform = `translateY(${-0.75 * v}rem)`;
    meter.style.opacity = String(clamp01(1 - v));
  });
  const veilSp = Spring(CFG.VEIL, (v) => { el.style.opacity = String(clamp01(v)); }, 1);

  const api = { onLift: null, done: false };
  let readied = false, lifted = false;
  const lift = () => {
    if (lifted) return;
    lifted = true;
    veilSp.to(0);
    api.onLift?.();
    // remove only when the *rendered* opacity is done — never on a timer
    const started = performance.now();
    const stop = subscribe(() => {
      const op = parseFloat(getComputedStyle(el).opacity);
      if (op <= 0.004 || performance.now() - started > 3000 + 4000) {
        stop();
        el.remove();
        api.done = true;
      }
    }, () => 0);
  };
  api.ready = (immediate = false) => {
    if (readied) return;
    readied = true;
    el.style.pointerEvents = "none";
    el.setAttribute("aria-label", "Loaded");
    Object.assign(progCfg, CFG.PROGRESS_READY);
    prog.to(1);
    clearSp.to(1);
    if (immediate) lift(); else setTimeout(lift, 430 + 240);
  };
  // backstop for a backgrounded tab: if the lift never renders, drop the element anyway
  return api;
}

/* =====================================================================
   The menu sheet (below 1280)
   ===================================================================== */
(function menu() {
  const burger = $(".burger");
  if (!burger) return;
  const links = [["Driver", "/driver"], ["SEASON", "/season"], ["journal", "/journal"], ["next race", "/next-race"], ["store", "/store"], ["Garage", "/garage"]];
  let sheet = null, opSp = null, timers = [], items = [];
  const close = () => {
    if (!sheet) return;
    const s = sheet;
    sheet = null;
    timers.forEach(clearTimeout);
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("kimi-menu-open");
    lenisRef()?.start();
    opSp.to(0);
    const stop = subscribe(() => { if (parseFloat(s.style.opacity) <= 0.01) { stop(); s.remove(); } }, () => 0);
    burger.focus();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const open = () => {
    if (sheet) return;
    sheet = document.createElement("div");
    sheet.className = "sheet-menu";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Menu");
    sheet.innerHTML = `<div class="top"><a class="logo" href="/" aria-label="Grido1 Racing Systems"><img src="${A("hero/ui/grido1-logo.webp")}" width="424" height="97" alt="" style="height:1.5rem;width:auto"></a><button class="close" type="button" aria-label="Close menu"><i></i><i></i></button></div><nav aria-label="Primary"><ul>${links.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></nav>`;
    root.appendChild(sheet);
    const s = sheet;
    $(".logo", s).addEventListener("click", close);
    $(".close", s).addEventListener("click", close);
    $$("nav a", s).forEach((a) => a.addEventListener("click", close));
    opSp = Spring(CFG.SHEET, (v) => { s.style.opacity = String(clamp01(v)); });
    opSp.to(1);
    items = $$("nav li", s).map((li, i) => {
      const r = rise(li, { y: "0.75rem", cfg: CFG.ITEM });
      timers.push(setTimeout(() => r.play(), 120 + i * 55));
      return r;
    });
    lenisRef()?.stop();
    document.documentElement.classList.add("kimi-menu-open");
    document.addEventListener("keydown", onKey);
    $(".close", s).focus();
  };
  burger.addEventListener("click", open);
  window.addEventListener("resize", () => { if (sheet && window.innerWidth >= 1280) close(); });
})();

/* =====================================================================
   The chequered dissolve (the seam)
   ===================================================================== */
function chequer(host) {
  const CELL = 24, SOLID_UNTIL = 0.16, LIFT = 2, ACCENT_SHARE = 0.06;
  const noise = (x, y) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const carry = host.dataset.chequer;
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const context = canvas.getContext("2d");
  let progress = 0;
  const render = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2);
    const bw = Math.round(width * ratio), bh = Math.round(height * ratio);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const flag = parseFloat(getComputedStyle(host).getPropertyValue("--flag-cell"));
    const cell = flag > 0 ? flag : CELL;
    const surface = readToken(carry === "light" ? "--background" : "--surface-black");
    const accent = readToken("--accent");
    const columns = Math.ceil(width / cell), rows = Math.ceil(height / cell), lift = progress * LIFT;
    for (let y = 0; y < rows; y += 1) {
      const depth = y / Math.max(1, rows - 1) + lift;
      if (depth > 1) break;
      const solid = depth <= SOLID_UNTIL;
      const fade = clamp01(1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL));
      if (!solid && fade <= 0) break;
      for (let x = 0; x < columns; x += 1) {
        if (!solid) {
          if ((x + y) % 2 !== 0) continue;
          if (noise(x, y) > fade) continue;
        }
        context.fillStyle = !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
        context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  };
  const sp = Spring(CFG.TRIGGER, (v) => { progress = v; render(); });
  trigger(host, { start: "top bottom", end: "top top" }, (p) => sp.to(p));
  new ResizeObserver(render).observe(host);
  render();
}
$$("[data-chequer]").forEach(chequer);

/* =====================================================================
   Hero boot
   ===================================================================== */
(function bootHero() {
  const section = $("[data-hero]");
  if (!section) return;   /* hero removed from the markup */
  const canvas = $(".hero-canvas", section);
  const box = $("[data-fit-box]", section);
  const veil = createVeil(section);
  /* the veil lifts when the scene is ready AND the hero has actually been scrolled into view,
     so the entrance plays when you arrive at it rather than while you are still on the landing */
  const seen = new Promise((resolve) => {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); resolve(); } }, { threshold: 0.25 });
    io.observe(section);
  });
  const settle = (immediate) => seen.then(() => { if (!dead) veil.ready(immediate); });
  let scene = null;
  let fallbackShown = false;

  const useFallback = () => {
    if (fallbackShown) return;
    fallbackShown = true;
    $(".hero-fallback", section).hidden = false;
    $$(".hero-fallback img[data-src]", section).forEach((img) => loadImg(img, true));
    canvas.style.display = "none";
    settle(true);
  };
  veil.onLift = () => { scene?.beginRise(); doHandover(); };

  try {
    if (!T.WebGLRenderer || !GLTFLoader || !HdrLoader) throw new Error("three.js unavailable");
    scene = new HeroScene(canvas);
    cleanups.push(() => { try { scene && scene.dispose && scene.dispose(); } catch (e) {} });
  } catch (err) {
    console.warn("WebGL scene unavailable:", err);
    scene = null;
    useFallback();
    return;
  }

  const applyFit = () => {
    const s = section.getBoundingClientRect();
    const k = s.height / (section.offsetHeight || 1) || 1;
    const fit = box.offsetParent !== null
      ? (() => {
          const b = box.getBoundingClientRect();
          return fitSubjectToBox(DEFAULT_PARAMS, { top: (b.top - s.top) / k, height: b.height / k }, section.clientHeight);
        })()
      : null;
    scene.setParams({
      ...DEFAULT_PARAMS,
      ...fit,
      ...(mq("(max-width: 1023px)") ? { bgRevealOpacity: 0 } : null),
      ...(mq("(hover: none)") ? { autoSweepAmount: 0.76 } : null),
      ...(mq("(max-width: 639px)") ? { sweepRadius: 0.95, sweepWarp: 0.18, autoSweepAmount: 0.55 } : null),
      ...(scene.tier.reveal ? null : { autoSweepAmount: 0 }),
    });
  };

  const onMove = (e) => scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  let pointerBound = false;
  const bindPointer = () => {
    const want = scene.tier.pointerEnabled;
    if (want && !pointerBound) { window.addEventListener("pointermove", onMove, { passive: true }); pointerBound = true; }
    else if (!want && pointerBound) { window.removeEventListener("pointermove", onMove); pointerBound = false; }
  };

  let lastW = -1, lastCoarse = mq("(hover: none) and (pointer: coarse)");
  const resize = () => {
    const w = section.clientWidth, h = section.clientHeight;
    const coarseNow = mq("(hover: none) and (pointer: coarse)");
    if (w !== lastW || coarseNow !== lastCoarse) {
      scene.retune();
      bindPointer();
      lastW = w; lastCoarse = coarseNow;
    } else if (scene.tier.coarsePointer) {
      return; // height-only changes on a coarse pointer (the iOS URL bar) are ignored
    }
    scene.resize(w, h);
    applyFit();
  };
  let rq = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rq); rq = requestAnimationFrame(resize); }).observe(section);
  window.addEventListener("resize", () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(resize); });
  lastW = section.clientWidth;
  scene.resize(section.clientWidth, section.clientHeight);
  applyFit();
  bindPointer();

  scene.onReady = () => { applyFit(); settle(); };
  scene.onError = () => useFallback();

  const stackEl = $("#stack");
  // render only while the hero is in view (+10 frames), the tab is visible, and scrollY is within reach
  let inView = true, grace = 0;
  new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; if (!inView) grace = 10; }).observe(section);
  subscribe((t) => {
    if (!(inView || grace > 0)) return;
    if (!inView) grace--;
    // the hero is sticky: it counts as covered once the stack has scrolled 1.15 viewports past it
    // (measured from the stack's own top, since this block is not at the top of the page)
    if (document.hidden || -stackEl.getBoundingClientRect().top > window.innerHeight * 1.15) return;
    scene.update(t);
  }, () => scene.tier.frameInterval);
})();


/* =====================================================================
   Shared helpers for the lower blocks
   ===================================================================== */
const parseRgb = (s) => {
  const m = String(s).match(/[\d.]+/g) || [0, 0, 0];
  return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
};
const tokenRgb = (t) => parseRgb(readToken(t));
const mixRgb = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
const rgbCss = ([r, g, b]) => `rgb(${r} ${g} ${b})`;
const coarse = mq("(hover: none) and (pointer: coarse)");
const px = (v) => `${((v / 1440) * 100).toFixed(4)}cqw`;

/* a one-shot tween on the shared ticker */
function tween(duration, ease, onUpdate, onDone) {
  let t0 = null;
  const stop = subscribe((time) => {
    if (t0 === null) t0 = time;
    const u = Math.min(1, (time - t0) / duration);
    onUpdate(ease(u));
    if (u >= 1) { stop(); if (onDone) onDone(); }
  }, () => 0);
  return stop;
}
const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);

/* every authored headline: two lines, word reveals, coloured full stop */
$$("[data-headline]").forEach((h) => headline(h, h.dataset.headline.split("|")));

/* =====================================================================
   Helpers for the timeline, paddock and footer
   ===================================================================== */
const hydrate = (root) => $$("img[data-src]", root).forEach((img) => {
  img.addEventListener("error", () => fail(img.src));
  img.src = A(img.dataset.src);
  img.removeAttribute("data-src");
});

/* a scroll scrub, smoothed by a spring */
function scrub(el, start, end, apply, init = 0) {
  if (reducedMotion) return trigger(el, { start, end }, apply);
  const sp = Spring(CFG.SMOOTH, apply, init, 0.0005);
  let first = true;
  return trigger(el, { start, end }, (p) => { if (first) { first = false; sp.set(p); } else sp.to(p); });
}

/* the contour backdrop — marching squares over the hero's field, on a 2D canvas */
function contour(canvas, colourToken, host) {
  const LINE_SCALE = 3.8, LINE_COUNT = 2.5, WAVE_AMOUNT = 0.37, WAVE_SPEED = 1.66, LINE_OPACITY = 0.85, CELLS = 96;
  const ctx = canvas.getContext("2d");
  const colour = readToken(colourToken);
  const start = performance.now();
  let width = 0, height = 0, ratio = 1;
  const field = (x, y, t) => {
    let f = Math.sin(x * 1.0 + t * 0.6) * 0.5;
    f += Math.sin(y * 0.85 - t * 0.45) * 0.45;
    f += Math.sin((x + y) * 0.65 + t * 0.35) * 0.35;
    f += Math.sin((x - y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  };
  const draw = (now = performance.now()) => {
    if (!width || !height) return;
    const t = ((now - start) / 1000) * WAVE_SPEED;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cols = width >= height ? CELLS : Math.max(8, Math.round((CELLS * width) / height));
    const rows = Math.max(8, Math.round((cols * height) / width));
    const stepX = width / cols, stepY = height / rows, aspect = width / height;
    const values = new Float32Array((cols + 1) * (rows + 1));
    for (let j = 0; j <= rows; j += 1) for (let i = 0; i <= cols; i += 1) {
      const nx = ((i / cols) * 2 - 1) * aspect * LINE_SCALE;
      const ny = ((j / rows) * 2 - 1) * LINE_SCALE;
      const qx = nx + Math.sin(ny * 0.8 + t * 0.7) * WAVE_AMOUNT;
      const qy = ny + Math.cos(nx * 0.7 - t * 0.6) * WAVE_AMOUNT;
      values[j * (cols + 1) + i] = field(qx, qy, t) * LINE_COUNT;
    }
    ctx.strokeStyle = colour; ctx.lineWidth = 1; ctx.globalAlpha = LINE_OPACITY; ctx.beginPath();
    for (let level = 0.5; level < LINE_COUNT; level += 1)
      for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
        const a = values[j * (cols + 1) + i], b = values[j * (cols + 1) + i + 1];
        const c = values[(j + 1) * (cols + 1) + i + 1], d = values[(j + 1) * (cols + 1) + i];
        const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x0 = i * stepX, y0 = j * stepY;
        const top = [x0 + stepX * ((level - a) / (b - a)), y0];
        const right = [x0 + stepX, y0 + stepY * ((level - b) / (c - b))];
        const bottom = [x0 + stepX * ((level - d) / (c - d)), y0 + stepY];
        const left = [x0, y0 + stepY * ((level - a) / (d - a))];
        const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
        switch (idx) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(left, top); break;
          case 5: seg(left, top); seg(bottom, right); break;
          case 10: seg(left, bottom); seg(top, right); break;
        }
      }
    ctx.stroke(); ctx.globalAlpha = 1;
  };
  const size = () => {
    width = canvas.clientWidth; height = canvas.clientHeight;
    ratio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    draw();
  };
  new ResizeObserver(size).observe(canvas);
  size();
  if (!reducedMotion) inViewLoop(host, draw, () => 24);
}

/* the dashed-bracket corner, drawn one path four ways */
const BRACKET_SVG = `<svg viewBox="0 0 10.5 10.5" aria-hidden="true"><path d="M0 0.5H10V10.5" fill="none" stroke="currentColor"/></svg>`;
const ROT = { tl: 270, tr: 0, br: 90, bl: 180 };
const uU = (n) => `calc(var(--u) * ${n})`;
function bracketSet(f, cls = "") {
  const S = "var(--bracket-spread, 0px)";
  const pos = {
    tl: [`calc(${f.l} - ${S})`, `calc(${f.t} - ${S})`],
    tr: [`calc(${f.r} - ${uU(10)} + ${S})`, `calc(${f.t} - ${S})`],
    bl: [`calc(${f.l} - ${S})`, `calc(${f.b} - ${uU(10)} + ${S} + ${f.stretch || "0px"})`],
    br: [`calc(${f.r} - ${uU(10)} + ${S})`, `calc(${f.b} - ${uU(10)} + ${S} + ${f.stretch || "0px"})`],
  };
  return ["tl", "tr", "bl", "br"].map((k) =>
    `<i class="pbr ${cls}" data-corner="${k}" style="left:${pos[k][0]};top:${pos[k][1]};rotate:${ROT[k]}deg">${BRACKET_SVG}</i>`).join("");
}
const BTN_PATH = "M0.5 0.5H216.5V42L209 49.5H0.5Z";
const ARROW_SVG = `<svg viewBox="0 0 13.7071 10.7071" aria-hidden="true"><path d="M0 5.35H13M8 10.35L13 5.35L8 0.35"/></svg>`;


/* =====================================================================
   5 — From the paddock
   ===================================================================== */
(function paddock() {
  const pad = $("[data-pad]");
  if (!pad) return;
  const sp = (x) => `calc(50% + ${px(x - 720)} * var(--cal-spread, 1))`;
  /* outline icons that say what each stat is: mentoring -> graduation cap, internships -> briefcase, web dev head -> code window, research head -> flask */
  const ICONS = {
    cap: '<path d="M32 12 L5 25 L32 38 L59 25 Z"/><path d="M15 31 V43 C15 48 23 52 32 52 C41 52 49 48 49 43 V31"/><path d="M59 25 V41"/>',
    briefcase: '<rect x="7" y="20" width="50" height="35" rx="5"/><path d="M23 20 V14 a3 3 0 0 1 3-3 H38 a3 3 0 0 1 3 3 V20"/><path d="M7 35 H57"/><path d="M28 31 V39 H36 V31"/>',
    code: '<rect x="6" y="10" width="52" height="44" rx="5"/><path d="M6 22 H58"/><circle cx="13" cy="16" r="1.4"/><circle cx="19" cy="16" r="1.4"/><path d="M25 31 L18 38 L25 45"/><path d="M39 31 L46 38 L39 45"/><path d="M35 30 L29 46"/>',
    flask: '<path d="M25 8 H39"/><path d="M28 8 V26 L11 52 a4 4 0 0 0 3.5 6 H49.5 a4 4 0 0 0 3.5-6 L36 26 V8"/><path d="M18 43 H46"/><circle cx="28" cy="50" r="2"/><circle cx="37" cy="48" r="1.5"/>',
  };
  const statIcon = (k) => `<svg class="stat-ic" viewBox="0 0 64 64" width="31" height="31" aria-hidden="true" focusable="false">${ICONS[k]}</svg>`;
  const stats = [
    ["cap", "students mentored", "1,800+"], ["briefcase", "internships", "4"],
    ["code", "web dev head", "40 FOLKS"], ["flask", "research head", "9 MEMBERS"],
  ];
  /* engineering journey: only facts that exist in content.js or were stated by the owner; no invented dates */
  const rounds = [
    { rd: "stage 01", nm: "the foundation", dt: "computer science<br>SRM", x: 330, w: 150 },
    { rd: "stage 02", nm: "build & explore", dt: "AI · software<br>engineering", x: 525, w: 150 },
    { rd: "stage 03", nm: "research & discovery", dt: "research ·<br>experimentation", x: 720, w: 170 },
    { rd: "stage 04", nm: "lead & collaborate", dt: "web development<br>30+ students", x: 915, w: 150 },
    { rd: "stage 05", nm: "share & empower", dt: "1,800+ students<br>mentored", x: 1110, w: 190 },
  ];
  const stages = [
    { t: "the foundation", a: "computer science · SRM", b: "B.Tech CSE",
      p: "Computer Science at SRM Institute of Science and Technology is the base: the habit of understanding a system before building on it." },
    { t: "build & explore", a: "AI · software engineering", b: "building real products",
      p: "I build AI applications and backend systems, from full-stack work with FastAPI, APIs and databases to training a language model from scratch." },
    { t: "research & discovery", a: "research · experimentation", b: "learning by testing",
      p: "Research and experimentation: testing ideas with retrieval-augmented generation and model training to see what actually works." },
    { t: "lead & collaborate", a: "web development · 30+ students", b: "leading a team",
      p: "I’m driven by curiosity, challenged by complex problems, and motivated by the process of turning ideas into things people can actually use.\nFor me, engineering is about understanding how things work, questioning what’s possible, and building something better." },
    { t: "share & empower", a: "1,800+ students mentored", b: "teaching what I learn",
      p: "Sharing what I learn: mentoring 1,800+ students and helping them go from curiosity to building real things." },
  ];
  const ACTIVE0 = 3;   /* which stage's copy shows first */
  const SEL0 = -1;     /* ...but no stage looks selected until the visitor clicks one */
  const links = rounds.slice(0, 4).map((r, i) => ({ x: r.x + 19, w: rounds[i + 1].x - r.x - 38 }));
  const mkSvg = (on) => on
    ? `<svg viewBox="0 0 11 11" aria-hidden="true" style="width:${uU(11)};height:${uU(11)}"><circle data-pulse cx="5.5" cy="5.5" r="5.5" fill="none" style="stroke:var(--accent)" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0"/><circle cx="5.5" cy="5.5" r="5.5" style="fill:var(--accent)"/></svg>`
    : `<svg viewBox="0 0 11 11" aria-hidden="true" style="width:${uU(11)};height:${uU(11)}"><circle cx="5.5" cy="5.5" r="5" fill="none" stroke="#fff" stroke-width="1"/></svg>`;
  const COL_RIGHT = `calc(2.2222cqw + ${uU(12)})`;
  const colLeft = `calc(100% - ${COL_RIGHT} - ${uU(193)})`;
  const meetF = {
    l: `var(--meet-frame-left, calc(100% - 2.2222cqw - ${uU(218)}))`, r: `var(--meet-frame-right, calc(100% - 2.2222cqw))`,
    t: `var(--meet-frame-top, ${uU(32)})`, b: `var(--meet-frame-bottom, ${uU(105)})`,
  };
  const statF = {
    l: `var(--stats-frame-left, calc(100% - 2.2222cqw - ${uU(218)}))`, r: `var(--stats-frame-right, calc(100% - 2.2222cqw))`,
    t: `calc(${uU(137)} + var(--stats-frame-drop, 0px))`, b: `calc(${uU(535)} + var(--stats-frame-drop, 0px))`,
    stretch: "var(--stats-stretch, 0px)",
  };

  pad.innerHTML = `
    <canvas class="pad-bg" aria-hidden="true"></canvas>
    <div class="pad-art" aria-hidden="true"><div class="pa-halo"></div><div class="pa-disc"></div><div class="pa-word">ANSH</div><div class="pa-dots"></div><div class="pa-stripes"></div><div class="pa-line"></div><svg class="pa-rail" viewBox="0 0 1000 480" aria-hidden="true" focusable="false"><line class="spine" x1="440" x2="440" y1="40" y2="400"/><line x1="440" x2="454" y1="40" y2="40"/><line x1="440" x2="447" y1="52" y2="52"/><line x1="440" x2="447" y1="64" y2="64"/><line x1="440" x2="447" y1="76" y2="76"/><line x1="440" x2="447" y1="88" y2="88"/><line x1="440" x2="454" y1="100" y2="100"/><line x1="440" x2="447" y1="112" y2="112"/><line x1="440" x2="447" y1="124" y2="124"/><line x1="440" x2="447" y1="136" y2="136"/><line x1="440" x2="447" y1="148" y2="148"/><line x1="440" x2="454" y1="160" y2="160"/><line x1="440" x2="447" y1="172" y2="172"/><line x1="440" x2="447" y1="184" y2="184"/><line x1="440" x2="447" y1="196" y2="196"/><line x1="440" x2="447" y1="208" y2="208"/><line x1="440" x2="454" y1="220" y2="220"/><line x1="440" x2="447" y1="232" y2="232"/><line x1="440" x2="447" y1="244" y2="244"/><line x1="440" x2="447" y1="256" y2="256"/><line x1="440" x2="447" y1="268" y2="268"/><line x1="440" x2="454" y1="280" y2="280"/><line x1="440" x2="447" y1="292" y2="292"/><line x1="440" x2="447" y1="304" y2="304"/><line x1="440" x2="447" y1="316" y2="316"/><line x1="440" x2="447" y1="328" y2="328"/><line x1="440" x2="454" y1="340" y2="340"/><line x1="440" x2="447" y1="352" y2="352"/><line x1="440" x2="447" y1="364" y2="364"/><line x1="440" x2="447" y1="376" y2="376"/><line x1="440" x2="447" y1="388" y2="388"/><line x1="440" x2="454" y1="400" y2="400"/><text x="460" y="42.5">00</text><text x="460" y="162.5">10</text><text x="460" y="282.5">20</text><text x="460" y="402.5">30</text><g class="eye"><line class="dash" x1="352" x2="440" y1="215" y2="215"/><circle cx="352" cy="215" r="3.2"/><path d="M440 215 l14 -6 v12 z"/><text x="460" y="218">FROM THEORY TO PRACTICE</text></g><text class="cap" x="432" y="46" text-anchor="end">ENGINEERING MINDSET</text><text class="cap" x="452" y="417" style="font-size:6.3px;letter-spacing:.03em" textLength="57" lengthAdjust="spacing">EXPERIMENTATION</text><g class="plus"><path d="M30 30h12M36 24v12"/><path d="M958 30h12M964 24v12"/><path d="M30 440h12M36 434v12"/></g></svg></div>
    <div class="pad-band" aria-hidden="true"></div>
    <div class="pad-fig" aria-hidden="false"><div class="pl" data-pl><img src="${import.meta.env.BASE_URL}me/paddock-b4.webp" alt="Ansh Gautam" width="1350" height="1165" draggable="false"><canvas class="pad-rev" aria-hidden="true"></canvas><svg class="pad-hud" viewBox="0 0 1350 1165" aria-hidden="true" focusable="false"><g class="h-wire"><ellipse class="m" style="animation-delay:-0.0s" cx="545" cy="375" rx="330" ry="395"/><ellipse class="m" style="animation-delay:-1.6s" cx="545" cy="375" rx="330" ry="395"/><ellipse class="m" style="animation-delay:-3.2s" cx="545" cy="375" rx="330" ry="395"/><ellipse class="m" style="animation-delay:-4.8s" cx="545" cy="375" rx="330" ry="395"/><ellipse class="m" style="animation-delay:-6.4s" cx="545" cy="375" rx="330" ry="395"/><ellipse class="m" style="animation-delay:-8.0s" cx="545" cy="375" rx="330" ry="395"/><g class="h-lat"><ellipse cx="545" cy="125" rx="255" ry="20"/><ellipse cx="545" cy="250" rx="313" ry="30"/><ellipse cx="545" cy="375" rx="330" ry="40"/><ellipse cx="545" cy="500" rx="313" ry="30"/><ellipse cx="545" cy="625" rx="255" ry="20"/></g></g><ellipse class="h-ring r1" cx="545" cy="375" rx="372" ry="438"/><ellipse class="h-ring r2" cx="545" cy="375" rx="412" ry="480"/><ellipse class="h-ring r3" cx="545" cy="375" rx="452" ry="520"/><g class="h-scan"><line x1="80" x2="1010" y1="375" y2="375"/><line class="g" x1="80" x2="1010" y1="375" y2="375"/></g></svg></div></div>
    <div class="pad-melt" aria-hidden="true"></div>
    <div class="cheq" data-chequer="dark" style="z-index:30" aria-hidden="true"></div>
    <h2 class="pad-h" id="pad-h"></h2>
    <div class="pad-cue" aria-hidden="true"><span class="pc-mouse"><i></i></span><span class="pc-txt"><b>Scroll to explore</b><em>Stage 01 &rarr; 05 &middot; the journey</em></span><span class="pc-line"><i></i></span></div>
    <div class="pad-intro">
      <p data-intro></p>
    </div>
    <div class="pad-panels">
      <div data-meet-brackets>${bracketSet(meetF)}</div>
      <div class="pm-col" data-meet aria-live="polite" style="left:var(--meet-left, ${colLeft});top:var(--meet-top, ${uU(43)});width:${uU(193)};display:flex;flex-direction:column;gap:${uU(6)};font-size:${uU(14)}">
        <b style="font-weight:700" data-m0>${stages[ACTIVE0].t}</b><span data-m1>${stages[ACTIVE0].a}</span><span data-m2>${stages[ACTIVE0].b}</span>
      </div>
      <div data-stat-brackets>${bracketSet(statF)}</div>
      <div class="pm-col" data-stats style="left:var(--stats-left, ${colLeft});top:calc(${uU(147)} + var(--stats-drop, 0px));width:var(--stats-col-w, ${uU(193)})">
        ${stats.map(([ic, lb, fg], i) => `<div class="stat-row" data-row>${statIcon(ic)}<div><div class="lb">${lb}</div><div class="fg${fg.length > 6 ? " fg-sm" : ""}" data-fig>${fg}</div></div></div>${i < 3 ? `<div class="stat-rule" data-rule style="margin:var(--stats-rule-top, ${uU(24)}) 0 var(--stats-rule-bottom, ${uU(23)})"></div>` : ""}`).join("")}
      </div>
    </div>
    <div class="cal" data-cal>
      ${links.map((l) => `<div class="link" data-link style="left:${sp(l.x)};width:calc(${px(l.w)} * var(--cal-spread, 1));top:calc(${px(159.5)} + var(--cal-mark-drop, 0px))"><i></i></div>`).join("")}
      ${rounds.map((r, i) => `<div class="card${i === SEL0 ? " live" : ""}${i < 2 ? " hide-phone" : ""}" data-card role="button" tabindex="0" aria-pressed="${i === SEL0}" aria-label="${stages[i].t}" data-i="${i}" style="left:calc(${sp(r.x)} - ${px(r.w / 2)});top:calc(${px(43)} + var(--cal-card-drop, 0px));width:var(--cal-card-w, ${px(r.w)})"><span class="rd">${r.rd}</span><span class="nm" data-nm>${r.nm}</span><span class="dt">${r.dt}</span></div>`).join("")}
      ${rounds.map((r, i) => `<div class="mk" data-mk style="left:${sp(r.x)};top:calc(${px(154)} + var(--cal-mark-drop, 0px))">${mkSvg(i === SEL0)}</div>`).join("")}
      <div class="lv" data-lv style="left:${sp(rounds[ACTIVE0].x - 56)};width:calc(${px(112)} * var(--cal-spread, 1));top:calc(${px(32)} + var(--bracket-drop, 0px));height:calc(${px(110)} + var(--bracket-stretch, 0px));pointer-events:none;opacity:0">
        ${["tl", "tr", "bl", "br"].map((k) => {
          const S = "var(--bracket-spread, 0px)";
          const left = k[1] === "l" ? `calc(0px - ${S})` : `calc(100% - ${uU(10)} + ${S})`;
          const top = k[0] === "t" ? `calc(0px - ${S})` : `calc(100% - ${uU(10)} + ${S})`;
          return `<i class="pbr live" style="opacity:1;left:${left};top:${top};rotate:${ROT[k]}deg">${BRACKET_SVG}</i>`;
        }).join("")}
      </div>
    </div>`;
  hydrate(pad);
  chequer($(".cheq", pad));
  contour($(".pad-bg", pad), "--paddock-contour", pad);

  /* portrait: up only */
  const pl = $("[data-pl]", pad);
  scrub(pad, "top bottom", "bottom top", (p) => { pl.style.top = `${(-3.3333 * p).toFixed(4)}cqw`; });

  /* portrait: blob-trail hover reveal (organic mask that follows the cursor and shows an alternate duotone portrait) */
  if (!reducedMotion && window.matchMedia("(hover: hover) and (min-width: 1024px)").matches) {
    const cv = $(".pad-rev", pad), img = $(".pad-fig img", pad), cx = cv.getContext("2d");
    const pts = []; let raf = 0, last = null;
    const LIFE = 760, R0 = 92;
    const blob = (p, now) => {
      const age = (now - p.t) / LIFE; if (age >= 1) return null;
      const r = R0 * p.k * (1 - age) ** 0.7 + 4, n = 16, path = new Path2D();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (1 + 0.2 * Math.sin(a * 3 + p.s) + 0.13 * Math.sin(a * 5 + p.s * 2 + now * 0.004));
        const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr * 0.92;
        i ? path.lineTo(x, y) : path.moveTo(x, y);
      }
      path.closePath(); return path;
    };
    const draw = (now) => {
      cx.clearRect(0, 0, cv.width, cv.height);
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      if (!pts.length) { raf = 0; return; }
      const all = new Path2D();
      for (const p of pts) { const b = blob(p, now); if (b) all.addPath(b); }
      cx.fillStyle = "rgba(25, 211, 243, .10)"; cx.fill(all, "nonzero");
      if (img.complete && img.naturalWidth) {
        cx.save(); cx.clip(all, "nonzero");
        cx.filter = "grayscale(1) contrast(1.35) brightness(1.1) sepia(1) hue-rotate(188deg) saturate(2.4)";
        const cr = cv.getBoundingClientRect(), ir = img.getBoundingClientRect();
        cx.drawImage(img, ir.left - cr.left, ir.top - cr.top, ir.width, ir.height);
        cx.restore();
      }
      cx.filter = "none"; cx.lineWidth = 2; cx.strokeStyle = "rgba(70, 120, 240, .9)"; cx.stroke(all);
      raf = requestAnimationFrame(draw);
    };
    pad.addEventListener("pointermove", (e) => {
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      const w = Math.round(r.width), h = Math.round(r.height);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (last && Math.hypot(x - last.x, y - last.y) < 12) return;
      const k = last ? Math.min(1.25, 0.8 + Math.hypot(x - last.x, y - last.y) / 120) : 0.9;
      last = { x, y }; pts.push({ x, y, t: performance.now(), s: Math.random() * 6.28, k });
      if (pts.length > 40) pts.shift();
      if (!raf) raf = requestAnimationFrame(draw);
    }, { passive: true });
    pad.addEventListener("pointerleave", () => { last = null; });
  }

  /* portrait: entrance transition (replays every time the block scrolls into view) */
  if (!reducedMotion && "IntersectionObserver" in window) {
    pad.classList.add("pad-pre");

    /* mosaic wipe: the block arrives under a black checker that breaks up square by square (diagonal wave, a few cyan
       cells at the front), and the page content builds in underneath as it clears */
    const mos = document.createElement("canvas");
    mos.className = "pad-mosaic"; mos.setAttribute("aria-hidden", "true");
    pad.appendChild(mos);
    const mx = mos.getContext("2d");
    const CELL = 30, DUR = 1700, SPREAD = 0.75;
    const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const ease = (t) => t * t * (3 - 2 * t);
    let prog = -1;
    const draw = () => {
      return;   /* the pad's own mosaic is retired: the landing's aperture (PushTransition / iris.js) now opens onto the paddock */
      const w = pad.clientWidth, h = pad.clientHeight;
      if (!w || !h) return;
      const r = Math.min(window.devicePixelRatio || 1, 1.5);
      const bw = Math.round(w * r), bh = Math.round(h * r);
      if (mos.width !== bw || mos.height !== bh) { mos.width = bw; mos.height = bh; }
      mx.setTransform(r, 0, 0, r, 0, 0);
      mx.clearRect(0, 0, w, h);
      if (prog >= 1) return;
      const black = readToken("--surface-black") || "#0a0b0c", accent = "#6f95f2";
      const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const th = ((x / cols) * 0.6 + (y / rows) * 0.4) * 0.62 + ((x + y) & 1) * 0.22 + hash(x, y) * 0.16;
        const lp = clamp01(prog * (1 + SPREAD) - th * SPREAD);
        if (lp >= 1) continue;
        const sz = CELL * (1 - ease(lp)) + (lp > 0 ? 0 : 0.6);
        const o = (CELL - sz) / 2;
        mx.fillStyle = lp > 0.02 && lp < 0.4 && hash(x + 91, y + 17) < 0.1 ? accent : black;
        mx.fillRect(x * CELL + o, y * CELL + o, sz + 0.5, sz + 0.5);
      }
    };
    new ResizeObserver(draw).observe(pad);
    prog = 0; draw();

    /* scroll-linked, not time-based: the wipe is tied to the block rising into the viewport, so it is always fully
       open by the time the block has landed, however fast the visitor scrolls (and it continues the landing's mosaic) */
    const holdEl = pad.closest("[data-last]");
    trigger(pad, { start: "top bottom", end: "top center" }, (p0) => {
      /* while PushTransition pins the block at the top of the viewport its rect no longer moves, so it hands us the progress */
      const hold = holdEl && holdEl.dataset.hold !== undefined ? parseFloat(holdEl.dataset.hold) : null;
      const p = hold !== null ? hold * 0.62 : p0;          /* hold 0..1 over one viewport of scroll -> mosaic fully open at ~62% */
      const q = clamp01(p / 0.55);
      if (Math.abs(q - prog) > 0.004 || (q === 0 && prog !== 0) || (q >= 1 && prog < 1)) { prog = q; draw(); }
      if (p > 0.12 && pad.classList.contains("pad-pre")) { pad.classList.remove("pad-pre"); pad.classList.add("pad-in"); }
      else if (p <= 0.001 && pad.classList.contains("pad-in")) { pad.classList.remove("pad-in"); pad.classList.add("pad-pre"); }   /* fully below the fold: re-arm so it replays */
    });
  }

  /* scroll cue: appears when the visitor pauses on the landing, hides the moment they scroll, retires after they have explored */
  {
    const cue = $(".pad-cue", pad);
    let t = 0, base = null, retired = false;
    const inView = () => { const r = pad.getBoundingClientRect(), H = window.innerHeight; return r.top < H * 0.35 && r.bottom > H * 0.6; };
    const show = () => { if (retired || !inView()) return; if (base === null) base = window.scrollY; cue.classList.add("on"); };
    const onScroll = () => {
      cue.classList.remove("on"); clearTimeout(t);
      if (base !== null && Math.abs(window.scrollY - base) > 420) { retired = true; return; }
      t = setTimeout(show, 1300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    t = setTimeout(show, 1800);
  }

  /* masthead */
  headline($(".pad-h", pad), ["engineered", "through", "curiosity"]);

  /* intro + button */
  const introOpts = { unit: "word", stagger: 30, cfg: CFG.COPY2, delayIn: 2 * 130 + 90, gap: 0.46 };
  let introCtl = revealText($("[data-intro]", pad), stages[ACTIVE0].p, { unit: "word", stagger: 30, cfg: CFG.COPY2, delayIn: 2 * 130 + 90, gap: 0.46 });
  const btnCtl = { play() {}, reset() {} };   /* the "explore my work" button was removed */

  /* panels */
  const bracketCtl = (host, delay) => {
    const items = $$(".pbr", host).map((el) => rise(el, { kind: "fade", cfg: CFG.REVEAL }));
    return { play: () => items.forEach((c) => c.play(delay)), reset: () => items.forEach((c) => c.reset()) };
  };
  const meetBr = bracketCtl($("[data-meet-brackets]", pad), 320);
  const meetCol = rise($("[data-meet]", pad), { y: "0.75rem", cfg: CFG.REVEAL });
  const statBr = bracketCtl($("[data-stat-brackets]", pad), 0);
  const rowEls = $$("[data-row]", pad), ruleEls = $$("[data-rule]", pad), figEls = $$("[data-fig]", pad);
  const rowCtls = rowEls.map((el, i) => rise(el, { y: "0.75rem", cfg: CFG.REVEAL }));
  const ruleCtls = ruleEls.map((el) => rise(el, { kind: "scaleX", cfg: CFG.REVEAL }));
  /* stat figures count up from 0 every time the block comes into view ("1,800+" -> 0 ... 1,800+, "40 FOLKS" -> 0 ... 40 FOLKS) */
  const countUp = (el, text) => {
    const m = text.match(/^(\d[\d,]*)(.*)$/);
    if (!m) return revealText(el, text, { unit: "letter", stagger: 24, cfg: CFG.FIGURE });
    const target = parseInt(m[1].replace(/,/g, ""), 10), suffix = m[2], commas = m[1].includes(",");
    const fmt = (v) => (commas ? Math.round(v).toLocaleString("en-US") : String(Math.round(v)));
    el.textContent = "";
    const sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = text;
    const vis = document.createElement("span"); vis.setAttribute("aria-hidden", "true"); vis.className = "k-count";
    el.append(sr, vis);
    vis.textContent = reducedMotion ? text : fmt(0) + suffix;
    let timer = 0, raf = 0, started = false;
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); };
    return {
      el,
      play(extra = 0) {
        stop(); started = true;
        if (reducedMotion) { vis.textContent = text; return; }
        timer = setTimeout(() => {
          const DUR = 1500, t0 = performance.now();
          const step = (now) => {
            const u = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - u, 3);
            vis.textContent = fmt(target * e) + suffix;
            if (u < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        }, extra);
      },
      reset() { stop(); started = false; vis.textContent = reducedMotion ? text : fmt(0) + suffix; },
      get started() { return started; },
    };
  };
  const figCtls = figEls.map((el) => countUp(el, el.textContent.trim()));
  /* the stats panel (right) is held back until the journey timeline below has finished drawing itself: it plays from calStatsPlay() */
  const statsCtl = {
    play: () => {
      statBr.play();
      rowCtls.forEach((c, i) => {
        const T = 460 + i * 90 - 460;
        if (ruleCtls[i]) ruleCtls[i].play(Math.max(0, T + 100));
        c.play(Math.max(0, T + 140));
        figCtls[i].play(Math.max(0, T + 220));
      });
    },
    reset: () => { statBr.reset(); rowCtls.forEach((c) => c.reset()); ruleCtls.forEach((c) => c.reset()); figCtls.forEach((c) => c.reset()); },
  };
  let padOn = false;
  const padCtls = [
    { play: () => introCtl.play(0), reset: () => introCtl.reset() },
    { play: () => btnCtl.play(2 * 130 + 260), reset: () => btnCtl.reset() },
    meetBr,
    { play: () => meetCol.play(410), reset: () => meetCol.reset() },
  ];
  let applySteps = () => {};
  gate(pad, { rootMargin: "0px 0px -15% 0px", forward: true }, (on) => {
    padOn = on;
    padCtls.forEach((c) => (on ? c.play() : c.reset()));
    applySteps();
  });

  /* calendar strip */
  const cal = $("[data-cal]", pad);
  const linkEls = $$("[data-link]", cal), cardEls = $$("[data-card]", cal), mkEls = $$("[data-mk]", cal), lv = $("[data-lv]", cal);
  const CARD_DELAY = 560, CARD_STAGGER = 90;
  const linkCtls = linkEls.map((el) => rise(el, { kind: "scaleX", cfg: CFG.REVEAL }));
  const cardCtls = cardEls.map((el) => rise(el, { y: "0.5rem", cfg: CFG.REVEAL }));
  const nmCtls = cardEls.map((el) => rise($("[data-nm]", el), { y: "0.3em", cfg: CFG.NAME }));
  const mkCtls = mkEls.map((el) => rise(el, { kind: "fade", cfg: CFG.REVEAL }));
  const lvCtl = rise(lv, { kind: "fade", cfg: CFG.REVEAL });
  cardEls.forEach((el) => { el.querySelector("[data-nm]").style.display = "block"; });
  mkEls.forEach((el) => { el.style.transform = "translate(-50%, -50%)"; });
  /* scroll-stepped journey: the block stays pinned while you scroll. Stage 01 is there from the start, 02..05 arrive one per scroll step,
     and only when the whole timeline is in does the stats panel come in from the right. Scrolling back undoes the steps in reverse. */
  const lastEl = pad.closest("[data-last]");
  const STEP_AT = [0, 0.1, 0.27, 0.44, 0.61, 0.78];   /* runway progress at which step i shows: stage 1..5, then the stats */
  const shown = new Array(STEP_AT.length).fill(false);
  const setStep = (i, on) => {
    if (shown[i] === on) return;
    shown[i] = on;
    if (i < cardEls.length) {
      if (on) {
        if (i > 0 && linkCtls[i - 1]) linkCtls[i - 1].play(0);
        const d = i > 0 ? 140 : 120;
        cardCtls[i].play(d); nmCtls[i].play(d + 110); mkCtls[i].play(d + 60);
      } else {
        if (i > 0 && linkCtls[i - 1]) linkCtls[i - 1].reset();
        cardCtls[i].reset(); nmCtls[i].reset(); mkCtls[i].reset();
      }
    } else if (on) statsCtl.play();
    else statsCtl.reset();
  };
  applySteps = () => {
    let r = 0;
    if (lastEl) {
      const rect = lastEl.getBoundingClientRect(), run = Math.max(1, rect.height - pad.offsetHeight);
      r = run <= 1 ? 1 : clamp01(-rect.top / run);   /* no runway (phones): everything shows at once */
    }
    STEP_AT.forEach((t, i) => setStep(i, padOn && r >= t));
  };
  let stepQueued = false;
  const onStepScroll = () => { if (stepQueued) return; stepQueued = true; requestAnimationFrame(() => { stepQueued = false; applySteps(); }); };
  window.addEventListener("scroll", onStepScroll, { passive: true });
  window.addEventListener("resize", onStepScroll);
  if (mq("(hover: hover)")) {
    cardEls.forEach((c) => {
      c.addEventListener("pointerenter", () => { if (c.classList.contains("live")) cal.style.setProperty("--bracket-spread", px(5)); });
      c.addEventListener("pointerleave", () => cal.style.removeProperty("--bracket-spread"));
    });
  }
  let pulse = $("[data-pulse]", cal);

  /* engineering journey: selecting a stage moves the cyan marker/bracket and rewrites the meet block + intro */
  const meetEls = [$("[data-m0]", pad), $("[data-m1]", pad), $("[data-m2]", pad)];
  const introEl = $("[data-intro]", pad);
  const tagIntro = (i) => { if (introEl.parentElement) introEl.parentElement.setAttribute("data-k", `0${i + 1} / 05  ·  ${stages[i].t}`); };
  tagIntro(ACTIVE0);
  let active = ACTIVE0;
  let picked = false;
  const setActive = (i) => {
    if (i === active && picked) return;
    if (!picked) { picked = true; lvCtl.play(0); }
    active = i;
    const st = stages[i];
    tagIntro(i);
    cardEls.forEach((c, k) => { c.classList.toggle("live", k === i); c.setAttribute("aria-pressed", String(k === i)); });
    mkEls.forEach((m, k) => { m.innerHTML = mkSvg(k === i); });
    pulse = $("[data-pulse]", cal);
    lv.style.left = sp(rounds[i].x - 56);
    [st.t, st.a, st.b].forEach((t, k) => {
      meetEls[k].textContent = t;
      if (!reducedMotion && meetEls[k].animate) meetEls[k].animate([{ opacity: 0, transform: "translateY(0.4em)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: k * 60, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
    introCtl = revealText(introEl, st.p, { ...introOpts, delayIn: 0 });
    introCtl.play(0);
  };
  cardEls.forEach((c) => {
    const i = +c.dataset.i;
    c.addEventListener("click", () => setActive(i));
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(i); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const n = cardEls[i + (e.key === "ArrowRight" ? 1 : -1)];
        if (n && getComputedStyle(n).display !== "none") { n.focus(); setActive(+n.dataset.i); }
      }
    });
  });

  const crawl = linkEls.map((el) => $("i", el));
  const PERIOD = 0.7951;
  inViewLoop(cal, (time) => {
    if (reducedMotion) return;
    const u = (time % 5200) / 5200;
    crawl.forEach((el, i) => {
      const dir = i < 2 ? 1 : -1;
      el.style.backgroundPositionX = `${(dir * u * PERIOD).toFixed(4)}cqw`;
    });
    if (pulse) {
      const v = (time % 3200) / 3200;
      const e = 1 - (1 - v) * (1 - v);
      pulse.setAttribute("r", (5.5 + e * 5.5 * 3.4).toFixed(3));
      pulse.setAttribute("opacity", (0.5 * (1 - e) * (1 - e)).toFixed(4));
    }
  }, () => 0);
})();


  })().catch((e) => console.error("Kimi block failed:", e));

  return function destroy() {
    dead = true;
    cleanups.splice(0).reverse().forEach((f) => { try { f(); } catch (e) {} });
    __obs.forEach((o) => { try { o.disconnect(); } catch (e) {} });
    __timers.forEach((id) => globalThis.clearTimeout(id));
    __timers.clear();
    globalThis.document.documentElement.classList.remove("kimi-menu-open");
    const lenis = globalThis.window.__lenis;
    if (lenis && lenis.start) lenis.start();
  };
}

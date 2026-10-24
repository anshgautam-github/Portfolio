import { createGlassScene } from "./glass.js";
import { createFallingStickers } from "./falling.js";
import { bigArrowSvg } from "./stickers.js";
import { landingContent } from "./landingContent.js";
import { smoothScrollTo } from "../../lib/smooth.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, "0");

function tzLabel() {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  return `GMT${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}
function region(content) {
  if (content.country) return content.country;
  try { return new Intl.Locale(navigator.language).maximize().region || "--"; } catch { return "--"; }
}

/**
 * Builds the whole landing screen inside `root` and wires up WebGL, physics and UI.
 * Returns a destroy() function.
 */
export function mountLanding(root, content = landingContent, options = {}) {
  const c = content;
  root.classList.add("ll");
  root.dataset.theme = "dark";
  root.innerHTML = `
    <canvas class="ll-gl"></canvas>
    <div class="ll-grid" aria-hidden="true">
      ${[3.85, 34.65, 65.45, 96.25].map((x) => `<i class="ll-v" style="left:${x}%"></i>`).join("")}
      ${[33.7, 68.3].map((y) => `<i class="ll-h" style="top:${y}%"></i>`).join("")}
      ${[3.85, 34.65, 65.45, 96.25].flatMap((x) => [33.7, 68.3].map((y) => `<i class="ll-x" style="left:${x}%;top:${y}%"></i>`)).join("")}
    </div>
    <div class="ll-t ll-logo ll-rise ll-d1">${esc(c.logo)}</div>
    <nav class="ll-t ll-nav ll-rise ll-d1" aria-label="Primary">
      ${c.nav.map((n, i) => `<button type="button" data-nav="${esc(n.target)}" data-i="${i}">${esc(n.label)}</button>`).join("")}
      <button type="button" data-theme-btn>THEME[<span data-theme-l>D</span>]</button>
      <button type="button" data-sound-btn>SOUND[<span data-sound-s>·</span>]</button>
    </nav>
    <div class="ll-spot" aria-hidden="true"></div>
    <div class="ll-t ll-col ll-c1">
      <div class="ll-ch ll-d2"><i>01</i><span>${esc(c.cols?.[0] || "Role")}</span></div>
      <h3 class="ll-role ll-rise ll-d2">${c.label.map(esc).join("<br>")}</h3>
    </div>
    <div class="ll-t ll-col ll-c2">
      <div class="ll-ch ll-d3"><i>02</i><span>${esc(c.cols?.[1] || "Approach")}</span></div>
      <h2 class="ll-h2" aria-label="${esc(c.tagline.join(" "))}">${c.tagline.map((l) => `<span class="ll-ln2" aria-hidden="true"><span>${esc(l)}</span></span>`).join("")}</h2>
    </div>
    <div class="ll-t ll-col ll-c3">
      <div class="ll-ch ll-d4"><i>03</i><span>${esc(c.cols?.[2] || "About")}</span></div>
      <p class="ll-bio ll-rise ll-d4">${esc(c.bio)}</p>
      <div class="ll-ctas ll-rise ll-d5">${(c.cta || []).map((b, i) => `<button type="button" class="ll-cta${i ? " is-ghost" : ""}" data-nav="${esc(b.target)}"><span>${esc(b.label)}</span><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></button>`).join("")}</div>
    </div>
    <div class="ll-t ll-mq ll-rise ll-d5" aria-hidden="true"><div class="ll-mq-track">${[0, 1].map(() => (c.marquee || []).map((m) => `<span>${esc(m)}</span><i></i>`).join("")).join("")}</div></div>
    <h1 class="ll-t ll-h1" aria-label="${esc(c.headline.join(" "))}">${c.headline.map((l) => `<span class="ll-ln" aria-hidden="true"><span>${esc(l)}</span></span>`).join("")}</h1>
    <div class="ll-t ll-mono ll-foot ll-clock ll-rise ll-d5" data-clock></div>
    <div class="ll-t ll-mono ll-foot ll-coords ll-rise ll-d5" data-coords>0000 X 0000 Y</div>
    <div class="ll-t ll-scroll ll-rise ll-d6" aria-hidden="true"><span>Scroll</span><i></i></div>
    <div class="ll-globe ll-rise ll-d6" aria-hidden="true">
      <svg viewBox="0 0 40 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
        <ellipse cx="20" cy="12" rx="19" ry="11"/>
        <ellipse cx="20" cy="12" rx="8" ry="11"/>
        <path d="M1 12H39M20 1V23M4.2 5.2C12 8 28 8 35.8 5.2M4.2 18.8C12 16 28 16 35.8 18.8"/>
      </svg>
    </div>
    <div class="ll-arrow" data-arrow><div class="ll-arrow-in">${bigArrowSvg()}</div><i class="ll-glint"></i></div>
  `;

  const $ = (sel) => root.querySelector(sel);
  const canvas = $(".ll-gl");
  const coordsEl = $("[data-coords]");
  const clockEl = $("[data-clock]");
  const arrowEl = $("[data-arrow]");

  /* ---------- sound ---------- */
  let soundOn = false, actx = null, lastTick = 0;
  const tick = (v) => {
    if (!soundOn) return;
    const now = performance.now();
    if (now - lastTick < 38) return;
    lastTick = now;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(340 + v * 460 + Math.random() * 70, t);
      o.frequency.exponentialRampToValueAtTime(130, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012 + 0.07 * v, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + 0.15);
    } catch { /* audio unavailable */ }
  };

  /* ---------- WebGL ---------- */
  // stickers are drawn inside the WebGL scene (behind the glass lettering), see falling.js
  const sprites = createFallingStickers({ startDelay: 0.9, stagger: 0.55, onImpact: tick });
  let glass = null;
  try { glass = createGlassScene(canvas, { ...(options.glass || {}), sprites }); } catch (e) { console.warn("[landing] glass failed:", e); }
  // shown while the WebGL scene is still being prepared (and as the fallback if it cannot start); the opaque canvas covers it once drawing begins
  canvas.style.background = "linear-gradient(135deg,#c5dcf0,#fdf3e1 55%,#c5dcf0)";

  /* ---------- pointer ---------- */
  let lastX = 0, lastY = 0, lastT = 0, hasLast = false;
  const rel = (e) => { const r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  const onMove = (e) => {
    if (e.pointerType === "touch" && !dragging) return;
    const [x, y, r] = rel(e);
    glass && glass.pointer(x, y, true);
    coordsEl.textContent = `${pad4(x)} X ${pad4(y)} Y`;
    const now = performance.now();
    if (hasLast) {
      const dt = Math.max(8, now - lastT);
      const k = 16 / dt;
      sprites.wind(x, y, (x - lastX) * k, (y - lastY) * k);   // the cursor shoves the piled stickers
    }
    lastX = x; lastY = y; lastT = now; hasLast = true;
    if (dragging && e.pointerId === dragging.id) dragging.b.drag = { x, y };
    else if (!dragging) root.style.cursor = sprites.pick(x, y) ? "grab" : "";
    root.style.setProperty("--sx", x.toFixed(0) + "px");
    root.style.setProperty("--sy", y.toFixed(0) + "px");
    root.style.setProperty("--hx", ((x / r.width - 0.5) * -10).toFixed(2) + "px");
    root.style.setProperty("--hy", ((y / r.height - 0.5) * -6).toFixed(2) + "px");
    // parallax for the big pointer
    const nx = x / r.width - 0.5, ny = y / r.height - 0.5;
    arrowEl.style.setProperty("--ax", (-nx * 26).toFixed(1));
    arrowEl.style.setProperty("--ay", (-ny * 18).toFixed(1));
    arrowEl.style.setProperty("--ar", (nx * 7).toFixed(2));
  };
  const onLeave = () => { glass && glass.pointer(lastX, lastY, false); hasLast = false; };
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);

  /* drag + throw (piled stickers only) */
  let dragging = null;
  const onDown = (e) => {
    if (e.target.closest("button, a")) return;
    const [x, y] = rel(e);
    const b = sprites.pick(x, y);
    if (!b) return;
    try { root.setPointerCapture(e.pointerId); } catch { /* noop */ }
    b.drag = { x, y };
    dragging = { b, id: e.pointerId };
    root.style.cursor = "grabbing";
    e.preventDefault();
  };
  const onUp = (e) => {
    if (!dragging || e.pointerId !== dragging.id) return;
    const { b } = dragging;
    b.drag = null;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 2600) { b.vx *= 2600 / sp; b.vy *= 2600 / sp; }
    try { root.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragging = null;
    root.style.cursor = "";
  };
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);

  /* ---------- theme / sound / nav ---------- */
  const setTheme = (dark, persist = true) => {
    root.dataset.theme = dark ? "dark" : "light";
    $("[data-theme-l]").textContent = dark ? "D" : "L";
    glass && glass.setDark(dark);
    if (persist) { try { localStorage.setItem("ll-theme", dark ? "dark" : "light"); } catch { /* private mode */ } }
  };
  /* dark is the default; only a saved "light" choice (made with the toggle) overrides it */
  let savedLight = false;
  try { savedLight = localStorage.getItem("ll-theme") === "light"; } catch { /* noop */ }
  setTheme(!savedLight, false);
  const setSound = (on) => {
    soundOn = on;
    $("[data-sound-s]").textContent = on ? "●" : "·";
    if (on) tick(0.6);
  };
  const scrollTo = (target) => {
    if (target === "next") { const w = root.closest(".pin-spacer") || root; smoothScrollTo(w.getBoundingClientRect().bottom + window.scrollY); }
    else if (target === "end") smoothScrollTo(document.documentElement.scrollHeight);
    else if (target === "projects") {
      const el = document.querySelector("[data-warp-wrap]");
      if (!el) { smoothScrollTo(document.documentElement.scrollHeight); return; }
      window.__skipHold = true;   // stop the paddock's arrival glide/lock from catching the jump half-way
      smoothScrollTo(el.getBoundingClientRect().top + window.scrollY, { duration: 2, onComplete: () => { setTimeout(() => { window.__skipHold = false; }, 300); } });
      setTimeout(() => { window.__skipHold = false; }, 4000);
    }
    else smoothScrollTo(target);
  };
  const onClick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-theme-btn")) setTheme(root.dataset.theme !== "dark");
    else if (b.hasAttribute("data-sound-btn")) setSound(!soundOn);
    else if (b.dataset.nav) scrollTo(b.dataset.nav);
  };
  root.addEventListener("click", onClick);
  const ctaMove = (e) => {
    if (e.pointerType === "touch") return;
    const b = e.target.closest && e.target.closest(".ll-cta");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px");
    b.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px");
    b.style.setProperty("--lx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    b.style.setProperty("--ly", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
  };
  const ctaOut = (e) => { const b = e.target.closest && e.target.closest(".ll-cta"); if (b) { b.style.setProperty("--mx", "0px"); b.style.setProperty("--my", "0px"); } };
  root.addEventListener("pointermove", ctaMove);
  root.addEventListener("pointerout", ctaOut);
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "l" || e.key === "L") setTheme(false);
    else if (e.key === "d" || e.key === "D") setTheme(true);
  };
  window.addEventListener("keydown", onKey);

  /* ---------- footnote (static text, no fake live data) ---------- */
  clockEl.textContent = c.footnote || "";
  const clockTimer = 0;

  destroy.setLoad = (m) => glass && glass.setLoad && glass.setLoad(m);
  return destroy;

  function destroy() {
    clearInterval(clockTimer);
    window.removeEventListener("keydown", onKey);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onUp);
    root.removeEventListener("click", onClick);
    root.removeEventListener("pointermove", ctaMove);
    root.removeEventListener("pointerout", ctaOut);
    sprites.destroy();
    glass && glass.destroy();
    root.innerHTML = "";
    root.classList.remove("ll");
    try { actx && actx.close(); } catch { /* noop */ }
  }
}

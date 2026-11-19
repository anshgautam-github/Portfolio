// Diagnostic only (open the site with ?probe): shows, on screen, which elements keep flipping visibility or reversing opacity
// (that reversal is what the eye reads as flicker). Does nothing unless the URL has "probe".
export function startFlickerProbe() {
  // bisect switches: ?x=a,b,c,d adds html.x-a ... so one layer group at a time can be removed on a real phone (see freefallLoader.css, bottom)
  const m = typeof location !== "undefined" && /[?&]x=([a-z,]+)/.exec(location.search);
  if (m) m[1].split(",").forEach((k) => document.documentElement.classList.add("x-" + k));
  if (typeof window === "undefined" || !/[?&]probe\b/.test(location.search)) return;
  const st = new WeakMap(), score = new Map();
  const name = (el) => (el.tagName || "").toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const hit = (el, kind) => { const k = name(el) + " " + kind; score.set(k, (score.get(k) || 0) + 1); };
  const check = (el) => {
    const s = el.style; if (!s) return;
    const o = parseFloat(s.opacity), v = s.visibility;
    let r = st.get(el); if (!r) { r = { o: isNaN(o) ? null : o, v, d: 0 }; st.set(el, r); return; }
    if (v !== r.v) { if (r.v !== undefined) hit(el, "visibility"); r.v = v; }
    if (!isNaN(o) && r.o !== null && o !== r.o) { const d = Math.sign(o - r.o); if (r.d && d !== r.d) hit(el, "opacity-reversal"); r.d = d; }
    if (!isNaN(o)) r.o = o;
  };
  new MutationObserver((ms) => { for (const m of ms) if (m.type === "attributes") check(m.target); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["style"], subtree: true });
  const box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;margin:0;padding:6px 8px;font:10px/1.35 monospace;color:#7CFF9B;background:rgba(0,0,0,.82);pointer-events:none;white-space:pre-wrap;max-height:34vh;overflow:hidden";
  document.body.appendChild(box);
  setInterval(() => {
    const top = [...score].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, n]) => n + "x  " + k);
    box.textContent = "FLICKER PROBE (last 4s)\n" + (top.join("\n") || "no flips yet");
    score.clear();
  }, 4000);
}

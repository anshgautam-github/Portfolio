import { useLayoutEffect, useRef, useState } from "react";
import { markup } from "./markup.js";
import { mountFreefallStory } from "./engine.js";
import { createClouds } from "./clouds.js";
import { createCloudFx } from "./cloudFx.js";
import { release, pendingTasks } from "../../lib/loader.js";
import { IS_MOBILE } from "../../lib/perf.js";
import { buildFramePath, readFrameVars } from "../Frame/Frame.jsx";
import { hudAt, fmtAlt, fmtVel, fmtMet, fmtLat, fmtLon, fmtG, STAGES, EVENTS } from "./loaderHud.js";
import "../Frame/frame.css";
import "./freefallStory.css";
import "./freefallLoader.css";

/**
 * <FreefallLoader /> - the site's loader: a full-screen overlay that plays the descent (orbit, rocket, the jump, parachute, SRM) on top of the
 * page, then lifts to reveal the website. It is NOT part of the page flow. It does NOT play by itself: it moves only while the visitor scrolls
 * down (wheel / swipe / arrow keys; scrolling back up rewinds it), and "Skip intro" (or Esc) runs it to the end. It uses the same engine as the in-page story, in 'loader' mode (virtual progress).
 * When it ends in the SRM flash it calls release() (lib/loader.js) so the landing starts its own intro behind the lifting overlay.
 */
const END = 0.99;           // story progress where the loader ends: the index of floating tiles (the descent, the SRM flash, the crowd's noise, the fire ring, RISE, then the tiles)
const POST = 0.505;         // the SRM flash has cleared: from here the ending plays on by scroll, with a slow cruise so nobody gets stuck
const CRUISE = (END - POST) / 42000;   // idle drift per ms through the ending (about 42 s end to end); scrolling / swiping speeds it up
const DWELL = 1700;         // ms to rest on the finished index tiles before the clouds roll in
const DURATION = 52000;     // only used for how fast the flash is crossed once the landing is ready
const LOCK_MS = 500;        // after the clouds have parted the landing page cannot be scrolled for this long
const CLOUD_MS = 3800;      // the cloud transition onto the landing page (clouds roll in, hide the hand-over, part from the centre)
const BADGE = "ANSH GAUTAM \u00b7 AI ENGINEER \u00b7 BUILDER \u00b7 MENTOR \u00b7 ";
const HOLD = 0.462;         // wait here (just before the flash) until the landing scene below has finished building, then run on by itself

export default function FreefallLoader() {
  const ref = useRef(null);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { release(true); setGone(true); return undefined; }
    // the loader always opens the visit at the TOP of the page: a reload would otherwise restore the old scroll position (e.g. the chapters far
    // below) and the loader would lift onto that instead of the landing page
    const toTop = () => { try { window.__lenis && window.__lenis.scrollTo(0, { immediate: true, force: true }); } catch (e) { /* ignore */ } window.scrollTo(0, 0); };
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    toTop();
    const host = root.querySelector(".fs");
    const bar = root.querySelector(".fl-bar i"), num = root.querySelector(".fl-num"), tag = root.querySelector(".fl-tag");
    let tagTxt = "";
    // mission-control readout: refs + a tiny "write only when the text changed" helper, so the per-frame update never touches layout needlessly
    const q = (c) => root.querySelector(c);
    let SH = {};   // the story's own big readout (built after the markup is mounted): the monitor quotes the same numbers, so the two never disagree
    const H = { scan: q(".fl-scan"), vig: q(".fl-vig"), telem: q(".fl-telem"), g: q(".fl-g"), log: Array.from(root.querySelectorAll(".fl-log li")), alt: q(".fl-alt"), vel: q(".fl-vel"), lat: q(".fl-lat"), lon: q(".fl-lon"), met: q(".fl-met"), lock: q(".fl-lock"), phase: q(".fl-phase span"), mark: q(".fl-mark"), markV: q(".fl-mark-v"), badge: q(".fl-badge-ring"), st: Array.from(root.querySelectorAll(".fl-st li")) };
    const memo = new Map();
    const put = (el, txt) => { if (el && memo.get(el) !== txt) { memo.set(el, txt); el.textContent = txt; } };
    let gLast = -1, stIdx = -1, shaken = false, feedOn = false, fitN = 0, telemOff = false;
    let evN = -1;
    const hud = (p) => {
      const h = hudAt(p);
      if (!SH.num) SH = { num: q(".hud-num"), unit: q(".hud-unit"), vel: q(".hud-vel"), clock: q(".hud-clock") };
      const sAlt = SH.num && SH.num.textContent ? (SH.num.textContent + " " + (SH.unit ? SH.unit.textContent : "km")).toUpperCase() : fmtAlt(h.alt);
      const sVel = SH.vel && SH.vel.textContent ? SH.vel.textContent + " M/S" : fmtVel(h.vel);
      const sMet = SH.clock && SH.clock.textContent ? "T+ " + SH.clock.textContent : fmtMet(h.sec);
      put(H.alt, sAlt); put(H.vel, sVel); put(H.lat, fmtLat(h.lat)); put(H.lon, fmtLon(h.lon)); put(H.g, fmtG(h.g));
      put(H.met, sMet); put(H.phase, h.phase); put(H.lock, String(Math.round(h.k * 100)).padStart(2, "0") + "% LOCK"); put(H.markV, sAlt);
      // mission log: the newest three events that have happened by now
      let n = 0; for (let i = 0; i < EVENTS.length; i++) if (p >= EVENTS[i][0]) n = i + 1;
      if (n !== evN) {
        evN = n;
        H.log.forEach((li, k) => {
          const e = EVENTS[n - 1 - k];
          li.style.visibility = e ? "visible" : "hidden";
          if (e) { li.firstChild.textContent = fmtMet(hudAt(e[0]).sec); li.lastChild.textContent = e[1]; li.classList.toggle("is-new", k === 0); }
        });
      }
      // the picture shakes with the G-load (strongest through the entry burn and the chute shock), like a camera bolted to the capsule
      const sh = IS_MOBILE ? 0 : Math.min(1, h.g / 7);          // phones: no whole-scene shake (it re-rasters the 3D scene every frame and reads as flicker)
      if (sh > 0.02) { const t = performance.now(); host.style.transform = `translate3d(${(Math.sin(t * 0.071) + Math.sin(t * 0.173)) * sh * 1.7}px,${(Math.sin(t * 0.093) + Math.sin(t * 0.211)) * sh * 1.7}px,0) scale(${1 + sh * 0.012})`; shaken = true; }
      else if (shaken) { host.style.transform = ""; shaken = false; }
      const gq = Math.round(sh * 40) / 40;                      // quantised, and set only on the two overlays that read it: a custom property changed on the root restyles the whole story tree every frame
      if (gq !== gLast) { gLast = gq; const gs = gq.toFixed(3); if (H.scan) H.scan.style.setProperty("--g", gs); if (H.vig) H.vig.style.setProperty("--g", gs); }
      // the live feed waits until the big name has dissolved, then fades in (and tucks away again if you scroll back to the start)
      // keep clear of the story's own text: the card steps aside whenever a caption (or the big altitude block) would reach it
      if ((fitN = (fitN + 1) % 24) === 0 && H.telem) {
        const tr = H.telem.getBoundingClientRect();
        let clash = false;
        if (tr.width) {
          if (!SH.caps) SH.caps = Array.from(root.querySelectorAll(".cap")); 
          for (const c of SH.caps) { if ((c.style.opacity !== "" ? parseFloat(c.style.opacity) : parseFloat(getComputedStyle(c).opacity)) > 0.05) { const r = c.getBoundingClientRect(); if (r.bottom > tr.top - 14 && r.top < tr.bottom && r.left < tr.right && r.right > tr.left) { clash = true; break; } } }
          const sh = root.querySelector("#fs-hud");
          if (!clash && sh && getComputedStyle(sh).visibility !== "hidden" && parseFloat(getComputedStyle(sh).opacity) > 0.05) { const r = sh.getBoundingClientRect(); if (r.top < tr.bottom + 14 && r.bottom > tr.top && r.left < tr.right) clash = true; }
        }
        if (clash !== telemOff) { telemOff = clash; H.telem.classList.toggle("is-yield", clash); }
      }
      const fd = p > 0.05;
      if (fd !== feedOn) { feedOn = fd; root.classList.toggle("is-feed", fd); }
      if (H.mark) H.mark.style.transform = `translate3d(0,${(h.mark * 100).toFixed(2)}%,0)`;
      if (H.badge) H.badge.style.transform = `rotate(${(p * 900).toFixed(1)}deg)`;
      if (h.stage !== stIdx) { stIdx = h.stage; H.st.forEach((li, i) => { li.classList.toggle("is-on", i === stIdx); li.classList.toggle("is-done", i < stIdx); }); }
    };
    hud(0);
    // the readout slides in once the scene has settled
    const hudT = setTimeout(() => root.classList.add("is-hud"), 700);
    const ringP = root.querySelector(".fl-ringp"), edgeP = root.querySelector(".fl-edge");
    const drawRing = () => { const d = buildFramePath(root.clientWidth, root.clientHeight, readFrameVars(root)); ringP.setAttribute("d", d.ring); edgeP.setAttribute("d", d.edge); };
    drawRing();
    const ro = new ResizeObserver(drawRing); ro.observe(root);
    const skipBtn = root.querySelector(".fl-skip");
    const base = `${import.meta.env.BASE_URL}freefall-story/`;
    host.innerHTML = markup(base);
    let destroy = null;
    try { destroy = mountFreefallStory(host, { base, mode: "loader" }); } catch (err) { console.error(err); release(true); setGone(true); return undefined; }

    const preloadT = setTimeout(() => { try { destroy.preload(); } catch (e) { /* ignore */ } }, 1500);   // the ending needs the film frames: start fetching them early
    const cloudEl = root.querySelector(".fl-cloud");
    const T = { p: 0, boost: 0, back: 0, skip: false, done: false, tc: 0, released: false, out: false };
    let clouds = null, cfx = null;
    const t0 = performance.now();
    let last = t0, raf = 0, finishT = 0, holdStart = 0;
    const finish = () => {
      if (T.done) return;
      T.done = true;
      toTop();
      T.tc = performance.now();
      root.classList.add("is-clouding");
      try { clouds = createClouds(cloudEl); } catch (e) { clouds = null; }
      try { cfx = clouds && createCloudFx(root.querySelector(".fl-fx")); } catch (e) { cfx = null; }   // mist, an airliner, glints and an altitude readout on top of the cloud
      if (!clouds) { release(); root.classList.add("is-out"); finishT = setTimeout(() => { T.over = true; setGone(true); }, 1500); T.out = true; }   // no WebGL: plain fade
    };
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - last); last = now;
      if (T.done) {
        destroy.setProgress(END);
        if (!clouds || T.out) return;
        if (!T.out) toTop();                                            // nothing scrolled during the clouds may reach the landing page: it always opens from its very start
        const k = Math.min(1, (now - T.tc) / CLOUD_MS);
        clouds.draw(k, (now - t0) / 1000);
        if (cfx) cfx.draw(k, (now - t0) / 1000);
        // the landing's own intro starts while the clouds are still thick, so it is already playing as they part
        if (k > 0.4 && !T.released) { T.released = true; toTop(); release(); }
        // under the thickest cloud the descent is swapped for the (transparent) window onto the landing page
        host.style.opacity = String(1 - Math.min(1, Math.max(0, (k - 0.46) / 0.08)));
        if (k >= 1) { T.out = true; T.unlock = now + LOCK_MS; toTop(); root.classList.add("is-out"); finishT = setTimeout(() => { T.over = true; setGone(true); }, 700); }
        return;
      }
      if (T.skip) {                                                     // "Skip": a fast, accelerating plunge straight to the SRM flash and the landing page
        if (!T.sk0) { T.sk0 = now; T.skFrom = T.p; root.classList.add("is-skipping"); }
        const k = Math.min(1, (now - T.sk0) / 2400);
        const target = T.skFrom + (END - T.skFrom) * (k * k * (1.6 - 0.6 * k));
        if (target > T.p) T.p = target;
      }
      const b = T.boost * 0.18; T.p += b; T.boost -= b;
      if (T.p < 0) T.p = 0;
      // at the end of the descent (just before the flash) wait for the landing scene below AND the film frames to finish loading - but never trap the visitor
      // (8 s at most), and when they are ready cross the flash by itself
      if (T.p >= HOLD && !T.go) {
        if (!holdStart) holdStart = now;
        if ((pendingTasks() === 0 && destroy.filmReady()) || now - holdStart > 8000) T.go = true; else T.p = HOLD;
      } else if (T.p < HOLD - 0.01) holdStart = 0;
      const auto = now > T.back;                                        // scrolling back pauses the self-running parts, so the visitor can actually scrub backwards
      if (T.go && auto && T.p >= HOLD - 0.002 && T.p < POST) T.p += (END / DURATION) * dt * 10;
      // the ending (crowd, noise, fire ring, RISE, index tiles): scroll drives it, a slow cruise carries it on if the visitor stops
      if (auto && T.p >= POST && T.p < END && !T.skip) T.p += CRUISE * dt;
      if (T.p >= END) {
        T.p = END;
        if (!T.end0) T.end0 = now;                                  // rest a moment on the finished index
        if (now - T.end0 > (T.skip ? 500 : DWELL)) finish();
      } else T.end0 = 0;
      destroy.setProgress(T.p);
      hud(T.p);
      bar.style.transform = `scaleX(${(T.p / END).toFixed(4)})`;
      put(num, String(Math.round((T.p / END) * 100)).padStart(3, "0"));
      const tt = T.p < 0.47 ? "% FALLING" : T.p < 0.685 ? "% LANDED" : T.p < 0.86 ? "% RISING" : "% READY";
      if (tt !== tagTxt) { tagTxt = tt; tag.textContent = tt; }
    };
    raf = requestAnimationFrame(tick);

    // input: scroll / swipe / keys scrub the descent (forward faster, back slower); it keeps falling by itself otherwise
    const locked = () => T.done && !(T.unlock && performance.now() >= T.unlock);   // the landing page stays still for half a second after the clouds part
    const onWheel = (e) => { if (T.done && !locked()) return; e.preventDefault(); if (T.done) { e.stopPropagation(); return; } T.boost += e.deltaY * 0.00006; if (e.deltaY < 0) T.back = performance.now() + 1800; };
    let ty = 0;
    const onTS = (e) => { ty = e.touches[0].clientY; };
    const onTM = (e) => { if (T.done && !locked()) return; e.preventDefault(); if (T.done) { e.stopPropagation(); return; } const y = e.touches[0].clientY; T.boost += (ty - y) * 0.00014; if (y > ty) T.back = performance.now() + 1800; ty = y; };
    const onKey = (e) => {
      if (T.done && !T.over) { if (!locked()) return; if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) e.preventDefault(); return; }
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { T.boost += 0.012; e.preventDefault(); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { T.boost -= 0.012; T.back = performance.now() + 1800; e.preventDefault(); }
      else if (e.key === "Escape") { T.skip = true; T.boost = 0; }
    };
    const onSkip = () => { T.skip = true; T.boost = 0; };
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTS, { passive: true });
    root.addEventListener("touchmove", onTM, { passive: false });
    window.addEventListener("keydown", onKey);
    skipBtn.addEventListener("click", onSkip);

    return () => {
      cancelAnimationFrame(raf); clearTimeout(finishT); clearTimeout(preloadT); clearTimeout(hudT); ro.disconnect(); if (clouds) clouds.destroy(); if (cfx) cfx.destroy();
      root.removeEventListener("wheel", onWheel); root.removeEventListener("touchstart", onTS); root.removeEventListener("touchmove", onTM);
      window.removeEventListener("keydown", onKey); skipBtn.removeEventListener("click", onSkip);
      destroy(); host.innerHTML = "";
    };
  }, []);

  if (gone) return null;
  return (
    <div className="fs-loader" ref={ref} role="status" aria-label="Loading: a story told in one fall">
      <section className="fs fs--loader" />
      <canvas className="fl-cloud" aria-hidden="true" />
      <canvas className="fl-fx" aria-hidden="true" />
      {/* the site's own curvy window: beige ring + the notch, with a loader readout where the brand tab sits on the real page */}
      <svg className="fl-svg" width="100%" height="100%" aria-hidden="true"><path className="fl-ringp" fillRule="evenodd" /><path className="fl-edge" /></svg>
      <div className="fl-tab" aria-hidden="true"><span className="fl-num">000</span><span className="fl-tag">% FALLING</span></div>
      <button className="fl-skip" type="button">Skip intro</button>
      <div className="fl-bar" aria-hidden="true"><i /></div>

      {/* ---- mission control: grain + vignette over the scene, then the readout (all decorative; driven by the same progress as the descent) ---- */}
      <div className="fl-grain" aria-hidden="true" />
      <div className="fl-scan" aria-hidden="true" />
      <div className="fl-vig" aria-hidden="true" />
      <div className="fl-corners" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="fl-hud" aria-hidden="true">

        <div className="fl-badge">
          <span className="fl-badge-spin">
            <svg viewBox="0 0 120 120" className="fl-badge-ring">
              <defs><path id="fl-bp" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" /></defs>
              <text><textPath href="#fl-bp" textLength="282" lengthAdjust="spacing">{BADGE}</textPath></text>
            </svg>
          </span>
          <span className="fl-badge-core"><b>AG</b></span>
        </div>

        <div className="fl-telem">
          <div className="fl-t-head"><span>Mission telemetry</span><em className="fl-met">T+ 00:00</em></div>
          <div className="fl-t-row"><span>Alt</span><b className="fl-alt">408.0 KM</b></div>
          <div className="fl-t-row"><span>Vel</span><b className="fl-vel">7.66 KM/S</b></div>
          <div className="fl-t-row"><span>G-load</span><b className="fl-g">0.0 G</b></div>
          <div className="fl-t-row"><span>Lat</span><b className="fl-lat">27.4000° N</b></div>
          <div className="fl-t-row"><span>Lon</span><b className="fl-lon">61.8000° E</b></div>
          <div className="fl-t-row"><span>Tgt</span><b>Chennai, IN <small className="fl-lock">00% LOCK</small></b></div>
          <div className="fl-phase"><i /><span>Orbit</span></div>
        </div>

        <div className="fl-ruler">
          <span className="fl-r-cap">Orbit</span>
          <div className="fl-r-track">
            <div className="fl-mark"><i /><em className="fl-mark-v">408.0 KM</em></div>
          </div>
          <span className="fl-r-cap">Ground</span>
        </div>

        <div className="fl-feed">
          <div className="fl-feed-h"><i /><span>Live feed</span><b>CAM 02 &middot; ONBOARD</b></div>
          <ol className="fl-log"><li><em /><span /></li><li><em /><span /></li><li><em /><span /></li></ol>
        </div>

        <ol className="fl-st">
          {STAGES.map(([name, at]) => (<li key={name} style={{ left: ((at / END) * 100).toFixed(2) + "%" }}><i /><span>{name}</span></li>))}
        </ol>
      </div>
    </div>
  );
}

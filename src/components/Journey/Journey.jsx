import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { getGL, texture } from "./glUtil.js";
import { makeWorld, makeRegion } from "./maps.js";
import { createEarth } from "./earthGL.js";
import { createTerrain } from "./terrainGL.js";
import { createCity, CITY_LABELS } from "./cityGL.js";
import { terrainState, earthState, showEarth, showTerrain, showCore, altitudeKm, sm } from "./camera.js";
import { drawHUD } from "./hud.js";
import { drawCore } from "./coreFx.js";
import { createCore } from "./coreGL.js";
import { createShatter } from "./shatter.js";
import { createPortal } from "./portal.js";
import "./journey.css";
import { capDpr, START_SCALE, IS_MOBILE } from "../../lib/perf.js";

gsap.registerPlugin(ScrollTrigger);

const fmtAlt = (km) => (km >= 100 ? Math.round(km).toLocaleString("en-US") + " KM" : km >= 1 ? km.toFixed(1) + " KM" : Math.round(km * 1000) + " M");
const fmtLat = (v) => Math.abs(v).toFixed(4) + "°" + (v >= 0 ? "N" : "S");
const fmtLon = (v) => Math.abs(v).toFixed(4) + "°" + (v >= 0 ? "E" : "W");

export default function Journey() {
  const J = content.journey;
  const sec = useRef(null);
  const pin = useRef(null);
  const glRef = useRef(null);
  const coreRef = useRef(null);
  const shRef = useRef(null);
  const irisRef = useRef(null);
  const hudRef = useRef(null);
  const stRefs = useRef([]);
  const rd = useRef({});
  const barRef = useRef(null);
  const [noGL, setNoGL] = useState(false);

  useEffect(() => {
    const secEl = sec.current;
    const glc = glRef.current, coreC = coreRef.current, hudC = hudRef.current;
    const gl = getGL(glc);
    if (!gl) setNoGL(true);

    let earth = null, terrain = null, city = null, core3d = null, ready = false, dead = false, idleId = 0;
    if (gl) {
      // Heavy CPU texture generation + shader compiles used to run in one long task right at page load.
      // Now: wait until the page is idle after load, then do it in small slices so scrolling/painting never stalls.
      const steps = [
        () => { gl.activeTexture(gl.TEXTURE0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); texture(gl, makeWorld(3072, 1536), 0); },
        () => { gl.activeTexture(gl.TEXTURE0); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); texture(gl, makeRegion(3584, 2688), 1); },
        () => { earth = createEarth(gl); },
        () => { terrain = createTerrain(gl); },
        () => { city = createCity(gl); },
        () => { core3d = createCore(gl); },
        () => { ready = !!(earth && terrain); if (!ready) setNoGL(true); },
      ];
      let si = 0;
      const init = () => {
        if (dead) return;
        if (si < steps.length) { steps[si++](); idleId = setTimeout(init, 90); }
      };
      const start = () => { idleId = setTimeout(init, 1200); };
      if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
    }

    const shC = shRef.current;
    const shCtx = shC.getContext("2d");
    const shatter = createShatter();
    const SH = 1.0, IR = 1.5, TOT = IR + J.length + SH;
    const irisEl = secEl.querySelector(".jr-iris");
    const portal = createPortal(), pctx = irisEl.getContext("2d");
    let pw = 0, ph = 0;
    let sigEl = null;
    let irisT = 0, irisCur = 0;
    let spin = 0, shT = 0, shCur = 0, snapped = false, SW = 0, SHh = 0;
    const coreCtx = coreC.getContext("2d");
    const hudCtx = hudC.getContext("2d");
    let W = 0, H = 0, scale = START_SCALE, dpr = 1, hudDpr = 1, cw = 0, ch = 0;
    const size = () => {
      cw = pin.current.clientWidth; ch = pin.current.clientHeight;
      dpr = capDpr(2, 1.25);
      W = Math.round(cw * dpr * scale); H = Math.round(ch * dpr * scale);
      glc.width = W; glc.height = H;
      hudDpr = capDpr(1.5, 1);
      hudC.width = Math.round(cw * hudDpr); hudC.height = Math.round(ch * hudDpr);
      const cs = 0.75;
      coreC.width = Math.round(cw * cs); coreC.height = Math.round(ch * cs);
      SW = Math.round(cw * Math.min(dpr, 1.25)); SHh = Math.round(ch * Math.min(dpr, 1.25));
      shC.width = SW; shC.height = SHh;
      if (gl) gl.viewport(0, 0, W, H);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(pin.current);

    let target = 0, cur = 0, active = false, last = 0, frames = 0, slow = 0, acc = 0, lastP = -1, tick = 0;
    const T0 = performance.now();

    const setT = (prog) => {
      const v0 = prog * TOT;
      irisT = Math.min(1, v0 / IR);
      const v = Math.max(0, v0 - IR);
      const sS = Math.min(1, v / J.length);
      const A = 2.7 / J.length, B = 6.6 / J.length;
      target = sS < A ? (sS / A) * 0.3 : sS < B ? 0.3 + ((sS - A) / (B - A)) * 0.13 : 0.43 + ((sS - B) / (1 - B)) * 0.57;
      shT = Math.max(0, Math.min(1, (v - J.length) / SH));
    };
    const st = ScrollTrigger.create({
      trigger: secEl,
      start: "top top",
      end: () => "+=" + Math.round(window.innerHeight * TOT),
      pin: pin.current,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => setT(self.progress),
      onToggle: (self) => { active = self.isActive; },
      onRefresh: (self) => { setT(self.progress); pin.current.style.visibility = self.progress >= 1 && !self.isActive ? "hidden" : "visible"; },
      onLeave: () => { pin.current.style.visibility = "hidden"; },
      onEnterBack: () => { pin.current.style.visibility = "visible"; },
    });
    let wideActive = false;
    // also render a little before/after the pin so the first/last frame is already there
    const wide = ScrollTrigger.create({
      start: () => st.start - 120, end: () => st.end + window.innerHeight,
      onToggle: (s) => { wideActive = s.isActive; },
    });


    const stages = J.stages;
    const PIECE = [[-160, -240, -10], [-340, -320, -7], [380, 300, 8], [-120, 320, 6], [260, -260, -9]];
    const pieces = () => { const el = stRefs.current[stages.length - 1]; return el ? Array.from(el.querySelectorAll(".jr-tag, .jr-title span, .jr-body, .jr-cta")) : []; };
    const barEl = () => secEl.querySelector(".jr-bar");
    const render = (time, dt) => {
      if (!sigEl || !sigEl.isConnected) sigEl = document.querySelector(".rv-sig");
      if (!(active || wideActive)) {
        // scrolled far away (fast scroll-back): never leave the warp overlay behind
        if (irisEl.style.opacity !== "0") { irisEl.style.opacity = "0"; pctx.clearRect(0, 0, pw, ph); }
        irisCur = irisT;
        pin.current.style.opacity = irisT <= 0 ? "0" : "1"; pin.current.style.transform = "none";
        if (sigEl) sigEl.style.opacity = irisT <= 0 ? "" : "0";
        if (irisT <= 0) portal.reset();
        return;
      }
      const now = performance.now();
      const k = 1 - Math.pow(0.0001, dt / 1000);
      cur += (target - cur) * Math.min(1, k * 0.9);
      if (Math.abs(target - cur) < 1e-5) cur = target;
      irisCur += (irisT - irisCur) * Math.min(1, k * 0.9);
      if (Math.abs(irisT - irisCur) < 1e-4) irisCur = irisT;
      {
        const i = irisCur;
        const nw = Math.round(cw * Math.min(dpr, IS_MOBILE ? 1 : 1.5)), nh = Math.round(ch * Math.min(dpr, IS_MOBILE ? 1 : 1.5));
        if (irisEl.width !== nw || irisEl.height !== nh) { irisEl.width = pw = nw; irisEl.height = ph = nh; }
        const a = sm(0.55, 0.92, i), z = 1 + 0.5 * Math.pow(1 - sm(0.45, 1, i), 2);   // the planet fades up out of the light while flying in from close range
        pin.current.style.opacity = i >= 0.999 ? "1" : a.toFixed(3);
        pin.current.style.transform = i >= 0.999 ? "none" : `scale(${z.toFixed(4)})`;
        irisEl.style.opacity = i <= 0.001 || i >= 0.999 ? "0" : "1";
        portal.draw(pctx, pw, ph, i, now / 1000, sigEl, cw, ch);
        if (sigEl) sigEl.style.opacity = i <= 0.002 ? "" : String(Math.max(0, 1 - i / 0.05));
        if (i <= 0.002) portal.reset();
      }
      shCur += (shT - shCur) * Math.min(1, k * 0.9);
      if (Math.abs(shT - shCur) < 1e-4) shCur = shT;
      const p = cur;
      const t = (now - T0) / 1000;

      // adaptive resolution
      if (last) {
        acc += now - last; frames++;
        if (frames >= 40) {
          const avg = acc / frames;
          if (!navigator.webdriver && avg > 26 && scale > 0.5) { scale = Math.max(0.5, scale - 0.12); size(); }
          acc = 0; frames = 0;
        }
      }
      last = now;

      spin += (dt / 1000) * 7.5 * (1 - sm(0, 0.02, p));
      const es = earthState(p, spin), ts = terrainState(p);
      const S = { p, earth: es, ter: ts, city, labels: CITY_LABELS };

      const shat = shCur > 0.0005;
      if (!snapped) {
        // WebGL
        if (ready) {
          const sE = showEarth(p), sT = showTerrain(p);
          glc.style.visibility = "visible";
          const inCore = core3d && p > 0.79;
          if (p <= 0.9 || !core3d) {
            if (sE) earth.draw(W, H, es, t);
            else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
            if (sT) terrain.draw(W, H, ts, t);
            if (city && p > 0.39 && p < 0.9) city.draw(W, H, p, t);
          } else { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
          if (inCore) {
            core3d.draw(W, H, sm(0.8, 0.98, p), sm(0.805, 0.875, p), sm(0.8, 0.83, p) * (1 - sm(0.83, 0.88, p)), t, 0, 0.35 + 0.65 * sm(0.82, 0.9, p));
          }
        }
        // legacy 2D core (fallback only)
        if (showCore(p) && !core3d) {
          coreC.style.visibility = "visible";
          drawCore(coreCtx, coreC.width, coreC.height, sm(0.8, 1, p), sm(0.78, 0.86, p), t);
        } else coreC.style.visibility = "hidden";
        // hud
        hudCtx.setTransform(hudDpr, 0, 0, hudDpr, 0, 0);
        drawHUD(hudCtx, cw, ch, S, t);
      }
      // shatter exit: freeze the last frame and break it into shards
      if (shat && !snapped) {
        shatter.capture(glc, hudC, SW, SHh);
        snapped = true;
        pin.current.classList.add("shat");
        shC.style.visibility = "visible";
      } else if (!shat && snapped) {
        snapped = false;
        pin.current.classList.remove("shat");
        shC.style.visibility = "hidden";
        shCtx.clearRect(0, 0, SW, SHh);
        pieces().forEach((el) => { el.style.transform = ""; el.style.filter = ""; el.style.opacity = ""; });
        barEl().style.opacity = "";
      }
      if (snapped) {
        shatter.draw(shCtx, SW, SHh, shCur);
        const ps = pieces();
        ps.forEach((el, i) => {
          const o = PIECE[i % PIECE.length];
          const u = Math.min(1, Math.max(0, (shCur - 0.1 - i * 0.035) / 0.55));
          const e = u * u * (3 - 2 * u);
          el.style.transform = `translate3d(${o[0] * e}px,${o[1] * e + 260 * e * e}px,0) rotate(${o[2] * e}deg) scale(${1 + 0.35 * e})`;
          if (!IS_MOBILE) el.style.filter = e > 0.02 ? `blur(${(e * 9).toFixed(1)}px)` : "none";
          el.style.opacity = String(1 - Math.pow(e, 1.3));
        });
        barEl().style.opacity = String(1 - Math.min(1, shCur / 0.12));
      }
      // text stages
      stages.forEach((s, i) => {
        const el = stRefs.current[i];
        if (!el) return;
        const [a, b, c, d] = s.range;
        const v = sm(a, b, p) * (1 - sm(c, d, p));
        if (v < 0.003) { if (el.style.visibility !== "hidden") el.style.visibility = "hidden"; return; }
        el.style.visibility = "visible";
        el.style.opacity = v;
        const into = 1 - sm(a, b, p), out = sm(c, d, p);
        el.style.transform = `translate3d(0,${into * 36 - out * 28}px,0)`;
        if (!IS_MOBILE) el.style.filter = v < 0.98 ? `blur(${((1 - v) * 10).toFixed(1)}px)` : "none";
      });

      // readouts (throttled)
      if (++tick % 3 === 0 && Math.abs(p - lastP) > 1e-5) {
        lastP = p;
        let idx = 0;
        stages.forEach((s, i) => { if (p >= s.range[0] + (s.range[1] - s.range[0]) * 0.5) idx = i; });
        const r = rd.current;
        r.stage.textContent = String(idx + 1).padStart(2, "0") + " / " + String(stages.length).padStart(2, "0");
        r.name.textContent = stages[idx].tag;
        if (p > 0.8) {
          r.lat.textContent = "NODE"; r.lon.textContent = "ONLINE"; r.alt.textContent = "—";
        } else if (p < 0.3) {
          const lat = (es.la * 180) / Math.PI, lon = (es.lo * 180) / Math.PI;
          r.lat.textContent = fmtLat(lat); r.lon.textContent = fmtLon(lon); r.alt.textContent = fmtAlt(altitudeKm(p, ts));
        } else if (city && p > 0.44) {
          const e = city.eye();
          const k = Math.min(1, Math.max(0, e[2] / 1400));
          r.lat.textContent = fmtLat(13.083 - 0.26 * k + e[0] * 9e-6);
          r.lon.textContent = fmtLon(80.27 - 0.225 * k + e[0] * 1e-5);
          r.alt.textContent = fmtAlt(Math.max(0.03, e[1] / 1000));
        } else {
          r.lat.textContent = fmtLat(ts.c[1]); r.lon.textContent = fmtLon(ts.c[0]); r.alt.textContent = fmtAlt(altitudeKm(p, ts));
        }
        barRef.current.style.transform = `scaleX(${p})`;
      }
    };
    gsap.ticker.add(render);

    return () => {
      gsap.ticker.remove(render);
      st.kill(); wide.kill(); ro.disconnect();
      dead = true;
      clearTimeout(idleId);
    };
  }, []);

  const set = (k) => (el) => { rd.current[k] = el; };

  return (
    <section ref={sec} className="jr" id="journey" aria-label="Journey from orbit to my desk">
      <canvas ref={irisRef} className="jr-iris" />
      <div ref={pin} className="jr-pin" style={{ opacity: 0 }}>
        <div className={"jr-fallback" + (noGL ? " on" : "")} />
        <canvas ref={glRef} className="jr-gl" />
        <canvas ref={coreRef} className="jr-core" />
        <canvas ref={hudRef} className="jr-hud" />
        <canvas ref={shRef} className="jr-shatter" />
        <div className="jr-shade" />
        <div className="jr-grain" />

        <div className="jr-bar">
          <div className="jr-bar-l"><span className="jr-plus">+</span> {J.label}</div>
          <div className="jr-bar-r">
            <span><i>STAGE</i> <b ref={set("stage")}>01 / 06</b></span>
            <span><i>LAT</i> <b ref={set("lat")}>—</b></span>
            <span><i>LON</i> <b ref={set("lon")}>—</b></span>
            <span><i>ALT</i> <b ref={set("alt")}>—</b></span>
          </div>
        </div>
        <div className="jr-name" ref={set("name")} />

        {J.stages.map((s, i) => (
          <div key={i} ref={(el) => (stRefs.current[i] = el)} className={"jr-st jr-st--" + (s.pos || "bl")} style={{ visibility: "hidden", opacity: 0 }}>
            <div className="jr-tag"><span className="jr-plus">+</span> {s.tag}</div>
            <h2 className="jr-title">{s.title.map((l, j) => <span key={j}>{l}</span>)}</h2>
            <p className="jr-body">{s.body}</p>
            {s.cap && <p className="jr-cap">{s.cap}</p>}
            {s.cta && <p className="jr-cta">{s.cta} <span className="jr-arrow">↓</span></p>}
          </div>
        ))}

        <div className="jr-prog"><div ref={barRef} className="jr-prog-i" /></div>
      </div>
    </section>
  );
}

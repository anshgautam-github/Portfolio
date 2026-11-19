import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Manifesto from "../Manifesto/Manifesto.jsx";
import { VERT, FRAG } from "./shader.js";
import "./illusion.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * <Illusion /> - the section right before "Where I've worked".
 * You scroll *into* a pearl-grey bowl of rings (WebGL shader, log-polar so the rings never run out), the surface turns iridescent as you
 * get closer, an opening appears at the centre and swallows the screen: "Into the unknown. / Beyond the familiar.". The void it ends in is the same
 * black as the next section, so you land in "Where I've worked" without a seam. Pure scroll-driven (sticky stage, no pin), the pointer tilts the light.
 */
const pad = (n) => String(n).padStart(2, "0");
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default function Illusion() {
  const root = useRef(null);
  const cv = useRef(null);
  const layerEl = useRef(null);
  const barEl = useRef(null);
  const mfEl = useRef(null);

  useLayoutEffect(() => {
    const el = root.current, canvas = cv.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const q = (s) => el.querySelector(s);
    el.classList.remove("is-static");

    // ---------- the void after the fall: the manifesto rises through it (extra scroll length is added to the section) ----------
    const mobile = window.matchMedia("(max-width: 700px)");
    const vhPx = () => window.innerHeight;
    const baseLen = () => (mobile.matches ? 4.8 : 5.6) * vhPx() - vhPx();     // the fall itself (matches the old CSS heights)
    const mfWrap = mfEl.current;
    const mfH = () => (mfWrap ? mfWrap.firstElementChild.offsetHeight : 0);
    const travel = () => mfH() + vhPx() * 0.5;                              // how far the text climbs: from just below the screen to its last line mid-screen
    const tailLen = () => travel() + vhPx() * 1.15;                         // plus a hold of one screen: the stage stays stuck while the next section (Prism) rises over it
    const layout = () => { el.style.height = Math.round(baseLen() + vhPx() + tailLen()) + "px"; };
    layout();
    let mfRO = null;
    if (mfWrap && window.ResizeObserver) { mfRO = new ResizeObserver(() => { layout(); ScrollTrigger.refresh(); }); mfRO.observe(mfWrap.firstElementChild); }
    const onResizeMf = () => { layout(); };
    window.addEventListener("resize", onResizeMf);
    let tailOn = false;
    const applyTail = (px) => {
      if (!mfWrap) return;
      const m = Math.min(1, Math.max(0, (px - baseLen()) / Math.max(1, travel())));
      // starts fully BELOW the screen (it used to start at 85% of the height, so its first lines peeked in during the fall) and ends exactly where it always did
      const y0 = vhPx() * 1.08, y1 = vhPx() * 1.2 - travel();
      mfWrap.style.transform = `translate3d(0, ${(y0 + (y1 - y0) * m).toFixed(1)}px, 0)`;
      const on = px > baseLen() + 4;
      if (on !== tailOn) { tailOn = on; el.classList.toggle("is-tail", on); }
    };
    const extraCleanup = () => { mfRO && mfRO.disconnect(); window.removeEventListener("resize", onResizeMf); };

    // ---------- text beats (scrubbed by scroll) ----------
    const b = { a: q('[data-b="1"]'), b: q('[data-b="2"]'), c: q('[data-b="3"]'), d: q('[data-b="4"]') };
    const you = q(".ill-y"), we = q(".ill-w"), cue = q(".ill-cue");
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top top", end: () => "+=" + baseLen(), invalidateOnRefresh: true, scrub: reduce ? true : 0.7 } });
      const show = (t, at, dur = 0.05) => tl.fromTo(t, { autoAlpha: 0, y: 34, scale: 0.965, filter: "blur(14px)" }, { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "power2.out", duration: dur }, at);
      const hide = (t, at, dur = 0.045) => tl.to(t, { autoAlpha: 0, y: -26, scale: 1.045, filter: "blur(12px)", ease: "power2.in", duration: dur }, at);
      tl.set(el, {}, 0);
      tl.to(cue, { autoAlpha: 0, duration: 0.05 }, 0.06);
      show(b.a, 0.08); hide(b.a, 0.235);
      show(b.b, 0.285); hide(b.b, 0.435);
      show(b.c, 0.475); 
      tl.to(you, { yPercent: -115, autoAlpha: 0, ease: "power3.inOut", duration: 0.05 }, 0.60);
      tl.fromTo(we, { yPercent: 115, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: "power3.inOut", duration: 0.05 }, 0.60);
      hide(b.c, 0.745);
      show(b.d, 0.83, 0.07);
      hide(b.d, 0.945, 0.055);                    // "the work" gives way to the manifesto, which rises through the void
      tl.to({}, { duration: 0.1 }, 0.9);          // hold the void a moment before the page moves on
    }, el);

    // ---------- the shader ----------
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    let raf = 0, vis = false, ro, io, st;
    const S = { p: 0, sp: 0, z: 0, mx: 0, my: 0, tmx: 0, tmy: 0, t: 0 };
    let destroyed = false;

    const track = (t) => { const px = t.scroll() - t.start; S.p = Math.min(1, Math.max(0, px / baseLen())); applyTail(px); };
    st = ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: track, onRefresh: track });

    if (!gl) { el.classList.add("is-static"); return () => { extraCleanup(); ctx.revert(); st.kill(); }; }

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error("[illusion]", gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs) { el.classList.add("is-static"); return () => { extraCleanup(); ctx.revert(); st.kill(); }; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ["uR", "uM", "uC", "uT", "uZ", "uSat", "uHole", "uIn", "uP", "uWob", "uTilt"].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    const size = () => {
      const stage = canvas.parentElement; const w = stage.clientWidth, h = stage.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.5) * (touch ? 0.8 : 1);
      canvas.width = Math.max(2, Math.round(w * dpr)); canvas.height = Math.max(2, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    size();
    ro = new ResizeObserver(size); ro.observe(canvas.parentElement);

    const onMove = (e) => { const r = el.getBoundingClientRect(); S.tmx = (e.clientX / window.innerWidth) * 2 - 1; S.tmy = -((e.clientY / window.innerHeight) * 2 - 1); };
    if (!touch) window.addEventListener("pointermove", onMove, { passive: true });

    let last = performance.now(), hud = 0;
    const frame = (now) => {
      raf = 0; if (destroyed || !vis) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduce) S.t += dt;
      const k = 1 - Math.exp(-dt * 5.5);
      S.sp += (S.p - S.sp) * k;                              // viscous follow: wheel steps feel like one continuous fall
      S.z = 24 * Math.pow(S.sp, 1.3);
      S.mx += (S.tmx - S.mx) * (1 - Math.exp(-dt * 3)); S.my += (S.tmy - S.my) * (1 - Math.exp(-dt * 3));
      gl.uniform2f(U.uR, canvas.width, canvas.height);
      gl.uniform2f(U.uM, S.mx, S.my);
      gl.uniform1f(U.uT, S.t);
      gl.uniform1f(U.uZ, S.z);
      gl.uniform1f(U.uSat, sstep(0.1, 0.52, S.sp));
      gl.uniform1f(U.uHole, sstep(0.56, 0.93, S.sp));
      gl.uniform1f(U.uIn, sstep(0.0, 0.1, S.sp));
      gl.uniform1f(U.uP, S.sp);
      const cm = sstep(0.0, 0.6, S.sp);                       // the bowl's centre slides to the middle of the screen as you fall into it
      gl.uniform2f(U.uC, 0.17 * (1 - cm), -0.04 * (1 - cm));
      gl.uniform1f(U.uWob, 0.28 + 1.5 * S.sp);
      gl.uniform1f(U.uTilt, 1.6 - 0.6 * sstep(0.15, 0.85, S.sp));   // from looking across it to looking straight down
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if ((hud += dt) > 0.08) {
        hud = 0;
        if (layerEl.current) layerEl.current.textContent = pad(Math.floor(S.z) + 1);
        if (barEl.current) barEl.current.style.transform = `scaleY(${S.sp.toFixed(4)})`;
      }
      raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && vis && !destroyed) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis) kick(); }, { rootMargin: "300px 0px" });
    io.observe(el);

    const lost = (e) => { e.preventDefault(); };
    canvas.addEventListener("webglcontextlost", lost);

    const t1 = setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 140);
    return () => {
      extraCleanup(); destroyed = true; clearTimeout(t1); cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("webglcontextlost", lost);
      ro && ro.disconnect(); io && io.disconnect(); st && st.kill(); ctx.revert();
    };
  }, []);

  return (
    <section ref={root} className="ill" id="fs-illusion" aria-label="Into the illusion">
      <div className="ill-stage">
        <canvas ref={cv} className="ill-cv" aria-hidden="true" />
        <div className="ill-grid" aria-hidden="true" />

        <div className="ill-copy">
          <h2 className="ill-b is-ink" data-b="1">There is <em>more</em> to every question.</h2>
          <h2 className="ill-b is-ink" data-b="2">Follow the <em>curiosity</em>.</h2>
          <h2 className="ill-b" data-b="3"><span className="ill-sw"><em className="ill-y">Into the unknown.</em><em className="ill-w">Beyond the familiar.</em></span></h2>
          <div className="ill-b ill-end" data-b="4">
            <p className="ill-end-k">What matters</p>
            <p className="ill-end-t">is what you leave <em>behind</em>.</p>
          </div>
        </div>

        <div className="ill-mf" ref={mfEl}><Manifesto embedded /></div>

        <p className="ill-cue" aria-hidden="true"><i />Scroll to fall in</p>
      </div>
    </section>
  );
}

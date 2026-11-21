import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Spotlight from "../ArcCarousel/Spotlight.jsx";
import { programs } from "../ArcCarousel/programsData.js";
import amazon from "../ArcCarousel/logos/amazon.png";
import iisc from "../ArcCarousel/logos/iisc.png";
import ibm from "../ArcCarousel/logos/ibm.png";
import ios from "../ArcCarousel/logos/ios.svg";
import mckinsey from "../ArcCarousel/logos/mckinsey.png";
import gssoc from "../ArcCarousel/logos/gssoc.png";
import microsoft from "../ArcCarousel/logos/microsoft.svg";
import hacktoberfest from "../ArcCarousel/logos/hacktoberfest.png";
import "./hours.css";

gsap.registerPlugin(ScrollTrigger);

/* <Hours />: the programs & communities as a watch dial. The section is pinned; as you scroll, the hand sweeps round the dial in the order the
   programs happened, a giant counter rolls up to 08, and each program's logo wakes up on the dial with its name beneath (a ripple leaves it).
   Click a logo and it opens full-screen in the same spotlight the carousel uses. At the end the dial steps back and the closing line comes in. */

const LOGOS = { amazon, iisc, ibm, ios, mckinsey, gssoc, microsoft, hacktoberfest };
const ORDER = ["GirlScript Summer of Code", "Microsoft Learn Student Ambassadors", "Hacktoberfest Open Source Contributor", "McKinsey Forward Program", "iOS App Developer", "IBM Z Student Ambassador", "Edge AI & Robotics Summer School", "Amazon ML Summer School"];
const ITEMS = ORDER.map((t) => programs.find((p) => p.title === t)).filter(Boolean);
const N = ITEMS.length;

const A0 = -125, A1 = 125;               // the hand's sweep, degrees clockwise from twelve o'clock
const TICKS = 100;
const stopAngle = (i) => A0 + 16 + (i * (A1 - A0 - 32)) / (N - 1);
const pad = (n) => String(n).padStart(2, "0");
const fromRect = (tile) => {                         // a card-shaped rect centred on the logo tile: where the spotlight's artwork flies from / back to
  const r = tile.getBoundingClientRect();
  const w = r.width * 1.15, h = w * 1.4, left = r.left + r.width / 2 - w / 2, top = r.top + r.height / 2 - h / 2;
  return { left, top, width: w, height: h, right: left + w, bottom: top + h, x: left, y: top };
};

export default function Hours() {
  const root = useRef(null);
  const tiles = useRef([]);
  const hidden = useRef(-1);
  const [spot, setSpot] = useState(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = (s) => el.querySelector(s);
    const qa = (s) => Array.from(el.querySelectorAll(s));
    const hand = q(".hr-hand"), dial = q(".hr-dial"), ring = q(".hr-ring"), num = q(".hr-num"), cap = q(".hr-cap");
    const cols = [q(".hr-col-t"), q(".hr-col-o")];
    const ticks = qa(".hr-tick"), marks = qa(".hr-mark");
    const objs = qa(".hr-obj"), pops = qa(".hr-pop");
    const note = q(".hr-note"), noteT = q(".hr-note-t"), noteK = q(".hr-note-k"), noteP = q(".hr-note-p"), lead = q(".hr-lead");
    const lines = qa(".hr-end-l"), endBits = qa(".hr-end-b");
    const pill = q(".hr-pill");
    const mtop = q(".hr-mtop"), pips = qa(".hr-pip"), mhint = q(".hr-mtop-h");   // phone-only header above the dial

    /* ----- geometry: a dial whose top arc fills the width; every part shares --R and --cy ----- */
    const layout = () => {
      const w = Math.min(el.clientWidth, window.innerWidth), h = Math.min(el.clientHeight, window.innerHeight);   // never size the dial from a wider-than-viewport wrapper
      const R = Math.min(h * 0.6, w * 0.45);
      el.style.setProperty("--R", R.toFixed(1) + "px");
      el.style.setProperty("--cy", (h * 0.66).toFixed(1) + "px");
      objs.forEach((o, i) => {
        const a = (stopAngle(i) * Math.PI) / 180;
        const r = R * 0.985, maxX = w / 2 - R * 0.3;
        o.style.setProperty("--x", Math.max(-maxX, Math.min(maxX, Math.sin(a) * r)).toFixed(1) + "px");
        o.style.setProperty("--y", (-Math.cos(a) * r).toFixed(1) + "px");
      });
    };
    layout();

    /* ----- state, painted by render() ----- */
    const S = { ang: A0 };
    let lastCount = -1, lastTick = -1, lastStop = -2, done = false;
    const roll = (col, d) => gsap.to(col, { yPercent: -d * 10, duration: reduce ? 0 : 0.55, ease: "power3.out", overwrite: true });
    const render = () => {
      hand.style.transform = `rotate(${S.ang.toFixed(2)}deg)`;
      let count = 0, st = -1;
      for (let i = 0; i < N; i++) { const on = S.ang >= stopAngle(i) - 2; objs[i].classList.toggle("is-on", on); marks[i].classList.toggle("is-on", on); if (on) { count = i + 1; st = i; } }
      if (count !== lastCount) { el.classList.toggle("has-start", count > 0); lastCount = count; roll(cols[0], Math.floor(count / 10)); roll(cols[1], count % 10);
        pips.forEach((pp, k) => pp.classList.toggle("is-on", k < count));
        if (mhint) mhint.textContent = count ? "Tap any logo to open its story" : "Scroll to sweep the dial"; }
      const ti = Math.max(-1, Math.min(TICKS, Math.floor(((S.ang - A0) / (A1 - A0)) * TICKS + 1e-6)));
      if (ti !== lastTick) {
        const a = lastTick < 0 ? 0 : Math.min(ti, lastTick), b = Math.max(ti, lastTick);
        for (let i = Math.max(0, a); i <= Math.min(TICKS, b); i++) ticks[i].classList.toggle("is-on", i <= ti);
        lastTick = ti;
      }
      if (st !== lastStop) {
        lastStop = st;
        if (st >= 0) { const d = ITEMS[st]; noteK.textContent = "Took part \u00b7 " + pad(st + 1) + " / " + pad(N) + " \u00b7 " + d.year; noteT.textContent = d.title; noteP.textContent = d.text; }
        else { noteK.textContent = "Took part \u00b7 00 / " + pad(N); noteT.textContent = "Eight programs I took part in, and what each one taught me."; noteP.textContent = "Tap any logo to open its full story."; }
        note.classList.remove("is-swap"); void note.offsetWidth; note.classList.add("is-swap");
      }
      const dn = S.ang > A1 + 3;
      if (dn !== done) { done = dn; el.classList.toggle("is-done", dn); }
    };

    if (reduce) {
      S.ang = A1; render();
      gsap.set([...pops, ...lines, ...endBits], { clearProps: "all" });
      el.classList.add("is-static");
      return () => {};
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: () => "+=" + window.innerHeight * 6.4, pin: true, anticipatePin: 1, scrub: 0.9, invalidateOnRefresh: true },
        onUpdate: render,
      });
      gsap.set(pops, { scale: 0.4, opacity: 0, y: 40, rotate: (i) => (i % 2 ? 12 : -12) });
      gsap.set(lines, { yPercent: 110, opacity: 0 });
      gsap.set(endBits, { y: 40, opacity: 0 });
      gsap.set(ticks, { opacity: 0 });
      gsap.set([num, cap], { opacity: 0, scale: 0.86, y: 30 });
      gsap.set(hand, { opacity: 0 });
      gsap.set(lead, { opacity: 0, y: 24 });
      gsap.set(mtop, { opacity: 0, y: 24 });
      gsap.set(ring, { strokeDashoffset: 1 });
      render();

      const T0 = 1, T1 = 8.6;
      // 0 - 1: the dial draws itself, the counter arrives, the hand appears
      tl.to(ring, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0);
      tl.to(ticks, { opacity: 1, duration: 0.3, stagger: { each: 0.006, from: "center" }, ease: "power1.out" }, 0.1);
      tl.to([num, cap], { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1 }, 0.3);
      tl.to(hand, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0.6);
      tl.to(lead, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.5);
      tl.to(mtop, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.5);
      tl.to(lead, { opacity: 0, y: -18, duration: 0.5, ease: "power2.in" }, 1.7);
      // 1 - 8.6: the sweep: the dial breathes, the paper shifts from dawn to dusk, each program wakes as the hand reaches it
      tl.to(S, { ang: A1, duration: T1 - T0, ease: "none", onUpdate: render }, T0);
      tl.to(dial, { scale: 1.05, duration: T1 - T0, ease: "none" }, T0);
      tl.to(el, { backgroundColor: "#e9e6f2", duration: T1 - T0, ease: "none" }, T0);
      ITEMS.forEach((d, i) => {
        const at = T0 + ((stopAngle(i) - A0) / (A1 - A0)) * (T1 - T0) - 0.3;
        tl.to(pops[i], { scale: 1, opacity: 1, y: 0, rotate: i % 2 ? 3 : -3, duration: 0.55, ease: "back.out(2.2)" }, at);
      });
      if (pill) tl.to(pill, { rotate: 540, duration: T1 - T0 + 2.4, ease: "none" }, 0.5);

      // 8.8 - 11.4: finale: the hand drops to six o'clock, the programs drift off, the dial steps back, the closing line rises
      tl.to(S, { ang: 180, duration: 1.1, ease: "power2.inOut", onUpdate: render }, 8.8);
      tl.to(pops, { scale: 0.7, opacity: 0, y: -26, duration: 0.7, stagger: 0.06, ease: "power2.in" }, 8.85);
      tl.to(el, { backgroundColor: "#f3f1ea", duration: 1.6, ease: "none" }, 9.2);
      tl.to([num, cap], { opacity: 0, scale: 0.7, y: -80, duration: 1.0, ease: "power2.in", stagger: 0.05 }, 9.7);
      tl.to(hand, { opacity: 0, scaleY: 0.8, duration: 0.6, ease: "power1.in" }, 9.9);
      tl.to(dial, { scale: 1.55, opacity: 0.16, duration: 1.8, ease: "power2.inOut" }, 9.5);
      tl.to(note, { opacity: 0, duration: 0.4 }, 9.2);
      tl.to(mtop, { opacity: 0, y: -18, duration: 0.5, ease: "power2.in" }, 8.9);
      tl.to(lines, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.14, ease: "power3.out" }, 10.2);
      tl.to(endBits, { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" }, 10.7);
      tl.to({}, { duration: 0.8 }, 11.5);
    }, el);

    // the programs lean toward the pointer, a little
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    let near = true;
    const nio = new IntersectionObserver(([en]) => { near = en.isIntersecting; }, { rootMargin: "200px" });
    nio.observe(el);
    const onMove = (e) => { if (!near) return; tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; if (!raf) raf = requestAnimationFrame(step); };
    const step = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      el.style.setProperty("--mx", cx.toFixed(3)); el.style.setProperty("--my", cy.toFixed(3));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const onResize = () => { layout(); };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const tLay = setTimeout(layout, 700);   // re-measure once the page has settled (fonts, pin spacers)
    const t1 = setTimeout(() => { layout(); ScrollTrigger.refresh(); }, 400);
    return () => { clearTimeout(tLay); window.removeEventListener("orientationchange", onResize); clearTimeout(t1); cancelAnimationFrame(raf); nio.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("resize", onResize); ctx.revert(); };
  }, []);

  /* ----- the spotlight: the clicked logo's card flies open full-screen; its tile is hidden while the copy is in flight ----- */
  const hide = (i) => { if (hidden.current >= 0 && tiles.current[hidden.current]) tiles.current[hidden.current].style.visibility = ""; hidden.current = i; if (i >= 0 && tiles.current[i]) tiles.current[i].style.visibility = "hidden"; };
  const open = (i) => { const t = tiles.current[i]; if (!t || spot) return; root.current?.classList.add("has-opened"); setSpot({ i, from: fromRect(t) }); hide(i); };
  const close = () => { hide(-1); setSpot(null); };

  const goWork = () => {
    const t = document.querySelector("#fs-work-intro");
    if (!t) return;
    const y = t.getBoundingClientRect().top + window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.8 }); else window.scrollTo({ top: y, behavior: "smooth" });
  };
  const goHello = () => {
    const y = document.documentElement.scrollHeight;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2.2 }); else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const tickEls = [];
  for (let i = 0; i <= TICKS; i++) {
    const a = A0 + (i / TICKS) * (A1 - A0);
    const major = i % 4 === 0;
    tickEls.push(<line key={i} className={`hr-tick${major ? " is-major" : ""}`} x1="0" y1="-476" x2="0" y2={major ? -446 : -462} transform={`rotate(${a.toFixed(3)})`} />);
  }
  const markEls = ITEMS.map((d, i) => <circle key={d.title} className="hr-mark" r="9" cx="0" cy="-480" transform={`rotate(${stopAngle(i).toFixed(3)})`} />);

  return (
    <section ref={root} className="hr" id="hours" aria-label="Programs I took part in">
      <div className="hr-lead" aria-hidden="true"><span>Taken part in &middot; learned from</span><b>Eight programs that<br />shaped how I build.</b></div>

      <div className="hr-mtop" aria-hidden="true">
        <span className="hr-mtop-k"><i />Programs &middot; communities &middot; summer schools</span>
        <b className="hr-mtop-t">Eight programs that<br />shaped how I build.</b>
        <span className="hr-pips">{ITEMS.map((d) => <i key={d.title} className="hr-pip" />)}</span>
        <span className="hr-mtop-h">Scroll to sweep the dial</span>
      </div>

      <div className="hr-dial" aria-hidden="true">
        <svg viewBox="-500 -500 1000 1000">
          <circle className="hr-ring" r="480" pathLength="1" />
          {tickEls}
          {markEls}
        </svg>
      </div>

      <p className="hr-cap" aria-hidden="true">Programs &middot; communities &middot; summer schools</p>
      <div className="hr-num" aria-hidden="true">
        {["t", "o"].map((k) => (
          <span key={k} className="hr-dg"><span className={`hr-col hr-col-${k}`}>{Array.from({ length: 10 }).map((_, d) => <b key={d}>{d}</b>)}</span></span>
        ))}
      </div>

      <div className="hr-hand" aria-hidden="true"><i className="hr-bar" /><i className="hr-pin" /></div>

      {ITEMS.map((d, i) => (
        <div key={d.title} className="hr-obj" style={{ "--c1": d.acc[0], "--c2": d.acc[1] }}>
          <div className="hr-pop">
            <button type="button" className="hr-tile" ref={(n) => { tiles.current[i] = n; }} onClick={() => open(i)} data-cursor="Open" aria-label={`Open ${d.title}`}>
              <i className="hr-rip" /><i className="hr-rip hr-rip--2" />
              <i className="hr-plus"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></i>
              <span className="hr-float"><span className="hr-logo"><img src={LOGOS[d.logo]} alt="" draggable="false" decoding="async" /></span></span>
            </button>
            <button type="button" className="hr-chip" tabIndex={-1} aria-hidden="true" onClick={() => open(i)}><b>{d.title}</b><em className="hr-yr">{d.year}</em><em className="hr-go">Open story \u2197</em></button>
          </div>
        </div>
      ))}

      <p className="hr-note is-swap"><span className="hr-note-k">Took part &middot; 00 / 08</span><span className="hr-note-t">Eight programs I took part in, and what each one taught me.</span><span className="hr-note-p">Tap any logo to open its full story.</span></p>

      <div className="hr-end">
        <h2 className="hr-end-h">
          <span className="hr-end-m"><span className="hr-end-l">Eight programs, one way</span></span>
          <span className="hr-end-m"><span className="hr-end-l">of <em>building.</em></span></span>
        </h2>
        <p className="hr-end-b hr-end-p">From open-source communities to global learning initiatives, every experience added a different perspective to how I approach technology, solve problems, and keep growing.</p>
        <div className="hr-end-b hr-end-a">
          <button type="button" className="hr-link" onClick={goHello}>Let&rsquo;s talk</button>
        </div>
      </div>

      <i className="hr-pill" aria-hidden="true" />

      {spot && (
        <Spotlight items={ITEMS} index={spot.i} from={spot.from}
          getRect={(k) => (tiles.current[k] ? fromRect(tiles.current[k]) : null)}
          onIndex={(k) => hide(k)} onClose={close} />
      )}
    </section>
  );
}

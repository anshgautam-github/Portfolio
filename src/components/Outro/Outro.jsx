import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { splitChars } from "../../lib/fx.js";
import "./outro.css";

gsap.registerPlugin(ScrollTrigger);

/*
  Closing call-to-action ("Want to see how I enable companies?").
  Copy / avatar / link live in content.js -> outro.

  Motion, in order:
  1. headline characters rise out of their line masks (staggered)
  2. the eye pops in closed, the toggle springs in
  3. the toggle flips ON (spring + ripple) and the eye opens with it
  4. sub-copy + button blur/slide in
  Always on: the pupil follows the cursor, the eye blinks now and then, the green track shimmers,
  a soft spotlight trails the pointer, lines drift with scroll, the button is magnetic.
  The toggle is a real switch: click / Enter / Space flips it (and the eye opens / closes with it).
*/

const EYE =
  "M16 54C16 50 20 44 28 38C50 18 78 8 100 8C122 8 150 18 172 38C180 44 184 50 184 54C184 58 180 64 172 70C150 90 122 100 100 100C78 100 50 90 28 70C20 64 16 58 16 54Z";

function Eye() {
  return (
    <svg className="outro-eye" data-eye viewBox="0 0 200 108" aria-hidden="true">
      <defs>
        <clipPath id="outro-eye-clip">
          <path d={EYE} />
        </clipPath>
      </defs>
      <path d={EYE} fill="#7a7a7a" stroke="#7a7a7a" strokeWidth="6" strokeLinejoin="round" />
      <g clipPath="url(#outro-eye-clip)">
        <circle data-pupil cx="100" cy="54" r="37" fill="#121212" />
      </g>
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h17M13.5 5.5 20 12l-6.5 6.5" />
    </svg>
  );
}

export default function Outro() {
  const root = useRef(null);
  const o = content.outro;

  useLayoutEffect(() => {
    const el = root.current;
    const q = gsap.utils.selector(el);
    const toggle = q("[data-toggle]")[0];
    const eye = q("[data-eye]")[0];
    const pupil = q("[data-pupil]")[0];
    const ring = q("[data-ring]")[0];
    const spot = q("[data-spot]")[0];
    const btn = q("[data-btn]")[0];
    const lines = q("[data-line]");

    let on = false;
    let inView = false;
    let reduced = false;
    let blinkCall;

    /* ---------- the switch: one place that flips the toggle + eye together ---------- */
    const setOn = (v, instant) => {
      on = v;
      toggle.setAttribute("aria-checked", String(v));
      if (instant || reduced) {
        gsap.killTweensOf([toggle, eye, ring]);
        gsap.set(toggle, { "--on": v ? 1 : 0 });
        gsap.set(eye, { scaleY: v ? 1 : 0.1 });
        return;
      }
      gsap.to(toggle, { "--on": v ? 1 : 0, duration: v ? 0.95 : 0.55, ease: v ? "back.out(1.8)" : "power3.inOut", overwrite: true });
      gsap.to(eye, { scaleY: v ? 1 : 0.1, duration: v ? 0.75 : 0.35, ease: v ? "back.out(2.2)" : "power3.in", overwrite: true });
      if (v) gsap.fromTo(ring, { scale: 1, autoAlpha: 0.85 }, { scale: 1.75, autoAlpha: 0, duration: 1.1, ease: "power2.out", overwrite: true });
    };
    const onClick = () => setOn(!on);
    toggle.addEventListener("click", onClick);

    /* ---------- pupil follows the cursor ---------- */
    const px = gsap.quickTo(pupil, "x", { duration: 0.45, ease: "power3.out" });
    const py = gsap.quickTo(pupil, "y", { duration: 0.45, ease: "power3.out" });
    const onMove = (e) => {
      const r = eye.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(d / 280, 1);
      px((dx / d) * k * 24);
      py((dy / d) * k * 6);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    /* ---------- idle blink ---------- */
    const blink = () => {
      if (on && inView && !reduced) {
        gsap
          .timeline()
          .to(eye, { scaleY: 0.08, duration: 0.09, ease: "power2.in", overwrite: "auto" })
          .to(eye, { scaleY: 1, duration: 0.26, ease: "power2.out" });
      }
      blinkCall = gsap.delayedCall(gsap.utils.random(2.6, 5.4), blink);
    };
    blinkCall = gsap.delayedCall(3, blink);

    const st = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (s) => (inView = s.isActive) });

    /* ---------- spotlight + magnetic button (pointer devices only) ---------- */
    const mmFine = gsap.matchMedia();
    mmFine.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const sx = gsap.quickTo(spot, "x", { duration: 0.9, ease: "power3.out" });
      const sy = gsap.quickTo(spot, "y", { duration: 0.9, ease: "power3.out" });
      const so = gsap.quickTo(spot, "opacity", { duration: 0.6 });
      const move = (e) => {
        const r = el.getBoundingClientRect();
        sx(e.clientX - r.left);
        sy(e.clientY - r.top);
      };
      const enter = () => so(1);
      const leave = () => so(0);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);

      const bx = gsap.quickTo(btn, "x", { duration: 0.7, ease: "elastic.out(1, 0.55)" });
      const by = gsap.quickTo(btn, "y", { duration: 0.7, ease: "elastic.out(1, 0.55)" });
      const bmove = (e) => {
        const r = btn.getBoundingClientRect();
        bx((e.clientX - (r.left + r.width / 2)) * 0.18);
        by((e.clientY - (r.top + r.height / 2)) * 0.28);
      };
      const bleave = () => (bx(0), by(0));
      btn.addEventListener("pointermove", bmove);
      btn.addEventListener("pointerleave", bleave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
        btn.removeEventListener("pointermove", bmove);
        btn.removeEventListener("pointerleave", bleave);
      };
    });

    /* ---------- entrance + scroll motion ---------- */
    const mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      reduced = !!ctx.conditions.reduce;
      gsap.set(toggle, { "--on": 0 });
      gsap.set(eye, { scaleY: 0.1 });
      if (reduced) {
        setOn(true, true);
        el.classList.add("is-revealed");
        return;
      }

      const chars = lines.flatMap((l) => splitChars(l).chars);
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: el, start: "top 62%", toggleActions: "play none none reverse" },
      });
      tl.from(chars, { yPercent: 125, rotation: 8, transformOrigin: "0% 100%", duration: 1.05, stagger: { each: 0.022 } }, 0)
        .from(q("[data-eyewrap]"), { autoAlpha: 0, scale: 0.4, rotation: -14, duration: 0.9, ease: "back.out(1.9)" }, 0.5)
        .from(q("[data-tgwrap]"), { autoAlpha: 0, scaleX: 0.25, scaleY: 0.6, duration: 1, ease: "back.out(1.7)" }, 0.8)
        .add(() => {
          if (!tl.reversed()) setOn(true);
        }, 1.6)
        .from(q("[data-sub]"), { y: 28, autoAlpha: 0, filter: "blur(10px)", duration: 0.95, clearProps: "filter" }, 1.5)
        .from(q("[data-btnwrap]"), { y: 46, autoAlpha: 0, scale: 0.86, duration: 1.1, ease: "back.out(1.5)" }, 1.75)
        .add(() => el.classList.toggle("is-revealed", !tl.reversed()), 2.7);
      tl.eventCallback("onReverseComplete", () => {
        setOn(false, true);
        el.classList.remove("is-revealed");
      });

      // each line drifts at its own pace while the section scrolls in
      gsap.from(lines, {
        y: (i) => 120 - i * 34,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: 0.7 },
      });
    });

    return () => {
      toggle.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onMove);
      blinkCall?.kill();
      st.kill();
      mm.revert();
      mmFine.revert();
    };
  }, []);

  return (
    <section ref={root} className="outro" id="outro" aria-labelledby="outro-h">
      <div className="outro-spot" data-spot aria-hidden="true" />

      <h2 id="outro-h" className="outro-h">
        <span className="outro-line" data-line>
          <span>{o.line1}</span>
          <span className="outro-eyewrap" data-eyewrap aria-hidden="true">
            <Eye />
          </span>
        </span>

        <span className="outro-line" data-line>
          <span className="outro-serif">{o.line2a}</span>
          <span className="outro-tgwrap" data-tgwrap>
            <button type="button" role="switch" aria-checked="false" aria-label={o.toggleLabel} className="outro-tg" data-toggle>
              <span className="outro-tg-green" />
              <span className="outro-tg-ring" data-ring />
              <span className="outro-tg-knob">
                {o.avatar ? <img decoding="async" src={o.avatar} alt="" draggable="false" /> : <span className="outro-av" data-i={o.initials} />}
              </span>
            </button>
          </span>
          <span className="outro-serif">{o.line2b}</span>
        </span>

        <span className="outro-line" data-line>
          {o.line3}
        </span>
      </h2>

      <p className="outro-sub" data-sub>
        {o.sub}
      </p>

      <div className="outro-btnwrap" data-btnwrap>
        <a className="outro-btn" href={o.button.href} data-btn>
          <span className="outro-btn-pill">
            <span className="outro-btn-fill" />
            <span className="outro-btn-label">
              <span>{o.button.label}</span>
              <span aria-hidden="true">{o.button.label}</span>
            </span>
          </span>
          <span className="outro-btn-circle">
            <span className="outro-btn-fill" />
            <span className="outro-btn-arrow">
              <Arrow />
            </span>
            <span className="outro-btn-arrow outro-btn-arrow--in" aria-hidden="true">
              <Arrow />
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}

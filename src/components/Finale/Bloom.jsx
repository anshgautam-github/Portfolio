import { useEffect, useMemo, useRef } from "react";
import initBloom from "./bloom.js";
import { mountAboutFx } from "../FreefallStory/aboutFx.js";
import { STAR, Star, scatter } from "./stars.jsx";
import "./finale.css";

/* Straight after the featured build: the night carries on, one star starts to swell, and keeps swelling until it fills the screen with amber.
   That amber is the page the Finale (Finale.jsx) opens on, so the hand-off is one continuous colour. Decorative only. */

export default function Bloom() {
  const root = useRef(null);
  const sky = useMemo(() => scatter(26, 11, (r, i) => ({
    x: 2 + r() * 96, y: 3 + r() * 94, size: i % 6 === 0 ? 46 + r() * 30 : 14 + r() * 24, depth: 0.4 + r() * 1.5, hollow: i % 5 === 3, rot: -40 + r() * 80,
  })), []);
  useEffect(() => {
    const stop = initBloom(root.current);
    const fx = mountAboutFx(root.current.querySelector("[data-bl-about]"));   // the same live streaks, glows and pointer dots as the About section before it
    return () => { try { stop && stop(); } catch (e) { /* ignore */ } try { fx && fx(); } catch (e) { /* ignore */ } };
  }, []);

  return (
    <section ref={root} className="bl" aria-hidden="true">
      <div className="bl-wrap" data-bl-wrap>
        <div className="bl-stage" data-bl-stage>
          <div className="fs bl-fs" aria-hidden="true">
            <div className="about bl-about" data-bl-about>
              <div className="about-fx"><canvas className="afx-cv" /><i className="afx-b afx-b1" /><i className="afx-b afx-b2" /><i className="afx-b afx-b3" /><i className="afx-dots" /><i className="afx-spot" /></div>
            </div>
          </div>
          <div className="bl-sky">
            {sky.map((s, i) => (
              <span className="bl-s" data-bl-s data-depth={s.depth} key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.size, height: s.size, transform: `rotate(${s.rot}deg)` }}>
                <Star className={"bl-si" + (s.hollow ? " is-hollow" : "")} />
              </span>
            ))}
          </div>
          <p className="bl-txt" data-bl-txt>
            <span>That&rsquo;s the <em>why.</em></span>
            <span>Now let&rsquo;s make the <em>what.</em></span>
          </p>
          <svg className="bl-svg" data-bl-svg focusable="false">
            <g data-bl-star><path className="bl-big" d={STAR} transform="translate(-50 -50)" /></g>
          </svg>
          <div className="bl-fill" data-bl-fill />
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef } from "react";
import initBloom from "./bloom.js";
import { STAR, Star, scatter } from "./stars.jsx";
import "./finale.css";

/* Straight after the featured build: the night carries on, one star starts to swell, and keeps swelling until it fills the screen with amber.
   That amber is the page the Finale (Finale.jsx) opens on, so the hand-off is one continuous colour. Decorative only. */

export default function Bloom() {
  const root = useRef(null);
  const sky = useMemo(() => scatter(26, 11, (r, i) => ({
    x: 2 + r() * 96, y: 3 + r() * 94, size: i % 6 === 0 ? 46 + r() * 30 : 14 + r() * 24, depth: 0.4 + r() * 1.5, hollow: i % 5 === 3, rot: -40 + r() * 80,
  })), []);
  useEffect(() => initBloom(root.current), []);

  return (
    <section ref={root} className="bl" aria-hidden="true">
      <div className="bl-wrap" data-bl-wrap>
        <div className="bl-stage" data-bl-stage>
          <div className="bl-sky">
            {sky.map((s, i) => (
              <span className="bl-s" data-bl-s data-depth={s.depth} key={i} style={{ left: s.x + "%", top: s.y + "%", width: s.size, height: s.size, transform: `rotate(${s.rot}deg)` }}>
                <Star className={"bl-si" + (s.hollow ? " is-hollow" : "")} />
              </span>
            ))}
          </div>
          <svg className="bl-svg" data-bl-svg focusable="false">
            <g data-bl-star><path className="bl-big" d={STAR} transform="translate(-50 -50)" /></g>
          </svg>
          <div className="bl-fill" data-bl-fill />
        </div>
      </div>
    </section>
  );
}

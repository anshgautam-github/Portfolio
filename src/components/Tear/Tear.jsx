import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./tear.css";

gsap.registerPlugin(ScrollTrigger);

/* A torn sheet of paper laid over the end of the section above it, so moving from one section to the next feels like
   turning to a new page instead of a hard cut. Drifts at a different speed than the page (depth) while you scroll. */

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

export default function Tear({ color = "#f3f0e8", seed = 7 }) {
  const root = useRef(null);
  const svg = useRef(null);

  const { fill, rim, under } = useMemo(() => {
    const r = rng(seed);
    const pts = [];
    let y = 26;
    for (let x = 0; x <= 1200; x += 6) {
      y += (r() - 0.5) * 7;
      y += (28 + Math.sin(x * 0.011) * 9 + Math.sin(x * 0.037) * 3 - y) * 0.08;   // wander around a gently wavy centre line
      if (r() < 0.04) y += (r() - 0.5) * 14;                                       // an occasional bigger rip
      y = Math.min(Math.max(y, 9), 46);
      pts.push([x, y]);
    }
    const line = (dy) => pts.map(([x, v], i) => `${i ? "L" : "M"}${x} ${(v + dy).toFixed(1)}`).join(" ");
    return { fill: `${line(0)} L1200 100 L0 100 Z`, rim: line(-1.5), under: line(5) };
  }, [seed]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(svg.current, { y: 34 }, { y: -26, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "top top", scrub: 0.6 } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="tear" aria-hidden="true">
      <svg ref={svg} viewBox="0 0 1200 100" preserveAspectRatio="none">
        <path d={under} fill="none" stroke="rgba(60,45,20,0.10)" strokeWidth="5" vectorEffect="non-scaling-stroke" />
        <path d={fill} fill={color} />
        <path d={rim} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

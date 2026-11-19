import { useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./seam.css";

/**
 * <Seam from to accent span glow /> - drop it between two sections. It never moves or transforms either of them (so pins, fixed layers and
 * other scroll triggers are untouched); it only paints a feathered edge, a bloom and a hairline on the join, driven by where the join is on screen.
 *   to     colour of the section BELOW (what the tail of the section above dissolves into)
 *   accent "r,g,b" of the light on the join
 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function Seam({ to = "#000", accent = "91,140,255", span = 30, glow = 34 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return undefined;
    const set = (p) => {
      // p: 0 when the join enters at the bottom of the screen, 1 when it leaves at the top
      const mid = Math.sin(Math.PI * clamp01(p));                // swells to the middle of its pass
      el.style.setProperty("--d", p.toFixed(3));
      el.style.setProperty("--g", (0.95 * Math.pow(mid, 1.4)).toFixed(3));
      el.style.setProperty("--l", (easeOut(clamp01(p / 0.55)) * (1 - clamp01((p - 0.62) / 0.3))).toFixed(3));
      el.style.setProperty("--x", (8 + 84 * easeOut(clamp01((p - 0.1) / 0.8))).toFixed(1));
    };
    const st = ScrollTrigger.create({
      trigger: el, start: "top bottom", end: "top top", invalidateOnRefresh: true,
      onUpdate: (self) => set(self.progress),
      onRefresh: (self) => set(self.progress),
    });
    return () => { st.kill(); };
  }, []);
  return (
    <div ref={ref} className="sm" aria-hidden="true" style={{ "--to": to, "--ac": accent, "--span": span + "vh", "--glow": glow + "vh" }}>
      <i className="sm-tint" /><i className="sm-glow" /><i className="sm-line" /><i className="sm-spark" />
    </div>
  );
}

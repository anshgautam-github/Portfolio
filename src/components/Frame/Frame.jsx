import { useEffect, useRef } from "react";
import { landingContent } from "../Landing/landingContent.js";
import { smoothScrollTo } from "../../lib/smooth.js";
import "./frame.css";

/**
 * The whole site lives inside one rounded frame.
 * It is a fixed, click-through overlay: a white ring (outer rect minus a rounded inner window) with a curved tab around the
 * brand at top-centre. The page keeps scrolling normally underneath, so Lenis / ScrollTrigger / pinned sections are untouched.
 * Sizes are CSS variables (see frame.css) so margins, radius and notch scale per breakpoint.
 */
function read(el) {
  const cs = getComputedStyle(el);
  const n = (v, d) => parseFloat(cs.getPropertyValue(v)) || d;
  return { m: n("--fr-m", 14), r: n("--fr-r", 30), nw: n("--fr-nw", 340), nh: n("--fr-nh", 50), nr: n("--fr-nr", 26) };
}

function build(W, H, { m, r, nw, nh, nr }) {
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  r = Math.min(r * 0.7, (x1 - x0) / 2, (y1 - y0) / 2);   // corners are straight chamfers now
  nr = Math.max(nr, 0);
  const cx = W / 2;
  nw = Math.min(nw, W - 2 * (m + r + Math.max(nr, nh)) - 8);
  const hw = nw / 2;
  const d = Math.min(nh, 120);
  const k = Math.min(nr, d * 0.9);
  const b = Math.min(k, hw);
  const sh = Math.min(nr, d * 0.6);          // vertical drop of the shoulder (45deg when nr == sh)
  const ch = Math.min(Math.max(d * 0.28, 0), hw);   // bottom chamfer
  if (d < 1) return { ring: `M0 0H${W}V${H}H0Z${`M${x0} ${y0}H${x1}V${y1}H${x0}Z`}`, edge: `M${x0} ${y0}H${x1}V${y1}H${x0}Z` };               // rounded bottom corners of the tab
  const outer = `M0 0H${W}V${H}H0Z`;
  const inner = [
    `M${x0 + r} ${y0}`,
    `H${cx - hw - d}`,
    // one clean slant from the top edge straight down to the tab floor (45deg, no vertical, no break)
    `L${cx - hw} ${y0 + d}`,
    `H${cx + hw}`,
    `L${cx + hw + d} ${y0}`,
    `H${x1 - r}`,
    `L${x1} ${y0 + r}`,
    `V${y1 - r}`,
    `L${x1 - r} ${y1}`,
    `H${x0 + r}`,
    `L${x0} ${y1 - r}`,
    `V${y0 + r}`,
    `L${x0 + r} ${y0}Z`,
  ].join("");
  return { ring: `${outer}${inner}`, edge: inner };
}

export default function Frame() {
  const ref = useRef(null);
  const ringRef = useRef(null);
  const edgeRef = useRef(null);
  const brandRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    let base = read(el), raf = 0;
    // the frame belongs to the hero only: as you scroll out of it the margins, corners and brand tab melt away (full-bleed below)
    const draw = () => {
      raf = 0;
      const H = el.clientHeight || window.innerHeight;
      const t = Math.min(1, Math.max(0, (window.scrollY || 0) / (H * 0.75)));
      const e = t * t * (3 - 2 * t);
      const k = 1 - e;
      el.style.visibility = t >= 1 ? "hidden" : "visible";
      if (t >= 1) return;
      const d = build(el.clientWidth, H, { m: base.m * k, r: base.r * k, nw: base.nw, nh: base.nh * k, nr: base.nr * k });
      ringRef.current?.setAttribute("d", d.ring);
      edgeRef.current?.setAttribute("d", d.edge);
      if (brandRef.current) {
        brandRef.current.style.opacity = Math.max(0, 1 - e * 2.2);
        brandRef.current.style.pointerEvents = e > 0.4 ? "none" : "auto";
      }
      el.style.opacity = String(1 - Math.max(0, e - 0.7) / 0.3);
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const resize = () => { base = read(el); req(); };
    draw();
    window.addEventListener("scroll", req, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("orientationchange", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", req);
      window.removeEventListener("orientationchange", resize);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="fr" ref={ref}>
      <svg className="fr-svg" width="100%" height="100%" aria-hidden="true">
        <path className="fr-ring" ref={ringRef} fillRule="evenodd" />
        <path className="fr-edge" ref={edgeRef} />
      </svg>
      <button ref={brandRef} type="button" className="fr-brand" onClick={() => smoothScrollTo?.(0)} aria-label={`${landingContent.logo} – back to top`}>
        {landingContent.logo}
        {landingContent.logoTag && <span className="fr-tag">{landingContent.logoTag}</span>}
      </button>
    </div>
  );
}

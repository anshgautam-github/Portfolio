// Phones: when Chrome's address bar slides away the visible page grows by ~60-100 px. Every pinned / sticky screen is deliberately sized to the
// SMALL viewport (so their layout never changes while you scroll), which leaves a strip along the bottom edge that shows the page background
// (near-black) behind the screen. This paints that strip in the screen's own colour, by giving the wrapper behind each pinned screen the same
// background colour as the screen. Layout, sizes and animation are not touched: it is a background-color on an existing wrapper.
import { ScrollTrigger } from "gsap/ScrollTrigger";

const STAGES = [".rv-stage", ".fs .stage", ".fs .work-stage", ".fs .portal-stage", ".ill-stage", ".ts-pin", ".pr", ".cb", ".tk-sec"];

const solid = (c) => {
  if (!c || c === "transparent") return false;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return false;
  const p = m[1].split(",").map((v) => parseFloat(v));
  return p.length < 4 || p[3] > 0.95;
};

export function initGapFill() {
  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) return;
  const paint = (wrap, stage) => {
    if (!wrap || wrap === document.body || wrap.id === "root" || wrap.tagName === "MAIN") return;
    if (wrap.dataset.gapFill) return;                       // already done for this wrapper
    const cs = getComputedStyle(stage).backgroundColor;
    if (!solid(cs)) return;
    if (solid(getComputedStyle(wrap).backgroundColor)) return;   // the wrapper already has its own colour
    wrap.style.backgroundColor = cs;
    wrap.dataset.gapFill = "1";
  };
  const run = () => {
    document.querySelectorAll(".pin-spacer").forEach((sp) => paint(sp, sp.firstElementChild));
    STAGES.forEach((sel) => document.querySelectorAll(sel).forEach((el) => paint(el.parentElement, el)));
  };
  // sections mount and pin spacers appear over the first seconds: run after every ScrollTrigger refresh and a few times while the page settles
  ScrollTrigger.addEventListener("refresh", run);
  [600, 2000, 5000, 9000].forEach((t) => setTimeout(run, t));
  run();
}

/**
 * One short circular hand-off between the landing and the paddock (same sky-blue as the paddock, no black, no rings).
 *   draw(open, turn, dir)
 *   dir = 1  (landing, closing): a circle grows from the centre until it covers the screen   (open 1 -> 0)
 *   dir = -1 (paddock, opening): the covering sheet simply melts away to reveal the paddock  (open 0 -> 1)
 */
const NS = "http://www.w3.org/2000/svg";
const LIGHT = "#e3ecfc";
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ease = (t) => t * t * (3 - 2 * t);

export function createIris(parent, { fixed = false, z = 60 } = {}) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = `position:${fixed ? "fixed" : "absolute"};left:0;top:0;width:100%;height:100%;z-index:${z};pointer-events:none;overflow:hidden;display:none`;
  svg.innerHTML = `<circle data-c fill="${LIGHT}" r="0"/>`;
  parent.appendChild(svg);
  const c = svg.querySelector("[data-c]");

  function draw(open, turn = 0, dir = 1) {
    const w = svg.clientWidth || window.innerWidth, h = svg.clientHeight || window.innerHeight;
    const rMax = Math.hypot(w, h) * 0.5 * 1.05;
    const o = clamp01(open);
    c.setAttribute("cx", w / 2); c.setAttribute("cy", h / 2);
    if (dir < 0) {                       // opening: full sheet fading out
      c.setAttribute("r", rMax.toFixed(1));
      c.style.opacity = (1 - ease(o)).toFixed(3);
    } else {                             // closing: circle growing
      c.setAttribute("r", (rMax * ease(1 - o)).toFixed(1));
      c.style.opacity = "1";
    }
  }

  return {
    el: svg,
    show() { svg.style.display = "block"; },
    hide() { svg.style.display = "none"; },
    draw,
    destroy() { svg.remove(); },
  };
}

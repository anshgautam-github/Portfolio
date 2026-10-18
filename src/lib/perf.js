// Device tiering + shared performance knobs.
// Phones / tablets / weak laptops get a cheaper render budget (lower canvas resolution, no animated blur filters,
// lighter glass) so scrolling stays on the compositor and every frame fits in 16 ms.

const nav = typeof navigator !== "undefined" ? navigator : {};
const win = typeof window !== "undefined" ? window : {};

export const IS_TOUCH = !!win.matchMedia && win.matchMedia("(pointer: coarse)").matches;
export const IS_SMALL = !!win.matchMedia && win.matchMedia("(max-width: 820px)").matches;
export const IS_MOBILE = IS_TOUCH || IS_SMALL;

const cores = nav.hardwareConcurrency || 8;
const mem = nav.deviceMemory || 8;
export const IS_LOW_END = IS_MOBILE || cores <= 4 || mem <= 4;

/** Highest devicePixelRatio we are willing to render a canvas at. */
export const capDpr = (desktopMax = 1.5, mobileMax = 1.25) =>
  Math.min(win.devicePixelRatio || 1, IS_MOBILE ? mobileMax : desktopMax);

/** Starting render scale for the big WebGL scene (the adaptive code only ever steps down from here). */
export const START_SCALE = IS_MOBILE ? 0.72 : IS_LOW_END ? 0.85 : 1;

if (typeof document !== "undefined") {
  const c = document.documentElement.classList;
  if (IS_MOBILE) c.add("is-mobile");
  if (IS_LOW_END) c.add("is-lite");
}

/**
 * Shared frame-rate budget for decorative canvas loops.
 * frameMs = 0 means "run every display frame"; 33 means "cap at ~30 fps".
 * Phones start capped; other devices get capped automatically if they are measured to be struggling.
 */
export const perf = { frameMs: IS_MOBILE ? 33 : 0 };
/** true when a loop that last ran at `last` should skip this rAF tick */
export const skipFrame = (now, last) => perf.frameMs > 0 && now - last < perf.frameMs - 2;

if (typeof window !== "undefined" && window.requestAnimationFrame && !IS_MOBILE) {
  let t0 = 0, n = 0, windows = 0;
  const probe = (t) => {
    if (document.hidden || windows >= 6) { t0 = 0; if (windows < 6) requestAnimationFrame(probe); return; }
    if (!t0) { t0 = t; n = 0; } else if (++n >= 90) {
      windows++;
      if ((t - t0) / n > 26) { perf.frameMs = 33; document.documentElement.classList.add("is-lite"); windows = 99; return; }
      t0 = 0;
    }
    requestAnimationFrame(probe);
  };
  // start measuring after the initial load burst so startup hitches don't trigger it
  setTimeout(() => requestAnimationFrame(probe), 6000);
}

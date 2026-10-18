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

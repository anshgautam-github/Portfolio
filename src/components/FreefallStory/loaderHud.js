// loaderHud.js - the "mission control" readout for the loader. Every value is a pure function of the story progress p, so it scrubs both ways.
// The phase boundaries follow the real film: the launch vehicle coasts and the capsule separates (p 0 - .12), the freefall (.12 - .395),
// then drogue, canopy (rocket.js CH: .395 / .436) and the touchdown at .464 - .472.
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const norm = (v, a, b) => clamp((v - a) / (b - a));
const sstep = (a, b, v) => { const t = norm(v, a, b); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const outCubic = (t) => 1 - Math.pow(1 - t, 3);

export const TOUCH = 0.464;
export const PHASES = [
  [0, 'Weightless'], [0.06, 'Separation'], [0.12, 'Freefall'], [0.395, 'Final approach'], [0.436, 'Campus lock'], [0.472, 'Landed'], [0.685, 'Rising'], [0.79, 'Ready'],
];
// the markers on the progress bar: [label, story progress]
// the mission log: [story progress, line]. The newest three show in the monitor, each stamped with its mission-elapsed time.
export const EVENTS = [[0, 'All systems nominal'], [0.06, 'Capsule separation'], [0.12, 'Entry interface'], [0.2, 'Peak heating \u00b7 max-Q'], [0.3, 'Decelerating'], [0.395, 'Final approach'], [0.436, 'Campus lock'], [0.472, 'Touchdown \u00b7 Chennai'], [0.685, 'Ascent to site'], [0.79, 'Site ready']];
const bell = (p, c, w) => Math.exp(-(((p - c) / w) ** 2));
export const gLoad = (p) => (p < 0.12 ? 0 : p < 0.395 ? 0.2 + 7.2 * bell(p, 0.2, 0.06) : 1 + 3.4 * bell(p, 0.405, 0.008) + (p < 0.436 ? 0.5 : 0));
export const fmtG = (g) => g.toFixed(1) + ' G';
export const STAGES = [['Orbit', 0], ['Fall', 0.12], ['Dive', 0.405], ['Land', 0.472], ['Rise', 0.685], ['Ready', 0.79]];

const START = { lat: 27.4, lon: 61.8 };       // over the Arabian Sea / Iran at the start of the fall
const TARGET = { lat: 13.0827, lon: 80.2707 };  // Chennai

export function hudAt(p) {
  // altitude (km): coasting in orbit, then a long fall that thins out, then the last kilometres under canopy
  let alt;
  if (p < 0.12) alt = 408 - 8 * norm(p, 0, 0.12);
  else if (p < 0.395) alt = lerp(400, 3.2, 1 - Math.pow(1 - norm(p, 0.12, 0.395), 1.5));
  else alt = lerp(3.2, 0, sstep(0.395, TOUCH, p));
  // speed (m/s): orbital, the atmosphere bites, then the canopy
  let vel;
  if (p < 0.12) vel = 7660;
  else if (p < 0.395) vel = lerp(7660, 280, outCubic(norm(p, 0.12, 0.395)));
  else if (p < 0.44) vel = lerp(280, 6, outCubic(norm(p, 0.395, 0.44)));
  else vel = lerp(6, 0, sstep(0.44, TOUCH, p));
  const k = sstep(0, 0.395, p);
  const lat = lerp(START.lat, TARGET.lat, k), lon = lerp(START.lon, TARGET.lon, k);
  const sec = Math.floor((clamp(p, 0, 0.99) / 0.472) * 17 * 60);
  let phase = PHASES[0][1];
  for (const [at, name] of PHASES) if (p >= at) phase = name;
  let stage = 0;
  for (let i = 0; i < STAGES.length; i++) if (p >= STAGES[i][1]) stage = i;
  return { alt, vel, lat, lon, k, sec, phase, stage, mark: clamp(p / TOUCH), g: gLoad(p) };
}

export const fmtAlt = (km) => (km >= 10 ? km.toFixed(1) + ' KM' : Math.round(km * 1000).toLocaleString('en-US') + ' M');
export const fmtVel = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(2) + ' KM/S' : Math.round(ms) + ' M/S');
export const fmtMet = (s) => 'T+ ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
export const fmtLat = (v) => v.toFixed(4) + '° N';
export const fmtLon = (v) => v.toFixed(4) + '° E';

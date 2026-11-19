// chapters.js - "Where I've worked": the cards that follow the manifesto, one per experience (data comes from the Where I've Worked component).
import { EXPERIENCES } from '../Freefall/Freefall.jsx';

// "Where I've worked": the cards that follow the manifesto are the real experiences, read straight from the Where I've Worked component
// (Freefall/Freefall.jsx), so the roles, dates and logos can never drift apart. Logos live in /public/freefall/.
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const cap = (t) => t.charAt(0) + t.slice(1).toLowerCase();
export const CHAPTERS = EXPERIENCES.map((e, i, all) => {
  const period = e.when.split(' \u00b7 ')[0];
  return {
    id: e.rail.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    roman: ROMAN[i],
    title: e.rail,                       // the big word sliding behind the card
    bar: e.short,                        // centre of the card's top bar
    c: e.theme[0],                       // accent colour of this organisation
    logo: e.logo, sq: !!e.sq, org: e.company, yr: e.yr,
    next: i < all.length - 1 ? all[i + 1].rail : null,
    kicker: `${e.kind} \u00b7 ${period}`,
    head: e.n,
    body: e.text,
    dl: [['Organisation', e.company], ['Mode', (e.place && e.place.toLowerCase().startsWith(e.tag.toLowerCase())) ? e.place : cap(e.tag) + (e.place ? ' \u00b7 ' + e.place : '')], ['Duration', e.when.split(' \u00b7 ')[1] || e.when]],
    skills: e.skills,
    ring: `${e.short} \u2014 ${e.n} \u2014 ${period} \u2014`,
  };
});

// three personal principles (curiosity, leadership, execution): the lessons the descent left behind
export const LESSONS = [
  ['Stay a beginner at something.', 'The moment you think you know enough is usually the moment you stop discovering.'],
  ['Build beyond yourself.', 'The best thing you can create sometimes isn\u2019t software. It\u2019s an opportunity for someone else.'],
  ['Ideas need evidence.', 'An interesting concept becomes meaningful when someone can actually use it.'],
];

// the descent as a place: the readout in the corner of the film and the ladder on its right edge (engine.js reads p0 / p1: story progress).
// alt0 / alt1 are the altitude shown at the start and end of each leg (km); the engine interpolates between them. Coordinates are the places' real ones.
export const WAYPOINTS = [
  { tag: 'Orbit',      alt: '6,500 km', p0: 0.03,  p1: 0.075, place: 'Above the Earth',            sub: 'The whole planet. One small guess.' },
  { tag: 'India',      alt: '4,000 km', p0: 0.075, p1: 0.15,  place: 'India',                      sub: '20.59°N  78.96°E' },
  { tag: 'Tamil Nadu', alt: '700 km',   p0: 0.15,  p1: 0.235, place: 'Tamil Nadu',                 sub: '11.13°N  78.66°E' },
  { tag: 'Chennai',    alt: '100 km',   p0: 0.235, p1: 0.39,  place: 'Chennai',                    sub: '13.08°N  80.27°E · Bay of Bengal' },
  { tag: 'SRM',        alt: '0 m',      p0: 0.39,  p1: 0.62,  place: 'SRM Kattankulathur',         sub: 'Institute of Science and Technology · 12.82°N  80.04°E' },
  { tag: 'B.Tech CS',  alt: '0 m',      p0: 0.62,  p1: 0.87,  place: 'B.Tech, Computer Science',   sub: 'SRM Institute of Science and Technology, Chennai' },
];

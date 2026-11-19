import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Prism from "../Prism/Prism.jsx";
import Illusion from "../Illusion/Illusion.jsx";
import { markup } from "./markup.js";
import { mountFreefallStory } from "./engine.js";
import { mountAboutFx } from "./aboutFx.js";
import { mountWorkFx } from "./workFx.js";
import "./freefallStory.css";

/**
 * <FreefallStory /> - the "Freefall" scroll film right after the landing: Ansh's story told as a descent (gradient descent -> the hype -> what is left standing).
 *
 * One scroll-driven story: a figure falls through a shaft of light (frame-by-frame canvas film) while type flies past in 3D,
 * the impact flash, the noise, the fire ring, RISE, then an index of fragments from the descent (no projects: those live in the
 * Projects section), five chapters of the descent (Guess, Fall, Noise, Teach, Stand: chapters.js + art.js) with a loss curve
 * along the bottom that shows where you are, an about manifesto with the lessons it left behind and a tools marquee, service
 * rows with a cursor-following preview, and finally a burning doorway to walk through.
 *
 * Self-contained: markup.js is the static DOM, engine.js is the scroll engine (it returns destroy()), freefallStory.css is scoped
 * under .fs. The two films live in /public/freefall-story/{fall,portal}. The page's own Lenis, cursor and frame stay in charge.
 * The old standalone site's contact footer is left out: the portfolio's <Contact /> at the end of the page replaces it, and every
 * "Start a project" / "Talk about..." button scrolls there.
 */
// flip to true to bring the "Engineered through curiosity" block (Kimi / paddock) back, right after the About section
const SHOW_KIMI = false;
// Kimi (and three.js + its Draco decoder) is a lazy chunk that only exists in the build while the flag is on
const KimiAntonelli = SHOW_KIMI ? lazy(() => import("../Kimi/Kimi.jsx")) : null;

export default function FreefallStory() {
  const ref = useRef(null);
  const [prismSlot, setPrismSlot] = useState(null);   // slot right before "Where I've worked": the rolling Prism bar is portalled into it
  const [illSlot, setIllSlot] = useState(null);   // slot right before the "Where I've worked" title: the scroll dive into the illusion
  const [kimiSlot, setKimiSlot] = useState(null);   // the empty slot right after the About block: the Kimi block is portalled into it

  useLayoutEffect(() => {
    const root = ref.current;
    const base = `${import.meta.env.BASE_URL}freefall-story/`;
    root.innerHTML = markup(base);           // fresh DOM every mount (the engine rewrites parts of it: split text, cloned marquee, 3D words)
    setKimiSlot(root.querySelector('#fs-kimi-slot'));
    setPrismSlot(root.querySelector('#fs-prism-slot'));
    setIllSlot(root.querySelector('#fs-illusion-slot'));
    const destroyFx = mountAboutFx(root.querySelector('#fs-about'));   // the live background behind the About manifesto
    const wIntro = root.querySelector('#fs-work-intro');   // the opening title of "Where I've worked": reveals once when it scrolls into view
    const wio = wIntro && new IntersectionObserver(([en]) => { if (en.isIntersecting) { wIntro.classList.add('is-in'); wio.disconnect(); } }, { threshold: 0.35 });
    wio && wio.observe(wIntro);
    const destroyWork = mountWorkFx(root.querySelector('.work-stage')); // pointer life for the experience cards
    const destroy = mountFreefallStory(root, { base, mode: 'page' });
    // this block adds ~28 screens of height to the page: have every GSAP pin / trigger below (and the Reveal -> here transition) re-measure
    const t = setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 60);
    return () => {
      clearTimeout(t);
      wio && wio.disconnect();
      destroy();
      destroyFx();
      destroyWork();
      setKimiSlot(null);
      setPrismSlot(null);
      setIllSlot(null);
      root.innerHTML = "";
    };
  }, []);

  return (
    <section ref={ref} className="fs fs--page" aria-label="Freefall, a story told in one fall">
      {SHOW_KIMI && kimiSlot && createPortal(<Suspense fallback={null}><KimiAntonelli /></Suspense>, kimiSlot)}
      {prismSlot && createPortal(<Prism />, prismSlot)}
      {illSlot && createPortal(<Illusion />, illSlot)}
    </section>
  );
}

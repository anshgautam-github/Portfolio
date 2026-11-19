import { useEffect, useState, useCallback } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "./components/Landing/Reveal.jsx";
// import Hero from "./components/Hero/Hero.jsx"; // previous hero – still on disk, swap back here if you want it
import FreefallStory from "./components/FreefallStory/FreefallStory.jsx";
import Warp from "./components/Warp/Warp.jsx";
import TechSwitch from "./components/TechSwitch/TechSwitch.jsx";
import Hours from "./components/Hours/Hours.jsx";
import Proof from "./components/Proof/Proof.jsx";
import TechTransition from "./components/Transitions/TechTransition.jsx";
import PushTransition from "./components/Transitions/PushTransition.jsx";
import Seam from "./components/Transitions/Seam.jsx";
import GardenTransition from "./components/Transitions/GardenTransition.jsx";
import FreefallLoader from "./components/FreefallStory/FreefallLoader.jsx";
import { release } from "./lib/loader.js";
import Preloader from "./components/Preloader/Preloader.jsx";
import { resumeTarget } from "./lib/resume.js";

import Showcase from "./components/Showcase/Showcase.jsx";
import ArcCarousel from "./components/ArcCarousel/ArcCarousel.jsx";
import Toolkit from "./components/Toolkit/Toolkit.jsx";
import Collab from "./components/Collab/Collab.jsx";
import Contact from "./components/Contact/Contact.jsx";
import Diary from "./components/Diary/Diary.jsx";
import Frame from "./components/Frame/Frame.jsx";
import Cursor from "./components/Cursor/Cursor.jsx";
import Fx from "./components/Fx/Fx.jsx";
import MotionToggle from "./components/MotionToggle.jsx";

const SHOW_DIARY = false;
// the scroll showcase is still the template's "Butter" video-editor demo (its copy and /showcase images are not yours), so it is parked here:
// flip to true to put it back between the garden and the collaboration scene
const SHOW_SHOWCASE = false;
const SHOW_LOADER = false; // the counter + freefall loader - set to true to bring it back (off while testing so reloads are instant)
const SHOW_CONTACT = false; // the footer / contact section - flip to true to bring it back
const SHOW_COLLAB = false; // the handshake section - flip to true to bring it back

// in-page skip link: the browser's own jump fights the smooth scroller, so move focus to <main> and let it scroll the page itself
function skipToMain(e) {
  e.preventDefault();
  const m = document.getElementById("main");
  if (m) m.focus({ preventScroll: true });
  window.__lenis && window.__lenis.scrollTo ? window.__lenis.scrollTo(m, { immediate: true }) : m && m.scrollIntoView();
}

export default function App() {
  // the counter pre-loader runs first; the heavy main loader mounts only when it reaches 100 (so nothing competes with the first paint).
  // No counter when the page restarts mid-visit (resume) or with reduced motion: the loader decides those cases itself.
  const skipPre = resumeTarget() > 0 || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [loaderOn, setLoaderOn] = useState(skipPre);
  const startLoader = useCallback(() => setLoaderOn(true), []);
  // loader hidden: open the page straight away
  useEffect(() => { if (!SHOW_LOADER) release(true); }, []);
  // The pinned showcase + web fonts + images all change page height after first paint.
  // Re-measure every scroll trigger whenever that happens so the Socials / Contact reveals fire when you reach them.

  useEffect(() => {
    let lastW = window.innerWidth;
    let t;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    // re-measuring pins mid-scroll makes them un-pin / re-pin (a visible flash), so wait until scrolling has settled
    let lastY = window.scrollY, lastMove = 0;
    window.addEventListener("scroll", () => { lastMove = performance.now(); }, { passive: true });
    let pending = 0;
    const refresh = () => {
      clearTimeout(pending);
      if (performance.now() - lastMove < 250) { pending = setTimeout(refresh, 260); return; }
      ScrollTrigger.refresh();
    };
    const onWindowResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = window.innerWidth;
        if (w !== lastW) {
          lastW = w;
          refresh();
        }
      }, 200);
    };

    window.addEventListener("load", refresh);
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", () => setTimeout(refresh, 300));
    document.fonts?.ready.then(() => setTimeout(refresh, 120));
    const t1 = setTimeout(refresh, 900);
    const t2 = setTimeout(refresh, 2200);

    let ro = null;
    if (!touch) {
      let lastH = document.documentElement.scrollHeight;
      const onBodyResize = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const h = document.documentElement.scrollHeight;
          if (Math.abs(h - lastH) > 4) {
            lastH = h;
            refresh();
          }
        }, 150);
      };
      ro = new ResizeObserver(onBodyResize);
      ro.observe(document.body);
    }

    return () => {
      window.removeEventListener("load", refresh);
      window.removeEventListener("resize", onWindowResize);
      clearTimeout(t);
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* The story, in the order a visitor wants it (the dark / light rhythm is deliberate):
          hook      loader -> landing -> freefall (who I am, about)                                  light -> dark
          work      Warp projects                                                                    dark, high energy
          how       TechSwitch: the stack, cream switch opening onto dark rows                       a breath of light, then dark
          trust     Proof: experience, CGPA, certifications (calm, text-led, same dark as the rows)  dark, quiet
          depth     ArcCarousel: the programs and communities behind it                              black, high energy
          invite    Toolkit hand-off -> Garden "Let's grow your next idea"                           the emotional turn
          ask       Collab (the interactive handshake) -> Contact (dawn sky)                         night -> dawn */}
      {/* The loader: a full-screen overlay (orbit, rocket, jump, parachute, SRM). It plays on top of the page, then lifts and calls release() so the landing plays its intro */}
      {SHOW_LOADER && !skipPre && <Preloader onReady={startLoader} />}
      {SHOW_LOADER && loaderOn && <FreefallLoader />}
      <a className="skip-link" href="#main" onClick={skipToMain}>Skip to main content</a>
      {/* Act 2: the landing */}
      <main id="main" tabIndex={-1}>
      <Reveal />
      {/* Act 2a: the rest of the Freefall story (impact, noise, rise, chapters...) straight after the landing */}
      <FreefallStory />
      {/* the Kimi / paddock block now lives inside <FreefallStory />, right after its About section */}
      <Warp />
      {/* the tech stack: a switch you flip, then slanted rows of tools running in opposite directions */}
      <TechSwitch />
      {/* the laptop-screen flight into the stack was replaced: the stack now rises from the bottom as a card over the last project (techSwitch.css) */}
      {/* "a day of building": a watch dial, a sweeping hand and a rolling counter, scrubbed by scroll */}
      <Hours />
      {/* soft hand-offs on the joins that used to be hard cuts (see Transitions/Seam.jsx) */}
      {/* Proof (experience tabs, CGPA, credentials) is hidden for now: flip the comment back to bring it, and its #12161b seam, back
          <Seam to="#12161b" accent="120,160,255" span={34} glow={40} />
          <Proof />
      */}
      <PushTransition from="#fs-portal" />
      <Seam to="#000000" accent="91,140,255" span={22} glow={30} />
      <ArcCarousel />
      <Seam to="#04071a" accent="110,150,255" span={26} glow={34} />
      <Toolkit />
      {/* hidden for now - flip SHOW_DIARY to bring it back (sits after Toolkit) */}
      {SHOW_DIARY && <Diary />}
      {SHOW_SHOWCASE && <Showcase />}
      {SHOW_COLLAB && <Seam to="#02040a" accent="120,200,170" span={26} glow={34} />}
      {SHOW_COLLAB && <Collab />}
      {SHOW_CONTACT && <Seam to="#f6f8fc" accent="255,190,130" span={34} glow={44} />}
      {SHOW_CONTACT && <Contact />}
      </main>
      {/* text-only footer landmark (no visual change: the page still ends on the garden scene) */}
      <footer className="a11y-hidden">
        <p>Ansh Gautam: AI engineer, researcher and builder, from India.</p>
      </footer>
      <MotionToggle />
      <Frame />
      <Cursor />
      <Fx />
    </>
  );
}

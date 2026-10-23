import { Suspense, lazy, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Reveal from "./components/Landing/Reveal.jsx";
// import Hero from "./components/Hero/Hero.jsx"; // previous hero – still on disk, swap back here if you want it
import KimiAntonelli from "./components/Kimi/Kimi.jsx";
import Warp from "./components/Warp/Warp.jsx";
import PushTransition from "./components/Transitions/PushTransition.jsx";
import GardenTransition from "./components/Transitions/GardenTransition.jsx";
import Journey from "./components/Journey/Journey.jsx";
import { startStory } from "./lib/loader.js";

// Flip to true to bring back the Earth journey (the loader). While false the page opens straight on the landing.
const SHOW_INTRO = false;
import Showcase from "./components/Showcase/Showcase.jsx";
import ArcCarousel from "./components/ArcCarousel/ArcCarousel.jsx";
import WorkTransition from "./components/Transitions/WorkTransition.jsx";
import Freefall from "./components/Freefall/Freefall.jsx";
import Toolkit from "./components/Toolkit/Toolkit.jsx";
import Collab from "./components/Collab/Collab.jsx";
import Contact from "./components/Contact/Contact.jsx";
import Diary from "./components/Diary/Diary.jsx";
import Frame from "./components/Frame/Frame.jsx";
import Cursor from "./components/Cursor/Cursor.jsx";
// the assistant is a fixed overlay (not part of the scroll layout), so it can load after the page is interactive
const Teddy = lazy(() => import("./components/Teddy/Teddy.jsx"));

const SHOW_DIARY = false;

export default function App() {
  // The pinned showcase + web fonts + images all change page height after first paint.
  // Re-measure every scroll trigger whenever that happens so the Socials / Contact reveals fire when you reach them.
  useEffect(() => {
    if (!SHOW_INTRO) startStory();
  }, []);

  useEffect(() => {
    let last = document.documentElement.scrollHeight;
    let t;
    const refresh = () => ScrollTrigger.refresh();
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const h = document.documentElement.scrollHeight;
        if (Math.abs(h - last) > 2) {
          last = h;
          refresh();
        }
      }, 150);
    };
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(() => setTimeout(refresh, 120));
    const t1 = setTimeout(refresh, 900);
    const t2 = setTimeout(refresh, 2200);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("load", refresh);
      clearTimeout(t);
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* Act 0 + 1: the Earth is the loader. Prologue while it builds, then the scroll-driven flight; it shatters open onto the landing */}
      {SHOW_INTRO && <Journey />}
      {/* Act 2: the landing */}
      <Reveal />
      {/* Act 2b: the Kimi Antonelli driver block, straight after the landing */}
      <KimiAntonelli />
      <Warp />
      <PushTransition />
      <WorkTransition />
      <Freefall />
      <ArcCarousel />
      <Toolkit />
      {/* hidden for now - flip SHOW_DIARY to bring it back (sits after Toolkit) */}
      {SHOW_DIARY && <Diary />}
      <Showcase />
      <Collab />
      <Contact />
      <Suspense fallback={null}>
        <Teddy />
      </Suspense>
      <Frame />
      <Cursor />
    </>
  );
}

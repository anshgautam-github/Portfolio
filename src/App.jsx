import { Suspense, lazy, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Loader from "./components/Loader/Loader.jsx";
import Reveal from "./components/Landing/Reveal.jsx";
// import Hero from "./components/Hero/Hero.jsx"; // previous hero – still on disk, swap back here if you want it
import Warp from "./components/Warp/Warp.jsx";
import Journey from "./components/Journey/Journey.jsx";
import Collage from "./components/Collage/Collage.jsx";
import Showcase from "./components/Showcase/Showcase.jsx";
import Picked from "./components/Picked/Picked.jsx";
import Toolkit from "./components/Toolkit/Toolkit.jsx";
import Garden from "./components/Garden/Garden.jsx";
import Socials from "./components/Socials/Socials.jsx";
import Collab from "./components/Collab/Collab.jsx";
import Contact from "./components/Contact/Contact.jsx";
import Diary from "./components/Diary/Diary.jsx";
import Outro from "./components/Outro/Outro.jsx";
import Cursor from "./components/Cursor/Cursor.jsx";
// the assistant is a fixed overlay (not part of the scroll layout), so it can load after the page is interactive
const Teddy = lazy(() => import("./components/Teddy/Teddy.jsx"));

export default function App() {
  // The pinned showcase + web fonts + images all change page height after first paint.
  // Re-measure every scroll trigger whenever that happens so the Socials / Contact reveals fire when you reach them.
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
      <Loader />
      <Reveal />
      <Journey />
      <Warp />
      <Collage />
      <Diary />
      <Showcase />
      <Picked />
      <Toolkit />
      <Garden />
      <Socials />
      <Collab />
      <Contact />
      <Outro />
      <Suspense fallback={null}>
        <Teddy />
      </Suspense>
      <Cursor />
    </>
  );
}

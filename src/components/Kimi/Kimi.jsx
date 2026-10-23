import { useEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { markup } from "./markup.js";
import { mountKimi } from "./engine.js";
import "./kimi.css";

/**
 * <KimiAntonelli /> — the Kimi Antonelli driver block: WebGL hero → the season (circuit trace + halftone map)
 * → "from karts to F1" timeline → the paddock → keep pushing forward.
 *
 * Self-contained: markup.js is the static DOM, engine.js is the motion engine (it returns destroy()), kimi.css is
 * scoped under .kimi. three.js is pulled from the CDN through the import map in index.html. Drop it anywhere in the
 * page — in App.jsx it sits straight after <Reveal /> (the landing).
 */
export default function KimiAntonelli() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    root.innerHTML = markup;                 // fresh DOM every mount (the engine rewrites parts of it, e.g. split text)
    const destroy = mountKimi(root);
    // this block adds its own height to the page: have every GSAP pin / trigger below it re-measure
    const t = setTimeout(() => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }, 60);
    return () => {
      clearTimeout(t);
      destroy();
      root.innerHTML = "";
      ScrollTrigger.refresh();
    };
  }, []);

  return <section ref={ref} className="kimi" aria-label="Kimi Antonelli" />;
}

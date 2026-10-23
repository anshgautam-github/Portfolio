import { useEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountReveal } from "./reveal.js";
import { mountLanding } from "./landing.js";
import { landingContent } from "./landingContent.js";
import "./landing.css";
import "./reveal.css";

/**
 * <Reveal /> — the landing screen plus its scroll transition (see reveal.js):
 * landing shrinks into a card, a signature signs itself behind it, strips slide past, then the deep-navy beat before the Earth.
 * It replaces <Landing /> in App.jsx; the landing itself is still built by mountLanding (landing.js).
 */
export default function Reveal({ content = landingContent, scrollLength = 3.75 }) {
  const ref = useRef(null);
  useEffect(() => {
    const rv = mountReveal(ref.current, undefined, { scrollLength });
    const destroyLanding = mountLanding(rv.slot, content);
    // the WebGL scene is by far the heaviest thing on screen: lighten it as soon as the card shrinks, freeze it once it is small
    let mode = 0;
    rv.onProgress = (p) => {
      const m = p > 0.22 ? 2 : p > 0.008 ? 1 : 0;
      if (m !== mode) { mode = m; destroyLanding.setLoad && destroyLanding.setLoad(m); }
    };
    ScrollTrigger.sort();
    ScrollTrigger.refresh();   // sections below were measured before our pin spacing existed: re-measure all
    return () => { destroyLanding(); rv.destroy(); };
  }, [content, scrollLength]);
  return <section ref={ref} data-reveal />;
}

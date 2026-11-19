import React from "react";
import { createRoot } from "react-dom/client";
// a refresh / reload always starts from the top, so the loader (the counting preloader) plays first: never let the browser restore an old scroll position
if (typeof history !== "undefined" && "scrollRestoration" in history) history.scrollRestoration = "manual";
if (typeof window !== "undefined") window.scrollTo(0, 0);
import "./lib/perf.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./index.css";
import App from "./App.jsx";
import { initSmoothScroll } from "./lib/smooth.js";
import { initOffscreenPause } from "./lib/offscreen.js";
import { batchStartupRefresh } from "./lib/stRefresh.js";
import { startFlickerProbe } from "./lib/flickerProbe.js";

gsap.registerPlugin(ScrollTrigger);
// merge the ~17 start-up ScrollTrigger.refresh() calls into one (see lib/stRefresh.js)
batchStartupRefresh();
// Don't let one long frame (tab switch, GC, shader compile) make every tween "catch up" in a visible jump.
gsap.ticker.lagSmoothing(500, 33);
// Mobile URL-bar collapse/expand fires resize on every scroll; refreshing all pins for that is what causes the stutter.
ScrollTrigger.config({ ignoreMobileResize: true });
initSmoothScroll();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// the app is up: the static identity text in index.html (for crawlers / no-JS) would only duplicate it
document.getElementById("static-identity")?.remove();

// endless decorative loops sleep while their section is far off-screen (see lib/offscreen.js)
initOffscreenPause();
startFlickerProbe();   // no-op unless the URL has ?probe

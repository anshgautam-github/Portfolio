import React from "react";
import { createRoot } from "react-dom/client";
import "./lib/perf.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./index.css";
import App from "./App.jsx";
import { initSmoothScroll } from "./lib/smooth.js";

gsap.registerPlugin(ScrollTrigger);
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

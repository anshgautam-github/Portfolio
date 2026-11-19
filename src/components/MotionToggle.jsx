import { useState } from "react";

// WCAG 2.2.2 (Pause, Stop, Hide): the page has auto-moving marquees and tickers that run for more than 5 seconds, so visitors get
// one button that freezes them. It sets html[data-motion="paused"]: index.css pauses every CSS loop under it, and the JS tickers
// (TechSwitch rows, the Freefall marquee) read the same attribute. Scroll-driven motion is the visitor's own and is untouched.
export default function MotionToggle() {
  const [paused, setPaused] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.motion === "paused");
  const flip = () => {
    const next = !paused;
    if (next) document.documentElement.dataset.motion = "paused"; else delete document.documentElement.dataset.motion;
    setPaused(next);
  };
  return (
    <button type="button" className="motion-toggle" aria-pressed={paused} onClick={flip} data-lenis-prevent>
      {paused ? "Play motion" : "Pause motion"}
    </button>
  );
}

import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * <ArcHold /> - after the cards shatter and the "Where I learn, contribute & grow" section lands, a fast scroll must not
 * carry straight through it. The first time the section's top reaches the top of the screen (scrolling down) the page is held
 * there for HOLD ms; after that the next scroll moves on into the Arsenal transition as normal.
 */
const HOLD = 1200;

export default function ArcHold({ target = "section.arc" }) {
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let st = null, timer = 0, held = false, boot = 0, free = null, onScroll = null;
    const stop = (e) => { e.preventDefault(); };
    const KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "End", "Home"]);
    const onKey = (e) => { if (KEYS.has(e.key)) e.preventDefault(); };

    const release = () => {
      held = false; timer = 0;
      const lenis = window.__lenis;
      if (lenis) lenis.start();
      if (free) { free(); free = null; }
    };

    const hold = (y) => {
      if (held) return;
      held = true;
      const lenis = window.__lenis;
      if (lenis) {
        lenis.stop();
        lenis.scrollTo(y, { immediate: true, force: true });
      } else {
        window.scrollTo(0, y);
        window.addEventListener("wheel", stop, { passive: false });
        window.addEventListener("touchmove", stop, { passive: false });
        window.addEventListener("keydown", onKey);
        free = () => {
          window.removeEventListener("wheel", stop);
          window.removeEventListener("touchmove", stop);
          window.removeEventListener("keydown", onKey);
        };
      }
      timer = window.setTimeout(release, HOLD);
    };

    boot = requestAnimationFrame(() => {
      const el = document.querySelector(target);
      if (!el) return;
      let armed = true;
      st = ScrollTrigger.create({
        trigger: el, start: "top top", end: "bottom top",
        onEnter: (self) => { if (armed && !held) { armed = false; hold(self.start); } },   // self.start = the section's natural scroll position (ignores any transform on it)
        // re-arm only once the visitor has really scrolled back up above the section, not on jitter at the hold position
      });
      onScroll = () => { if (!armed && !held && st && window.scrollY < st.start - window.innerHeight * 0.6) armed = true; };
      window.addEventListener("scroll", onScroll, { passive: true });
    });

    return () => {
      cancelAnimationFrame(boot);
      if (onScroll) window.removeEventListener("scroll", onScroll);
      if (st) st.kill();
      if (timer) clearTimeout(timer);
      release();
    };
  }, [target]);
  return null;
}

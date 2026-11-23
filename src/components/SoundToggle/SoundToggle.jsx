import { useEffect, useRef, useState } from "react";
import { score } from "../../lib/score.js";
import "./soundToggle.css";

/* The site's one sound switch. It shows what the music is doing: four bars that move with the scroll speed, and a plain label.
   "Sound on" = playing, "Sound off" = the visitor muted it (remembered), "Tap for sound" = the browser is waiting for a first click / key / tap. */
const LABEL = { on: "Sound on", off: "Sound off" };

export default function SoundToggle() {
  const [st, setSt] = useState(() => score.state());
  const btn = useRef(null);

  useEffect(() => {
    score.init();
    setSt(score.state());
    const un = score.subscribe(() => setSt(score.state()));
    let raf = 0, last = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 50 || !btn.current) return;
      last = now;
      btn.current.style.setProperty("--lv", score.level().toFixed(3));
    };
    raf = requestAnimationFrame(tick);
    return () => { un(); cancelAnimationFrame(raf); };
  }, []);

  if (st !== "on" && st !== "off") return null;   // never asked / waiting for a tap: the consent card is on screen instead
  return (
    <button
      ref={btn}
      type="button"
      className={"snd-toggle is-" + st}
      aria-pressed={st === "on"}
      aria-label={st === "off" ? "Turn the music on" : "Turn the music off"}
      onClick={() => { if (!score.justStarted()) score.toggle(); }}
      data-lenis-prevent
    >
      <span className="snd-bars" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="snd-label">{LABEL[st]}</span>
    </button>
  );
}

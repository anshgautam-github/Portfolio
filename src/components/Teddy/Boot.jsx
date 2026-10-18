import { useEffect, useRef, useState } from "react";
import { teddy } from "./teddyContent.js";

const SEGMENTS = 40;

const CHECKS = [
  ["mounting /dev/bamboo", "OK"],
  ["spawning 3 subagents", "OK"],
  ["loading the system prompt", "OK"],
  ["aligning pandas on one goal", "3 of 4 → OK"],
];

/** Fake BIOS boot. Calls onDone() when finished (any key / click also skips - handled by the panel). */
export function BootScreen({ onDone, play }) {
  const [step, setStep] = useState(0); // 0 header, 1 init line, 2 bar running, 3.. checks
  const [pct, setPct] = useState(0);
  const [checks, setChecks] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    play("boot");
    at(120, () => setStep(1));
    at(620, () => setStep(2));

    // progress bar eased with rAF
    let raf = 0;
    const start = performance.now() + 620;
    const dur = 2100;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      setPct(1 - Math.pow(1 - t, 2.2));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    CHECKS.forEach((_, i) => at(2800 + i * 380, () => setChecks(i + 1)));
    at(2800 + CHECKS.length * 380 + 800, () => done.current());
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [play]);

  const filled = Math.floor(pct * SEGMENTS);

  return (
    <div className="ted-boot">
      <div className="ted-boot-dim ted-glitch">PANDA BIOS v1.0 · 640K context OK</div>
      {step >= 1 && <div className="ted-boot-hi">Initializing portfolio for {teddy.owner.toLowerCase()} in ~/den/</div>}
      {step >= 2 && (
        <div className="ted-bar-seg" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} className={i < filled ? "on" : i === filled && pct < 1 ? "cur" : ""} />
          ))}
        </div>
      )}
      <div className="ted-boot-rows">
        {CHECKS.slice(0, checks).map(([l, r], i) => (
          <div key={l} className="ted-boot-row">
            <span>{l}</span>
            <span className="ted-leader" />
            <b className={i === 3 ? "warm" : ""}>{r}</b>
          </div>
        ))}
      </div>
      {checks >= CHECKS.length && (
        <div className="ted-boot-skip">
          press <kbd>any key</kbd> to continue
        </div>
      )}
      {checks < CHECKS.length && (
        <div className="ted-boot-skip dim">
          press <kbd>any key</kbd> to skip
        </div>
      )}
    </div>
  );
}

/** "PRESS ANY KEY" title card. */
export function SplashScreen({ onEnter }) {
  return (
    <button type="button" className="ted-splash" onClick={onEnter} aria-label="Press any key to continue">
      <div className="ted-logo">
        <svg className="ted-globe" viewBox="0 0 400 130" fill="none" aria-hidden="true">
          <path d="M20 66 Q200 -8 380 66" />
          <path d="M20 66 Q200 140 380 66" />
          <path d="M120 52 Q200 6 280 52" />
          <path d="M120 80 Q200 126 280 80" />
          <path d="M200 8 V124" />
        </svg>
        <div className="ted-logo-text">PANDA OS</div>
      </div>
      <div className="ted-press">
        PRESS ANY KEY<span className="ted-caret" />
      </div>
    </button>
  );
}

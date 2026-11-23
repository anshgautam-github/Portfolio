import { useEffect, useRef, useState } from "react";
import { score } from "../../lib/score.js";
import { whenReleased } from "../../lib/loader.js";
import "./soundConsent.css";

/* The sound permission card. Browsers only play sound after a deliberate click, so instead of a silent page and a tiny switch the site asks
   - once, politely, in its own voice - the moment it opens. "Enter with sound" is that click: it unlocks audio and plays a short chime so the
   visitor hears it work at once. The answer is remembered (lib/score.js); "Stay silent" is respected and the card never returns.
   A returning visitor who already said yes still needs one tap per visit, so they get the same card, worded as a welcome back. */
const COPY = {
  ask: {
    eyebrow: "( Sound design )",
    title: "A little sound, just for the fall.",
    text: "A soft wind as you fall from the sky, and a far-off jet in the clouds. Once you land, the site is quiet.",
    yes: "Enter with sound",
  },
  locked: {
    eyebrow: "( Welcome back )",
    title: "Pick the sound back up?",
    text: "Your browser needs one tap before it lets the sound through. Everything else stays quiet.",
    yes: "Resume sound",
  },
};

function Cookie() {
  const chips = [[22, 24, 3.2, 2.5, 0], [37, 20, 2.6, 2.1, 1], [30, 36, 3.4, 2.6, 2], [44, 38, 2.5, 2, 3], [20, 42, 2.4, 1.9, 4], [38, 49, 2.8, 2.2, 5]];
  return (
    <span className="sc-cookie" aria-hidden="true">
      <i className="sc-ring" /><i className="sc-ring sc-ring--b" />
      <svg viewBox="0 0 64 64" width="52" height="52">
        <defs>
          <mask id="sc-bite"><rect width="64" height="64" fill="#fff" /><circle cx="51" cy="13" r="11" fill="#000" /><circle cx="59" cy="31" r="5" fill="#000" /></mask>
          <radialGradient id="sc-dough" cx="34%" cy="28%" r="80%"><stop offset="0" stopColor="#f8ebc9" /><stop offset="1" stopColor="#d7b575" /></radialGradient>
        </defs>
        <g mask="url(#sc-bite)">
          <circle cx="32" cy="34" r="26" fill="url(#sc-dough)" />
          {chips.map(([x, y, rx, ry, d], i) => <ellipse className="sc-chip" key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#2b1d14" style={{ "--d": d * 0.12 + "s" }} />)}
        </g>
      </svg>
    </span>
  );
}

export default function SoundConsent() {
  const [mode, setMode] = useState(null);       // null (hidden) | "ask" | "locked"
  const [open, setOpen] = useState(false);
  const yes = useRef(null), card = useRef(null);

  useEffect(() => {
    score.init();
    let t = 0, gone = false, ready = false;
    const sync = () => {
      const s = score.state();
      if (s === "ask" || s === "locked") { if (ready) setMode((m) => m || s); }
      else { setOpen(false); t = setTimeout(() => !gone && setMode(null), 900); }   // answered: the card leaves, then unmounts
    };
    // it comes by itself, like any consent banner: as soon as the counter hands over to the Earth screen (the preloader announces "pl:out"),
    // a beat later so that screen is seen first. With no counter (a resumed visit, reduced motion, loader switched off) it comes when the page
    // is released instead.
    const arm = (ms) => { if (gone || ready) return; ready = true; t = setTimeout(sync, ms); };
    const onCounterDone = () => arm(1300);
    window.addEventListener("pl:out", onCounterDone, { once: true });
    whenReleased(() => arm(1800));
    if (!document.querySelector(".pl")) arm(2200);
    const un = score.subscribe(sync);
    return () => { gone = true; clearTimeout(t); window.removeEventListener("pl:out", onCounterDone); un(); };
  }, []);

  useEffect(() => {
    if (!mode) return undefined;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => { setOpen(true); try { card.current && card.current.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }));   // focus the card (no ring), so Tab goes straight to the buttons
    return () => cancelAnimationFrame(r);
  }, [mode]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") score.decline(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mode) return null;
  const c = COPY[mode] || COPY.ask;
  return (
    <div className={"sc-wrap" + (open ? " is-open" : "")} role="dialog" aria-label="Sound" aria-describedby="sc-text" data-snd-consent data-lenis-prevent>
      <div className="sc-scrim" aria-hidden="true" />
      <div className="sc-card" ref={card} tabIndex={-1}>
        <span className="sc-edge" aria-hidden="true" />
        <div className="sc-top" style={{ "--i": 0 }}>
          <Cookie />
          <span className="sc-eyebrow">{c.eyebrow}</span>
        </div>
        <h2 className="sc-title" style={{ "--i": 1 }}>{c.title}</h2>
        <p className="sc-text" id="sc-text" style={{ "--i": 2 }}>{c.text}</p>
        <div className="sc-actions" style={{ "--i": 3 }}>
          <button ref={yes} type="button" className="sc-yes" onClick={() => score.accept()}>
            <span className="sc-bars" aria-hidden="true"><i /><i /><i /><i /></span>{c.yes}
          </button>
          <button type="button" className="sc-no" onClick={() => score.decline()}>Stay silent</button>
        </div>
        <p className="sc-fine" style={{ "--i": 4 }}>Remembered on this device only. Change it any time with the switch at the bottom.</p>
      </div>
    </div>
  );
}

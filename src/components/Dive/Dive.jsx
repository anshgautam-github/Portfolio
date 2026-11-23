import { useEffect, useRef } from "react";
import initDive from "./dive.js";
import "./dive.css";

/* Right after the landing: "Look closer".
   A big-eyed character peeks up from the bottom of the screen. Scrolling lifts the headline away, pushes in on the character's left eye,
   and the eye turns out to be a portal: you fall through it into a starfield where a card for the featured build floats up out of the dark.
   Everything is one pinned stage driven by a single scroll progress (see dive.js). Edit the copy / link below. */

const CONTENT = {
  line1: "LOOK CLOSER,",
  line2: "THE WORK IS INSIDE",
  button: "Enter the build",
  note: "go on, dive in",
  eyebrow: "[ featured build ]",
  title: "LLMs from scratch",
  body: "A language model built from the ground up. Every layer written by hand, so nothing is a black box.",
  cta: "Read the code",
  href: "https://github.com/anshgautam-github/llm-from-scratch",
  cardTitle: ["LLMs", "FROM", "SCRATCH"],
  cardBy: "Ansh Gautam",
};

export default function Dive() {
  const root = useRef(null);
  useEffect(() => initDive(root.current), []);

  return (
    <section ref={root} className="dv" id="dive" aria-label="Featured build">
      <div className="dv-wrap" data-dv-wrap>
        <div className="dv-stage" data-dv-stage>
          <canvas className="dv-bg" data-dv-bg aria-hidden="true" />
          <div className="dv-grid" aria-hidden="true">
            {[4.4, 33.3, 66.6, 95.6].map((x) => <i className="dv-gv" key={"v" + x} style={{ left: x + "%" }} />)}
            {[12, 88].map((y) => <i className="dv-gh" key={"h" + y} style={{ top: y + "%" }} />)}
            {[4.4, 33.3, 66.6, 95.6].flatMap((x) => [12, 88].map((y) => <i className="dv-gx" key={x + "-" + y} style={{ left: x + "%", top: y + "%" }} />))}
          </div>
          {/* the night on the other side of the eye: appears once the portal has filled the screen */}
          <div className="dv-night" data-dv-night aria-hidden="true">
            <canvas className="dv-nbg" data-dv-nbg aria-hidden="true" />
          </div>

          {/* the camera: one SVG, one transform. The eye is the origin of its own coordinates, so zooming into it is a single number. */}
          <svg className="dv-cam" data-dv-svg aria-hidden="true" focusable="false">
            <defs>
              <clipPath id="dv-iris"><ellipse cx="0" cy="0" rx="80" ry="120" /></clipPath>
              <radialGradient id="dv-glow" cx="50%" cy="46%" r="60%">
                <stop offset="0" stopColor="#141b3b" />
                <stop offset="1" stopColor="#04060c" />
              </radialGradient>
              <radialGradient id="dv-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#6f8cff" stopOpacity="0.26" />
                <stop offset="1" stopColor="#6f8cff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g data-dv-cam>
              {/* tuft */}
              <g transform="translate(160 -330) scale(0.62) translate(-160 330)"><g className="dv-tuft" data-dv-tuft>
                <path className="dv-ink dv-coral" d="M60 -326 C18 -430 58 -526 142 -566 C194 -482 172 -376 132 -322 Z" />
                <path className="dv-ink dv-amber" d="M148 -326 C136 -470 180 -604 274 -684 C336 -562 292 -420 230 -322 Z" />
                <path className="dv-ink dv-blue" d="M246 -326 C290 -400 360 -452 436 -442 C424 -380 372 -338 318 -318 Z" />
              </g></g>
              {/* head */}
              <path className="dv-ink dv-head" d="M-520 1300 C-528 520 -330 -330 160 -332 C650 -330 846 520 840 1300 Z" />
              <ellipse className="dv-blush" cx="-150" cy="215" rx="70" ry="38" />
              <ellipse className="dv-blush" cx="470" cy="225" rx="70" ry="38" />
              <g className="dv-freckles">
                <circle cx="-190" cy="190" r="7" /><circle cx="-135" cy="178" r="7" /><circle cx="-165" cy="238" r="7" />
                <circle cx="425" cy="196" r="7" /><circle cx="480" cy="184" r="7" /><circle cx="455" cy="244" r="7" />
              </g>
              <path className="dv-stroke dv-brow" d="M-115 -196 Q-20 -282 104 -240" />
              <path className="dv-stroke dv-brow" d="M232 -246 Q356 -286 438 -196" />

              {/* left eye: starts as an ordinary pupil, scroll turns it into the portal */}
              <ellipse className="dv-ink dv-white" cx="0" cy="0" rx="106" ry="150" />
              <g data-dv-lpupil>
                <ellipse cx="0" cy="0" rx="64" ry="100" fill="#101211" />
                <path className="dv-shine" d="M-34 -50 C-40 -76 -16 -88 2 -80" />
                <circle cx="32" cy="52" r="9" fill="#fff" />
              </g>
              <g data-dv-portal opacity="0">
              <g clipPath="url(#dv-iris)">
                <rect x="-90" y="-130" width="180" height="260" fill="url(#dv-glow)" />
                <ellipse cx="-18" cy="-24" rx="70" ry="96" fill="url(#dv-bloom)" />
                {[[-52, -78, 1.5, 0.9], [26, -92, 1, 0.6], [14, -36, 2, 1], [-60, 18, 1.2, 0.7], [34, 22, 1, 0.55], [26, 56, 1.6, 0.85], [-30, 74, 1.1, 0.6], [-6, 100, 1.4, 0.8], [52, -46, 0.9, 0.5], [-44, -20, 0.9, 0.5]].map(([x, y, r, o], i) => <circle key={i} className="dv-pt" cx={x} cy={y} r={r} opacity={o} />)}
              </g>
              <ellipse className="dv-ring" cx="0" cy="0" rx="80" ry="120" />
              <path className="dv-shine" data-dv-shine d="M-46 -64 C-52 -88 -30 -102 -14 -96" />
              </g>

              {/* right eye: follows the pointer */}
              <ellipse className="dv-ink dv-white" cx="320" cy="10" rx="106" ry="150" />
              <g data-dv-pupil>
                <ellipse cx="320" cy="10" rx="64" ry="100" fill="#101211" />
                <path className="dv-shine" d="M286 -40 C280 -66 304 -78 322 -70" />
                <circle cx="352" cy="62" r="9" fill="#fff" />
              </g>

              {/* lids (blink) */}
              <ellipse className="dv-lid" data-dv-lid cx="0" cy="0" rx="109" ry="0" />
              <ellipse className="dv-lid" data-dv-lid cx="320" cy="10" rx="109" ry="0" />
            </g>
          </svg>

          {/* the featured build, tiny inside the eye at first, full size on the far side */}
          <div className="dv-card" data-dv-card>
            <a className="dv-card-in" data-dv-card-in href={CONTENT.href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
              <span className="dv-card-spine" />
              <span className="dv-card-title">
                {CONTENT.cardTitle.map((w) => <span key={w}>{w}</span>)}
              </span>
              <svg className="dv-card-net" viewBox="0 0 160 120" aria-hidden="true">
                <g className="dv-net-l">
                  {[[20, 24, 80, 12], [20, 24, 80, 42], [20, 60, 80, 42], [20, 60, 80, 78], [20, 96, 80, 78], [20, 96, 80, 108], [20, 24, 80, 78], [20, 96, 80, 42],
                    [80, 12, 140, 40], [80, 42, 140, 40], [80, 42, 140, 80], [80, 78, 140, 80], [80, 78, 140, 40], [80, 108, 140, 80]].map(([a, b, c, d], i) => <line key={i} x1={a} y1={b} x2={c} y2={d} />)}
                </g>
                <g className="dv-net-n">
                  {[[20, 24], [20, 60], [20, 96], [80, 12], [80, 42], [80, 78], [80, 108], [140, 40], [140, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" />)}
                </g>
              </svg>
              <span className="dv-card-by">{CONTENT.cardBy}</span>
            </a>
          </div>

          {/* headline, button and the nudge: the first thing you see, lifted away by the first stretch of scroll */}
          <div className="dv-hero" data-dv-hero>
            <h2 className="dv-h" aria-label={CONTENT.line1 + " " + CONTENT.line2}>
              {[CONTENT.line1, CONTENT.line2].map((l, li) => (
                <span className="dv-line" key={li} aria-hidden="true">
                  {l.split(" ").map((w, wi) => (
                    <span key={wi}><span className="dv-w"><span className={"dv-w-i dv-t-" + w.toLowerCase().replace(/[^a-z]/g, "")} data-dv-word style={{ "--i": li * 3 + wi }}>{w}</span></span>{" "}</span>
                  ))}
                </span>
              ))}
            </h2>
            <p className="dv-note" data-dv-note aria-hidden="true">{CONTENT.note}</p>
          </div>

          {/* the far side */}
          <div className="dv-final" data-dv-final>
            <div className="dv-slot" data-dv-slot aria-hidden="true" />
            <div className="dv-copy" data-dv-copy>
              <p className="dv-eyebrow">{CONTENT.eyebrow}</p>
              <h3 className="dv-title">{CONTENT.title}</h3>
              <p className="dv-body">{CONTENT.body}</p>
              <a className="dv-btn dv-btn-gold" href={CONTENT.href} target="_blank" rel="noopener noreferrer">{CONTENT.cta}</a>
            </div>
          </div>
        </div>
      </div>
      <span id="dive-end" className="dv-end" aria-hidden="true" />
    </section>
  );
}

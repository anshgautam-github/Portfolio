import { useEffect, useRef } from "react";
import initDive from "./dive.js";
import { mountAboutFx } from "../FreefallStory/aboutFx.js";
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
  useEffect(() => {
    const el = root.current;
    const stop = initDive(el);
    let fx = null, clone = null, orig = null, tries = 0, timer = 0;
    // The About section (FreefallStory) lives in the eye now: take a copy of the real section, hide the one below it, and let the dive scroll it.
    const adopt = () => {
      orig = document.getElementById("fs-about");
      const host = el.querySelector("[data-dv-about-host]");
      if (!orig || !host) { if (++tries < 80) timer = setTimeout(adopt, 100); return; }
      clone = orig.cloneNode(true);
      clone.removeAttribute("id");
      const mf = clone.querySelector("#fs-manifesto"); if (mf) mf.removeAttribute("id");
      clone.querySelectorAll("canvas").forEach((c) => { c.removeAttribute("width"); c.removeAttribute("height"); c.removeAttribute("style"); });
      host.appendChild(clone);
      orig.style.display = "none";
      fx = mountAboutFx(clone);
      el.dispatchEvent(new CustomEvent("dv-about-ready"));
      window.dispatchEvent(new Event("resize"));            // the story below re-measures now that the About block has left it
    };
    adopt();
    return () => {
      clearTimeout(timer);
      try { fx && fx(); } catch (e) { /* ignore */ }
      if (clone) clone.remove();
      if (orig) { orig.style.display = ""; window.dispatchEvent(new Event("resize")); }
      try { stop && stop(); } catch (e) { /* ignore */ }
    };
  }, []);

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
              {/* soft volume for the head: lit from the upper left, cooler toward the edges (user-space so the blink lids match it exactly) */}
              <radialGradient id="dv-skin" gradientUnits="userSpaceOnUse" cx="60" cy="40" r="980">
                <stop offset="0" stopColor="#fbfcff" />
                <stop offset="0.55" stopColor="#eef3ff" />
                <stop offset="1" stopColor="#d2ddf6" />
              </radialGradient>
              <radialGradient id="dv-pup" cx="42%" cy="34%" r="75%">
                <stop offset="0" stopColor="#262b33" />
                <stop offset="0.55" stopColor="#111316" />
                <stop offset="1" stopColor="#07080a" />
              </radialGradient>
              <radialGradient id="dv-blushg" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#ff8f9e" stopOpacity="0.5" />
                <stop offset="1" stopColor="#ff8f9e" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="dv-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#6f8cff" stopOpacity="0.26" />
                <stop offset="1" stopColor="#6f8cff" stopOpacity="0" />
              </radialGradient>
              {/* depth + colour for the character (paint only) */}
              <clipPath id="dv-headclip"><path d="M-520 1300 C-528 520 -330 -330 160 -332 C650 -330 846 520 840 1300 Z" /></clipPath>
              <clipPath id="dv-eyeL"><ellipse cx="0" cy="0" rx="106" ry="150" /></clipPath>
              <clipPath id="dv-eyeR"><ellipse cx="320" cy="10" rx="106" ry="150" /></clipPath>
              <radialGradient id="dv-irisg" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#7a6cff" /><stop offset="0.78" stopColor="#7a6cff" /><stop offset="0.9" stopColor="#4f6ff0" /><stop offset="1" stopColor="#1d2f9a" />
              </radialGradient>
              <linearGradient id="dv-lv" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#8f7bff" /><stop offset="1" stopColor="#c9bcff" /></linearGradient>
              <linearGradient id="dv-lm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#3fd68c" /><stop offset="1" stopColor="#a6f5cc" /></linearGradient>
              <linearGradient id="dv-lb" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#3f72ee" /><stop offset="1" stopColor="#8fb0ff" /></linearGradient>
            </defs>
            <g data-dv-cam>
              {/* tuft */}
              <g transform="translate(160 -330) scale(0.62) translate(-160 330)"><g className="dv-tuft" data-dv-tuft>
                <path className="dv-ink dv-coral" d="M60 -326 C18 -430 58 -526 142 -566 C194 -482 172 -376 132 -322 Z" />
                <path className="dv-ink dv-amber" d="M148 -326 C136 -470 180 -604 274 -684 C336 -562 292 -420 230 -322 Z" />
                <path className="dv-ink dv-blue" d="M246 -326 C290 -400 360 -452 436 -442 C424 -380 372 -338 318 -318 Z" />
                <path className="dv-vein" d="M96 -332 C70 -420 90 -500 138 -552" />
                <path className="dv-vein" d="M188 -334 C190 -470 224 -590 270 -668" />
                <path className="dv-vein" d="M262 -334 C310 -394 360 -430 420 -438" />
              </g></g>
              
              {/* head */}
              <path className="dv-ink dv-head" d="M-520 1300 C-528 520 -330 -330 160 -332 C650 -330 846 520 840 1300 Z" />
              <path className="dv-rim" d="M-462 620 C-470 250 -290 -246 110 -288" />
              <g clipPath="url(#dv-headclip)">
                <path className="dv-cel" fillRule="evenodd" d="M-1800 -1200 H2400 V2600 H-1800 Z M-630 1300 C-638 520 -440 -330 50 -332 C540 -330 736 520 730 1300 Z" />
                <ellipse className="dv-gloss" cx="-250" cy="-10" rx="110" ry="26" transform="rotate(-62 -250 -10)" />
              </g>
              <ellipse className="dv-blush" cx="-150" cy="215" rx="104" ry="58" />
              <ellipse className="dv-blush" cx="470" cy="225" rx="104" ry="58" />
              <g className="dv-freckles">
                <circle cx="-190" cy="190" r="7" /><circle cx="-135" cy="178" r="7" /><circle cx="-165" cy="238" r="7" />
                <circle cx="425" cy="196" r="7" /><circle cx="480" cy="184" r="7" /><circle cx="455" cy="244" r="7" />
              </g>
              <ellipse className="dv-glint" cx="-190" cy="196" rx="30" ry="9" transform="rotate(-18 -190 196)" />
              <ellipse className="dv-glint" cx="430" cy="206" rx="30" ry="9" transform="rotate(-18 430 206)" />
              <path className="dv-stroke dv-brow" d="M-115 -196 Q-20 -282 104 -240" />
              <path className="dv-stroke dv-brow" d="M232 -246 Q356 -286 438 -196" />

              {/* left eye: starts as an ordinary pupil, scroll turns it into the portal */}
              <ellipse className="dv-ink dv-white" cx="0" cy="0" rx="106" ry="150" />
              <g clipPath="url(#dv-eyeL)"><ellipse className="dv-eyeshade" cx="0" cy="-168" rx="136" ry="100" /></g>
              <g data-dv-lpupil>
                <ellipse cx="0" cy="0" rx="80" ry="120" fill="url(#dv-irisg)" />
                <ellipse cx="0" cy="0" rx="64" ry="100" fill="url(#dv-pup)" />
                <path className="dv-sheen-b" d="M-30 76 C-8 92 24 88 42 66" />
                <path className="dv-shine" d="M-34 -50 C-40 -76 -16 -88 2 -80" />
                <circle cx="32" cy="52" r="9" fill="#fff" />
              </g>
              <g data-dv-portal opacity="0">
              <g clipPath="url(#dv-iris)">
                <rect x="-90" y="-130" width="180" height="260" fill="url(#dv-glow)" />
                <ellipse cx="-18" cy="-24" rx="70" ry="96" fill="url(#dv-bloom)" />
                {[[-52, -78, 1.5, 0.9], [26, -92, 1, 0.6], [14, -36, 2, 1], [-60, 18, 1.2, 0.7], [34, 22, 1, 0.55], [26, 56, 1.6, 0.85], [-30, 74, 1.1, 0.6], [-6, 100, 1.4, 0.8], [52, -46, 0.9, 0.5], [-44, -20, 0.9, 0.5]].map(([x, y, r, o], i) => <circle key={i} className="dv-pt" cx={x} cy={y} r={r} opacity={o} />)}
              </g>
              {/* blue iris ring, same colour as the right eye, framing the portal */}
              <ellipse cx="0" cy="0" rx="72" ry="112" fill="none" stroke="#6370ee" strokeWidth="16" />
              <ellipse cx="0" cy="0" rx="78.5" ry="118.5" fill="none" stroke="#1d2f9a" strokeWidth="3" opacity="0.7" />
              <ellipse className="dv-ring" cx="0" cy="0" rx="80" ry="120" />
              <path className="dv-shine" data-dv-shine d="M-46 -64 C-52 -88 -30 -102 -14 -96" />
              </g>

              {/* a surveyor's reticle on the eye that opens: draws attention to where "closer" leads, gone as soon as the dive starts */}
              <g className="dv-ret" data-dv-ret opacity="0" aria-hidden="true">
                <circle className="dv-ret-ring" cx="0" cy="0" r="196" />
                <g className="dv-ret-ticks">
                  <path d="M0 -226 V-176" /><path d="M0 176 V226" /><path d="M-226 0 H-176" /><path d="M176 0 H226" />
                </g>
                <path className="dv-ret-lead" d="M-150 -146 L-262 -232 H-440" />
                <text className="dv-ret-txt" x="-262" y="-252" textAnchor="start">THE WAY IN</text>
              </g>

              {/* right eye: follows the pointer */}
              <ellipse className="dv-ink dv-white" cx="320" cy="10" rx="106" ry="150" />
              <g clipPath="url(#dv-eyeR)"><ellipse className="dv-eyeshade" cx="320" cy="-158" rx="136" ry="100" /></g>
              <g data-dv-pupil>
                <ellipse cx="320" cy="10" rx="80" ry="120" fill="url(#dv-irisg)" />
                <ellipse cx="320" cy="10" rx="64" ry="100" fill="url(#dv-pup)" />
                <path className="dv-sheen-b" d="M290 86 C312 102 344 98 362 76" />
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
            <div className="dv-card-in dv-about" data-dv-card-in aria-label="About Ansh">
              <div className="fs dv-fs" data-dv-about-host aria-hidden="false" />
            </div>
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
            <p className="dv-note" data-dv-note aria-hidden="true"><span className="dv-note-t">{CONTENT.note}</span><span className="dv-note-line"><i /></span></p>
          </div>

          <div className="dv-grain" aria-hidden="true" />

          {/* the far side */}
          <div className="dv-final" data-dv-final>
            <div className="dv-slot" data-dv-slot aria-hidden="true" />
          </div>
        </div>
      </div>
      <span id="dive-end" className="dv-end" aria-hidden="true" />
    </section>
  );
}

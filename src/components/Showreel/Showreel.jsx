import { lazy, Suspense, useEffect, useRef } from "react";
import initShowreel from "./showreel.js";
import "./showreel.css";

/* what the pills fill with: the interactive handshake (press and hold, two hands, the "Let's build something together" call to action). Lazy: it carries its own WebGL scene. */
const Handshake = lazy(() => import("../Collab/Collab.jsx"));

/* Right after the landing: three disciplines wipe to colour, then the SHOWREEL title and seven pills that fill with the film and open to full screen.
   The film is a dummy picture for now: drop an mp4/webm into /public/showreel and set VIDEO below, the rest follows (muted autoplay, click for sound). */

const POSTER = "/showreel/poster.jpg";
const VIDEO = ""; // e.g. "/showreel/reel.mp4"

const ROWS = [
  { word: "RESEARCH", ink: "#0f1233", paper: "#6d86ff" },
  { word: "ENGINEERING", ink: "#2c0d09", paper: "#ff6b57" },
  { word: "DESIGN", ink: "#2b2108", paper: "#f5b93f" },
];

export default function Showreel() {
  const root = useRef(null);
  useEffect(() => initShowreel(root.current), []);

  return (
    <section ref={root} className="sr" id="showreel" aria-label="Capabilities and showreel">
      <div className="sr-wrap" data-sr-wrap>
        <div className="sr-stage" data-sr-stage>
          {/* the handshake scene (see Handshake above), revealed through the pills */}
          <div className="sr-media" data-sr-media>
            <Suspense fallback={null}><Handshake /></Suspense>
          </div>
          <div className="sr-tint" data-sr-tint aria-hidden="true" />
          {[0, 1, 2, 3, 4, 5].map((i) => <i className="sr-bridge" data-sr-bridge key={i} aria-hidden="true" />)}

          {/* the column that scrolls up */}
          <div className="sr-flow" data-sr-flow>
            <p className="sr-label">[ capabilities ]</p>
            <div className="sr-rows">
              {ROWS.map((r) => (
                <h2 className="sr-row" data-sr-row key={r.word} aria-label={r.word}>
                  <span className="sr-t" aria-hidden="true">{r.word}</span>
                  <span className="sr-wipe" data-sr-wipe aria-hidden="true" style={{ background: r.paper, color: r.ink }}>
                    <span className="sr-t">{r.word}</span>
                  </span>
                </h2>
              ))}
            </div>
            <p className="sr-note">
              Three disciplines, one standard.<br />
              Every detail is a lever. Only when research, engineering and design work in concert does a product come alive.
            </p>
            <h2 className="sr-title" data-sr-title>HANDSHAKE</h2>
          </div>

          <a className="sr-btn" data-sr-btn href="#selected-work" aria-label="Scroll to the selected work">Watch the reel</a>
          {VIDEO && <p className="sr-hint" data-sr-hint aria-hidden="true">Click &mdash; with sound</p>}
        </div>
      </div>
    </section>
  );
}

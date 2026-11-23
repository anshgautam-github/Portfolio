import { useEffect, useRef } from "react";
import initJourney from "./journey.js";
import { content } from "../../content.js";
import "./journey.css";

/* A pinned scroll journey, painted on one canvas (art.js): an autumn hill -> a sky of falling leaves, one leaf carries a line of text down ->
   over a sea -> onto a pond with koi -> a shore with a paper note. Text is real html on top of the canvas. Copy lives in COPY. */

const COPY = {
  title: ["Models,", "unbound."],
  lede: "Hand me data and an idea. I'll build AI that learns, ships and holds up in the real world.",
  leaf: ["From data", "to deploy"],
  pond: ["Make it", "reliable."],
  noteTitle: "Notes from the build",
  noteDate: "deploy day — clear and cold, no alerts.",
  noteP: [
    "Every project starts the same way: I read the data before I touch a model. Most of the wins are hiding in the first hour of looking.",
    "Then comes the quiet, beautiful part: baselines, evals, a pipeline that survives a bad day. The clever bit comes last.",
    "By the time it ships it should feel obvious, monitored, documented and easy for the next person to pick up.",
  ],
  fig: "fig. 1 — loss, going down",
  scenes: ["The hill", "The sky", "The sea", "The pond", "The notes"],
};

const GH = (content.garden.footer.socials.find((s) => s.icon === "github" && s.href) || {}).href || "";
const GH_SHOW = GH.replace(/^https?:\/\//, "");

export default function Journey() {
  const root = useRef(null);
  useEffect(() => initJourney(root.current), []);

  return (
    <section ref={root} className="jr" id="journey" aria-label="From data to deploy">
      <div className="jr-wrap" data-jr-wrap>
        <div className="jr-stage" data-jr-stage>
          <canvas className="jr-cv" data-jr-cv aria-hidden="true" />

          <div className="jr-hero" data-jr-hero>
            <div className="jr-hero-in" data-jr-heroin>
              <h2 className="jr-title" aria-label={COPY.title.join(" ")}>
                {COPY.title.map((w) => <span className="jr-tl" key={w} aria-hidden="true"><span data-jr-w>{w}</span></span>)}
              </h2>
              <p className="jr-lede" data-jr-rise>{COPY.lede}</p>
            </div>
          </div>

          <div className="jr-ltxt" data-jr-ltxt aria-hidden="true"><span className="jr-ltxt-in">{COPY.leaf.map((l) => <span key={l}>{l}</span>)}</span></div>
          <p className="jr-pond" data-jr-pond aria-label={COPY.pond.join(" ")}>{COPY.pond.map((l) => <span key={l} aria-hidden="true">{l}</span>)}</p>

          <article className="jr-note" data-jr-note aria-label={COPY.noteTitle}>
            <div className="jr-paper">
              <h3>{COPY.noteTitle}</h3>
              <p className="jr-date">{COPY.noteDate}</p>
              {COPY.noteP.map((t) => <p key={t}>{t}</p>)}
              <svg className="jr-fig" viewBox="0 0 160 90" aria-hidden="true"><path d="M8 10 C40 14 50 60 84 70 C110 76 130 78 154 80" /><path d="M8 84 H154 M8 84 V8" /></svg>
              <small>{COPY.fig}</small>
            </div>
          </article>

          <nav className="jr-dots" aria-label="Journey chapters">
            {COPY.scenes.map((s, i) => <button type="button" key={s} data-jr-dot={i} aria-label={s}><i /></button>)}
          </nav>

          {GH && (
            <div className="jr-pill">
              <a href={GH} target="_blank" rel="noopener noreferrer"><code>{GH_SHOW}</code></a>
              <button type="button" data-jr-copy aria-label="Copy GitHub link">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
              </button>
              <span className="jr-copied" data-jr-copied role="status" aria-live="polite" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

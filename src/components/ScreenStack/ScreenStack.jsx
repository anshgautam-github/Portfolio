import { useEffect, useRef } from "react";
import initScreenStack from "./screenStack.js";
import "./screenStack.css";

/* Right after the landing: "Selected work" - a fan of product screens that squares up into one as you scroll,
   then a headline that lights up word by word, then the three projects behind it. All copy / links live here. */

const SCREENS = [
  { src: "/stack/01.webp", alt: "A GPT-2 language model written from scratch in PyTorch: attention code and a training run" },
  { src: "/stack/02.webp", alt: "OwnMove: a place to find opportunities that fit you" },
  { src: "/stack/03.webp", alt: "CineMyst, an iOS app that connects artists and casting opportunities" },
  { src: "/stack/04.webp", alt: "An AI workflow that classifies support tickets and drafts replies" },
  { src: "/stack/05.webp", alt: "A model evaluation dashboard" },
  { src: "/stack/06.webp", alt: "A backend API: code and live request log" },
  { src: "/stack/07.webp", alt: "An attention map visualisation" },
  { src: "/stack/08.webp", alt: "A research assistant chat interface" },
  { src: "/stack/09.webp", alt: "Experiment notes comparing attention-head ablations" },
];

const HEADLINE = "Great products are built where research, engineering and design meet.";

// notes in the margin that appear as the matching word of the headline lights up
const MARGIN = [
  { key: "research", side: "l", n: "01", title: "Research", text: "papers, ablations, evals", acc: "#7ea2ff", rgb: [126, 162, 255] },
  { key: "engineering", side: "r", n: "02", title: "Engineering", text: "training, serving, scale", acc: "#8f7bff", rgb: [143, 123, 255] },
  { key: "design", side: "l", n: "03", title: "Design", text: "interfaces people keep", acc: "#4ee39a", rgb: [78, 227, 154] },
];

const WORKS = [
  { src: "/stack/01.webp", title: "GPT-2 from scratch", text: "A language model in pure PyTorch: tokenizer, attention, pretraining and fine-tuning.", href: "https://github.com/anshgautam-github/llm-from-scratch", cta: "View on GitHub" },
  { src: "/stack/03.webp", title: "CineMyst", text: "An iOS app bridging aspiring artists and real opportunities in the film industry.", href: "#projects", cta: "See the project" },
  { src: "/stack/02.webp", title: "OwnMove", text: "A place to discover opportunities, understand where you stand and take action.", href: "https://www.ownmove.in/", cta: "Visit OwnMove" },
];

const toProjects = (e) => {
  e.preventDefault();
  const el = document.getElementById("projects");
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2.4 });
  else window.scrollTo({ top: y, behavior: "smooth" });
};

export default function ScreenStack() {
  const root = useRef(null);
  useEffect(() => initScreenStack(root.current), []);

  return (
    <section ref={root} className="ss" id="selected-work" aria-label="Selected work">
      {/* ---------- A: the deck ---------- */}
      <div className="ss-a" data-ss-a>
        <div className="ss-sticky">
          {/* the light the product gives off, and a floor for it to stand on */}
          <div className="ss-amb" data-ss-amb aria-hidden="true"><i className="ss-amb-a" /><i className="ss-amb-b" /><i className="ss-floor" data-ss-floor /></div>
          {/* an editor's frame: hairlines, crop marks and small live labels */}
          <div className="ss-frame" aria-hidden="true">
            <i className="ss-fv" style={{ left: "4.4%" }} /><i className="ss-fv" style={{ left: "95.6%" }} />
            <i className="ss-fc ss-fc-tl" /><i className="ss-fc ss-fc-tr" /><i className="ss-fc ss-fc-bl" /><i className="ss-fc ss-fc-br" />
          </div>
          {/* once the deck is one screen, notes from the run point at it */}
          <div className="ss-notes" data-ss-notes aria-hidden="true">
            <p className="ss-note ss-note-l" data-ss-note style={{ top: "38vh" }}><span className="ss-nk">attention.py</span><span className="ss-nv">multi-head causal attention</span><i className="ss-nl" /></p>
            <p className="ss-note ss-note-l" data-ss-note style={{ top: "63vh" }}><span className="ss-nk">163,009,536</span><span className="ss-nv">parameters, trained on-device</span><i className="ss-nl" /></p>
            <p className="ss-note ss-note-r" data-ss-note style={{ top: "40vh" }}>
              <span className="ss-nk">train loss <b data-ss-loss>9.781</b></span>
              <svg className="ss-spark" viewBox="0 0 120 34" aria-hidden="true"><path data-ss-spark d="M2 4 C14 5 20 22 38 26 S70 30 96 31 L118 31" /></svg>
              <i className="ss-nl" />
            </p>
            <p className="ss-note ss-note-r" data-ss-note style={{ top: "64vh" }}><span className="ss-nk">12 layers / 12 heads</span><span className="ss-nv">context 1024, emb 768</span><i className="ss-nl" /></p>
          </div>
          <div className="ss-head" data-ss-head>
            <h2 className="ss-title">Software that moves people</h2>
            <p className="ss-sub">From language models to mobile apps, I design, train and ship products end to end.</p>
          </div>

          <div className="ss-stage" data-ss-stage aria-hidden="true">
            {SCREENS.map((s, i) => (
              <figure className="ss-card" data-ss-card key={s.src} style={{ zIndex: SCREENS.length - i }}>
                <img src={s.src} alt="" width="1440" height="900" decoding="async" loading={i < 3 ? "eager" : "lazy"} draggable="false" />
              </figure>
            ))}
          </div>
          <ul className="ss-sr">{SCREENS.map((s) => <li key={s.src}>{s.alt}</li>)}</ul>
        </div>
      </div>

      {/* ---------- B: the headline and the work ---------- */}
      <div className="ss-b" data-ss-b>
        <div className="ss-sticky ss-sticky--b" data-ss-sb>
          <div className="ss-amb" data-ss-amb-b aria-hidden="true"><i className="ss-amb-a" /><i className="ss-amb-b" /></div>
          <div className="ss-frame" aria-hidden="true">
            <i className="ss-fv" style={{ left: "4.4%" }} /><i className="ss-fv" style={{ left: "95.6%" }} />
            <i className="ss-fc ss-fc-tl" /><i className="ss-fc ss-fc-tr" /><i className="ss-fc ss-fc-bl" /><i className="ss-fc ss-fc-br" />
          </div>
          <div className="ss-marg" aria-hidden="true">
            {MARGIN.map((m) => (
              <p className={"ss-mn ss-mn-" + m.side} data-ss-mn data-key={m.key} key={m.key} style={{ "--acc": m.acc }}>
                <span className="ss-mi">{m.n}</span><span className="ss-mk">{m.title}</span><span className="ss-md">{m.text}</span><i className="ss-ml" />
              </p>
            ))}
          </div>
          <h3 className="ss-line" aria-label={HEADLINE}>
            {HEADLINE.split(" ").map((w, i) => (
              <span className="ss-w" data-ss-word key={i} aria-hidden="true">{w}{" "}</span>
            ))}
          </h3>
        </div>
      </div>

      <ul className="ss-works">
        {WORKS.map((w) => {
          const ext = /^https?:/.test(w.href);
          return (
            <li className="ss-work" data-ss-work key={w.title}>
              <a href={w.href} onClick={w.href === "#projects" ? toProjects : undefined} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <span className="ss-work-img"><img src={w.src} alt="" width="1440" height="900" loading="lazy" decoding="async" draggable="false" /></span>
                <span className="ss-work-t">{w.title}</span>
                <span className="ss-work-d">{w.text}</span>
                <span className="ss-work-c">{w.cta} <i aria-hidden="true">&rarr;</i></span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

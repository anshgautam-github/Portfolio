import { useEffect, useRef } from "react";
import { Laptop, Phones } from "./Devices.jsx";
import { projects } from "./projectsData.js";
import "./projects.css";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* each word of the title slides up on its own; the last word becomes the blue serif accent (like the closing statement) */
function Title({ text }) {
  const words = text.split(" ");
  return (
    <h2 aria-label={text}>
      {words.map((w, i) => {
        const last = i === words.length - 1;
        return [
          i > 0 ? " " : null,
          <span key={i} className="pj-w" aria-hidden="true">
            <span style={{ "--i": i }} className={last ? "acc" : undefined}>
              {w}
            </span>
          </span>,
        ];
      })}
    </h2>
  );
}

/*
  Project sections. Each section writes a 0..1 scroll progress (--p) onto itself:
  0 while it is still below the fold, 1 once it is comfortably in view. The CSS turns that into
  the laptop lid opening (and the screen waking up) / the phones fanning in, and drives the parallax of the
  background light, the big numeral and the floating badges.
  Hover a device and it tilts toward the pointer (see useTilt in Devices.jsx).
*/
export default function Projects() {
  const secs = useRef([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      secs.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        // progress follows the DEVICE itself: 0 while it is still below the fold (so you meet a closed laptop),
        // 1 once it sits in the middle of the screen
        const d = el.querySelector(".pj-device").getBoundingClientRect();
        const p = reduce ? 1 : ease(clamp((vh - d.top) / (vh * 0.5 + d.height / 2)));
        el.style.setProperty("--p", p.toFixed(4));
        // -1 (section below) .. 0 (centred) .. 1 (section above): used for gentle parallax
        el.style.setProperty("--s", clamp((r.top + r.height / 2 - vh / 2) / (vh * 0.9), -1, 1).toFixed(4));
        el.classList.toggle("is-in", r.top < vh * 0.7 && r.bottom > 0);
      });
    };
    const kick = () => !raf && (raf = requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pj-wrap" id="projects">
      <header className="pj-head">
        <div className="pj-eyebrow">
          <i />
          Selected work <span>({String(projects.length).padStart(2, "0")})</span>
        </div>
        <h2>
          Projects that <em>ship</em>,<br />
          designed with care.
        </h2>
        <p>A few things I have designed and built, from research prototypes to products people use every day.</p>
        <div className="pj-scroll" aria-hidden="true">
          <span />
        </div>
      </header>

      {projects.map((p, i) => (
        <section
          key={p.id}
          ref={(el) => (secs.current[i] = el)}
          className={`pj pj-${p.device} text-${p.side} v${i % 3}`}
          style={{ "--p": 0, "--s": 0 }}
        >
          <div className="pj-bg" aria-hidden="true">
            <i className="a" />
            <i className="b" />
            <i className="c" />
            <span className="pj-grid-lines" />
          </div>
          {p.ghost && (
            <div className="pj-ghost" aria-hidden="true">
              {p.ghost}
            </div>
          )}
          <div className="pj-bignum" aria-hidden="true">
            {p.no}
          </div>
          <div className="pj-grid">
            <div className="pj-text">
              <div className="pj-no">
                <svg viewBox="0 0 132 14" aria-hidden="true">
                  <path d="M0 1 H100 L88 13 H12 Z" />
                  <path d="M100 1 H132" strokeWidth="2" />
                </svg>
                <span>
                  {p.no}
                  <b> / {String(projects.length).padStart(2, "0")}</b>
                </span>
              </div>
              {p.tags && (
                <ul className="pj-tags">
                  {p.tags.map((t, k) => (
                    <li key={t} style={{ "--k": k }}>
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <Title text={p.title} />
              <p>{p.text}</p>
              {(p.role || p.year) && (
                <dl className="pj-meta">
                  {p.role && (
                    <div>
                      <dt>Role</dt>
                      <dd>{p.role}</dd>
                    </div>
                  )}
                  {p.year && (
                    <div>
                      <dt>Year</dt>
                      <dd>{p.year}</dd>
                    </div>
                  )}
                </dl>
              )}
              <a className="pj-btn" href={p.href}>
                <span>{p.cta}</span>
                <b>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12h16M14 6l6 6-6 6" />
                  </svg>
                </b>
              </a>
            </div>
            <div className="pj-stage">
              <div className="pj-plate" aria-hidden="true" />
              <div className="pj-halo" aria-hidden="true" />
              <div className="pj-orbit" aria-hidden="true">
                <i />
              </div>
              <div className="pj-device">{p.device === "laptop" ? <Laptop image={p.image} screen={p.screen} /> : <Phones images={p.images} />}</div>
              {p.chips &&
                p.chips.map((c, k) => (
                  <div key={c.k} className={`pj-chip c${k}`} aria-hidden="true">
                    <small>{c.k}</small>
                    <strong>{c.v}</strong>
                  </div>
                ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

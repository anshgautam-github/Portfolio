import { memo } from "react";
import { Laptop, Phones } from "../Projects/Devices.jsx";
import { projects } from "../Projects/projectsData.js";
import "../Projects/projects.css";
import "./warpProjects.css";

/* The three projects, stacked on top of the warp starfield. Warp.jsx's scroll timeline brings them in one by one:
   each [data-slide] fades/slides in, its --p goes 0→1 (laptop lid opens / phones fan in), then it leaves for the next. */
function WarpProjects() {
  return (
    <div className="wp-layer" aria-label="Selected projects">
      <div data-rail className="wp-rail" aria-hidden="true">
        <span className="wp-rail-title">Work</span>
        <div className="wp-rail-line">
          <i data-prog />
        </div>
        {projects.map((p) => (
          <b key={p.id} data-dot style={{ "--on": 0 }}>
            {p.no}
          </b>
        ))}
      </div>
      {projects.map((p) => {
        const words = p.title.split(" ");
        return (
          <article key={p.id} data-slide className={`wp-slide side-${p.side}`} style={{ "--p": 0 }}>
            <div data-ghost className="wp-ghost" aria-hidden="true">
              {p.no}
            </div>
            <div className="wp-grid">
              <div className="wp-text">
                <div data-t className="wp-no">
                  <span>{p.no}</span>
                  <i />
                  <b>{String(projects.length).padStart(2, "0")}</b>
                  <em>Selected work</em>
                </div>
                {p.tags && (
                  <ul data-t className="wp-tags">
                    {p.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
                <h3 data-t aria-label={p.title}>
                  {words.map((w, i) => (
                    <span key={i} className={i === words.length - 1 ? "acc" : undefined}>
                      {w}{" "}
                    </span>
                  ))}
                </h3>
                <p data-t>{p.text}</p>
                {(p.role || p.year) && (
                  <dl data-t className="wp-meta">
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
                <a data-t className="wp-btn" href={p.href}>
                  <span>{p.cta}</span>
                  <b>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12h16M14 6l6 6-6 6" />
                    </svg>
                  </b>
                </a>
              </div>
              <div data-stage className={`wp-stage ${p.device}`}>
                <div className="wp-glow" aria-hidden="true" />
                <div className="wp-orb o1" aria-hidden="true" />
                <div className="wp-orb o2" aria-hidden="true" />
                <div className="wp-ring" aria-hidden="true" />
                <div className="wp-ring r2" aria-hidden="true" />
                <div className="wp-floor" aria-hidden="true" />
                <div className="wp-device">{p.device === "laptop" ? <Laptop image={p.image} screen={p.screen} /> : <Phones images={p.images} />}</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default memo(WarpProjects);

import { Fragment, memo, useEffect, useRef } from "react";
import { Laptop, Phones } from "../Projects/Devices.jsx";
import { projects } from "../Projects/projectsData.js";
import "../Projects/projects.css";
import "./warpProjects.css";

/* The three projects, stacked on top of the warp starfield. Warp.jsx's scroll timeline brings them in one by one:
   each [data-slide] fades/slides in, its --p goes 0→1 (laptop lid opens / phones fan in), then it leaves for the next. */
function WarpProjects() {
  const layer = useRef(null);

  /* "Impact" numbers count up from 0 every time their slide comes into view, and reset when it leaves, so they replay on every visit */
  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    const cleanups = [];
    root.querySelectorAll("[data-slide]").forEach((slide) => {
      const nums = Array.from(slide.querySelectorAll("[data-count]"));
      if (!nums.length) return;
      let raf = 0, delay = 0, live = false;
      const set = (n, v) => { n.textContent = fmt(v); };
      const stop = () => { clearTimeout(delay); cancelAnimationFrame(raf); };
      const run = () => {
        stop();
        if (reduce) { nums.forEach((n) => set(n, +n.dataset.count)); return; }
        delay = setTimeout(() => {
          const t0 = performance.now(), DUR = 1900;
          const tick = (now) => {
            const k = Math.min(1, (now - t0) / DUR);
            const e = 1 - Math.pow(1 - k, 4); /* ease-out quart */
            nums.forEach((n) => set(n, +n.dataset.count * e));
            if (k < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, 450);
      };
      const check = () => {
        const o = parseFloat(slide.style.opacity || "0");
        const shown = slide.style.visibility !== "hidden" && o > 0.5;
        const gone = slide.style.visibility === "hidden" || o < 0.05;
        if (shown && !live) { live = true; run(); }
        else if (gone && live) { live = false; stop(); nums.forEach((n) => set(n, 0)); }
      };
      const mo = new MutationObserver(check);
      mo.observe(slide, { attributes: true, attributeFilter: ["style"] });
      check();
      cleanups.push(() => { mo.disconnect(); stop(); });
    });
    return () => cleanups.forEach((f) => f());
  }, []);

  /* desktop only: the device leans toward the cursor, the giant numeral + colour orbs drift the other way (depth), and the CTA is magnetic.
     Everything is written straight to the few elements involved (never a CSS variable on the layer: that would restyle the whole 3D device). */
  useEffect(() => {
    const root = layer.current;
    if (!root || window.matchMedia("(pointer: coarse), (max-width: 900px), (prefers-reduced-motion: reduce)").matches) return;
    const t = { x: 0, y: 0 }, c = { x: 0, y: 0 };
    let raf = 0;
    const visible = () => Array.from(root.querySelectorAll("[data-slide]")).find((s) => s.style.visibility !== "hidden" && parseFloat(s.style.opacity || "0") > 0.05);
    const frame = () => {
      raf = 0;
      c.x += (t.x - c.x) * 0.075;
      c.y += (t.y - c.y) * 0.075;
      const s = visible();
      if (s) {
        const tilt = s.querySelector("[data-tilt]");
        if (tilt) tilt.style.transform = `perspective(1600px) rotateY(${(c.x * 9).toFixed(2)}deg) rotateX(${(-c.y * 6).toFixed(2)}deg) translate3d(${(c.x * 10).toFixed(1)}px, ${(c.y * 6).toFixed(1)}px, 0)`;
        const g = s.querySelector("[data-ghost]");
        if (g) g.style.translate = `${(-c.x * 34).toFixed(1)}px ${(-c.y * 20).toFixed(1)}px`;
        const o1 = s.querySelector(".wp-orb.o1"), o2 = s.querySelector(".wp-orb.o2");
        if (o1) o1.style.translate = `${(c.x * 46).toFixed(1)}px ${(c.y * 30).toFixed(1)}px`;
        if (o2) o2.style.translate = `${(-c.x * 60).toFixed(1)}px ${(-c.y * 36).toFixed(1)}px`;
      }
      if (Math.abs(t.x - c.x) + Math.abs(t.y - c.y) > 0.002) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const move = (e) => {
      t.x = (e.clientX / innerWidth - 0.5) * 2;
      t.y = (e.clientY / innerHeight - 0.5) * 2;
      kick();
    };
    const leave = () => { t.x = t.y = 0; kick(); };
    /* magnetic button */
    const btnMove = (e) => {
      const b = e.currentTarget, r = b.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.translate = `${(dx * 14).toFixed(1)}px ${(dy * 10).toFixed(1)}px`;
      b.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    };
    const btnLeave = (e) => { e.currentTarget.style.translate = ""; };
    const btns = Array.from(root.querySelectorAll(".wp-btn"));
    btns.forEach((b) => { b.addEventListener("pointermove", btnMove); b.addEventListener("pointerleave", btnLeave); });
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      btns.forEach((b) => { b.removeEventListener("pointermove", btnMove); b.removeEventListener("pointerleave", btnLeave); });
    };
  }, []);

  return (
    <div ref={layer} className="wp-layer" aria-label="Selected projects">
      <div data-wipe className="wp-wipe" aria-hidden="true" />
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
          <article key={p.id} data-slide data-id={p.id} className={`wp-slide side-${p.side}`} style={{ "--p": 0 }}>
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
                    {p.tags.map((t, ti) => (
                      <li key={t} style={{ "--i": ti }}>{t}</li>
                    ))}
                  </ul>
                )}
                <h3 data-t aria-label={p.title}>
                  {words.map((w, i) => (
                    <Fragment key={i}>
                      <span className="wp-w" style={{ "--i": i }}>
                        <span className={i === words.length - 1 ? "acc" : undefined}>{w}</span>
                      </span>{" "}
                    </Fragment>
                  ))}
                </h3>
                <p data-t>{p.text}</p>
                {p.features && (
                  <ul data-t className="wp-feats">
                    {p.features.map((f) => (
                      <li key={f.t}><b>{f.t}</b><span>{f.d}</span></li>
                    ))}
                  </ul>
                )}
                {p.featured && (
                  <div data-t className="wp-featured">
                    <em><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.6 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z" /></svg>Featured on</em>
                    <div>
                      {p.featured.map((f) => (
                        <span key={f.n}><i>{f.logo ? <img src={f.logo} alt="" draggable={false} /> : f.i}</i><b>{f.n}</b></span>
                      ))}
                    </div>
                  </div>
                )}
                {p.impact && (
                  <div data-t className="wp-impact">
                    <em><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>Impact so far</em>
                    <div>
                      {p.impact.map((m) => (
                        <span key={m.k}>
                          <strong aria-label={m.to.toLocaleString("en-US") + m.suffix}><b data-count={m.to}>0</b><u>{m.suffix}</u></strong>
                          <small>{m.k}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.who && (
                  <div data-t className="wp-who">
                    <em>Built for</em>
                    {p.who.map((w) => <span key={w}>{w}</span>)}
                  </div>
                )}
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
                {p.credit && <p data-t className="wp-credit">{p.credit}</p>}
              </div>
              <div data-stage className={`wp-stage ${p.device}`}>
                <div className="wp-glow" aria-hidden="true" />
                <div className="wp-orb o1" aria-hidden="true" />
                <div className="wp-orb o2" aria-hidden="true" />
                <div className="wp-ring" aria-hidden="true" />
                <div className="wp-ring r2" aria-hidden="true" />
                <div className="wp-floor" aria-hidden="true" />
                <div className="wp-sparks" aria-hidden="true">
                  {Array.from({ length: 9 }, (_, k) => (
                    <i key={k} style={{ "--k": k }} />
                  ))}
                </div>
                <div data-tilt className="wp-tilt">
                  <div className="wp-device">{p.device === "laptop" ? <Laptop image={p.image} screen={p.screen} /> : <Phones images={p.images} />}</div>
                </div>
              </div>
            </div>
            {p.stats && (
              <ul data-t className="wp-specs" aria-label="Project facts">
                {p.stats.map((s) => (
                  <li key={s.k}><strong>{s.v}</strong><span>{s.k}</span></li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default memo(WarpProjects);

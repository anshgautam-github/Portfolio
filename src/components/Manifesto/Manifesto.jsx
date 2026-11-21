import { Fragment, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./manifesto.css";

/* <Manifesto />: a statement set large, that lights up word by word as you read it down the page. Between the sentences small living objects
   pop in (an app icon, the logos of the places I have worked, peeks of real projects, a ring that fills, an availability light), and a few key
   words are drawn in their own typographic treatment (outline, gradient, chrome, script, glitch, extruded, selection box).
   Every word / chip is positioned by layout and lit by where it is relative to a reading line in the viewport, so it is correct however you arrive. */

const BASE = import.meta.env.BASE_URL;

// tokens: a plain string is split into words; { chip } is a living object; { fx, t } is a styled word
const COPY = [
  [
    "I\u2019m Ansh Gautam, a Computer Science undergraduate at SRM Institute of Science and Technology, India.", { chip: "app" },
    "My interests have taken me across", { fx: "grad", t: "artificial" }, "intelligence, systems engineering, research, and", { fx: "select", t: "product" }, "development.", { chip: "spark" },
  ],
  [
    "I\u2019ve explored", { fx: "chrome", t: "language" }, "model training,", { chip: "ring" }, { chip: "gpt" }, { fx: "glitch", t: "retrieval" }, "systems, machine learning,", { chip: "neural" }, "and the engineering behind",
    "production applications.", { chip: "phone" }, { chip: "web" },
    "I enjoy moving between", { fx: "script", t: "theoretical" }, "understanding and", { fx: "outline", t: "practical" }, "implementation.", { chip: "code" },
  ],
  [
    "Beyond engineering, I\u2019ve led research and web development teams, worked with student communities,", { chip: "logos" },
    "and mentored more than 1,800 students on professional presence and career development.", { chip: "people" },
  ],
  [
    "I\u2019m interested in ambitious engineering problems, thoughtful research,", { chip: "atom" }, "and people who enjoy building things that didn\u2019t exist before.", { chip: "open" },
  ],
  [
    "Have something worth building?",
  ],
];

let wid = 0;
function Words({ text }) {
  return text.split(" ").map((w, i, a) => (
    <Fragment key={wid++}>
      <span className="mf-w" data-w>{w}</span>{i < a.length - 1 ? " " : null}
    </Fragment>
  ));
}

function Chip({ kind }) {
  switch (kind) {
    case "app":
      return (
        <span className="mf-chip mf-app" data-chip aria-hidden="true">
          <span className="mf-app-in">
            <svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="60" height="20" fill="#ff9933" />
              <rect y="20" width="60" height="20" fill="#fff" />
              <rect y="40" width="60" height="20" fill="#138808" />
              <g fill="none" stroke="#000080" strokeWidth="0.9">
                <circle cx="30" cy="30" r="7.6" />
                {Array.from({ length: 12 }, (_, i) => <line key={i} x1="30" y1="22.4" x2="30" y2="37.6" transform={`rotate(${i * 15} 30 30)`} strokeWidth="0.55" />)}
              </g>
              <circle cx="30" cy="30" r="1.3" fill="#000080" />
            </svg>
          </span>
        </span>
      );
    case "logos":
      return (
        <span className="mf-chip mf-logos" data-chip aria-hidden="true">
          {["ecr.png", "shn.png", "infosys.png", "iisppr.png"].map((f) => (
            <span key={f} className="mf-logo"><img src={`${BASE}freefall/${f}`} alt="" draggable="false" /></span>
          ))}
        </span>
      );
    case "gpt":
      return (
        <span className="mf-chip mf-shot" data-chip aria-hidden="true">
          <span className="mf-shot-in" style={{ backgroundImage: `url(${BASE}gpt2.jpg)` }} /><i>GPT-2</i>
        </span>
      );
    case "phone":
      return (
        <span className="mf-chip mf-phone" data-chip aria-hidden="true">
          <span className="mf-phone-in" style={{ backgroundImage: `url(${BASE}cinemyst-2.jpg)` }} />
        </span>
      );
    case "web":
      return (
        <span className="mf-chip mf-shot" data-chip aria-hidden="true">
          <span className="mf-shot-in" style={{ backgroundImage: `url(${BASE}ownmove.jpg)` }} /><i>OwnMove</i>
        </span>
      );
    case "ring":
      return (
        <span className="mf-chip mf-ring" data-chip aria-hidden="true">
          <span className="mf-ring-in"><b>163M</b></span>
        </span>
      );
    case "spark":
      return (
        <span className="mf-chip mf-spark" data-chip aria-hidden="true">
          <svg viewBox="0 0 48 48"><defs><linearGradient id="mfSpk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bcd8ff" /><stop offset=".5" stopColor="#5b8cff" /><stop offset="1" stopColor="#79e4ff" /></linearGradient></defs>
            <path d="M24 2c1.6 11.2 6.8 18 22 22-15.2 4-20.4 10.8-22 22-1.6-11.2-6.8-18-22-22C17.2 20 22.4 13.2 24 2z" fill="url(#mfSpk)" />
            <path d="M39 4c.5 3.4 2 5.2 6.5 6.5C41 11.8 39.5 13.6 39 17c-.5-3.4-2-5.2-6.5-6.5C37 9.2 38.5 7.4 39 4z" fill="#dff1ff" opacity=".9" />
          </svg>
        </span>
      );
    case "neural": {
      const L = [[16, [12, 29, 46]], [50, [8, 23, 38, 53]], [84, [20, 38]]];
      const lines = [];
      for (let a = 0; a < L.length - 1; a++) L[a][1].forEach((y1, i) => L[a + 1][1].forEach((y2, k) => lines.push(<line key={`${a}${i}${k}`} x1={L[a][0]} y1={y1} x2={L[a + 1][0]} y2={y2} style={{ "--d": `${((i * 3 + k * 5 + a) % 7) * 0.35}s` }} />)));
      return (
        <span className="mf-chip mf-neural" data-chip aria-hidden="true">
          <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet">
            <g className="mf-nl">{lines}</g>
            {L.map(([x, ys], a) => ys.map((y, i) => <circle key={`${a}-${i}`} cx={x} cy={y + 1.5} r="3.6" style={{ "--d": `${((a * 4 + i * 3) % 9) * 0.28}s` }} />))}
          </svg>
        </span>
      );
    }
    case "code":
      return (
        <span className="mf-chip mf-code" data-chip aria-hidden="true">
          <i className="mf-code-d"><b /><b /><b /></i>
          <span className="mf-code-t">&lt;/&gt;<em /></span>
        </span>
      );
    case "people":
      return (
        <span className="mf-chip mf-people" data-chip aria-hidden="true">
          {["#7fa6ff,#3459ee", "#79e4ff,#2f8de0", "#cdb4ff,#6a4be0", "#ffc29b,#e0653a"].map((g, i) => (
            <span key={i} className="mf-av" style={{ background: `linear-gradient(150deg, ${g})` }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4" /><path d="M4 21c1-5 5-7 8-7s7 2 8 7z" /></svg>
            </span>
          ))}
          <span className="mf-av mf-av-n"><b>+1.8K</b></span>
        </span>
      );
    case "atom":
      return (
        <span className="mf-chip mf-atom" data-chip aria-hidden="true">
          <svg viewBox="0 0 60 60"><defs><linearGradient id="mfAt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bcd8ff" /><stop offset="1" stopColor="#5b8cff" /></linearGradient></defs>
            <g className="mf-atom-o" fill="none" stroke="url(#mfAt)" strokeWidth="2.2">
              <ellipse cx="30" cy="30" rx="25" ry="9.5" />
              <ellipse cx="30" cy="30" rx="25" ry="9.5" transform="rotate(60 30 30)" />
              <ellipse cx="30" cy="30" rx="25" ry="9.5" transform="rotate(120 30 30)" />
            </g>
            <circle cx="30" cy="30" r="5" fill="#79e4ff" />
          </svg>
        </span>
      );
    case "chat":
      return (
        <span className="mf-chip mf-chat" data-chip aria-hidden="true">
          <span className="mf-chat-b"><i /><i /><i /></span>
        </span>
      );
    case "open":
      return (
        <span className="mf-chip mf-open" data-chip aria-hidden="true">
          <i className="mf-dot" /><span className="mf-open-t">Available for work</span>
        </span>
      );
    default:
      return null;
  }
}

function Fx({ fx, t }) {
  const k = wid++;
  if (fx === "select") {
    return (
      <span className="mf-w mf-fx mf-select" data-w data-fx key={k}>
        {t}<i className="h h1" /><i className="h h2" /><i className="h h3" /><i className="h h4" />
      </span>
    );
  }
  return <span className={`mf-w mf-fx mf-${fx}`} data-w data-fx data-t={t} key={k}>{t}</span>;
}

export default function Manifesto({ embedded = false, native = false }) {
  const sec = useRef(null);
  const pillRef = useRef(null);

  useLayoutEffect(() => {
    const root = sec.current;
    if (!root) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = Array.from(root.querySelectorAll("[data-w]"));
    const chips = Array.from(root.querySelectorAll("[data-chip]"));
    const pill = pillRef.current;
    const blobs = Array.from(root.querySelectorAll(".mf-blob"));
    const items = [];
    let rootH = 1;

    const measure = () => {
      const rr = root.getBoundingClientRect();
      rootH = rr.height;
      items.length = 0;
      for (const el of words) { const r = el.getBoundingClientRect(); items.push({ el, chip: false, y: r.top - rr.top + r.height / 2, p: -1, on: false }); }
      for (const el of chips) { const r = el.getBoundingClientRect(); items.push({ el, chip: true, y: r.top - rr.top + r.height / 2, p: -1, on: false }); }
    };

    const clamp = (v) => Math.min(1, Math.max(0, v));
    const update = () => {
      const vh = window.innerHeight;
      const rr = root.getBoundingClientRect();
      const line = vh * 0.68, span = vh * 0.16;        // the reading line, and how far a word takes to go from dim to lit
      for (const it of items) {
        const wy = rr.top + it.y;
        const p = reduce ? 1 : clamp((line - wy) / span + 0.2);
        const q = Math.round(p * 50) / 50;
        if (q === it.p) continue;
        it.p = q;
        if (it.chip) {
          const e = 1 - Math.pow(1 - q, 3);
          it.el.style.opacity = q.toFixed(2);
          it.el.style.transform = `translateY(${((1 - e) * 0.35).toFixed(3)}em) scale(${(0.5 + 0.5 * e).toFixed(3)}) rotate(${((1 - e) * -14).toFixed(1)}deg)`;
          const on = q > 0.7;
          if (on !== it.on) { it.on = on; it.el.classList.toggle("is-on", on); }
        } else {
          it.el.style.setProperty("--p", q.toFixed(2));
          if (it.el.hasAttribute("data-fx")) {
            const on = q > 0.85;
            if (on !== it.on) { it.on = on; it.el.classList.toggle("is-on", on); }
          }
        }
      }
      // the soft light behind the text drifts a little against the scroll
      const prog = clamp((vh - rr.top) / (rr.height + vh));
      blobs.forEach((b, i) => { b.style.transform = `translate3d(${((i ? -1 : 1) * (prog - 0.5) * 90).toFixed(1)}px, ${((prog - 0.5) * (i ? 140 : -140)).toFixed(1)}px, 0)`; });
      // the floating "See work" pill is only there while you are reading this
      if (pill) pill.classList.toggle("is-in", rr.top < vh * 0.55 && rr.bottom > vh * 0.45);
    };

    measure();
    update();
    // embedded (inside the Illusion's void) the section is moved by a transform, so it is driven by the ticker instead of by ScrollTrigger
    // native: the text sits in normal flow (phones), so the browser scrolls it and ScrollTrigger can drive the lighting like any other section
    const st = embedded && !native ? null : ScrollTrigger.create({ trigger: root, start: "top bottom", end: "bottom top", onUpdate: update, onRefresh: () => { measure(); update(); } });
    // embedded (how the page uses it): driven from the ticker, but only while the text is actually on screen - it used to measure and walk every word on every frame for the whole life of the page
    let vis = !embedded, io = null;
    const tickUpdate = () => { if (vis) update(); };
    if (embedded) {
      if (!native) gsap.ticker.add(tickUpdate);
      root.classList.add("mf-asleep");   // endless loops (signal lines, node pulses...) stay paused until the text is actually near the screen
      io = new IntersectionObserver(([en]) => { if (en.isIntersecting !== vis) { vis = en.isIntersecting; root.classList.toggle("mf-asleep", !vis); if (vis || !native) update(); } }, { rootMargin: native ? "40px 0px" : "120px 0px" });
      io.observe(root);
    }
    const ro = new ResizeObserver(() => { measure(); update(); });
    ro.observe(root);
    document.fonts && document.fonts.ready.then(() => { measure(); update(); });
    const t1 = setTimeout(() => { measure(); update(); }, 600);
    window.addEventListener("resize", update, { passive: true });
    return () => { st && st.kill(); if (embedded && !native) gsap.ticker.remove(tickUpdate); io && io.disconnect(); ro.disconnect(); clearTimeout(t1); window.removeEventListener("resize", update); };
  }, [embedded, native]);

  const goWork = () => {
    const t = document.querySelector("#fs-work-intro") || document.querySelector("#prism");
    if (!t) return;
    const y = t.getBoundingClientRect().top + window.scrollY;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: "smooth" });
  };
  const goHello = (e) => {
    e.preventDefault();
    const y = document.documentElement.scrollHeight;
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2 }); else window.scrollTo({ top: y, behavior: "smooth" });
  };

  wid = 0;
  const pillEl = (<button ref={pillRef} type="button" className="mf-pill" onClick={goWork} aria-label="See my selected work">
          <span>See work</span><i aria-hidden="true"><b /><b /></i>
        </button>);
  return (
    <>
    <section ref={sec} className={`mf${embedded ? " mf-embed" : ""}`} id="manifesto" aria-label="About">
      {!embedded && <div className="mf-bg" aria-hidden="true">
        <i className="mf-grid" />
        <i className="mf-blob b1" />
        <i className="mf-blob b2" />
      </div>}
      <div className="mf-body">
        {COPY.map((para, pi) => (
          <p key={pi} className={`mf-p${pi === COPY.length - 1 ? " mf-last" : ""}`}>
            {para.map((tok, ti) => (
              <Fragment key={ti}>
                {typeof tok === "string" ? <Words text={tok} /> : tok.chip ? <Chip kind={tok.chip} /> : <Fx fx={tok.fx} t={tok.t} />}
                {" "}
              </Fragment>
            ))}
            {pi === COPY.length - 1 && (
              <>
                <a className="mf-w mf-cta" data-w href="#contact" onClick={goHello}>Say hello</a>
                <span className="mf-chip mf-go" data-chip aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg></span>
                <span className="mf-chip mf-chat" data-chip aria-hidden="true"><span className="mf-chat-b"><i /><i /><i /></span></span>
              </>
            )}
          </p>
        ))}
      </div>
    </section>
    {embedded && typeof document !== "undefined" ? createPortal(pillEl, document.body) : pillEl}
    </>
  );
}

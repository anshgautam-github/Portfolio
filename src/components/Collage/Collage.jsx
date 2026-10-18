import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./collage.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * <Collage /> - pinned, scroll-driven showcase in the dark landing theme.
 *   Mock product cards drift around a paper note; the note changes phrase three times and the cards re-scatter each time,
 *   then everything flies into a tidy board ("Everything you build, build with care.").
 *   Edit NOTES / CARDS below. Cards are pure CSS mock UIs - swap any of them for a real screenshot by passing `img`.
 */
const NOTES = [
  { a: "Obsess over", b: "the details." },
  { a: "Ship models", b: "that matter." },
  { a: "Engineer with", b: "empathy." },
];
const CAPTION = "Everything you build, build with care.";

const CARDS = [
  { k: "chat", light: false, label: "Assistant" },
  { k: "metric", light: true, label: "Latency" },
  { k: "code", light: false, label: "train.ts" },
  { k: "builder", light: true, label: "Course builder" },
  { k: "phone", light: false, label: "Mobile" },
  { k: "graph", light: false, label: "Pipeline" },
  { k: "kanban", light: true, label: "Roadmap" },
  { k: "term", light: false, label: "Deploy" },
  { k: "heat", light: false, label: "Runs" },
];

/* positions: x in vw, y in vh (from the centre), r = rotation, s = scale */
const P = (x, y, r, s) => ({ x, y, r, s });
const A = [P(-34, -22, -5, 1), P(-6, -40, 3, 0.8), P(36, -24, 5, 1), P(-40, 22, 4, 0.95), P(34, 26, -4, 1.05), P(-20, 42, -3, 0.75), P(22, -42, -4, 0.7), P(-52, -2, 6, 0.8), P(54, 2, -6, 0.8)];
const B = [P(-38, 10, -4, 0.95), P(-30, -34, 5, 0.85), P(6, -38, -3, 0.9), P(40, -14, 4, 0.95), P(-8, 40, 4, 0.9), P(34, 34, -5, 0.8), P(-50, -30, 3, 0.7), P(-22, 28, 5, 0.7), P(50, 10, -5, 0.85)];
const C = [P(-28, -30, 4, 0.9), P(-42, -4, -5, 1), P(30, -34, -4, 0.85), P(44, 6, 5, 0.9), P(-34, 30, -4, 1), P(4, 38, 3, 0.9), P(26, 32, -3, 0.75), P(-8, -40, 6, 0.7), P(52, -22, 4, 0.7)];
const GR = [-1.5, 1.2, -0.8, 1.6, -1.2, 0.9, 1.4, -1.6, 0.6];
const G = CARDS.map((_, i) => P((i % 3 - 1) * 20.5, (Math.floor(i / 3) - 1) * 26.5, GR[i], 0.88));
const GM = CARDS.map((_, i) => P(i === 8 ? 0 : (i % 2 ? 1 : -1) * 24, (Math.floor(i / 2) - 2) * 17, GR[i], 0.62));
const mob = (arr) => arr.map((p) => P(p.x * 0.5, p.y * 1.3, p.r, p.s * 0.85));

const u = (p) => ({ x: p.x + "vw", y: p.y + "vh", rotation: p.r, scale: p.s });

/* ------------------------------------------------------------------ the mock UIs (sized in cqw so they scale with the card) */
function Mock({ k }) {
  switch (k) {
    case "chat":
      return (
        <div className="m m-chat">
          <div className="hd"><i /><b>Assistant</b><u>online</u></div>
          <p className="l">Summarise last night's training run</p>
          <p className="r">Accuracy +4.2% over baseline. P95 latency down 42%.</p>
          <p className="l">Ship it?</p>
          <div className="typing"><i /><i /><i /></div>
        </div>
      );
    case "metric":
      return (
        <div className="m m-met">
          <small>P95 latency</small>
          <strong>−42%</strong>
          <div className="bars">{[38, 52, 44, 60, 48, 70, 58, 86].map((h, i) => <span key={i} style={{ "--h": h + "%", "--i": i }} />)}</div>
          <em>vs. last release</em>
        </div>
      );
    case "code":
      return (
        <div className="m m-code">
          <div className="dots"><i /><i /><i /></div>
          <pre>
            <span className="c">// fine-tune, evaluate, ship</span>{"\n"}
            <span className="k">const</span> model = <span className="k">await</span> <span className="n">train</span>({"{"}{"\n"}
            {"  "}data, epochs: <span className="s">40</span>,{"\n"}
            {"  "}lr: <span className="s">3e-4</span>,{"\n"}
            {"}"});{"\n"}
            <span className="k">await</span> <span className="n">ship</span>(model); <span className="g">✓</span><b className="caret" />
          </pre>
        </div>
      );
    case "builder":
      return (
        <div className="m m-bld">
          <div className="rail"><i className="on" /><i /><i /></div>
          <div className="cv">
            <span className="chip">Lesson 03</span>
            <h4>Designing<br />for clarity</h4>
            <div className="sk"><i /><i /></div>
            <button type="button" tabIndex={-1}>Continue</button>
          </div>
        </div>
      );
    case "phone":
      return (
        <div className="m m-ph">
          <div className="top"><b>Playing</b><i /></div>
          {[["#f59e0b", 80], ["#38bdf8", 46], ["#a78bfa", 64], ["#34d399", 28]].map(([c, w], i) => (
            <div className="row" key={i}>
              <span style={{ background: `linear-gradient(135deg, ${c}, #0b1424)` }} />
              <div><i /><em><b style={{ width: w + "%" }} /></em></div>
            </div>
          ))}
        </div>
      );
    case "graph":
      return (
        <div className="m m-gr">
          <svg viewBox="0 0 100 75" aria-hidden="true">
            <g className="ln">
              <path d="M14 38 L38 18 L64 30 L86 14" />
              <path d="M14 38 L40 58 L66 50 L86 62" />
              <path d="M38 18 L40 58" />
              <path d="M64 30 L66 50" />
            </g>
            {[[14, 38], [38, 18], [64, 30], [86, 14], [40, 58], [66, 50], [86, 62]].map(([x, y], i) => (
              <g key={i} className="nd" style={{ "--i": i }}>
                <circle cx={x} cy={y} r="6.5" className="halo" />
                <circle cx={x} cy={y} r="3.4" />
              </g>
            ))}
          </svg>
        </div>
      );
    case "kanban":
      return (
        <div className="m m-kb">
          {[["#3f72ee", 2], ["#f59e0b", 3], ["#10b981", 1]].map(([c, n], i) => (
            <div className="col" key={i}>
              <i />
              {Array.from({ length: n }, (_, j) => <span key={j} style={{ "--c": c }}><b /><b /></span>)}
            </div>
          ))}
        </div>
      );
    case "term":
      return (
        <div className="m m-tm">
          <div className="dots"><i /><i /><i /></div>
          <p><s>$</s> npm run build</p>
          <p className="ok">✓ compiled in 1.2s</p>
          <p><s>$</s> deploy --prod</p>
          <p className="ok">✓ live · 12 regions</p>
          <p><s>$</s><b className="caret" /></p>
        </div>
      );
    default:
      return (
        <div className="m m-ht">
          <small>Experiments tracked</small>
          <strong>1.2M</strong>
          <div className="gridh">
            {Array.from({ length: 60 }, (_, i) => {
              const v = (Math.sin(i * 1.7) + Math.cos(i * 0.6) + 2) / 4;
              return <span key={i} style={{ "--o": (0.12 + v * 0.88).toFixed(2), "--i": i % 12 }} />;
            })}
          </div>
        </div>
      );
  }
}

export default function Collage({ scrollLength = 7.6 }) {
  const root = useRef(null);
  const stage = useRef(null);

  /* gentle pointer parallax: writes --mx / --my (px) onto the stage, each card scales it by its own depth */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const t = { x: 0, y: 0 };
    const c = { x: 0, y: 0 };
    let raf = 0;
    const loop = () => {
      c.x += (t.x - c.x) * 0.07;
      c.y += (t.y - c.y) * 0.07;
      el.style.setProperty("--mx", c.x.toFixed(2));
      el.style.setProperty("--my", c.y.toFixed(2));
      raf = Math.abs(t.x - c.x) + Math.abs(t.y - c.y) > 0.05 ? requestAnimationFrame(loop) : 0;
    };
    const move = (e) => {
      t.x = (e.clientX / window.innerWidth - 0.5) * 2;
      t.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const cards = q("[data-card]");
      const notes = q("[data-note]");
      const dots = q("[data-dot]");
      const board = q("[data-board]")[0];
      const bw = q("[data-bw]")[0];
      const cap = q("[data-cap]")[0];
      const hud = q("[data-hud]");
      const mm = gsap.matchMedia();

      const build = (m) => {
        const a = m ? mob(A) : A;
        const b = m ? mob(B) : B;
        const c = m ? mob(C) : C;
        const g = m ? GM : G;
        const R = 7.6;
        gsap.set(cards, { autoAlpha: 0 });
        cards.forEach((cd, i) => gsap.set(cd, { x: a[i].x * 2.6 + "vw", y: a[i].y * 2.6 + "vh", rotation: a[i].r * 3, scale: a[i].s * 0.6 }));
        gsap.set(notes, { autoAlpha: 0, transformOrigin: "50% 50%" });
        gsap.set(board, { clipPath: "inset(50% 50% 50% 50% round 34px)" });
        gsap.set(bw, { autoAlpha: 0 });
        gsap.set(cap, { autoAlpha: 0, y: 40 });
        gsap.set(hud, { autoAlpha: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: { trigger: el, start: "top top", end: () => "+=" + window.innerHeight * scrollLength, pin: true, scrub: 1, invalidateOnRefresh: true },
        });
        const fly = (arr, at, dur = 1.5, extra = {}) =>
          tl.to(cards, { x: (i) => arr[i].x + "vw", y: (i) => arr[i].y + "vh", rotation: (i) => arr[i].r, scale: (i) => arr[i].s, duration: dur, stagger: { each: 0.05, from: "random" }, ...extra }, at);
        const noteIn = (n, at) => tl.fromTo(n, { autoAlpha: 0, scale: 0.55, rotation: -12, y: 30 }, { autoAlpha: 1, scale: 1, rotation: (n.dataset.rot || -2) * 1, y: 0, duration: 0.9, ease: "back.out(1.5)", immediateRender: false }, at);
        const noteOut = (n, at) => tl.to(n, { autoAlpha: 0, scale: 1.18, rotation: 8, y: -40, duration: 0.55, ease: "power2.in" }, at);
        const dot = (i, at) => {
          tl.to(dots, { opacity: 0.28, scaleX: 1, duration: 0.3, ease: "none" }, at);
          tl.to(dots[i], { opacity: 1, scaleX: 3.2, duration: 0.3, ease: "none" }, at);
        };

        tl.to(hud, { autoAlpha: 1, duration: 0.5, ease: "none" }, 0);
        noteIn(notes[0], 0.05);
        dot(0, 0.1);
        fly(a, 0.1, 1.5, { autoAlpha: 1, ease: "power3.out" });

        noteOut(notes[0], 2.3);
        noteIn(notes[1], 2.7);
        dot(1, 2.7);
        fly(b, 2.4, 1.6);

        noteOut(notes[1], 4.5);
        noteIn(notes[2], 4.9);
        dot(2, 4.9);
        fly(c, 4.6, 1.6);

        noteOut(notes[2], 6.5);
        tl.to(hud, { autoAlpha: 0, duration: 0.4, ease: "none" }, 6.5);
        fly(g, 6.6, 1.7, { ease: "power3.inOut" });
        tl.fromTo(board, { clipPath: "inset(50% 50% 50% 50% round 34px)" }, { clipPath: "inset(0% 0% 0% 0% round 34px)", duration: 1.5, ease: "power3.inOut", immediateRender: false }, 6.6);
        tl.to(bw, { autoAlpha: 1, duration: 0.5, ease: "none" }, 6.6);
        tl.to(cap, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out" }, 8.2);
        tl.to({}, { duration: 1.0 }, 9.2);
        return () => tl.scrollTrigger && tl.scrollTrigger.kill();
      };

      mm.add("(min-width: 761px) and (prefers-reduced-motion: no-preference)", () => build(false));
      mm.add("(max-width: 760px) and (prefers-reduced-motion: no-preference)", () => build(true));
      mm.add("(prefers-reduced-motion: reduce)", () => {
        cards.forEach((cd, i) => gsap.set(cd, { ...u(G[i]), autoAlpha: 1 }));
        gsap.set(board, { clipPath: "none" });
        gsap.set(bw, { autoAlpha: 1 });
        gsap.set(cap, { autoAlpha: 1, y: 0 });
      });
    }, el);
    return () => ctx.revert();
  }, [scrollLength]);

  return (
    <section ref={root} className="cl" aria-label="Selected craft">
      <div ref={stage} className="cl-stage">
        <div className="cl-bg" aria-hidden="true">
          <i className="a" /><i className="b" /><i className="c" />
          <span className="grid" />
          <span className="dust" />
        </div>

        <div className="cl-hud" data-hud aria-hidden="true">
          <span className="l">( Craft )</span>
          <span className="mid">{[0, 1, 2].map((i) => <i key={i} data-dot />)}</span>
          <span className="r">03 / 03</span>
        </div>

        {/* the finale board */}
        <div className="cl-board" data-bw aria-hidden="true">
          <span className="accent" />
          <div className="face" data-board>
            <span className="ruler">{Array.from({ length: 18 }, (_, i) => <b key={i}>{i + 1}</b>)}</span>
            <span className="sweep" />
            <p data-cap className="cap">{CAPTION}</p>
          </div>
        </div>

        {/* centre notes */}
        {NOTES.map((n, i) => (
          <div key={i} data-note data-rot={[-2, 1.5, -1][i]} className="cl-note">
            <span className="tape" />
            <p><em>{n.a}</em><strong>{n.b}</strong></p>
          </div>
        ))}

        {CARDS.map((c, i) => (
          <div key={c.k} data-card className={`cl-card${c.light ? " light" : ""}`} style={{ "--d": [9, 5, 11, 7, 10, 6, 8, 12, 5][i], "--dl": (i * -0.9).toFixed(1) + "s" }}>
            <div className="par">
              <div className="in">
                <Mock k={c.k} />
                <span className="gloss" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountAboutFx } from "../FreefallStory/aboutFx.js";
import "./prism.css";

gsap.registerPlugin(ScrollTrigger);

/*
  <Prism /> - sits right after the tech stack.
  A long four-sided bar floats in the dark, tilted so one end shows. Scrolling rolls it towards you, face by face:
    1. ice-white wordmark face     (a ticker of words slides along it)
    2. royal-blue face with three real project screens (GPT-2, CineMyst, OwnMove), each drifting at its own speed
    3. ice-white wordmark face     (the ticker runs the other way)
    4. cyan face with the numbers behind the work
  Each face is shaded by how directly it faces you, the pointer nudges the tilt, a caption + segmented progress follow the roll.
*/

const CAPS = [
  { n: "01", t: "The engineer", d: "Across machine learning, backend architecture, data systems, and application engineering." },
  { n: "02", t: "Selected work", d: "GPT-2 from scratch · CineMyst · OwnMove." },
  { n: "03", t: "The craft", d: "Understanding the problem. Designing the architecture. Engineering for reliability." },
  { n: "04", t: "The proof", d: "A few numbers from the things I have built, launched and shared." },
];
const WORDS_A = ["Programming", "(Python, Java, JavaScript, Swift)", "Machine Learning", "(PyTorch, Transformers, Sentence Transformers)", "Data & Retrieval", "(PostgreSQL, pgvector, FAISS, Embeddings)", "Backend & Infrastructure", "(FastAPI, REST APIs, Supabase, Docker)", "Frontend", "(React, Vite, Tailwind CSS)"];
const WORDS_B = ["Research", "(Model architectures, experimentation, evaluation)", "Systems", "(Backend design, data pipelines, retrieval architecture)", "Intelligence", "(LLMs, RAG, embeddings, intelligent workflows)", "Engineering", "(Testing, security, performance, deployment)"];
const STATS = [
  { v: "163M", k: "Parameters in a language model trained from scratch." },
  { v: "2,100+", k: "Visitors to OwnMove." },
  { v: "1,800+", k: "Students mentored in professional presence and career development." },
];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function Ticker({ words, cls }) {
  const set = (k) => (
    <div className="pr-mq-set" key={k} aria-hidden={k ? "true" : undefined}>
      {words.map((w, i) => (<span key={i} className={w.startsWith("(") ? "is-paren" : ""}>{w}</span>))}
    </div>
  );
  return <div className={`pr-mq ${cls}`}><div className="pr-mq-track">{set(0)}{set(1)}{set(2)}</div></div>;
}

export default function Prism() {
  const sec = useRef(null);

  useLayoutEffect(() => {
    const root = sec.current;
    if (!root) return undefined;
    const q = (s) => root.querySelector(s);
    const qa = (s) => [...root.querySelectorAll(s)];
    const destroyFx = mountAboutFx(q(".pr-pin"));   // the same drifting light threads as the manifesto above, behind the bar
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = q(".pr-scene"), bar = q(".pr-bar"), tilt = q(".pr-tilt"), floor = q(".pr-floor"), ghost = q(".pr-ghost span");
    const shades = qa(".pr-shade"), caps = qa(".pr-cap-i"), ticks = qa(".pr-tick"), tracks = qa(".pr-mq-track"), shots = qa(".pr-shot"), stats = qa(".pr-stat");
    const P = { th: 0, ent: reduce ? 1 : 0, out: 0 };
    const pt = { x: 0, y: 0, cx: 0, cy: 0 };
    let active = -1;

    const render = () => {
      const e = P.ent, o = P.out;
      root.style.setProperty("--pc", (1 - e).toFixed(3));   // 1 while the card is still rising in, 0 once it fills the screen
      const ey = (1 - e) * 62 - o * 26;                 // vh: the bar starts below the fold and climbs into place
      const sc = 0.84 + 0.16 * e - o * 0.12;
      const th = P.th + (1 - e) * -52;
      bar.style.transform = `translate3d(0, ${ey.toFixed(2)}vh, 0) scale(${sc.toFixed(4)}) rotateX(${th.toFixed(2)}deg)`;
      scene.style.opacity = (clamp(e * 2.2) * (1 - clamp((o - 0.35) / 0.65))).toFixed(3);
      shades.forEach((s, k) => {
        const f = Math.cos(((P.th - k * 90) * Math.PI) / 180);        // 1 = facing the viewer, -1 = facing away
        s.style.opacity = (clamp(1 - f) * 0.62).toFixed(3);
      });
      floor.style.opacity = (e * (1 - o)).toFixed(3);
      floor.style.transform = `translate(-50%, 0) scale(${(0.7 + 0.3 * e).toFixed(3)}, ${(0.9 + 0.12 * Math.abs(Math.sin((P.th * Math.PI) / 90)) ).toFixed(3)})`;
      const idx = clamp(Math.round(P.th / 90), 0, 3);
      if (idx !== active) {
        active = idx;
        caps.forEach((c, i) => c.classList.toggle("is-on", i === idx));
        ticks.forEach((c, i) => c.classList.toggle("is-on", i <= idx));
        root.dataset.face = String(idx);
      }
    };
    let lastTf = "";
    const tiltTick = () => {
      pt.cx += (pt.x - pt.cx) * 0.08; pt.cy += (pt.y - pt.cy) * 0.08;
      const tf = `rotateX(${(-11 + pt.cy * -3).toFixed(2)}deg) rotateY(${(-15 + pt.cx * 5).toFixed(2)}deg)`;
      if (tf !== lastTf) { lastTf = tf; tilt.style.transform = tf; }   // once the pointer is still the value stops changing: no style write per frame
    };
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e) => { const r = root.getBoundingClientRect(); pt.x = ((e.clientX - r.left) / r.width) * 2 - 1; pt.y = ((e.clientY - r.top) / r.height) * 2 - 1; };
    if (fine && !reduce) { root.addEventListener("pointermove", onMove, { passive: true }); gsap.ticker.add(tiltTick); } else tiltTick();

    let tl, pre;
    if (!reduce) {
      /* entrance: as the section scrolls up into view the bar rises from the bottom of the screen (card-rise), landing as the pin begins */
      const riseTo = (p) => gsap.to(P, { ent: 1 - Math.pow(1 - p, 2.4), duration: 0.45, ease: "power2.out", overwrite: "auto", onUpdate: render });
      pre = ScrollTrigger.create({
        trigger: root, start: "top bottom", end: "top top", invalidateOnRefresh: true,
        onUpdate: (self) => riseTo(self.progress),
        onRefresh: (self) => { P.ent = 1 - Math.pow(1 - self.progress, 2.4); render(); },
      });
      const H = window.innerHeight;
      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root, start: "top top", end: () => "+=" + window.innerHeight * 5.6, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
        onUpdate: render,
      });
      const T = 10.2;
      [[90, 2.2], [180, 4.7], [270, 7.2]].forEach(([deg, at]) => tl.to(P, { th: deg, duration: 1.25, ease: "power3.inOut" }, at));
      tl.to(P, { out: 1, duration: 1.2, ease: "power2.in" }, 9.0);
      // tickers slide along their faces for the whole scroll, in opposite directions
      tracks.forEach((tr, i) => tl.fromTo(tr, { xPercent: i % 2 ? -66.6 : 0 }, { xPercent: i % 2 ? 0 : -66.6, duration: T }, 0));
      // the projects on the blue face drift against the roll at different speeds; the stats rise in as that face arrives
      shots.forEach((s, i) => tl.fromTo(s, { x: (i - 1) * 34 }, { x: (i - 1) * -34, duration: 4.4 }, 1.5));
      stats.forEach((s, i) => tl.fromTo(s, { y: 38, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 7.55 + i * 0.12));
      tl.fromTo(ghost, { xPercent: 8 }, { xPercent: -26, duration: T }, 0);
      tl.set({}, {}, T);
    } else {
      render();
    }
    render();
    return () => { destroyFx(); gsap.ticker.remove(tiltTick); root.removeEventListener("pointermove", onMove); pre && pre.kill(); gsap.killTweensOf(P); tl && tl.scrollTrigger && tl.scrollTrigger.kill(); tl && tl.kill(); };
  }, []);

  return (
    <section ref={sec} className="pr" id="prism" aria-label="Selected builds" data-face="0">
      <div className="pr-pin">
        <div className="pr-bg" aria-hidden="true"><div className="about-fx"><canvas className="afx-cv" /><i className="afx-b afx-b1" /><i className="afx-b afx-b2" /><i className="afx-b afx-b3" /><i className="afx-dots" /><i className="afx-spot" /></div><i className="pr-grid" /><i className="pr-halo" /><i className="pr-sp s1" /><i className="pr-sp s2" /><i className="pr-sp s3" /><i className="pr-sp s4" /><i className="pr-sp s5" /></div>
        <div className="pr-ghost" aria-hidden="true"><span>Build · Ship · Learn · Build · Ship</span></div>

        {/* eyebrow label "(04) Selected builds" removed */}

        <div className="pr-scene">
          <div className="pr-tilt">
            <div className="pr-bar">
              {/* face 1: wordmark */}
              <div className="pr-f pr-f--w" style={{ "--k": 0 }}><Ticker words={WORDS_A} cls="a" /><i className="pr-shade" /></div>
              {/* face 2: real project screens on royal blue */}
              <div className="pr-f pr-f--b" style={{ "--k": 1 }}>
                <div className="pr-shots">
                  <figure className="pr-shot pr-lap"><div className="pr-scr"><img src="/gpt2.jpg" alt="GPT-2 built from scratch" draggable="false" /></div><figcaption><b>01</b> GPT-2 from scratch</figcaption></figure>
                  <figure className="pr-shot pr-ph"><div className="pr-scr"><img src="/cinemyst-2.jpg" alt="CineMyst iOS app" draggable="false" /></div><figcaption><b>02</b> CineMyst</figcaption></figure>
                  <figure className="pr-shot pr-lap pr-lap--3"><div className="pr-scr"><img src="/ownmove.jpg" alt="OwnMove" draggable="false" /></div><figcaption><b>03</b> OwnMove</figcaption></figure>
                </div>
                <i className="pr-shade" />
              </div>
              {/* face 3: wordmark, other direction */}
              <div className="pr-f pr-f--w" style={{ "--k": 2 }}><Ticker words={WORDS_B} cls="b" /><i className="pr-shade" /></div>
              {/* face 4: the numbers */}
              <div className="pr-f pr-f--c" style={{ "--k": 3 }}>
                <div className="pr-stats">{STATS.map((s) => (<div className="pr-stat" key={s.v}><b>{s.v}</b><span>{s.k}</span></div>))}</div>
                <i className="pr-shade" />
              </div>
              {/* end caps */}
              <div className="pr-cap pr-cap--r"><span>AG</span><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><circle cx="50" cy="50" r="33" /></svg></div>
              <div className="pr-cap pr-cap--l" />
            </div>
            <i className="pr-floor" aria-hidden="true" />
          </div>
        </div>

        <div className="pr-caps" aria-live="polite">
          {CAPS.map((c, i) => (<div className={"pr-cap-i" + (i === 0 ? " is-on" : "")} key={c.n}><h3>{c.t}</h3><p>{c.d}</p></div>))}
        </div>
        <div className="pr-ticks" aria-hidden="true">{CAPS.map((c, i) => (<i key={c.n} className={"pr-tick" + (i === 0 ? " is-on" : "")} />))}</div>
        {/* "Scroll to roll" hint removed */}
      </div>
    </section>
  );
}

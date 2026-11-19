import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IS_MOBILE } from "../../lib/perf.js";
import { mountTechBg } from "./techBg.js";
import "./techSwitch.css";

gsap.registerPlugin(ScrollTrigger);

/*
  <TechSwitch /> - sits right after the projects.
  A calm cream screen with a big switch. As you scroll (or tap the switch) the knob slides across and turns green,
  the switch "powers on" the stack: a dark field opens from the switch outwards and slanted rows of tools slide in,
  one row drifting forwards, the next backwards, and so on. Scroll speed pushes them faster.
  Stack data is the STACK list below (name, bg, fg), grouped as Programming / AI-ML / Backend / Frontend / Infrastructure.
*/

const MONO = { "HTML & CSS": "</>", JavaScript: "JS", "REST APIs": "API", PostgreSQL: "Pg", Transformers: "\u{1F917}", Embeddings: "Em", LangChain: "LC", LangGraph: "LG", pgvector: "pgv", Supabase: "Sb", FastAPI: "Fa", Tailwind: "Tw", PyTorch: "Pt", GitHub: "Gh", Vercel: "▲", Chroma: "Ch", Render: "Rn", Python: "Py", Java: "Jv", React: "Re", SQL: "SQL", RAG: "RAG", FAISS: "Fs", Git: "Git" };
const MONO2 = { ...MONO, Swift: "Sw", Vite: "Vt", "Sentence Transformers": "ST", "Tailwind CSS": "Tw" };
const mono = (n) => MONO2[n] || n.slice(0, 2);
const STACK = [
  // Programming
  { name: "Python", bg: "#2b5b84", fg: "#ffd43b" }, { name: "Java", bg: "#e76f00", fg: "#ffffff" }, { name: "JavaScript", bg: "#ecdc6a", fg: "#1f2020" },
  { name: "Swift", bg: "#f05138", fg: "#ffffff" }, { name: "SQL", bg: "#0b1e3a", fg: "#4aa3f5" },
  // AI / ML
  { name: "PyTorch", bg: "#ee4c2c", fg: "#ffffff" }, { name: "Transformers", bg: "#ffd21e", fg: "#1f1f1f" }, { name: "LangChain", bg: "#12302b", fg: "#7ee0b5" },
  { name: "Sentence Transformers", bg: "#1c2d5a", fg: "#ffd21e" },
  // Backend
  { name: "FastAPI", bg: "#05998b", fg: "#ffffff" }, { name: "PostgreSQL", bg: "#336791", fg: "#ffffff" }, { name: "Supabase", bg: "#161616", fg: "#3ecf8e" },
  // Frontend
  { name: "React", bg: "#232832", fg: "#67bdd8" }, { name: "Vite", bg: "#2a1f5e", fg: "#ffc517" }, { name: "Tailwind CSS", bg: "#0f172a", fg: "#38bdf8" },
  // Infrastructure
  { name: "GitHub", bg: "#0d1117", fg: "#ffffff" }, { name: "Vercel", bg: "#000000", fg: "#ffffff" }, { name: "Render", bg: "#46e3b7", fg: "#0b1e3a" },
];
const ROWS = IS_MOBILE ? 7 : 9;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const TAGS = [
  { k: "01", v: "tokens", x: "7%", y: "22%", d: 14, a: 7 }, { k: "02", v: "embeddings", x: "80%", y: "18%", d: -10, a: 9 },
  { k: "03", v: "attention", x: "13%", y: "70%", d: 18, a: 11 }, { k: "04", v: "retrieval", x: "84%", y: "64%", d: -16, a: 6 },
  { k: "05", v: "inference", x: "22%", y: "11%", d: 8, a: 10 }, { k: "06", v: "fine-tune", x: "70%", y: "84%", d: -8, a: 8 },
  { k: "07", v: "pipelines", x: "4%", y: "47%", d: 12, a: 12 }, { k: "08", v: "deploy", x: "90%", y: "42%", d: -12, a: 5 },
];

export default function TechSwitch() {
  const sec = useRef(null);
  const rows = useMemo(() => {
    const items = STACK;
    return Array.from({ length: ROWS }, (_, r) => {
      const list = [];
      const n = items.length;
      for (let k = 0; k < n; k++) {
        const it = items[(k * 5 + r * 7) % n];
        list.push({ ...it, kind: "w", o: (k + r) % 4 === 2 });
        list.push({ ...items[(k * 3 + r * 5 + 2) % n], kind: "t" });
      }
      return list;
    });
  }, []);

  useLayoutEffect(() => {
    const root = sec.current;
    if (!root) return undefined;
    const pin = root.querySelector(".ts-pin");
    const rowEls = [...root.querySelectorAll(".ts-row")];
    const tracks = rowEls.map((r) => r.querySelector(".ts-track"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // continuous drift: even rows run forwards, odd rows backwards. WAAPI so the speed can be boosted by scrolling.
    const anims = tracks.map((tr, i) => {
      const dur = 52000 + ((i * 37) % 5) * 9000;
      return tr.animate(i % 2 ? [{ transform: "translate3d(-50%,0,0)" }, { transform: "translate3d(0,0,0)" }] : [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(-50%,0,0)" }], { duration: dur, iterations: Infinity, easing: "linear" });
    });
    anims.forEach((a, i) => { a.currentTime = (i * 7919) % 40000; if (reduce) a.pause(); });

    let p = 0, lastP = -1, vel = 0, lastY = window.scrollY, vis = false, raf = 0, boost = 1;
    const lerpRate = (a, b, k) => a + (b - a) * k;
    const apply = () => {
      const s = sstep(0.1, 0.34, p);            // knob travels, turns green
      const r = sstep(0.3, 0.68, p);            // the dark field opens from the switch
      pin.style.setProperty("--s", s.toFixed(4));
      pin.style.setProperty("--r", r.toFixed(4));
      pin.classList.toggle("is-on", s > 0.55);
      const W = window.innerWidth;
      rowEls.forEach((el, i) => {
        const re = sstep(0, 1, clamp((r * 1.7 - i * 0.075) / 0.7));
        el.style.opacity = re.toFixed(3);
        el.style.transform = `translate3d(${((1 - re) * (i % 2 ? 1 : -1) * W * 0.8).toFixed(1)}px,0,0)`;
      });
    };
    const st = ScrollTrigger.create({
      trigger: root, start: "top top", end: "bottom bottom",
      onUpdate: (self) => { p = self.progress; if (Math.abs(p - lastP) > 0.0002) { lastP = p; apply(); } },
      onRefresh: (self) => { p = self.progress; lastP = p; apply(); },
    });
    const inSt = ScrollTrigger.create({ trigger: root, start: "top 75%", end: "bottom top", onToggle: (self) => pin.classList.toggle("is-in", self.isActive) });
    /* card rise: --tc is 1 while the section is still climbing in from the bottom of the screen over the pinned projects, 0 once it fills the screen */
    const riseSt = ScrollTrigger.create({
      trigger: root, start: "top bottom", end: "top top", invalidateOnRefresh: true,
      onUpdate: (self) => root.style.setProperty("--tc", (1 - self.progress).toFixed(3)),
      onRefresh: (self) => root.style.setProperty("--tc", (1 - self.progress).toFixed(3)),
    });

    // speed boost from scroll velocity, only while visible
    const loop = () => {
      raf = 0; if (!vis) return;
      const y = window.scrollY; const dy = Math.abs(y - lastY); lastY = y;
      vel = vel * 0.9 + dy * 0.1;
      const tgt = 1 + Math.min(5, vel / 14);
      boost = lerpRate(boost, tgt, 0.12);
      const held = document.documentElement.dataset.motion === "paused";   // the page-wide "Pause motion" button
      if (!reduce) anims.forEach((a, i) => { a.playbackRate = held ? 0 : boost * (0.8 + (i % 3) * 0.22); });
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      anims.forEach((a) => { if (reduce) return; vis ? a.play() : a.pause(); });
      if (vis && !raf) raf = requestAnimationFrame(loop);
    }, { rootMargin: "100px" });
    io.observe(root);

    // pointer: the rows lean toward the cursor and a soft light follows it
    const fine = window.matchMedia("(pointer: fine)").matches;
    let tx = 0, ty = 0, cxp = 0, cyp = 0, praf = 0;
    const onMove = (e) => {
      const rc = pin.getBoundingClientRect();
      tx = ((e.clientX - rc.left) / rc.width) * 2 - 1; ty = ((e.clientY - rc.top) / rc.height) * 2 - 1;
      pin.style.setProperty("--mx", `${e.clientX - rc.left}px`); pin.style.setProperty("--my", `${e.clientY - rc.top}px`);
      if (!praf) praf = requestAnimationFrame(() => { praf = 0; cxp += (tx - cxp) * 0.5; cyp += (ty - cyp) * 0.5; pin.style.setProperty("--tx", cxp.toFixed(3)); pin.style.setProperty("--ty", cyp.toFixed(3)); });
    };
    if (fine) pin.addEventListener("pointermove", onMove, { passive: true });

    // tap / key on the switch flips it: scroll to the "on" (or "off") position
    const btn = root.querySelector(".ts-sw");
    const onFlip = () => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      const range = root.offsetHeight - window.innerHeight;
      const target = p < 0.45 ? top + range * 0.56 : top + range * 0.04;
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 3) });
      else window.scrollTo({ top: target, behavior: "smooth" });
    };
    btn.addEventListener("click", onFlip);

    const stopBg = mountTechBg(root.querySelector(".ts-bgc"), pin);
    apply();
    return () => { stopBg(); st.kill(); inSt.kill(); riseSt.kill(); io.disconnect(); cancelAnimationFrame(raf); anims.forEach((a) => a.cancel()); btn.removeEventListener("click", onFlip); pin.removeEventListener("pointermove", onMove); };
  }, []);

  const words = "Engineering ideas into intelligent systems.".split(" ");   // line break after "into" (desktop) via CSS order
  return (
    <section ref={sec} className="ts" id="tech-switch" aria-label="Tech stack">
      <div className="ts-pin">
        {/* LIGHT: calm cream screen */}
        <div className="ts-light">
          <canvas className="ts-bgc" aria-hidden="true" />
          <i className="ts-grain" aria-hidden="true" />
          <i className="ts-wash" aria-hidden="true" />
          <h2 className="ts-h" aria-label="Engineering ideas into intelligent systems.">
            {words.map((w, i) => (<span key={i} style={{ display: "contents" }}><span className="ts-wd" aria-hidden="true"><span style={{ "--i": i }}>{w}</span></span>{i === 2 && <br className="ts-br" />}</span>))}
          </h2>
          <p className="ts-sub">I work across AI, software engineering, and systems thinking — turning technical curiosity into things that work beyond a prototype.</p>
        </div>

        {/* DARK: the stack, in slanted rows that run in opposite directions */}
        <div className="ts-dark" aria-hidden="true">
          <div className="ts-lean">
            <div className="ts-slant">
              {rows.map((row, i) => (
                <div className="ts-row" key={i}>
                  <div className="ts-track">
                    {[0, 1].map((d) => (
                      <div className="ts-set" key={d}>
                        {row.map((c, k) => c.kind === "w"
                          ? <span key={k} className={`ts-cell ts-word${c.o ? " is-o" : ""}`} style={{ "--hc": c.fg === "#000000" || c.fg === "#1f2020" || c.fg === "#1f1f1f" || c.fg === "#0b1e3a" ? c.bg : c.fg }}>{c.name.replace(/\n/g, "")}</span>
                          : <span key={k} className="ts-cell ts-tile"><b style={{ background: c.bg, color: c.fg, "--rot": `${((k * 7 + i * 3) % 9) - 4}deg` }}>{mono(c.name)}</b></span>)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <i className="ts-light-follow" />
          <i className="ts-vig" />
          <div className="ts-label"><span>Stack</span><b>{STACK.length} tools</b></div>
        </div>

        {/* the switch */}
        <button type="button" className="ts-sw" role="switch" aria-checked="false" aria-label="Flip the switch to show my tech stack">
          <span className="ts-sw-track"><i className="ts-sw-dots" /></span>
          <span className="ts-sw-knob"><i /></span>
        </button>
      </div>
    </section>
  );
}

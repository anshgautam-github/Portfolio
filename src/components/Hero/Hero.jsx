import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { content } from "../../content.js";
import CardArt from "../Socials/CardArt.jsx";

export default function Hero() {
  const root = useRef(null);
  const pill = useRef(null);
  const pool = useRef([]);
  const { hero } = content;
  const words = hero.statement.split(" ");
  const letters = Array.from(hero.name);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const restPos = () => {
        const r = root.current.getBoundingClientRect();
        return { x: r.width * 0.73, y: r.height * 0.46 };
      };

      // the pill is positioned purely by GSAP (x / y from the section's top-left)
      gsap.set(pill.current, { xPercent: -50, yPercent: -50, ...restPos() });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* ---------- entrance ---------- */
        gsap
          .timeline({
            defaults: { ease: "power4.out", force3D: true },
            // drop leftover transforms so Safari re-rasterizes the text crisp at rest
            onComplete: () => gsap.set([q("[data-word]"), q("[data-letter]"), q("[data-nav]"), q("[data-fade]")], { clearProps: "transform,opacity,visibility" }),
          })
          .from(q("[data-nav]"), { y: -16, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0)
          .from(q("[data-word]"), { yPercent: 110, duration: 1, stagger: 0.035 }, 0.15)
          .from(q("[data-letter]"), { yPercent: 115, duration: 1.1, stagger: 0.045 }, 0.45)
          .from(q("[data-fade]"), { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.7)
          .from(q("[data-tab]"), { xPercent: 100, duration: 0.9 }, 0.9)
          .from(pill.current, { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: "back.out(2)" }, 1);

        /* ---------- cursor: pill follows, images spawn along the path and fade away ---------- */
        const items = pool.current.filter(Boolean);
        gsap.set(items, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

        const px = gsap.quickTo(pill.current, "x", { duration: 0.6, ease: "power3.out" });
        const py = gsap.quickTo(pill.current, "y", { duration: 0.6, ease: "power3.out" });

        let idx = 0;
        let z = 10;
        let last = null;
        let inside = false;
        const spawnDist = () => Math.max(46, Math.min(96, window.innerWidth * 0.045));

        const spawn = (x, y, dx, dy) => {
          const el = items[idx];
          idx = (idx + 1) % items.length;
          z += 1;
          gsap.killTweensOf(el);
          const a = Math.atan2(dy, dx);
          const cx = Math.cos(a);
          const cy = Math.sin(a);
          gsap.set(el, {
            x, y, zIndex: z,
            rotation: gsap.utils.random(-9, 9),
            scale: 0.55, autoAlpha: 0, filter: "blur(10px)",
          });
          gsap
            .timeline()
            .to(el, { scale: 1, autoAlpha: 1, filter: "blur(0px)", x: x + cx * 26, y: y + cy * 26, duration: 0.5, ease: "power3.out" })
            .to(
              el,
              { autoAlpha: 0, scale: 0.9, filter: "blur(14px)", x: `+=${cx * 44}`, y: `+=${cy * 44}`, duration: 1.1, ease: "power2.inOut" },
              "+=0.18"
            );
        };

        const onMove = (e) => {
          inside = true;
          const r = root.current.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          px(x);
          py(y);
          if (!last) {
            last = { x, y };
            return;
          }
          const dx = x - last.x;
          const dy = y - last.y;
          if (Math.hypot(dx, dy) >= spawnDist()) {
            spawn(x, y, dx, dy);
            last = { x, y };
          }
        };
        const onLeave = () => {
          inside = false;
          last = null;
          const p = restPos();
          px(p.x);
          py(p.y);
        };
        const onResize = () => {
          if (inside) return;
          gsap.set(pill.current, restPos());
        };

        const el = root.current;
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        window.addEventListener("resize", onResize);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
          window.removeEventListener("resize", onResize);
        };
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative h-screen min-h-[600px] w-full overflow-hidden bg-white text-black"
      style={{ cursor: "default" }}
    >
      {/* ---------------- top bar ---------------- */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-5 md:px-7 md:pt-[1.55vw]">
        <a data-nav href="#" className="font-display text-[1.25rem] font-medium tracking-[-0.06em] md:text-[1.45rem]">
          {hero.name}
        </a>
        <nav className="absolute left-1/2 flex -translate-x-1/2 gap-3 text-[0.95rem] md:gap-3.5 md:text-[1.1rem]">
          {hero.nav.map((n) => (
            <a data-nav key={n} href="#" className="font-display tracking-[-0.01em] transition-opacity duration-300 hover:opacity-50">
              {n}
            </a>
          ))}
        </nav>
        <a data-nav href="#" className="font-display text-[0.95rem] tracking-[-0.01em] transition-opacity duration-300 hover:opacity-50 md:text-[1.1rem]">
          {hero.inquire}
        </a>
      </header>

      {/* ---------------- image trail (above the type, below nav + pill) ---------------- */}
      <div className="pointer-events-none absolute inset-0 z-[25] overflow-hidden" aria-hidden="true">
        {hero.trail.map((t, i) => (
          <div
            key={i}
            ref={(el) => (pool.current[i] = el)}
            className="absolute left-0 top-0 overflow-hidden rounded-[6px] will-change-transform"
            style={{
              width: `clamp(84px, ${t.w}vw, 240px)`,
              aspectRatio: String(t.ratio),
              boxShadow: "0 18px 40px -22px rgba(0,0,0,0.45)",
              visibility: "hidden",
            }}
          >
            {t.image ? (
              <img src={t.image} alt="" className="h-full w-full object-cover" draggable="false" />
            ) : (
              <CardArt pattern={t.pattern} palette={t.palette} />
            )}
          </div>
        ))}
      </div>

      {/* ---------------- statement ---------------- */}
      <h1 className="pointer-events-none absolute left-5 top-[24vw] z-20 w-[90vw] indent-[34%] font-display text-[9.2vw] font-normal leading-[1.16] tracking-[-0.03em] md:left-7 md:top-[5.7vw] md:w-[75.5vw] md:indent-[49.8%] md:text-[3.6vw]">
        {words.map((w, i) => (
          <span key={i} style={{ textIndent: 0 }}>
            <span className="inline-block overflow-hidden align-top indent-0" style={{ paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
              <span data-word className="inline-block indent-0" style={{ textIndent: 0 }}>
                {w}
              </span>
            </span>{" "}
          </span>
        ))}
      </h1>

      {/* ---------------- bottom-left taglines ---------------- */}
      <div className="absolute bottom-[26vw] left-5 z-20 flex gap-[5vw] text-[clamp(0.85rem,3.3vw,1rem)] leading-[1.25] md:bottom-7 md:left-7 md:gap-[1.5vw] md:text-[clamp(0.9rem,1.02vw,1.4rem)]">
        {hero.taglines.map((col, i) => (
          <p key={i} data-fade className="font-display tracking-[-0.01em]">
            {col.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
        ))}
      </div>

      {/* ---------------- giant wordmark ---------------- */}
      <div className="pointer-events-none absolute bottom-3 right-5 z-20 md:bottom-[1.6vw] md:right-7">
        <h2
          aria-label={hero.name}
          className="relative font-display text-[17.5vw] font-bold leading-[0.78] tracking-[-0.06em] md:text-[8.8vw]"
        >
          {letters.map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="inline-block overflow-hidden align-bottom"
              style={{ paddingBottom: "0.22em", marginBottom: "-0.22em" }}
            >
              <span data-letter className="inline-block">
                {ch === " " ? " " : ch}
              </span>
            </span>
          ))}
          <sup className="absolute -right-[0.5em] top-[0.1em] text-[0.14em] font-normal tracking-normal">™</sup>
        </h2>
      </div>

      {/* ---------------- side tab ---------------- */}
      <div
        data-tab
        className="absolute right-0 top-[40%] z-40 flex h-[clamp(130px,11.7vw,240px)] w-[clamp(40px,3.6vw,72px)] flex-col items-center justify-between bg-black py-[clamp(10px,1.2vw,22px)] text-white"
      >
        <span className="h-[0.9vw] min-h-[9px] w-[0.9vw] min-w-[9px] rounded-full bg-white" />
        <span
          className="font-display text-[clamp(0.7rem,0.8vw,1rem)] font-bold tracking-[0.04em]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {hero.badge}
        </span>
      </div>

      {/* ---------------- cursor pill ---------------- */}
      <div
        ref={pill}
        className="pointer-events-none absolute left-0 top-0 z-50 flex items-center gap-[0.7vw] whitespace-nowrap rounded-full bg-black px-[0.75vw] py-[0.95vw] text-white max-md:gap-2 max-md:px-3 max-md:py-3"
      >
        <span className="font-display text-[clamp(1rem,1.5vw,1.8rem)] font-medium leading-none tracking-[-0.08em]">jc</span>
        <span className="font-display text-[clamp(0.75rem,1.05vw,1.3rem)] leading-none">{hero.pill}</span>
      </div>
    </section>
  );
}

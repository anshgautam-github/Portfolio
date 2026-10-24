import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { NOTCH_D, NOTCH_H } from "./shapes.js";
import Topo from "./Topo.jsx";
import Signature from "./Signature.jsx";
import Figure from "./Figure.jsx";
import Marquee from "./Marquee.jsx";
import RollLink from "./RollLink.jsx";
import { ArrowIcon, BagIcon, MenuIcon } from "./icons.jsx";

gsap.registerPlugin(ScrollTrigger);

// Mobile layout is designed on a 390px-wide grid and scales with the viewport (capped for tablets).
const m = (n) => `calc(var(--m) * ${n})`;
const abs = (o) => ({ position: "absolute", ...o });

export default function ContactMobile() {
  const root = useRef(null);
  const marquee = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: root.current, start: "top 80%", once: true },
      });
      tl.from(q("[data-header]"), { y: -20, autoAlpha: 0, duration: 0.7 }, 0)
        .from(q("[data-panel]"), { yPercent: 4, autoAlpha: 0, duration: 1, ease: "power4.out" }, 0)
        .from(q("[data-line]"), { yPercent: 118, duration: 0.9, stagger: 0.12 }, 0.3)
        .fromTo(
          q("[data-sig]"),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.7, stagger: 0.25, ease: "power2.inOut" },
          0.8
        )
        .from(q("[data-figure]"), { yPercent: 12, autoAlpha: 0, duration: 1.1, ease: "power4.out" }, 0.4)
        .from(q("[data-fade]"), { y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.06 }, 0.8)
        .from(q("[data-cta]"), { scale: 0.75, autoAlpha: 0, duration: 0.7, ease: "back.out(1.8)" }, 1);

      const loop = gsap.to(marquee.current, { xPercent: -50, duration: 28, ease: "none", repeat: -1, paused: true });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => loop.play(),
        onLeave: () => loop.pause(),
        onEnterBack: () => loop.play(),
        onLeaveBack: () => loop.pause(),
      });
      return () => loop.kill();
    });
    return () => mm.revert();
  }, []);

  const { headline, pages, socials, store, cta } = content;
  const notchW = 200;
  const notchH = (NOTCH_H / 460) * notchW;

  return (
    <section
      ref={root}
      className="relative w-full overflow-hidden"
      style={{
        "--m": "min(calc(100vw / 390), 1.5px)",
        background:
          "linear-gradient(180deg,#f6f8fc 0%,#e3eefb 8%,#cfe2f8 16%,#b9d3f5 30%,#a3c4f3 100%)",
        paddingTop: m(92),
        paddingInline: m(10),
        paddingBottom: m(4),
      }}
    >
      {/* ---------------- top bar ---------------- */}
      <header
        data-header
        className="z-40 flex items-start justify-between"
        style={abs({ left: m(14), right: m(14), top: m(14) })}
      >
        <a href="#" className="select-none text-white/80">
          <span className="block font-serif" style={{ fontSize: m(30), lineHeight: m(24) }}>
            {content.name.first}
          </span>
          <span className="block font-display font-bold" style={{ fontSize: m(26), lineHeight: m(24) }}>
            {content.name.last}
          </span>
        </a>
        <div className="flex" style={{ gap: m(8) }}>
          <a
            href={store.href}
            className="flex items-center justify-center bg-[#5b8ef5] font-cond font-bold uppercase text-[#0b1630]"
            style={{ height: m(44), padding: `0 ${m(14)}`, borderRadius: m(10), gap: m(7), fontSize: m(17) }}
          >
            <BagIcon style={{ width: m(16), height: m(16) }} />
            {store.label}
          </a>
          <button
            type="button"
            aria-label="Menu"
            className="flex items-center justify-center border border-white/70 bg-white/60 text-[#0b1630] backdrop-blur"
            style={{ width: m(44), height: m(44), borderRadius: m(10) }}
          >
            <MenuIcon style={{ width: m(20), height: m(20) }} />
          </button>
        </div>
      </header>

      {/* ---------------- dark panel ---------------- */}
      <div data-panel className="relative">
        <div
          className="relative overflow-hidden bg-[#0b1630]"
          style={{ borderRadius: m(24), paddingTop: m(70), paddingBottom: m(58) }}
        >
          <div className="absolute" style={{ inset: m(-20) }} aria-hidden="true">
            <Topo className="h-full w-full" />
          </div>

          {/* headline + signature */}
          <h2 className="relative z-10 flex justify-center text-center">
            <span className="relative inline-block" style={{ fontSize: m(40) }}>
              <Signature
                className="pointer-events-none absolute"
                style={{ left: "35%", top: "-1.32em", width: "2.4em", height: "1.38em" }}
              />
              {[headline.line1, headline.line2].map((l, i) => (
                <span key={i} className="line-mask block">
                  <span data-line className="block whitespace-nowrap" style={{ lineHeight: "0.9" }}>
                    <span className="font-display font-bold uppercase tracking-[-0.025em] text-[#f4f4ee]">
                      {l.sans}
                    </span>{" "}
                    <span className="font-serif uppercase tracking-[-0.01em] text-[#8db4ff]">{l.serif}</span>
                  </span>
                </span>
              ))}
            </span>
          </h2>

          {/* figure (fades into the panel at the bottom) */}
          <div
            className="pointer-events-none relative z-20"
            style={{
              height: m(268),
              marginTop: m(-14),
              WebkitMaskImage: "linear-gradient(#000 72%, transparent 100%)",
              maskImage: "linear-gradient(#000 72%, transparent 100%)",
            }}
          >
            <div data-figure className="absolute inset-0">
              <Figure
                style={abs({ left: "50%", marginLeft: m(-152), top: 0, width: m(316), height: m(262) })}
              />
            </div>
          </div>

          {/* link columns */}
          <div
            className="relative z-30 grid grid-cols-2 text-center"
            style={{ marginTop: m(-6), paddingInline: m(14), columnGap: m(10) }}
          >
            {[
              { label: "Pages", items: pages, store: true },
              { label: "Follow on", items: socials, store: false },
            ].map((col) => (
              <nav key={col.label} aria-label={col.label}>
                <p
                  data-fade
                  className="font-medium uppercase tracking-[0.18em] text-white/60"
                  style={{ fontSize: m(12), lineHeight: m(16), marginBottom: m(12) }}
                >
                  {col.label}
                </p>
                <ul>
                  {col.items.map((it) => (
                    <li key={it.label} data-fade>
                      <RollLink href={it.href} className="font-cond font-bold uppercase text-white">
                        <span style={{ display: "block", fontSize: m(30), lineHeight: m(33) }}>{it.label}</span>
                      </RollLink>
                    </li>
                  ))}
                </ul>
                {col.store && (
                  <div data-fade style={{ marginTop: m(14) }}>
                    <RollLink href={store.href} hover="text-white" className="font-cond font-bold uppercase text-[#9dbcff]">
                      <span style={{ display: "block", fontSize: m(21), lineHeight: m(24) }}>{store.label}</span>
                    </RollLink>
                  </div>
                )}
              </nav>
            ))}
          </div>

          {/* partner marquee */}
          <div
            className="relative z-10 flex items-center overflow-hidden"
            style={{ marginTop: m(34), height: m(44) }}
          >
            <Marquee ref={marquee} scale={0.5} margin={34} />
          </div>
        </div>

        {/* top hump */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 460 ${NOTCH_H + 2}`}
          preserveAspectRatio="none"
          fill="#0b1630"
          style={abs({
            left: "50%",
            marginLeft: m(-notchW / 2),
            top: m(-notchH),
            width: m(notchW),
            height: m(notchH + (2 / 460) * notchW),
          })}
        >
          <path d={NOTCH_D} />
        </svg>

        {/* bottom bridge */}
        <svg
          aria-hidden="true"
          viewBox="0 0 240 19"
          preserveAspectRatio="none"
          fill="#0b1630"
          style={abs({ left: "50%", marginLeft: m(-120), top: "calc(100% - 1px)", width: m(240), height: m(19) })}
        >
          <path d="M0 0 C14 0 20 3 24 8 C27 14 30 19 42 19 H198 C210 19 213 14 216 8 C220 3 226 0 240 0 Z" />
        </svg>

        {/* CTA straddling the panel's bottom edge */}
        <div className="z-30 flex justify-center" style={abs({ left: 0, right: 0, bottom: m(-24) })}>
          <div data-cta>
            <a
              href={cta.href}
              className="flex items-center justify-center bg-[#5b8ef5] font-cond font-bold uppercase leading-none text-[#0b1630] active:bg-white"
              style={{
                height: m(50),
                padding: `0 ${m(22)}`,
                borderRadius: m(10),
                gap: m(10),
                fontSize: m(20),
              }}
            >
              {cta.label}
              <ArrowIcon style={{ width: m(16), height: m(16) }} />
            </a>
          </div>
        </div>
      </div>

      {/* ---------------- footer bar ---------------- */}
      <div
        className="flex items-center justify-between text-[#0b1630]"
        style={{ paddingTop: m(38), paddingBottom: m(16), paddingInline: m(4) }}
      >
        <p data-fade className="font-medium" style={{ fontSize: m(11.5), lineHeight: m(16) }}>
          © 2026 <strong className="font-bold">{content.copyright.holder}.</strong>
          <br />
          {content.copyright.text}
        </p>
        <ul data-fade className="flex items-center" style={{ gap: m(14) }}>
          {content.legal.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="font-cond font-bold uppercase" style={{ fontSize: m(16) }}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { splitChars } from "../../lib/fx.js";
import Topo from "./Topo.jsx";
import Signature from "./Signature.jsx";
import Figure from "./Figure.jsx";
import Marquee from "./Marquee.jsx";
import RollLink from "./RollLink.jsx";
import ContactMobile from "./ContactMobile.jsx";
import { ArrowIcon, BagIcon, MenuIcon } from "./icons.jsx";

gsap.registerPlugin(ScrollTrigger);

// Everything is laid out on a 2000px-wide design grid and scales with the viewport width.
const u = (n) => `calc(var(--u) * ${n})`;
const linkText = "font-cond font-bold uppercase text-white";
const linkStyle = { fontSize: u(40), lineHeight: u(39.3) };

function ContactDesktop() {
  const root = useRef(null);
  const marquee = useRef(null);
  const marqueeWrap = useRef(null);
  const cta = useRef(null);
  const figureParallax = useRef(null);
  const topoParallax = useRef(null);
  const ring = useRef(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);

      /* ---------- entrance (plays when the section scrolls into view, reverses when you leave upward) ---------- */
      const heads = q("[data-line]").map((el) => splitChars(el));
      const chars = heads.flatMap((h) => h.chars);
      const pulse = gsap.fromTo(ring.current, { scale: 1, autoAlpha: 0.75 }, { scale: 1.45, autoAlpha: 0, duration: 1.7, ease: "power2.out", repeat: -1, paused: true });

      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: root.current, start: "top 72%", toggleActions: "play none none reverse" },
      });
      tl.from(q("[data-header]"), { y: -30, autoAlpha: 0, duration: 0.8 }, 0)
        .from(q("[data-panel]"), { yPercent: 8, scale: 0.94, transformOrigin: "50% 100%", autoAlpha: 0, duration: 1.25, ease: "power4.out" }, 0)
        .from(chars, { yPercent: 125, rotation: 8, transformOrigin: "0% 100%", duration: 1, stagger: { each: 0.02 } }, 0.35)
        .fromTo(
          q("[data-sig]"),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 0.75, stagger: 0.28, ease: "power2.inOut" },
          1.0
        )
        .from(q("[data-figure]"), { yPercent: 18, autoAlpha: 0, duration: 1.3, ease: "power4.out" }, 0.5)
        .from(q("[data-fade]"), { y: 28, autoAlpha: 0, filter: "blur(8px)", duration: 0.9, stagger: 0.08, clearProps: "filter" }, 0.95)
        .from(q("[data-cta]"), { scale: 0.6, autoAlpha: 0, duration: 0.9, ease: "back.out(2)" }, 1.25)
        .add(() => pulse.play(), 2.1);
      tl.eventCallback("onReverseComplete", () => pulse.pause(0));

      // figure drifts upward as the section scrolls past
      gsap.fromTo(
        q("[data-figure]"),
        { y: () => 70 },
        { y: () => -45, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.7 } }
      );

      /* ---------- infinite partner marquee ---------- */
      const loop = gsap.to(marquee.current, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
      const wrap = marqueeWrap.current;
      const slow = () => ((hovering = true), gsap.to(loop, { timeScale: 0.2, duration: 0.6, overwrite: true }));
      const fast = () => ((hovering = false), gsap.to(loop, { timeScale: 1, duration: 0.6, overwrite: true }));
      // the marquee speeds up with scroll velocity, then eases back
      let hovering = false;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          if (hovering) return;
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 220, 9);
          gsap.to(loop, { timeScale: boost, duration: 0.25, overwrite: true });
          gsap.to(loop, { timeScale: 1, duration: 1.1, delay: 0.2, ease: "power2.out" });
        },
      });
      wrap.addEventListener("mouseenter", slow);
      wrap.addEventListener("mouseleave", fast);

      /* ---------- pointer parallax (figure + contour lines) ---------- */
      const fx = gsap.quickTo(figureParallax.current, "x", { duration: 0.9, ease: "power3.out" });
      const fy = gsap.quickTo(figureParallax.current, "y", { duration: 0.9, ease: "power3.out" });
      const tx = gsap.quickTo(topoParallax.current, "x", { duration: 1.2, ease: "power3.out" });
      const ty = gsap.quickTo(topoParallax.current, "y", { duration: 1.2, ease: "power3.out" });
      const onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        fx(nx * -18);
        fy(ny * -10);
        tx(nx * 26);
        ty(ny * 16);
      };
      root.current.addEventListener("mousemove", onMove);

      /* ---------- magnetic CTA ---------- */
      const btn = cta.current;
      const bx = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
      const by = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });
      const onBtnMove = (e) => {
        const r = btn.getBoundingClientRect();
        bx((e.clientX - (r.left + r.width / 2)) * 0.28);
        by((e.clientY - (r.top + r.height / 2)) * 0.4);
      };
      const onBtnLeave = () => {
        bx(0);
        by(0);
      };
      btn.addEventListener("mousemove", onBtnMove);
      btn.addEventListener("mouseleave", onBtnLeave);

      return () => {
        heads.forEach((h) => h.revert());
        wrap.removeEventListener("mouseenter", slow);
        wrap.removeEventListener("mouseleave", fast);
        root.current?.removeEventListener("mousemove", onMove);
        btn.removeEventListener("mousemove", onBtnMove);
        btn.removeEventListener("mouseleave", onBtnLeave);
      };
    });

    return () => mm.revert();
  }, []);

  const { headline, pages, socials, store, cta: ctaContent } = content;
  const abs = (o) => ({ position: "absolute", ...o });

  return (
    <section
      ref={root}
      className="relative w-full overflow-hidden"
      style={{
        "--u": "calc(100vw / 2000)",
        height: u(1185),
        background:
          "linear-gradient(180deg,#f6f8fc 0%,#e3eefb 8%,#cfe2f8 14%,#b9d3f5 25%,#a3c4f3 100%)",
      }}
    >
      {/* ---------------- top bar ---------------- */}
      <header data-header className="z-40" style={abs({ left: u(24), right: u(24), top: u(22) })}>
        <a href="#" className="select-none text-white/80" style={abs({ left: 0, top: 0, lineHeight: u(36) })}>
          <span className="block font-serif" style={{ fontSize: u(46), lineHeight: u(36) }}>
            {content.name.first}
          </span>
          <span className="block font-display font-bold" style={{ fontSize: u(40), lineHeight: u(36) }}>
            {content.name.last}
          </span>
        </a>

        <a
          href={store.href}
          className="flex items-center justify-center bg-[#5b8ef5] font-cond font-bold uppercase text-[#0b1630] transition-transform duration-300 hover:scale-[1.04]"
          style={abs({
            right: u(81),
            top: u(1),
            width: u(137),
            height: u(69),
            borderRadius: u(14),
            gap: u(10),
            fontSize: u(23),
          })}
        >
          <BagIcon style={{ width: u(22), height: u(22) }} />
          {store.label}
        </a>
        <button
          type="button"
          aria-label="Menu"
          className="flex items-center justify-center border border-white/70 bg-white/60 text-[#0b1630] backdrop-blur transition-colors duration-300 hover:bg-white"
          style={abs({ right: 0, top: u(1), width: u(69), height: u(69), borderRadius: u(14) })}
        >
          <MenuIcon style={{ width: u(26), height: u(26) }} />
        </button>
      </header>

      {/* ---------------- dark panel (x24..1976, y175..1125) ---------------- */}
      <div data-panel className="z-0" style={abs({ left: u(24), right: u(24), top: u(175), height: u(950) })}>
        <div className="absolute inset-0 overflow-hidden bg-[#0b1630]" style={{ borderRadius: u(32) }}>
          <div ref={topoParallax} className="absolute" style={{ inset: u(-40) }}>
            <Topo className="h-full w-full" />
          </div>
          <div
            ref={marqueeWrap}
            className="flex items-center overflow-hidden"
            style={abs({ left: 0, right: 0, top: u(865), height: u(56) })}
          >
            <Marquee ref={marquee} />
          </div>
        </div>

        {/* top notch: x770..1230, y125..175 */}
        <svg
          aria-hidden="true"
          viewBox="0 0 460 50.91"
          preserveAspectRatio="none"
          fill="#0b1630"
          style={abs({ left: "50%", marginLeft: u(-230), top: u(-48.91), width: u(460), height: u(50.91) })}
        >
          <path d="M0 48.89 L3.31 48.59 L6.62 48.35 L9.93 48.01 L13.24 47.55 L16.55 46.96 L19.86 46.26 L23.17 45.45 L26.47 44.59 L29.78 43.51 L33.09 42.38 L36.4 41.12 L39.71 39.72 L43.02 38.2 L46.33 36.5 L49.64 34.66 L52.95 32.69 L56.26 30.54 L59.57 28.18 L62.88 25.65 L66.19 22.92 L69.5 19.92 L72.81 17.11 L76.12 14.41 L79.42 12.12 L82.73 10.04 L86.04 8.16 L89.35 6.59 L92.66 5.14 L95.97 3.94 L99.28 2.87 L102.59 2.0 L105.9 1.25 L109.21 0.71 L112.52 0.23 L115.83 0.03 L119.14 0.0 L122.45 0.0 L125.76 0.0 L129.06 0.0 L132.37 0.0 L135.68 0.0 L138.99 0.0 L142.3 0.0 L145.61 0.0 L148.92 0.01 L152.23 0.0 L155.54 0.0 L158.85 0.0 L162.16 0.0 L165.47 0.0 L168.78 0.0 L172.09 0.0 L175.4 0.0 L178.71 0.0 L182.01 0.0 L185.32 0.0 L188.63 0.0 L191.94 0.0 L195.25 0.0 L198.56 0.0 L201.87 0.0 L205.18 0.0 L208.49 0.0 L211.8 0.0 L215.11 0.0 L218.42 0.0 L221.73 0.0 L225.04 0.01 L228.35 0.0 L231.65 0.0 L234.96 0.0 L238.27 0.0 L241.58 0.0 L244.89 0.0 L248.2 0.0 L251.51 0.0 L254.82 0.0 L258.13 0.0 L261.44 0.0 L264.75 0.0 L268.06 0.0 L271.37 0.0 L274.68 0.0 L277.99 0.0 L281.29 0.01 L284.6 0.0 L287.91 0.0 L291.22 0.0 L294.53 0.0 L297.84 0.0 L301.15 0.0 L304.46 0.0 L307.77 0.0 L311.08 0.0 L314.39 0.0 L317.7 0.0 L321.01 0.0 L324.32 0.0 L327.63 0.0 L330.94 0.01 L334.24 0.06 L337.55 0.41 L340.86 0.78 L344.17 1.34 L347.48 2.05 L350.79 2.83 L354.1 3.78 L357.41 4.87 L360.72 6.13 L364.03 7.5 L367.34 9.13 L370.65 10.81 L373.96 12.82 L377.27 14.9 L380.58 17.32 L383.88 19.83 L387.19 22.43 L390.5 24.89 L393.81 27.23 L397.12 29.4 L400.43 31.4 L403.74 33.26 L407.05 35.03 L410.36 36.63 L413.67 38.18 L416.98 39.58 L420.29 40.85 L423.6 42.04 L426.91 43.14 L430.22 44.09 L433.53 44.98 L436.83 45.8 L440.14 46.47 L443.45 47.06 L446.76 47.62 L450.07 48.02 L453.38 48.34 L456.69 48.53 L460 48.86 L460 50.91 L0 50.91 Z" />
        </svg>

        {/* bottom bridge: x295..1705, y1125..1160 */}
        <svg
          aria-hidden="true"
          viewBox="0 -1 1410 37"
          preserveAspectRatio="none"
          fill="#0b1630"
          style={abs({ left: "50%", marginLeft: u(-705), top: u(949), width: u(1410), height: u(37) })}
        >
          <path d="M0 -1 V0 C30 0 42 6 48 16 C54 28 58 36 75 36 H1335 C1352 36 1356 28 1362 16 C1368 6 1380 0 1410 0 V-1 Z" />
        </svg>
      </div>

      {/* ---------------- headline (line centres y395 / y483) ---------------- */}
      <h2 className="pointer-events-none z-10 text-center" style={abs({ left: 0, right: 0, top: u(351) })}>
        {[headline.line1, headline.line2].map((l, i) => (
          <span key={i} className="line-mask flex justify-center" style={{ height: u(88) }}>
            <span
              data-line
              className="block whitespace-nowrap"
              style={{ fontSize: u(98), lineHeight: u(88) }}
            >
              <span className="font-display font-bold uppercase tracking-[-0.025em] text-[#f4f4ee]">
                {l.sans}
              </span>{" "}
              <span className="font-serif uppercase tracking-[-0.01em] text-[#8db4ff]">{l.serif}</span>
            </span>
          </span>
        ))}
      </h2>

      {/* signature: x880..1115, y225..360 */}
      <Signature
        className="pointer-events-none z-[15]"
        style={abs({ left: u(880), top: u(225), width: u(235), height: u(135) })}
      />

      {/* ---------------- figure: helmet x810..1195, top y497, clipped at y1160 ---------------- */}
      <div
        className="pointer-events-none z-20 overflow-hidden"
        style={abs({ left: 0, right: 0, top: u(470), height: u(690) })}
      >
        <div ref={figureParallax} className="absolute inset-0">
          <div data-figure className="absolute inset-0">
            <Figure
              style={abs({ left: u(612), top: u(21), width: u(810), height: u(674) })}
            />
          </div>
        </div>
      </div>

      {/* ---------------- link columns (centres x340 / x1650) ---------------- */}
      {[
        { x: 340, label: "Pages", items: pages, withStore: true, name: "Pages" },
        { x: 1650, label: "Follow on", items: socials, withStore: false, name: "Social" },
      ].map((col) => (
        <nav key={col.name} aria-label={col.name} className="z-30">
          <p
            data-fade
            className="text-center font-medium uppercase tracking-[0.06em] text-white/55"
            style={abs({
              left: u(col.x - 150),
              width: u(300),
              top: u(658),
              fontSize: u(12),
              lineHeight: u(14),
            })}
          >
            {col.label}
          </p>
          <ul
            className="text-center"
            style={abs({ left: u(col.x - 150), width: u(300), top: u(688.4) })}
          >
            {col.items.map((it) => (
              <li key={it.label} data-fade>
                <RollLink href={it.href} className={linkText}>
                  <span style={linkStyle}>{it.label}</span>
                </RollLink>
              </li>
            ))}
          </ul>
          {col.withStore && (
            <div
              data-fade
              className="text-center"
              style={abs({ left: u(col.x - 150), width: u(300), top: u(877) })}
            >
              <RollLink
                href={store.href}
                hover="text-white"
                className="font-cond font-bold uppercase text-[#9dbcff]"
              >
                <span style={{ fontSize: u(26), lineHeight: u(28), display: "block" }}>{store.label}</span>
              </RollLink>
            </div>
          )}
        </nav>
      ))}

      {/* ---------------- CTA: x881..1118, y1074..1129 ---------------- */}
      <div
        className="z-30"
        style={abs({ left: u(881), top: u(1074), width: u(237), height: u(55) })}
      >
        <span ref={ring} aria-hidden="true" className="pointer-events-none absolute inset-0 border-2 border-[#9dbcff] opacity-0" style={{ borderRadius: u(10) }} />
        <div ref={cta} data-cta className="h-full w-full">
          <a
            href={ctaContent.href}
            className="group flex h-full w-full items-center justify-center overflow-hidden bg-[#5b8ef5] font-cond font-bold uppercase leading-none text-[#0b1630] transition-colors duration-300 hover:bg-white"
            style={{ borderRadius: u(10), gap: u(12), fontSize: u(22) }}
          >
            {ctaContent.label}
            <ArrowIcon
              className="transition-transform duration-500 group-hover:rotate-[360deg]"
              style={{ width: u(17), height: u(17) }}
            />
          </a>
        </div>
      </div>

      {/* ---------------- footer bar (centre y1152) ---------------- */}
      <p
        data-fade
        className="z-30 font-medium text-[#0b1630]"
        style={abs({ left: u(24), top: u(1140), fontSize: u(15), lineHeight: u(24) })}
      >
        © 2026 <strong className="font-bold">{content.copyright.holder}.</strong> {content.copyright.text}
      </p>
      <ul
        data-fade
        className="z-30 flex items-center text-[#0b1630]"
        style={abs({ right: u(24), top: u(1140), height: u(24), gap: u(23) })}
      >
        {content.legal.map((l) => (
          <li key={l.label}>
            <RollLink
              href={l.href}
              hover="text-white"
              className="font-cond font-bold uppercase"
            >
              <span style={{ fontSize: u(22), lineHeight: u(24), display: "block" }}>{l.label}</span>
            </RollLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function useIsMobile(query = "(max-width: 767px)") {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

export default function Contact() {
  const mobile = useIsMobile();
  return mobile ? <ContactMobile /> : <ContactDesktop />;
}

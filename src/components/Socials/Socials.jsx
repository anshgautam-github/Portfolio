import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { content } from "../../content.js";
import { splitChars } from "../../lib/fx.js";
import { IS_MOBILE } from "../../lib/perf.js";
import CardArt from "./CardArt.jsx";

gsap.registerPlugin(ScrollTrigger);

// 2000px-wide design grid; --u is set per breakpoint in index.css (.socials-root)
const u = (n) => `calc(var(--u) * ${n})`;
const CARD_W = 400;
const CARD_H = 700;

const SHADOW = "0 30px 50px -28px rgba(20,20,10,0.35)";
const SHADOW_HOVER = "0 60px 80px -30px rgba(20,20,10,0.55)";

function CameraIcon() {
  return (
    <svg viewBox="0 0 62 36" fill="none" stroke="#9b9b95" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: u(62), height: u(36) }}>
      <rect x="1.5" y="3.5" width="59" height="30" rx="7" />
      <circle cx="31" cy="20" r="9" />
      <circle cx="31" cy="20" r="3.2" />
      <circle cx="11" cy="12" r="2.4" />
      <path d="M44 9v22M48 9v22M52 9v22M56 9v22" />
      <path d="M17 3.5V1.5h8v2" />
    </svg>
  );
}

export default function Socials() {
  const root = useRef(null);
  const probe = useRef(null);
  const { title, cards } = content.socialsSection;

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root);
      const uPx = () => probe.current.getBoundingClientRect().width / 1000;
      const els = q("[data-card]");

      // outer = scroll-driven pose (position / fan rotation). inner = hover pose. Kept separate so they never fight.
      const inners = els.map((el) => el.querySelector("[data-inner]"));
      gsap.set(inners, { transformPerspective: 1000, boxShadow: SHADOW });
      gsap.set(q("[data-chip]"), { yPercent: 130, autoAlpha: 0 });

      /* ---------- heading + camera: char-by-char reveal, replays every time you scroll back in ---------- */
      const heads = q("[data-line]").map((el) => splitChars(el));
      const chars = heads.flatMap((h) => h.chars);
      gsap
        .timeline({
          defaults: { ease: "power4.out" },
          scrollTrigger: { trigger: root.current, start: "top 78%", toggleActions: "play none none reverse" },
        })
        .from(q("[data-camera]"), { scale: 0, rotation: -35, autoAlpha: 0, duration: 0.9, ease: "back.out(2.2)" }, 0)
        .from(chars, { yPercent: 125, rotation: 9, transformOrigin: "0% 100%", duration: 1.05, stagger: { each: 0.028, from: "start" } }, 0.15);

      // title drifts gently against the scroll
      gsap.fromTo(q("h2"), { y: () => 40 * uPx() }, { y: () => -30 * uPx(), ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true } });

      /* ---------- deck -> fan: plays by itself once the section scrolls into view ---------- */
      let ready = false;
      const spread = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        delay: 0.2,
        onComplete: () => {
          ready = true;
        },
        onUpdate: () => {
          ready = spread.progress() >= 1;
        },
        scrollTrigger: {
          trigger: root.current,
          start: "top 62%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      });
      els.forEach((el, i) => {
        const c = cards[i];
        const dist = Math.abs(i - 3);
        spread.fromTo(
          el,
          {
            // stacked: every card sits on the centre slot, peeking out below the one in front
            x: () => -(c.x - 1000) * uPx(),
            y: () => (588 - c.y) * uPx() + dist * 30 * uPx(),
            rotation: 0,
            scale: 1 - dist * 0.045,
            autoAlpha: 0,
            ...(IS_MOBILE ? {} : { filter: "blur(14px)" }),
          },
          { x: 0, y: 0, rotation: c.rot, scale: 1, autoAlpha: 1, ...(IS_MOBILE ? {} : { filter: "blur(0px)", clearProps: "filter" }), duration: 1.35, immediateRender: true },
          dist * 0.09
        );
      });

      /* ---------- hover interactions ----------
         Hit-testing is done on the RESTING fan geometry (not on the DOM), so lifting a card / changing its
         z-index can never steal the pointer from the card you are actually pointing at. */
      const parts = els.map((el, i) => ({
        el,
        inner: inners[i],
        art: el.querySelector("[data-art]"),
        chip: el.querySelector("[data-chip]"),
        glare: el.querySelector("[data-glare]"),
        shade: el.querySelector("[data-shade]"),
        base: cards[i],
        rx: gsap.quickTo(inners[i], "rotationX", { duration: 0.5, ease: "power3.out" }),
        ry: gsap.quickTo(inners[i], "rotationY", { duration: 0.5, ease: "power3.out" }),
      }));
      let hovered = -1;
      let zTop = 60;

      const push = (j, i) => {
        const dir = Math.sign(j - i) || 0;
        const dist = Math.abs(j - i);
        return { x: dir * (46 / (0.8 + dist * 0.55)) * uPx(), scale: 0.965, opacity: 0.9 };
      };

      const enter = (i) => {
        const p = parts[i];
        zTop += 1;
        gsap.set(p.el, { zIndex: zTop });
        gsap.to(p.inner, { y: -34 * uPx(), scale: 1.07, rotation: -p.base.rot * 0.75, boxShadow: SHADOW_HOVER, duration: 0.7, ease: "power3.out", overwrite: "auto" });
        gsap.to(p.art, { scale: 1.14, duration: 1.1, ease: "power2.out", overwrite: true });
        gsap.to(p.chip, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out", overwrite: true });
        gsap.to(p.glare, { autoAlpha: 1, duration: 0.5, overwrite: true });
        gsap.to(p.shade, { opacity: 1, duration: 0.5, overwrite: true });
        parts.forEach((o, j) => {
          if (j === i) return;
          gsap.to(o.inner, { ...push(j, i), duration: 0.7, ease: "power3.out", overwrite: "auto" });
        });
      };

      const leave = (i) => {
        const p = parts[i];
        gsap.to(p.inner, {
          y: 0, x: 0, scale: 1, rotation: 0, rotationX: 0, rotationY: 0, opacity: 1,
          boxShadow: SHADOW, duration: 0.8, ease: "power3.out", overwrite: "auto",
          onComplete: () => {
            if (hovered !== i) gsap.set(p.el, { zIndex: p.base.z });
          },
        });
        gsap.to(p.art, { scale: 1, x: 0, y: 0, duration: 0.9, ease: "power2.out", overwrite: true });
        gsap.to(p.chip, { yPercent: 130, autoAlpha: 0, duration: 0.4, ease: "power2.in", overwrite: true });
        gsap.to(p.glare, { autoAlpha: 0, duration: 0.4, overwrite: true });
        gsap.to(p.shade, { opacity: 0, duration: 0.4, overwrite: true });
        parts.forEach((o, j) => {
          if (j === i || j === hovered) return;
          gsap.to(o.inner, { x: 0, scale: 1, opacity: 1, duration: 0.8, ease: "power3.out", overwrite: "auto" });
        });
      };

      // which card is on top at (x, y)? uses the resting pose: centre, rotation, rounded-rect size, base z-order
      const pick = (x, y, rect) => {
        const k = uPx();
        let best = -1;
        let bestZ = -Infinity;
        let bestD = Infinity;
        cards.forEach((c, i) => {
          const w = CARD_W * c.s * k;
          const h = CARD_H * c.s * k;
          const r = 64 * c.s * k;
          const cx = rect.width / 2 + (c.x - 1000) * k;
          const cy = c.y * k;
          const t = (c.rot * Math.PI) / 180;
          const dx = x - cx;
          const dy = y - cy;
          const lx = Math.abs(dx * Math.cos(t) + dy * Math.sin(t));
          const ly = Math.abs(-dx * Math.sin(t) + dy * Math.cos(t));
          if (lx > w / 2 || ly > h / 2) return;
          const qx = lx - (w / 2 - r);
          const qy = ly - (h / 2 - r);
          if (qx > 0 && qy > 0 && Math.hypot(qx, qy) > r) return;
          const d = Math.hypot(dx, dy);
          if (c.z > bestZ || (c.z === bestZ && d < bestD)) {
            best = i;
            bestZ = c.z;
            bestD = d;
          }
        });
        return best;
      };

      const onMove = (e) => {
        if (!ready) return;
        const rect = root.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = pick(x, y, rect);
        if (hit !== hovered) {
          const prev = hovered;
          hovered = hit;
          if (prev > -1) leave(prev);
          if (hit > -1) enter(hit);
          root.current.style.cursor = hit > -1 ? "pointer" : "";
        }
        if (hovered > -1) {
          const p = parts[hovered];
          const r = p.inner.getBoundingClientRect();
          const nx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
          const ny = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
          p.ry(nx * 14);
          p.rx(-ny * 14);
          p.inner.style.setProperty("--mx", `${(nx + 0.5) * 100}%`);
          p.inner.style.setProperty("--my", `${(ny + 0.5) * 100}%`);
          gsap.to(p.art, { x: -nx * 18, y: -ny * 18, duration: 0.8, ease: "power3.out", overwrite: "auto" });
        }
      };
      const onLeaveRoot = () => {
        if (hovered > -1) {
          const prev = hovered;
          hovered = -1;
          leave(prev);
        }
        root.current.style.cursor = "";
      };
      const onClick = () => {
        if (hovered < 0) return;
        const href = cards[hovered].href;
        if (href && href !== "#") window.open(href, "_blank", "noopener");
      };

      const section = root.current;
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeaveRoot);
      section.addEventListener("click", onClick);
      const cleanups = [
        () => {
          section.removeEventListener("pointermove", onMove);
          section.removeEventListener("pointerleave", onLeaveRoot);
          section.removeEventListener("click", onClick);
          section.style.cursor = "";
        },
      ];

      return () => cleanups.forEach((fn) => fn());
    });

    return () => mm.revert();
  }, [cards]);

  return (
    <section
      ref={root}
      className="socials-root relative w-full overflow-hidden"
      style={{ height: u(1086), background: "#f5f5ef" }}
      aria-label="Socials"
    >
      <div ref={probe} aria-hidden="true" className="pointer-events-none absolute opacity-0" style={{ width: u(1000), height: 1, left: 0, top: 0 }} />

      <div data-camera className="absolute left-1/2 z-10" style={{ top: u(12), marginLeft: u(-31) }}>
        <CameraIcon />
      </div>

      <h2
        className="pointer-events-none absolute inset-x-0 z-[80] text-center text-[#111]"
        style={{ top: u(88) }}
      >
        <span className="line-mask block" style={{ height: u(82) }}>
          <span data-line className="block font-display font-extrabold uppercase tracking-[-0.045em]" style={{ fontSize: u(92), lineHeight: u(82), wordSpacing: "0.14em" }}>
            {title.sans}
          </span>
        </span>
        <span className="line-mask block" style={{ height: u(82) }}>
          <span data-line className="block font-serif uppercase tracking-[-0.03em]" style={{ fontSize: u(92), lineHeight: u(82), wordSpacing: "0.14em" }}>
            {title.serif}
          </span>
        </span>
      </h2>

      {cards.map((c) => {
        const w = CARD_W * c.s;
        const h = CARD_H * c.s;
        return (
          <a
            key={c.id}
            href="#"
            data-card
            aria-label={`${c.platform} ${c.handle}`}
            className="group pointer-events-none absolute block will-change-transform"
            style={{
              left: `calc(50% + var(--u) * ${c.x - 1000 - w / 2})`,
              top: u(c.y - h / 2),
              width: u(w),
              height: u(h),
              zIndex: c.z,
            }}
          >
            <div
              data-inner
              className="absolute inset-0 overflow-hidden bg-[#ddd] will-change-transform"
              style={{ borderRadius: u(64 * c.s) }}
            >
            {/* Safari: overflow+radius is ignored for transformed/blended children, so clip in a child (keeps the box-shadow on data-inner intact) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: u(64 * c.s),
                clipPath: `inset(0 round ${u(64 * c.s)})`,
                WebkitClipPath: `inset(0 round ${u(64 * c.s)})`,
                WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                isolation: "isolate",
              }}
            >
            <div data-art className="absolute inset-0 will-change-transform" style={{ borderRadius: u(64 * c.s) }}>
              {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <CardArt pattern={c.pattern} palette={c.palette} />}
            </div>

            {/* light that follows the pointer */}
            <div
              data-glare
              className="pointer-events-none absolute inset-0 opacity-0"
              style={{ background: "radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.38), transparent 46%)", mixBlendMode: "soft-light" }}
            />
            <div data-shade className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 opacity-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }} />

            {/* platform chip slides up on hover */}
            <div
              data-chip
              className="absolute flex items-center justify-between bg-white/95 text-[#111] opacity-0"
              style={{ left: u(22 * c.s + 8), right: u(22 * c.s + 8), bottom: u(26 * c.s + 6), padding: `${u(10 * c.s + 2)} ${u(10 * c.s + 6)} ${u(10 * c.s + 2)} ${u(18 * c.s + 6)}`, borderRadius: 999 }}
            >
              <span className="leading-none">
                <span className="block font-cond font-bold uppercase" style={{ fontSize: u(26 * c.s + 4) }}>{c.platform}</span>
                <span className="block font-display font-medium text-black/55" style={{ fontSize: u(15 * c.s + 3), marginTop: u(3) }}>{c.handle}</span>
              </span>
              <span className="flex items-center justify-center rounded-full bg-lime" style={{ width: u(46 * c.s + 8), height: u(46 * c.s + 8) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#272a1e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: "50%", height: "50%" }}>
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </span>
            </div>
            </div>
            </div>
          </a>
        );
      })}
    </section>
  );
}

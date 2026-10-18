import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll transition that wraps the landing screen.
 *   1. the landing page shrinks into a floating card
 *   2. behind it: two text strips slide past and a signature signs itself (a pen follows the stroke)
 *   3. the card drops away, the background has faded from sky-blue to white, and a big statement is revealed
 * Everything is scrubbed by the scroll position (the section is pinned for `scrollLength` viewport heights).
 */
export const revealContent = {
  eyebrow: "MESSAGE FROM ANSH",
  stripA: [["BUILDING ", ""], ["MODELS", "acc"], [" & AGENTS ✦ ", ""]],
  stripB: [["THAT ", ""], ["SHIP", "acc"], [" WITH CARE ✦ ", ""]],
  badge: "AI & ENGINEERING",
  // each line is a list of [text, accent?] chunks
  statement: [
    [["BUILDING ", 0], ["INTELLIGENT", 1], [" SYSTEMS,", 0]],
    [["SHIPPING ", 0], ["MODELS", 1], [" THAT MATTER,", 0]],
    [["FROM FIRST PROTOTYPE TO", 0]],
    [["PRODUCTION", 1], [" AT SCALE.", 0]],
  ],
};

// A hand-drawn looking signature (viewBox 1000 x 560). Three pen strokes, drawn in order.
const SIG = {
  main:
    "M90 430 C200 320 330 170 440 96 C500 56 528 92 494 156 C446 246 334 418 304 470 C288 498 316 506 346 470 " +
    "C424 376 474 252 562 232 C626 218 626 292 574 340 C542 370 562 404 624 384 C704 358 764 300 822 216 " +
    "C852 172 902 150 932 176 C966 206 892 292 800 346 C720 394 640 430 530 452",
  under: "M170 506 C380 470 650 438 892 436",
  tick: "M704 118 L716 186",
};

// every word is its own span so the statement can "ink in" word by word while you scroll; accents get a hand-drawn underline
const UL = '<svg class="rv-ul" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 C 18 3, 34 13, 52 7 S 84 4, 98 8" pathLength="1"/></svg>';
const words = (text, accent) => {
  const caps = (t) => t.toLowerCase();   // sentence case: CSS capitalises only the very first word
  const parts = text.split(/(\s+)/);
  return parts.map((w) => (/^\s+$/.test(w) || !w ? w : accent ? `<em class="rv-w rv-acc">${caps(w)}${UL}</em>` : `<span class="rv-w">${caps(w)}</span>`)).join("");
};
const seg = (chunks) => chunks.map(([t, k]) => (k ? `<em>${t}</em>` : `<b>${t}</b>`)).join("");

export function mountReveal(root, content = revealContent, { scrollLength = 6 } = {}) {
  const c = content;
  root.classList.add("rv");
  root.innerHTML = `<div class="rv-stage" data-stage>
    <div class="rv-eyebrow rv-mono" data-eyebrow>${c.eyebrow}</div>
    <div class="rv-strips" aria-hidden="true">
      <div class="rv-row" data-row="a">${[0, 1, 2].map(() => `<span class="rv-seg">${seg(c.stripA)}</span>`).join("")}</div>
      <div class="rv-row" data-row="b">${[0, 1, 2].map(() => `<span class="rv-seg">${seg(c.stripB)}</span>`).join("")}</div>
    </div>
    <div class="rv-card" data-card><section class="rv-slot" id="top"></section></div>
    <svg class="rv-sig" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="rvInk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6b9bff"/><stop offset="1" stop-color="#2f5fe0"/>
        </linearGradient>
      </defs>
      ${["main", "under", "tick"].map((k) => `
        <path data-sig="${k}" d="${SIG[k]}" fill="none" stroke="url(#rvInk)" stroke-width="${k === "tick" ? 15 : 17}" stroke-linecap="round" stroke-linejoin="round"/>
        <path data-sigs="${k}" d="${SIG[k]}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(-3 -4)"/>`).join("")}
      <circle data-pen r="13" cx="90" cy="430" fill="#fff" stroke="#2f5fe0" stroke-width="5" opacity="0"/>
    </svg>
</div>
  `;

  const $ = (s) => root.querySelector(s);
  const stage = $("[data-stage]");
  const card = $("[data-card]");
  const slot = $(".rv-slot");
  const mainPath = $('[data-sig="main"]');
  const pen = $("[data-pen]");
  const mainLen = mainPath.getTotalLength();

  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage,
        pin: stage,
        refreshPriority: 10,      // measured before sections created earlier (e.g. Warp), so their start positions include our pin spacing
        pinSpacer: root,          // our own wrapper: GSAP then never re-parents the stage, so the landing's CSS intro animations are not restarted on every refresh
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * scrollLength),
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { card.style.pointerEvents = self.progress > 0.02 ? "none" : ""; api.onProgress && api.onProgress(self.progress); },
      },
    });

    const small = window.innerWidth < 700 ? 0.56 : 0.44;
    // background: sky-blue -> the deep navy of the Earth scene that follows (text colours flip to light with it)
    tl.fromTo(stage, { backgroundColor: "#c5dcf0", "--rv-ink": "#0b1424" }, { backgroundColor: "#03091a", "--rv-ink": "#e6eeff", duration: 0.45 }, 0);
    // landing page -> card
    tl.fromTo(card, { scale: 1, borderRadius: 0 },
      { scale: small, borderRadius: 30, duration: 0.3, ease: "power3.inOut" }, 0);
    tl.to(card, { rotation: -2.2, scale: small * 0.92, duration: 0.26, ease: "sine.inOut" }, 0.32);
    tl.to(card, { scale: small * 0.5, y: "-9vh", rotation: -5, opacity: 0, duration: 0.2, ease: "power2.in" }, 0.62);
    tl.set(card, { y: "-260vh" }, 0.825);                      // far off-screen: the WebGL scene pauses itself

    // strips slide past (scroll-driven), fade in and out
    tl.fromTo($('[data-row="a"]'), { xPercent: 0 }, { xPercent: -33.333, duration: 1 }, 0);
    tl.fromTo($('[data-row="b"]'), { xPercent: -33.333 }, { xPercent: 0, duration: 1 }, 0);
    tl.fromTo(".rv-strips", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.07);
    tl.to(".rv-strips", { opacity: 0, duration: 0.12 }, 0.66);
    tl.fromTo("[data-eyebrow]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.1 }, 0.12);
    tl.to("[data-eyebrow]", { opacity: 0, duration: 0.08 }, 0.7);

    // the signature signs itself, the pen follows the stroke
    const draw = (k, at, dur, ease = "power1.inOut", extra = {}) => {
      const els = [...root.querySelectorAll(`[data-sig="${k}"], [data-sigs="${k}"]`)];
      const len = els[0].getTotalLength() + 2;
      els.forEach((e) => { e.style.strokeDasharray = `${len} ${len + 20}`; });
      gsap.set(els, { strokeDashoffset: len, opacity: 0 });   // hidden until the pen arrives (round caps would show dots)
      tl.set(els, { opacity: 1 }, at + 0.0005);
      tl.to(els, { strokeDashoffset: 0, duration: dur, ease, ...extra }, at);
    };
    tl.to(pen, { opacity: 1, duration: 0.02 }, 0.14);
    draw("main", 0.14, 0.36, "power1.inOut", {
      onUpdate() {
        const p = Math.max(0, Math.min(1, this.progress()));
        const pt = mainPath.getPointAtLength(p * mainLen);
        pen.setAttribute("cx", pt.x); pen.setAttribute("cy", pt.y);
      },
    });
    tl.to(pen, { opacity: 0, duration: 0.03 }, 0.5);
    draw("under", 0.5, 0.08, "power2.out");
    draw("tick", 0.58, 0.04, "power2.out");

    // nothing but the navy now: a short beat of dark, then the Earth iris (Journey) opens over it
    tl.to({}, { duration: 0.24 }, 0.86);
  }, root);

  const api = {
    slot,
    onProgress: null,   // (progress 0..1) => void, set by the owner
    destroy() {
      ctx.revert();
      root.innerHTML = "";
      root.classList.remove("rv");
    },
  };
  return api;
}

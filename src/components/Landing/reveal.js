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
  stripA: [["IDEAS INTO ", ""], ["SYSTEMS", "acc"], [" ✦ ", ""]],
  stripB: [["THAT MAKE AN ", ""], ["IMPACT", "acc"], [" ✦ ", ""]],
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
  main: "M 110 340 C 150 270 200 160 236 96 C 252 70 268 92 274 130 C 284 200 298 280 318 340 C 326 330 336 270 350 240 C 362 218 396 226 402 262 C 406 292 402 318 418 326 C 436 334 450 300 460 270 C 470 244 500 224 520 238 C 540 252 520 276 496 292 C 474 306 476 332 504 334 C 534 336 556 306 568 276 C 586 220 604 140 624 100 C 636 76 654 86 650 128 C 642 190 618 280 610 334 C 640 270 676 240 676 270 C 676 300 670 322 694 332 C 716 340 740 310 756 276",
  g: "M 440 372 C 400 342 340 372 336 432 C 332 492 390 512 430 484 C 452 468 452 450 446 434 C 430 436 414 438 400 436 M 446 434 C 462 432 470 424 484 424 C 500 414 530 422 528 446 C 526 470 500 498 476 484 C 462 476 466 450 484 442 C 502 434 528 442 532 468 C 534 484 546 490 556 486 C 566 480 568 452 570 426 C 570 462 576 490 596 490 C 616 490 622 462 628 430 C 628 462 630 488 650 490 C 654 452 656 402 664 352 C 668 330 682 338 676 370 C 670 424 664 474 684 488 C 698 498 712 484 720 462 C 724 442 740 430 760 430 C 780 430 784 462 770 478 C 756 492 734 484 736 462 C 738 442 776 432 790 458 C 796 478 806 492 816 484 C 826 476 826 434 836 426 C 848 418 852 452 852 478 C 854 452 862 424 876 424 C 890 424 892 458 892 480 C 894 454 902 428 916 428 C 934 428 934 468 928 492 C 960 484 976 442 984 398",
  under: "M 250 548 C 480 536 760 520 940 496",
  tick: "M 628 418 L 722 406",
  bar: "M 170 270 C 214 258 256 256 298 268",
};

// every word is its own span so the statement can "ink in" word by word while you scroll; accents get a hand-drawn underline
const UL = '<svg class="rv-ul" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9 C 18 3, 34 13, 52 7 S 84 4, 98 8" pathLength="1"/></svg>';
const words = (text, accent) => {
  const caps = (t) => t.toLowerCase();   // sentence case: CSS capitalises only the very first word
  const parts = text.split(/(\s+)/);
  return parts.map((w) => (/^\s+$/.test(w) || !w ? w : accent ? `<em class="rv-w rv-acc">${caps(w)}${UL}</em>` : `<span class="rv-w">${caps(w)}</span>`)).join("");
};
const seg = (chunks) => chunks.map(([t, k]) => (k ? `<em>${t}</em>` : `<b>${t}</b>`)).join("");

const END = 0.655;   // fraction of the original timeline kept: the signature finishes at ~0.63

export function mountReveal(root, content = revealContent, { scrollLength = 3.75 } = {}) {
  const c = content;
  root.classList.add("rv");
  root.innerHTML = `<div class="rv-stage" data-stage>
    <div class="rv-art" aria-hidden="true">
      <i class="rv-orb o1"></i><i class="rv-orb o2"></i><i class="rv-orb o3"></i>
      <i class="rv-rays"></i><i class="rv-gridx"></i>
      <svg class="rv-ringsvg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs><pattern id="rvPlus" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M32 27v10M27 32h10" stroke="rgba(63,114,238,.28)" stroke-width="1.2" fill="none"/></pattern></defs>
        <rect width="1600" height="900" fill="url(#rvPlus)" class="rv-pl"/>
        <g class="rv-rings"><circle cx="1000" cy="450" r="150" class="rr0"/><circle cx="1000" cy="450" r="260" class="rr1"/><circle cx="1000" cy="450" r="380" class="rr2"/><circle cx="1000" cy="450" r="520" class="rr3"/><circle cx="1000" cy="450" r="690" class="rr4"/></g>
        <g class="rv-orbit ob1"><circle cx="1000" cy="300" r="9"/><circle cx="1000" cy="300" r="20" class="halo"/></g>
        <g class="rv-orbit ob2"><circle cx="1000" cy="190" r="6"/></g>
        <g class="rv-orbit ob3"><circle cx="1000" cy="-70" r="12"/><circle cx="1000" cy="-70" r="26" class="halo"/></g>
        <g class="rv-ticks"><line x1="0" x2="0" y1="880" y2="862"/><line x1="20" x2="20" y1="880" y2="871"/><line x1="40" x2="40" y1="880" y2="871"/><line x1="60" x2="60" y1="880" y2="871"/><line x1="80" x2="80" y1="880" y2="871"/><line x1="100" x2="100" y1="880" y2="862"/><line x1="120" x2="120" y1="880" y2="871"/><line x1="140" x2="140" y1="880" y2="871"/><line x1="160" x2="160" y1="880" y2="871"/><line x1="180" x2="180" y1="880" y2="871"/><line x1="200" x2="200" y1="880" y2="862"/><line x1="220" x2="220" y1="880" y2="871"/><line x1="240" x2="240" y1="880" y2="871"/><line x1="260" x2="260" y1="880" y2="871"/><line x1="280" x2="280" y1="880" y2="871"/><line x1="300" x2="300" y1="880" y2="862"/><line x1="320" x2="320" y1="880" y2="871"/><line x1="340" x2="340" y1="880" y2="871"/><line x1="360" x2="360" y1="880" y2="871"/><line x1="380" x2="380" y1="880" y2="871"/><line x1="400" x2="400" y1="880" y2="862"/><line x1="420" x2="420" y1="880" y2="871"/><line x1="440" x2="440" y1="880" y2="871"/><line x1="460" x2="460" y1="880" y2="871"/><line x1="480" x2="480" y1="880" y2="871"/><line x1="500" x2="500" y1="880" y2="862"/><line x1="520" x2="520" y1="880" y2="871"/><line x1="540" x2="540" y1="880" y2="871"/><line x1="560" x2="560" y1="880" y2="871"/><line x1="580" x2="580" y1="880" y2="871"/><line x1="600" x2="600" y1="880" y2="862"/><line x1="620" x2="620" y1="880" y2="871"/><line x1="640" x2="640" y1="880" y2="871"/><line x1="660" x2="660" y1="880" y2="871"/><line x1="680" x2="680" y1="880" y2="871"/><line x1="700" x2="700" y1="880" y2="862"/><line x1="720" x2="720" y1="880" y2="871"/><line x1="740" x2="740" y1="880" y2="871"/><line x1="760" x2="760" y1="880" y2="871"/><line x1="780" x2="780" y1="880" y2="871"/><line x1="800" x2="800" y1="880" y2="862"/><line x1="820" x2="820" y1="880" y2="871"/><line x1="840" x2="840" y1="880" y2="871"/><line x1="860" x2="860" y1="880" y2="871"/><line x1="880" x2="880" y1="880" y2="871"/><line x1="900" x2="900" y1="880" y2="862"/><line x1="920" x2="920" y1="880" y2="871"/><line x1="940" x2="940" y1="880" y2="871"/><line x1="960" x2="960" y1="880" y2="871"/><line x1="980" x2="980" y1="880" y2="871"/><line x1="1000" x2="1000" y1="880" y2="862"/><line x1="1020" x2="1020" y1="880" y2="871"/><line x1="1040" x2="1040" y1="880" y2="871"/><line x1="1060" x2="1060" y1="880" y2="871"/><line x1="1080" x2="1080" y1="880" y2="871"/><line x1="1100" x2="1100" y1="880" y2="862"/><line x1="1120" x2="1120" y1="880" y2="871"/><line x1="1140" x2="1140" y1="880" y2="871"/><line x1="1160" x2="1160" y1="880" y2="871"/><line x1="1180" x2="1180" y1="880" y2="871"/><line x1="1200" x2="1200" y1="880" y2="862"/><line x1="1220" x2="1220" y1="880" y2="871"/><line x1="1240" x2="1240" y1="880" y2="871"/><line x1="1260" x2="1260" y1="880" y2="871"/><line x1="1280" x2="1280" y1="880" y2="871"/><line x1="1300" x2="1300" y1="880" y2="862"/><line x1="1320" x2="1320" y1="880" y2="871"/><line x1="1340" x2="1340" y1="880" y2="871"/><line x1="1360" x2="1360" y1="880" y2="871"/><line x1="1380" x2="1380" y1="880" y2="871"/><line x1="1400" x2="1400" y1="880" y2="862"/><line x1="1420" x2="1420" y1="880" y2="871"/><line x1="1440" x2="1440" y1="880" y2="871"/><line x1="1460" x2="1460" y1="880" y2="871"/><line x1="1480" x2="1480" y1="880" y2="871"/><line x1="1500" x2="1500" y1="880" y2="862"/><line x1="1520" x2="1520" y1="880" y2="871"/><line x1="1540" x2="1540" y1="880" y2="871"/><line x1="1560" x2="1560" y1="880" y2="871"/><line x1="1580" x2="1580" y1="880" y2="871"/><line x1="1600" x2="1600" y1="880" y2="862"/></g>
        <g class="rv-reg"><path d="M40 40h28M54 26v28"/><path d="M1532 40h28M1546 26v28"/><path d="M40 860h28M54 846v28"/><path d="M1532 860h28M1546 846v28"/></g>
      </svg>
      <div class="rv-gl g1"><svg viewBox="0 0 220 170" overflow="visible"><defs><radialGradient id="rvPln" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#b9ccff"/><stop offset=".62" stop-color="#5b82f2"/><stop offset="1" stop-color="#4a3fd6"/></radialGradient><linearGradient id="rvRng" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".5" stop-color="#9db8ff"/><stop offset="1" stop-color="#8f7bff"/></linearGradient><clipPath id="rvFront"><rect x="-20" y="85" width="260" height="120"/></clipPath><clipPath id="rvSph"><circle cx="110" cy="85" r="46"/></clipPath></defs><ellipse class="pshadow" cx="110" cy="160" rx="62" ry="8"/><g transform="rotate(-16 110 85)"><ellipse class="ring back" cx="110" cy="85" rx="98" ry="24"/><ellipse class="ring back thin" cx="110" cy="85" rx="82" ry="19"/></g><circle cx="110" cy="85" r="46" fill="url(#rvPln)"/><g clip-path="url(#rvSph)"><path class="band" d="M60 70 Q110 58 160 72 V80 Q110 68 60 80Z"/><path class="band" d="M60 94 Q110 82 160 96 V106 Q110 94 60 106Z"/><circle cx="132" cy="108" r="46" class="term"/></g><g transform="rotate(-16 110 85)"><g clip-path="url(#rvFront)"><ellipse class="ring front" cx="110" cy="85" rx="98" ry="24"/><ellipse class="ring front thin" cx="110" cy="85" rx="82" ry="19"/></g><g transform="translate(110 85)"><circle class="moon m1" r="6"><animateMotion dur="11s" repeatCount="indefinite" path="M-98 0 a98 24 0 1 0 196 0 a98 24 0 1 0 -196 0"/></circle><circle class="moon m2" r="3.6"><animateMotion dur="7s" repeatCount="indefinite" begin="-3s" path="M-82 0 a82 19 0 1 1 164 0 a82 19 0 1 1 -164 0"/></circle></g></g></svg></div><div class="rv-gl g2"><svg viewBox="0 0 200 190" overflow="visible"><defs><linearGradient id="rvPl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#9db8ff" stop-opacity=".55"/></linearGradient><linearGradient id="rvPlTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f7bff"/><stop offset="1" stop-color="#3f72ee"/></linearGradient></defs><ellipse class="sh" cx="80" cy="170" rx="58" ry="12"/><path class="beam" d="M80 28V150"/><g class="pl p1"><path class="face" d="M80 112L140 136L80 160L20 136Z"/><path class="grid" d="M50 124L110 148M65 118L125 142M95 118L35 142M110 124L50 148"/><circle class="nd" cx="80" cy="136" r="3"/></g><g class="pl p2"><path class="face" d="M80 80L140 104L80 128L20 104Z"/><path class="grid" d="M50 92L110 116M65 86L125 110M95 86L35 110M110 92L50 116"/><circle class="nd" cx="80" cy="104" r="3"/></g><g class="pl p3"><path class="face" d="M80 48L140 72L80 96L20 72Z"/><path class="grid" d="M50 60L110 84M65 54L125 78M95 54L35 78M110 60L50 84"/><circle class="nd" cx="80" cy="72" r="3"/></g><g class="pl p4"><path class="face" d="M80 16L140 40L80 64L20 40Z"/><path class="grid" d="M50 28L110 52M65 22L125 46M95 22L35 46M110 28L50 52"/><circle class="nd" cx="80" cy="40" r="3"/></g><g class="lb"><path d="M142 38h30M142 70h30M142 102h30M142 134h30"/><text x="176" y="41">OUT</text><text x="176" y="73">MLP</text><text x="176" y="105">ATTN</text><text x="176" y="137">EMB</text></g></svg></div><div class="rv-gl g3"><svg viewBox="0 0 120 120"><defs><path id="rvRing" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><g class="ring"><text><textPath href="#rvRing">LEARN · BUILD · TEST · SHIP · LEARN · BUILD · TEST · SHIP ·</textPath></text></g><circle class="core" cx="60" cy="60" r="9"/><circle class="pulse" cx="60" cy="60" r="9"/></svg></div><div class="rv-gl g4"><div class="cube-wrap"><div class="cube"><i class="f f1"><b>LLM</b></i><i class="f f2"><b>RAG</b></i><i class="f f3"><b>AGENT</b></i><i class="f f4"><b>EVAL</b></i><i class="f f5"><b>API</b></i><i class="f f6"><b>ML</b></i></div><span class="cube-floor"></span></div></div><i class="rv-sp sp1"></i><i class="rv-sp sp2"></i><i class="rv-sp sp3"></i><i class="rv-sp sp4"></i><i class="rv-sp sp5"></i><i class="rv-sp sp6"></i><i class="rv-sp sp7"></i><i class="rv-sp sp8"></i>
      <span class="rv-lab l1">THE JOURNEY</span><span class="rv-lab l2">SCROLL TO EXPLORE MY WORK</span><span class="rv-lab l3">AI &amp; ENGINEERING</span>
      <i class="rv-art-grain"></i>
    </div>
        <div class="rv-bg" data-bg aria-hidden="true"><i class="rv-b rv-b1"></i><i class="rv-b rv-b2"></i><i class="rv-b rv-b3"></i><i class="rv-floor"></i><i class="rv-sweep"></i><canvas class="rv-dust" data-dust></canvas></div>
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
      ${["main", "g", "bar", "tick", "under"].map((k) => `
        <path data-sig="${k}" d="${SIG[k]}" fill="none" stroke="url(#rvInk)" stroke-width="${k === "main" || k === "g" ? 11 : k === "under" ? 8 : 7}" stroke-linecap="round" stroke-linejoin="round"/>
        <path data-sigs="${k}" d="${SIG[k]}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="translate(-3 -4)"/>`).join("")}
      <circle data-pen r="9" cx="110" cy="340" fill="#fff" stroke="#2f5fe0" stroke-width="4" opacity="0"/>
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

  let offDust = null;
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: stage,
        pin: stage,
        refreshPriority: 10,      // measured before sections created earlier (e.g. Warp), so their start positions include our pin spacing
        pinSpacer: root,          // our own wrapper: GSAP then never re-parents the stage, so the landing's CSS intro animations are not restarted on every refresh
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * scrollLength * END),
        scrub: 0.5,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { card.style.pointerEvents = self.progress > 0.02 ? "none" : ""; api.onProgress && api.onProgress(self.progress); },
      },
    });

    const small = window.innerWidth < 700 ? 0.56 : 0.44;
    // background: the landing is dark now, so the transition stays a light sky-blue (dark ink, no dark aurora layer)
    tl.set(stage, { backgroundColor: "#c5dcf0", "--rv-ink": "#0b1424" }, 0);
    tl.set("[data-bg]", { opacity: 0 }, 0);
    // scroll-linked life in the light background: rings turn, shapes drift at different depths
    tl.to(".rv-rings", { rotation: 90, transformOrigin: "1000px 450px", duration: END, ease: "none" }, 0);
    tl.to(".ob1", { rotation: 300, transformOrigin: "1000px 450px", duration: END, ease: "none" }, 0);
    tl.to(".ob2", { rotation: -220, transformOrigin: "1000px 450px", duration: END, ease: "none" }, 0);
    tl.to(".ob3", { rotation: 140, transformOrigin: "1000px 450px", duration: END, ease: "none" }, 0);
    tl.to(".rv-gl.g1", { yPercent: -70, rotation: 24, duration: END, ease: "none" }, 0);
    tl.to(".rv-gl.g2", { yPercent: 55, rotation: -30, duration: END, ease: "none" }, 0);
    tl.to(".rv-gl.g3", { yPercent: -40, xPercent: 20, duration: END, ease: "none" }, 0);
    tl.to(".rv-gl.g4", { yPercent: 60, rotation: 40, duration: END, ease: "none" }, 0);
    tl.to(".rv-gridx", { backgroundPosition: "0px 260px, 260px 0px", duration: END, ease: "none" }, 0);
    tl.to(".rv-orb.o1", { xPercent: 22, yPercent: 14, duration: END, ease: "none" }, 0);
    tl.to(".rv-orb.o2", { xPercent: -18, yPercent: -16, duration: END, ease: "none" }, 0);
    // landing page -> card
    tl.fromTo(card, { scale: 1, borderRadius: 0 },
      { scale: small, borderRadius: 30, duration: 0.3, ease: "power3.inOut" }, 0);
    tl.to(card, { rotation: -2.2, scale: small * 0.92, duration: 0.26, ease: "sine.inOut" }, 0.32);
    // the card (the website preview) stays on screen until the signature is finished; it leaves with the pinned scene when the pin releases

    // strips slide past (scroll-driven), fade in and out
    tl.fromTo($('[data-row="a"]'), { xPercent: 0 }, { xPercent: -33.333, duration: END }, 0);
    tl.fromTo($('[data-row="b"]'), { xPercent: -33.333 }, { xPercent: 0, duration: END }, 0);
    tl.fromTo(".rv-strips", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" }, 0.07);
    tl.to(".rv-strips", { opacity: 0, duration: 0.05 }, 0.6);

    // the signature signs itself, the pen follows the stroke
    const draw = (k, at, dur, ease = "power1.inOut", extra = {}) => {
      const els = [...root.querySelectorAll(`[data-sig="${k}"], [data-sigs="${k}"]`)];
      const len = els[0].getTotalLength() + 2;
      els.forEach((e) => { e.style.strokeDasharray = `${len} ${len + 20}`; });
      gsap.set(els, { strokeDashoffset: len, opacity: 0 });   // hidden until the pen arrives (round caps would show dots)
      tl.set(els, { opacity: 1 }, at + 0.0005);
      tl.to(els, { strokeDashoffset: 0, duration: dur, ease, ...extra }, at);
    };
    const follow = (k) => {
      const path = $(`[data-sig="${k}"]`), total = path.getTotalLength();
      return { onUpdate() {
        const p = Math.max(0, Math.min(1, this.progress()));
        const pt = path.getPointAtLength(p * total);
        pen.setAttribute("cx", pt.x); pen.setAttribute("cy", pt.y);
      } };
    };
    tl.to(pen, { opacity: 1, duration: 0.02 }, 0.14);
    draw("main", 0.14, 0.17, "power1.inOut", follow("main"));
    draw("bar", 0.31, 0.03, "power2.out");                       // crossbar of the A
    tl.set(pen, { attr: { cx: 440, cy: 372 } }, 0.34);
    draw("g", 0.34, 0.19, "power1.inOut", follow("g"));
    tl.to(pen, { opacity: 0, duration: 0.02 }, 0.53);
    draw("tick", 0.53, 0.03, "power2.out");                      // cross of the t
    draw("under", 0.56, 0.07, "power2.out");                     // the flourish underline

    // (the closing iris onto the Kimi block was removed: the landing now scrolls straight into it)
    // the signature is complete at ~0.63 and every scrubbed tween now ends at END, so the pin releases right then (no held frame of the finished sign).
  }, root);

  // drifting light dust on the dark background
  const cv = $("[data-dust]");
  let raf = 0, stopDust = false;
  if (cv && !(matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    const g = cv.getContext("2d");
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.015 + Math.random() * 0.05, p: Math.random() * 6.28 }));
    let W = 0, H = 0, last = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); window.addEventListener("resize", size);
    const tick = (t) => {
      if (stopDust) return;
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return; last = t;
      g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y -= p.v * 0.033; p.x += Math.sin(t / 2400 + p.p) * 0.0002;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t / 900 + p.p));
        g.beginPath(); g.fillStyle = `rgba(150,190,255,${a})`; g.shadowColor = "rgba(90,150,255,.9)"; g.shadowBlur = 8;
        g.arc(p.x * W, p.y * H, p.r, 0, 6.283); g.fill();
      }
    };
    raf = requestAnimationFrame(tick);
    offDust = () => { stopDust = true; cancelAnimationFrame(raf); window.removeEventListener("resize", size); };
  }

  const api = {
    slot,
    onProgress: null,   // (progress 0..1) => void, set by the owner
    destroy() {
      ctx.revert();
      offDust && offDust();
      root.innerHTML = "";
      root.classList.remove("rv");
    },
  };
  return api;
}

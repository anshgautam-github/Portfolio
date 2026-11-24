import { useEffect, useMemo, useRef } from "react";
import initFinale from "./finale.js";
import { content } from "../../content.js";
import "./finale.css";

/* The page the Bloom opens onto (amber): say hello -> a wavy ribbon that unrolls with the scroll -> where to find me -> the wordmark.
   Copy lives in COPY below; the socials and footer links come from content.garden.footer (a social with no href is simply not shown). */

const COPY = {
  hello: ["SAY", "HELLO!"],
  helloNote: "Got a role, a collab or a strange problem? Say hi, I'm easy to find.",
  ribbon: "FANCY A CHAT?   FANCY EVEN MORE OF MY WORK?   ",
  connectNote: "I also help startups come online. Almost 3 so far.",
  connectTitle: ["LET'S PUT YOUR", "STARTUP ONLINE"],
  freeNote: "say hi, it's free",
  mark: "TRAIN. SHIP.",
  credit: "Language models, research and the interfaces built around them.",
};

const FOOT = content.garden.footer;
const SOCIALS = FOOT.socials.filter((s) => s.href);
const PRIMARY = (SOCIALS.find((s) => s.icon === "linkedin") || SOCIALS[0] || {}).href || "";
const PRIMARY_NAME = SOCIALS.find((s) => s.icon === "linkedin") ? "LinkedIn" : "";

/* the ribbon's centre line: a smooth sine, built once. crest at x = 1250, where the hanging character holds on */
function ribbonPath() {
  const pts = [];
  for (let x = -200; x <= 1800; x += 50) pts.push([x, 215 - 100 * Math.sin(((x - 975) / 1100) * Math.PI * 2)]);
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const TUFT = (
  <>
    <path className="fn-ink fn-coral" d="M60 -326 C18 -430 58 -526 142 -566 C194 -482 172 -376 132 -322 Z" />
    <path className="fn-leafhl" d="M62 -352 C40 -430 70 -508 128 -552" />
    <path className="fn-vein" d="M100 -332 C78 -420 96 -498 138 -552" />
    <path className="fn-ink fn-amber" d="M148 -326 C136 -470 180 -604 274 -684 C336 -562 292 -420 230 -322 Z" />
    <path className="fn-leafhl" d="M160 -352 C152 -470 192 -588 262 -664" />
    <path className="fn-vein" d="M192 -332 C196 -460 230 -588 270 -672" />
    <path className="fn-ink fn-blue" d="M246 -326 C290 -400 360 -452 436 -442 C424 -380 372 -338 318 -318 Z" />
    <path className="fn-leafhl" d="M254 -330 C296 -394 356 -434 420 -434" />
    <path className="fn-vein" d="M276 -322 C326 -380 376 -412 424 -430" />
  </>
);

function Icon({ name }) {
  if (name === "github") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.700 18.300 5 18.300 5c.7 1.700.3 2.900.1 3.200.8.800 1.200 1.900 1.200 3.200 0 4.600-2.800 5.600-5.500 5.900.4.400.8 1.100.8 2.200v3.300c0 .3.2.7.800.6A12 12 0 0 0 12 .3" /></svg>;
  if (name === "linkedin") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.500 8.800h3.400V20H4.500zM6.200 3.500a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 8.800h3.300v1.500c.5-.9 1.700-1.800 3.400-1.800 3.500 0 4.200 2.300 4.200 5.300V20h-3.400v-5.400c0-1.300 0-3-1.800-3s-2.100 1.400-2.100 2.900V20H10z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.500h18v11H3zM3.500 7l8.500 6.500L20.500 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function goTo(id) {
  return (e) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(el, { duration: 2.2 });
    else el.scrollIntoView({ behavior: "smooth" });
  };
}

export default function Finale() {
  const root = useRef(null);
  const rp = useMemo(ribbonPath, []);
  useEffect(() => initFinale(root.current), []);
  const ribbonText = COPY.ribbon.repeat(8);

  return (
    <section ref={root} className="fn" id="finale" aria-label="Say hello">
      <svg className="fn-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="fn-g-body" cx=".34" cy=".26" r=".85"><stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#f1f4ff" /><stop offset=".8" stopColor="#dbe3ff" /><stop offset="1" stopColor="#c3d0fb" /></radialGradient>
          <radialGradient id="fn-g-shade" cx=".36" cy=".3" r=".82"><stop offset=".55" stopColor="#3f72ee" stopOpacity="0" /><stop offset="1" stopColor="#3f72ee" stopOpacity=".24" /></radialGradient>
          <radialGradient id="fn-g-eye" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#ffffff" /><stop offset="1" stopColor="#e3eaff" /></radialGradient>
          <radialGradient id="fn-g-iris" cx=".5" cy=".78" r=".78"><stop offset="0" stopColor="#9db8ff" /><stop offset=".4" stopColor="#3f72ee" /><stop offset="1" stopColor="#0c1233" /></radialGradient>
          <linearGradient id="fn-g-coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffc0c9" /><stop offset=".55" stopColor="#ff8f9e" /><stop offset="1" stopColor="#ee6479" /></linearGradient>
          <linearGradient id="fn-g-mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b4f8d4" /><stop offset=".5" stopColor="#4ee39a" /><stop offset="1" stopColor="#1fb36f" /></linearGradient>
          <linearGradient id="fn-g-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9bb8ff" /><stop offset=".5" stopColor="#3f72ee" /><stop offset="1" stopColor="#2848b8" /></linearGradient>
          <radialGradient id="fn-g-blush"><stop offset="0" stopColor="#ff7f95" stopOpacity=".85" /><stop offset=".6" stopColor="#ff8f9e" stopOpacity=".5" /><stop offset="1" stopColor="#ff8f9e" stopOpacity="0" /></radialGradient>
          <radialGradient id="fn-g-shadow"><stop offset="0" stopColor="#0a0f24" stopOpacity=".38" /><stop offset=".6" stopColor="#0a0f24" stopOpacity=".16" /><stop offset="1" stopColor="#0a0f24" stopOpacity="0" /></radialGradient>
        </defs>
      </svg>
      {/* ---------- say hello ---------- */}
      <div className="fn-top">
        <div className="fn-hello">
          <h2 className="fn-pew" aria-label={COPY.hello.join(" ")}>
            {COPY.hello.map((w, i) => <span className="fn-pew-l" key={w} aria-hidden="true"><span className="fn-pew-w" data-fn-pew>{w}</span></span>)}
          </h2>
          <p className="fn-hand" data-fn-rise>{COPY.helloNote}</p>
          {PRIMARY && <a className="fn-btn fn-btn-coral" data-fn-rise href={PRIMARY} target="_blank" rel="noopener noreferrer">Find me on {PRIMARY_NAME || "the web"}</a>}
        </div>
        <svg className="fn-char" data-fn-char viewBox="0 0 440 540" aria-hidden="true" focusable="false">
          <defs><clipPath id="fn-mouth-clip"><path d="M164 312 Q216 332 270 310 Q266 374 216 376 Q168 374 164 312 Z" /></clipPath></defs>
          <ellipse cx="220" cy="522" rx="150" ry="15" fill="url(#fn-g-shadow)" />
          <ellipse className="fn-ink fn-body" cx="150" cy="498" rx="46" ry="20" />
          <ellipse className="fn-ink fn-body" cx="274" cy="498" rx="46" ry="20" />
          <g transform="translate(210 40) scale(0.5) translate(-160 330)">{TUFT}</g>
          <path className="fn-ink fn-body" d="M210 40 C320 40 372 200 372 340 C372 450 310 505 210 505 C110 505 48 450 48 340 C48 200 100 40 210 40 Z" />
          <path d="M210 40 C320 40 372 200 372 340 C372 450 310 505 210 505 C110 505 48 450 48 340 C48 200 100 40 210 40 Z" fill="url(#fn-g-shade)" />
          <ellipse cx="214" cy="418" rx="86" ry="62" fill="#fff" opacity=".45" />
          <path className="fn-gloss" d="M96 176 C102 122 136 82 180 62" />
          <path className="fn-gloss fn-gloss-d" d="M88 212 L90 224" />
          <path className="fn-ink-l" d="M70 340 C36 372 42 424 66 446" />
          <circle className="fn-ink fn-body" cx="68" cy="450" r="16" />
          <ellipse cx="118" cy="272" rx="40" ry="24" fill="url(#fn-g-blush)" />
          <ellipse cx="316" cy="276" rx="40" ry="24" fill="url(#fn-g-blush)" />
          <path className="fn-cheek" d="M104 268 l5 -9 M118 270 l5 -9 M132 270 l5 -9" />
          <path className="fn-cheek" d="M300 272 l5 -9 M314 274 l5 -9 M328 274 l5 -9" />
          <path className="fn-stroke" d="M120 140 Q158 108 196 128" />
          <path className="fn-stroke" d="M236 128 Q276 106 312 142" />
          <ellipse className="fn-ink fn-white" cx="160" cy="205" rx="42" ry="58" />
          <ellipse className="fn-ink fn-white" cx="268" cy="208" rx="42" ry="58" />
          <g data-fn-pupil>
            <ellipse cx="152" cy="212" rx="25" ry="39" fill="url(#fn-g-iris)" />
            <ellipse cx="152" cy="206" rx="15" ry="25" fill="#070a1c" />
            <circle cx="143" cy="194" r="9" fill="#fff" /><circle cx="162" cy="232" r="4.500" fill="#fff" opacity=".9" />
          </g>
          <g data-fn-pupil>
            <ellipse cx="260" cy="215" rx="25" ry="39" fill="url(#fn-g-iris)" />
            <ellipse cx="260" cy="209" rx="15" ry="25" fill="#070a1c" />
            <circle cx="251" cy="197" r="9" fill="#fff" /><circle cx="270" cy="235" r="4.500" fill="#fff" opacity=".9" />
          </g>
          <path d="M164 312 Q216 332 270 310 Q266 374 216 376 Q168 374 164 312 Z" fill="#1b0f1c" />
          <g clipPath="url(#fn-mouth-clip)"><ellipse cx="218" cy="376" rx="30" ry="21" fill="#ff7a90" /><path d="M200 362 Q218 372 236 362" fill="none" stroke="#e04e6c" strokeWidth="3" strokeLinecap="round" /></g>
          <path className="fn-ink-l" d="M164 312 Q216 332 270 310 Q266 374 216 376 Q168 374 164 312 Z" strokeLinejoin="round" />
          <g className="fn-wave" data-fn-wave>
            <path className="fn-ink-l" d="M366 330 C410 308 420 256 402 214" />
            <g className="fn-ink fn-body">
              <rect x="382" y="170" width="14" height="40" rx="7" />
              <rect x="397" y="162" width="14" height="46" rx="7" />
              <rect x="412" y="172" width="14" height="38" rx="7" />
              <rect x="371" y="190" width="14" height="30" rx="7" transform="rotate(-24 378 205)" />
            </g>
          </g>
        </svg>
      </div>

      {/* ---------- the ribbon ---------- */}
      <div className="fn-ribbon" data-fn-ribbon>
        <svg viewBox="0 0 1600 460" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
          <defs><path id="fn-rc" d={rp} /></defs>
          <path className="fn-paper" d={rp + " L1800 480 L-200 480 Z"} />
          {/* the one hanging on: body is behind the ribbon, only the fingers show over its top edge */}
          <g transform="translate(1250 55)">
            <g data-fn-hang-o><g data-fn-hang-v><g data-fn-hang-i>
              <path className="fn-ink-l" d="M-22 352 C-30 380 -34 400 -40 420" /><ellipse className="fn-ink fn-body" cx="-44" cy="424" rx="24" ry="11" />
              <path className="fn-ink-l" d="M24 354 C32 380 38 396 46 414" /><ellipse className="fn-ink fn-body" cx="52" cy="418" rx="24" ry="11" />
              <path className="fn-ink fn-body" d="M-64 255 C-64 165 -30 112 6 112 C46 112 68 170 68 255 C68 330 42 362 4 362 C-34 362 -64 330 -64 255 Z" />
              <ellipse className="fn-ink fn-white" cx="-18" cy="226" rx="20" ry="28" /><ellipse className="fn-ink fn-white" cx="28" cy="229" rx="20" ry="28" />
              <ellipse cx="-17" cy="216" rx="10" ry="16" fill="#101211" /><ellipse cx="29" cy="219" rx="10" ry="16" fill="#101211" />
              <ellipse cx="6" cy="300" rx="11" ry="17" fill="#101211" />
              <path className="fn-stroke fn-stroke-s" d="M-38 186 Q-18 170 0 180" /><path className="fn-stroke fn-stroke-s" d="M16 182 Q36 168 54 186" />
            </g></g></g>
          </g>
          <path className="fn-rink" data-fn-rp d={rp} />
          <path className="fn-rband" data-fn-rp d={rp} />
          <text className="fn-rtext" data-fn-rtext><textPath href="#fn-rc" data-fn-tp startOffset="0"><tspan dy=".35em">{ribbonText}</tspan></textPath></text>
          <g transform="translate(1250 55)">
            <g className="fn-ink fn-body">
              <rect x="-27" y="-36" width="13" height="38" rx="6.500" /><rect x="-12" y="-44" width="13" height="46" rx="6.500" />
              <rect x="3" y="-40" width="13" height="42" rx="6.500" /><rect x="18" y="-30" width="13" height="32" rx="6.500" />
            </g>
          </g>
        </svg>
      </div>

      {/* ---------- where to find me ---------- */}
      <div className="fn-connect">
        <p className="fn-hand fn-hand-l" data-fn-c>{COPY.connectNote}</p>
        <h3 className="fn-big" aria-label={COPY.connectTitle.join(" ")}>
          {COPY.connectTitle.map((l) => <span className="fn-big-l" key={l} aria-hidden="true"><span data-fn-big>{l}</span></span>)}
        </h3>
        <div className="fn-socials">
          {SOCIALS.map((s) => (
            <a className="fn-tile" data-fn-tile key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
              <Icon name={s.icon} /><span>{s.label}</span>
            </a>
          ))}
        </div>
        <p className="fn-free" data-fn-c>
          <svg viewBox="0 0 160 70" aria-hidden="true"><path data-fn-arrow d="M150 4 C148 40 110 52 52 46" /><path data-fn-arrow d="M64 34 L50 46 L68 56" /></svg>
          <span>{COPY.freeNote}</span>
        </p>
      </div>

      {/* ---------- the wordmark ---------- */}
      <footer className="fn-foot">
        <svg className="fn-rule" viewBox="0 0 1600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 C200 3 380 12 640 7 S1100 4 1300 9 S1500 5 1600 7" /></svg>
        <p className="fn-mark" aria-label={COPY.mark}>
          {COPY.mark.toUpperCase().split("").map((ch, i) => (
            ch === " " ? <span className="fn-gap" key={i} aria-hidden="true" /> : <span className="fn-mark-l" key={i} aria-hidden="true"><span data-fn-letter>{ch}</span></span>
          ))}
        </p>
        <div className="fn-peek" data-fn-peek aria-hidden="true">
          <svg viewBox="0 0 320 200" focusable="false">
            <defs><clipPath id="fn-pk-mouth"><path d="M136 158 Q160 170 184 158 Q182 190 160 191 Q138 190 136 158 Z" /></clipPath></defs>
            <g transform="translate(160 22) scale(0.34) translate(-160 330)">{TUFT}</g>
            <path className="fn-ink fn-body" d="M10 200 C10 90 80 22 160 22 C240 22 310 90 310 200 Z" />
            <path d="M10 200 C10 90 80 22 160 22 C240 22 310 90 310 200 Z" fill="url(#fn-g-shade)" />
            <path className="fn-gloss" d="M52 120 C56 86 78 58 112 44" />
            <path className="fn-gloss fn-gloss-d" d="M47 140 L48 150" />
            <ellipse cx="72" cy="150" rx="27" ry="16" fill="url(#fn-g-blush)" />
            <ellipse cx="248" cy="152" rx="27" ry="16" fill="url(#fn-g-blush)" />
            <path className="fn-cheek" d="M62 148 l4 -7 M72 150 l4 -7 M82 150 l4 -7" />
            <path className="fn-cheek" d="M238 150 l4 -7 M248 152 l4 -7 M258 152 l4 -7" />
            <path className="fn-stroke fn-stroke-s" d="M82 70 Q108 52 134 64" /><path className="fn-stroke fn-stroke-s" d="M186 64 Q212 52 238 70" />
            <ellipse className="fn-ink fn-white" cx="112" cy="116" rx="30" ry="42" /><ellipse className="fn-ink fn-white" cx="208" cy="118" rx="30" ry="42" />
            <g data-fn-pupil>
              <ellipse cx="112" cy="122" rx="18" ry="28" fill="url(#fn-g-iris)" />
              <ellipse cx="112" cy="117" rx="11" ry="18" fill="#070a1c" />
              <circle cx="105" cy="108" r="6.5" fill="#fff" /><circle cx="119" cy="136" r="3" fill="#fff" opacity=".9" />
            </g>
            <g data-fn-pupil>
              <ellipse cx="208" cy="124" rx="18" ry="28" fill="url(#fn-g-iris)" />
              <ellipse cx="208" cy="119" rx="11" ry="18" fill="#070a1c" />
              <circle cx="201" cy="110" r="6.5" fill="#fff" /><circle cx="215" cy="138" r="3" fill="#fff" opacity=".9" />
            </g>
            <path d="M136 158 Q160 170 184 158 Q182 190 160 191 Q138 190 136 158 Z" fill="#1b0f1c" />
            <g clipPath="url(#fn-pk-mouth)"><ellipse cx="161" cy="192" rx="22" ry="15" fill="#ff7a90" /></g>
            <path className="fn-ink-l" style={{ strokeWidth: 4 }} d="M136 158 Q160 170 184 158 Q182 190 160 191 Q138 190 136 158 Z" strokeLinejoin="round" />
          </svg>
          <svg className="fn-thumb" viewBox="0 0 80 110" focusable="false">
            <g className="fn-ink fn-body"><rect x="30" y="14" width="22" height="64" rx="11" /><rect x="14" y="50" width="22" height="22" rx="11" transform="rotate(-18 25 61)" /></g>
          </svg>
        </div>
        <p className="fn-credit">{COPY.credit}</p>
      </footer>
    </section>
  );
}

// Static markup for <FreefallStory />. `A` is the public URL of the frame folders (see FreefallStory.jsx).
//
// The story is Ansh Gautam's, told as a descent: the fall is gradient descent (guess -> fall down the loss curve),
// the crowd is the hype ("just call the API"), and the rise is what is left standing once it actually works.
// Copy for the five chapters that follow the fall lives in chapters.js, their drawings in art.js.
// The flying words, the big serif lines and the CTAs live in engine.js (WORLD / LINES / CTAS).
// No project covers anywhere in this block: the work itself lives in the portfolio's Projects section. The tiles in the index
// are frames from the two films and drawings of the ideas in the story (a guess, attention, the loss curve).
import { CHAPTERS, LESSONS, WAYPOINTS } from './chapters.js';
import { tileGuess, tileAttn, tileCurve } from './art.js';
import { escapeHtml as esc } from '../../lib/escapeHtml.js';

// The closing "portal" scene (doorway film, arches, "Every descent teaches you something.") is switched off for now: set to true to bring it back.
// While off the section stays in the DOM as [hidden] so the engine's lookups still resolve, but it takes no space and its frames are never downloaded.
export const SHOW_PORTAL = false;

const LOGO_BASE = `${import.meta.env.BASE_URL}freefall/`;   // organisation logos (shared with the Where I've Worked cards)

const reps = (w) => Array.from({ length: 4 }, () => esc(w)).join('&nbsp; ') + '&nbsp;';
const N = CHAPTERS.length;
// the ring text repeats until it fills the circle, so short names (Infosys) are not stretched into sparse letters
const ringFill = (t) => { const n = Math.max(1, Math.round(66 / Math.max(1, t.length))); return Array.from({ length: n }, () => t).join(' '); };

// a handful of slow embers per card (deterministic positions so every card differs a little)
const sparks = (i) => Array.from({ length: 16 }, (_, k) => `<b style="--x:${(k * 47 + i * 31) % 100}%;--d:${8 + ((k * 7 + i * 3) % 9)}s;--dl:${-((k * 5 + i * 7) % 14)}s;--s:${1 + ((k * 3 + i) % 3)}px"></b>`).join('');
// the About background's lead-in: fine light threads that start above the section (over the bottom of the previous block) and fall diagonally into the flow field
const leadThreads = Array.from({ length: 22 }, (_, k) => {
  const x = (k * 37 + 11 + (k % 3) * 9) % 100, len = 90 + ((k * 53) % 130), dur = 8 + ((k * 7) % 8), dl = -((k * 13) % 17), a = (0.22 + ((k * 29) % 40) / 100).toFixed(2);
  return `<i style="left:${x}%;--len:${len}px;--d:${dur}s;--dl:${dl}s;--a:${a}"></i>`;
}).join('');
const segs = (i) => Array.from({ length: N }, (_, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('');

const screen = (ch, i) => `
      <article class="screen" style="--c:${ch.c}" data-chapter="${ch.id}">
        <div class="screen-bg" aria-hidden="true"><i class="sb-mesh m1"></i><i class="sb-mesh m2"></i><i class="sb-mesh m3"></i><i class="sb-gw"><i class="sb-grid"></i></i><i class="sb-spot"></i><span class="sb-sparks">${sparks(i)}</span><i class="sb-grain"></i><i class="sb-vig"></i></div>
        <i class="screen-beam" aria-hidden="true"></i>
        <i class="screen-dim" aria-hidden="true"></i>
        <header class="screen-bar"><span>Where I&rsquo;ve worked</span><span>${esc(ch.bar)}</span><span class="bar-count"><i class="live"></i>Experience ${i + 1} of ${N}<b class="segs">${segs(i)}</b></span></header>
        <div class="screen-title" aria-hidden="true"><span>${reps(ch.title)}</span></div>
        <div class="disc">
          <svg class="disc-ring" viewBox="0 0 200 200" aria-hidden="true"><defs><path id="fs-ring${i}" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0"/></defs><text><textPath href="#fs-ring${i}" textLength="548" lengthAdjust="spacing">${esc(ringFill(ch.ring))}</textPath></text></svg>
          <div class="disc-face${ch.logo ? ' disc-face--logo' : ''}">${ch.logo
            ? `<span class="logo-orbit" aria-hidden="true"><i></i><i></i></span><span class="logo-plate${ch.sq ? ' is-sq' : ''}"><img src="${LOGO_BASE}${ch.logo}" alt="${esc(ch.org)} logo" width="300" height="300" draggable="false"></span>`
            : ch.art()}</div>
        </div>
        <div class="screen-meta">
          <p class="screen-kicker">${ch.roman} &mdash; ${esc(ch.kicker)}</p>
          <h3>${esc(ch.head)}</h3>
          <p>${esc(ch.body)}</p>
          ${ch.skills ? `<ul class="screen-skills">${ch.skills.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
          <dl>${ch.dl.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        </div>
        ${ch.next
          ? `<button class="screen-cta magnet" type="button" data-go="${i + 1}" data-cursor="Next">Next &middot; ${esc(ch.next)}</button>`
          : ''}
        <span class="screen-mark" aria-hidden="true">${ch.yr ? esc(ch.yr) : '&nabla; 0' + (i + 1)}</span>
      </article>`;

const rail = `
      <div class="rail" aria-hidden="true">
        <span class="rail-end rail-end--l">Experience</span><span class="rail-end rail-end--r">Open to more</span>
        <svg class="rail-svg"><path class="rail-base"/><path class="rail-trail" pathLength="1"/><circle class="rail-ball" r="5"/></svg>
        <ol class="rail-ticks">${CHAPTERS.map((ch, i) => `<li style="left:${(i / (N - 1)) * 100}%"><i>${ch.roman}</i>${esc(ch.title)}</li>`).join('')}</ol>
      </div>`;

export const markup = (A) => {
  return `
<section class="story" id="fs-story" aria-label="Intro story">
    <div class="stage">
      <div class="stage-inner">
        <canvas class="ambient" id="fs-ambient" aria-hidden="true"></canvas>
        <canvas class="earth" id="fs-earth" aria-hidden="true"></canvas>
        <canvas class="campus" id="fs-campus" aria-hidden="true"></canvas>
        <canvas class="rocket" id="fs-rocket" aria-hidden="true"></canvas>

        <div class="world world--back" aria-hidden="true"><div class="cam"></div></div>

        <div class="index-name" aria-hidden="true">Ansh Gautam</div>

        <div class="film" id="fs-film"><canvas id="fs-filmCanvas" aria-label="A figure falls from orbit toward the Earth, over India and Chennai, then through a shaft of golden light, and lands at SRM in the middle of a crowd"></canvas></div>
        <div class="vignette" aria-hidden="true"></div>

        <div class="index-tiles" id="fs-tiles">
          <button class="tile tile--art" data-go="1" data-cursor="View" data-x="-.30" data-y="-.25" data-s=".24" data-ar="1" data-z="-120" data-d="0">${tileAttn()}<span class="tile-cap">Attention</span></button>
          <button class="tile tile--art" data-go="0" data-cursor="View" data-x=".30" data-y="-.26" data-s=".18" data-ar=".62" data-z="-60" data-d=".08">${tileGuess()}<span class="tile-cap">Guess</span></button>
          <button class="tile" data-go="2" data-cursor="View" data-x="-.33" data-y=".18" data-s=".12" data-ar="1" data-z="40" data-d=".18"><img src="/services/4-web-mobile.jpg" alt="" style="object-position:50% 30%"><span class="tile-cap">Signal</span></button>
          <button class="tile" data-go="1" data-cursor="View" data-x=".31" data-y=".19" data-s=".19" data-ar="1" data-z="-20" data-d=".12"><img src="/services/2-ai-workflows.jpg" alt=""><span class="tile-cap">Loss</span></button>
          <button class="tile tile--gen gen-sun" data-go="0" data-cursor="View" data-x="-.07" data-y="-.43" data-s=".11" data-ar="1.3" data-z="-260" data-d=".26"><span class="tile-cap">Curiosity</span></button>
          <button class="tile tile--art" data-go="1" data-cursor="View" data-x=".06" data-y=".43" data-s=".13" data-ar="1.7" data-z="-200" data-d=".3">${tileCurve()}<span class="tile-cap">Descent</span></button>
          <button class="tile is-mono" data-go="2" data-cursor="View" data-x="-.46" data-y="-.02" data-s=".15" data-ar=".75" data-z="-320" data-d=".22"><img src="${A}fall/250.webp" alt=""><span class="tile-cap">Noise</span></button>
          <button class="tile" data-go="3" data-cursor="View" data-x=".47" data-y="-.03" data-s=".13" data-ar=".7" data-z="-280" data-d=".34"><img src="${A}portal/036.webp" alt="" style="object-position:50% 30%"><span class="tile-cap">Epoch</span></button>
          <button class="tile tile--gen gen-type" data-go="services" data-cursor="View" data-x="-.20" data-y=".41" data-s=".10" data-ar=".8" data-z="-160" data-d=".38"><b>AI</b><span class="tile-cap">Generative AI</span></button>
          <button class="tile is-iris" data-go="4" data-cursor="View" data-x=".19" data-y="-.42" data-s=".10" data-ar="1" data-z="-220" data-d=".42"><img src="/services/1-language-models.jpg" alt=""><span class="tile-cap">Weights</span></button>
        </div>


        <div class="caps" id="fs-caps" aria-hidden="true">
          <article class="cap" data-w=".03,.112"><span class="cap-k"><i>01</i>Orbit &middot; 6,500 km</span><p>Stage by stage, it lets go. Then <em>one small jump</em>.</p></article>
          <article class="cap" data-w=".108,.17"><span class="cap-k"><i>02</i>India</span><p>That blue is Earth. Somewhere under it, <em>India</em>.</p></article>
          <article class="cap" data-w=".152,.245"><span class="cap-k"><i>03</i>Tamil Nadu</span><p>Down the peninsula. Past the coast. <em>Tamil Nadu</em>.</p></article>
          <article class="cap" data-w=".238,.358"><span class="cap-k"><i>04</i>Chennai</span><p>Through the cloud. <em>Chennai</em>, where the land meets the sea.</p></article>
          <article class="cap" data-w=".362,.462"><span class="cap-k"><i>05</i>SRM</span><p>Lock on. <em>Kattankulathur.</em> SRM Institute of Science and Technology.</p></article>
        </div>

        <div class="figure" id="fs-figure" aria-hidden="true"><canvas id="fs-figureCanvas"></canvas><p class="figure-hint">Move to steer &middot; Click to spin</p></div>

        <div class="world world--front" aria-hidden="true"><div class="cam"></div></div>
        <div class="world world--ui"><div class="cam"></div></div>

        <div class="rise" aria-hidden="true"><span>S</span><span>H</span><span>I</span><span>P</span></div>
        <div class="shock" aria-hidden="true"></div>

        <div class="hero" id="fs-hero">
          <p class="hero-intro">AI engineer, builder and mentor.<br>This portfolio starts in orbit and falls to Chennai.</p>
          <h2 class="hero-name" aria-label="Ansh Gautam"><span class="hn">A</span><span class="hn">N</span><span class="hn">S</span><span class="hn">H</span><span class="hn sp"> </span><span class="hn">G</span><span class="hn">A</span><span class="hn">U</span><span class="hn">T</span><span class="hn">A</span><span class="hn">M</span></h2>
          <div class="hero-foot">
            <button class="hero-cue" data-jump="story:.2" data-cursor="Fall"><span>Scroll to let go</span><i></i></button>
            <button class="hero-skip" data-jump="work">Skip to the story</button>
          </div>
        </div>


        <div class="hud" id="fs-hud" aria-hidden="true">
          <div class="hud-alt"><span class="hud-lab">Altitude</span><b class="hud-num">408</b><i class="hud-unit">km</i></div>
          <p class="hud-place">Low Earth orbit</p>
          <p class="hud-sub">The whole planet. One small guess.</p>
          <p class="hud-tel"><span>Speed <b class="hud-vel">7,600</b> m/s</span><span>T+<b class="hud-clock">00:00</b></span></p>
        </div>
        <div class="ladder" id="fs-ladder" aria-hidden="true">
          <span class="ladder-line"><i class="ladder-fill"></i><i class="ladder-dot"></i></span>
          <ol>${WAYPOINTS.map((w) => `<li><b>${esc(w.tag)}</b><small>${esc(w.alt)}</small></li>`).join('')}</ol>
        </div>

        <div class="breach" aria-hidden="true"></div>
        <div class="flash" aria-hidden="true"><b>SRM</b></div>
        <div class="flash flash--ember" aria-hidden="true"></div>
      </div>
      <button class="fs-sound" type="button" aria-pressed="false" data-cursor="Listen"><i class="bars" aria-hidden="true"><b></b><b></b><b></b><b></b></i><span>Sound off</span></button>
    </div>
  </section>

  <!-- ============ ABOUT ============ -->
  <section class="about" id="fs-about" aria-label="About Ansh">
    <div class="about-fx" aria-hidden="true"><canvas class="afx-cv"></canvas><i class="afx-b afx-b1"></i><i class="afx-b afx-b2"></i><i class="afx-b afx-b3"></i><i class="afx-dots"></i><i class="afx-spot"></i></div>
    <div class="afx-lead" aria-hidden="true"><span class="afx-lead-glow"></span>${leadThreads}</div>
    <p class="manifesto" id="fs-manifesto">I have always been more interested in the why than the what. ¶ Why does a system behave this way? What happens when we challenge its assumptions? And what could we build if we started again? ¶ My curiosity usually takes me somewhere between a research paper, an unfamiliar technology, and an idea I can’t stop thinking about. ¶ I enjoy understanding something deeply enough to make something useful out of it.</p>
    <div class="about-cols">
      <p>Currently in <em class="kb">Chennai</em>, pursuing a B.Tech in Computer Science.</p>
      <p>Open to <em class="kb">AI and ML roles</em>, internships, and collaborations worth building together.</p>
    </div>
    <div class="lessons">
      <ol class="lessons-list">${LESSONS.map(([t, s], i) => `<li><span class="lesson-n">0${i + 1}</span><p class="lesson-t">${esc(t)}</p><p class="lesson-s">${esc(s)}</p></li>`).join('')}</ol>
    </div>
  </section>

  <!-- Kimi / paddock block ("Engineered through curiosity"): React portals <KimiAntonelli /> into this slot (FreefallStory.jsx) -->
  <div class="about-kimi" id="fs-kimi-slot"></div>

  <!-- the scroll dive "into the illusion" (<Illusion />) is portalled into this slot, right after the About block, before the Prism -->
  <div class="about-illusion" id="fs-illusion-slot"></div>
  <!-- the rolling four-sided bar (<Prism />) is portalled into this slot, right before "Where I've worked" -->
  <div class="about-prism" id="fs-prism-slot"></div>

  <!-- ============ WHERE I'VE WORKED: opening title ============ -->
  <section class="work-intro" id="fs-work-intro" aria-label="Where I&rsquo;ve worked, introduction">
    <div class="wi-bg" aria-hidden="true"><i class="wi-glow"></i><i class="wi-grid"></i><i class="wi-line l2"></i></div>
    <h2 class="wi-title" aria-label="Where I&rsquo;ve worked">
      <span class="wi-row"><span class="wi-w">Where</span> <span class="wi-w wi-ser">I&rsquo;ve</span></span>
      <span class="wi-row"><span class="wi-w wi-out">worked</span><b class="wi-dot" aria-hidden="true"></b></span>
    </h2>
    <p class="wi-sub">Different environments. Different challenges. One continuous learning curve.</p>
    <ul class="wi-orgs">${CHAPTERS.map((ch, i) => `<li style="--c:${ch.c};--i:${i}"><span class="wi-logo${ch.sq ? ' is-sq' : ''}"><img src="${LOGO_BASE}${ch.logo}" alt="" width="64" height="64" draggable="false"></span><span class="wi-n"><b>${esc(ch.bar)}</b><em>${esc(ch.yr || '')}</em></span></li>`).join('')}</ul>
    <p class="wi-cue" aria-hidden="true"><i></i></p>
  </section>

  <!-- ============ THE DESCENT (chapters) ============ -->
  <section class="work" id="fs-work" aria-label="Where I&rsquo;ve worked">
    <div class="work-stage">${CHAPTERS.map(screen).join('')}${rail}
    </div>
  </section>

  <div class="marquee" aria-label="Skills and disciplines">
    <div class="marquee-row" data-dir="-1"><div class="marquee-track"><span>Model training</span><span class="o">Research</span><span>System design</span><span class="o">Experimentation</span><span>Product thinking</span><span class="o">Open source</span></div></div>
    <div class="marquee-row" data-dir="1"><div class="marquee-track"><span class="o">Open source</span><span>Experimentation</span><span class="o">Research</span><span>Product thinking</span><span class="o">Model training</span><span>System design</span></div></div>
  </div>

  <!-- ============ SERVICES ============ -->
  <section class="services" id="fs-services" aria-label="What I can build with you">
    <h2 class="services-head">What I can build with you</h2>
    <ul class="svc-list">
      <li class="svc" data-ico="0" data-img="/services/1-language-models.jpg" data-cursor="Ask"><a href="#contact" data-jump="contact"><span class="svc-name">Language models</span><span class="svc-desc">From model architecture and training experiments to fine-tuning, evaluation, and understanding what happens beneath the weights.</span></a></li>
      <li class="svc" data-ico="1" data-img="/services/2-ai-workflows.jpg" data-cursor="Ask"><a href="#contact" data-jump="contact"><span class="svc-name">AI-powered workflows</span><span class="svc-desc">Intelligent features that connect models, data, and users to solve specific problems without adding AI just for the sake of it.</span></a></li>
      <li class="svc" data-ico="2" data-img="/services/3-backend-integrations.jpg" data-cursor="Ask"><a href="#contact" data-jump="contact"><span class="svc-name">Backend &amp; integrations</span><span class="svc-desc">The infrastructure behind an application: API design, authentication, database architecture, integrations, and dependable data flows.</span></a></li>
      <li class="svc" data-ico="3" data-img="/services/4-web-mobile.jpg" data-cursor="Ask"><a href="#contact" data-jump="contact"><span class="svc-name">Web &amp; mobile experiences</span><span class="svc-desc">Thoughtful digital experiences, from interactive web applications to native iOS interfaces, designed around how people actually use them.</span></a></li>
      <li class="svc" data-ico="4" data-img="/services/5-research-collaboration.jpg" data-cursor="Ask"><a href="#contact" data-jump="contact"><span class="svc-name">Research collaboration</span><span class="svc-desc">Exploring unanswered questions, testing hypotheses, analysing results, and translating research into practical directions.</span></a></li>
    </ul>
    <div class="svc-preview" aria-hidden="true"><span class="svc-ring"></span><span class="svc-ico" data-i="0"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="3"/><circle cx="12" cy="34" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="36" cy="14" r="3"/><circle cx="36" cy="34" r="3"/><path d="M15 14l6 8M15 34l6-8M27 22l6-6M27 26l6 6"/></svg></span><span class="svc-ico" data-i="1"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="9" width="12" height="9" rx="2"/><rect x="30" y="9" width="12" height="9" rx="2"/><rect x="18" y="30" width="12" height="9" rx="2"/><path d="M12 18v5h24v-5M24 23v7"/></svg></span><span class="svc-ico" data-i="2"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="24" cy="12" rx="14" ry="5"/><path d="M10 12v12c0 2.8 6.3 5 14 5s14-2.2 14-5V12M10 24v12c0 2.8 6.3 5 14 5s14-2.2 14-5V24"/></svg></span><span class="svc-ico" data-i="3"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="9" width="36" height="26" rx="3"/><path d="M6 16h36M18 42h12M24 35v7"/></svg></span><span class="svc-ico" data-i="4"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7h10M21 7v12L10 38a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38 38L27 19V7"/><path d="M15 31h18"/></svg></span></div>
  </section>

  <!-- ============ PORTAL ============ -->
  <section class="portal" id="fs-portal" aria-label="Contact intro"${SHOW_PORTAL ? '' : ' hidden'}>
    <div class="portal-stage">
      <canvas id="fs-portalCanvas" aria-label="A man in a suit walks out of a burning doorway in the clouds"></canvas>
      <div class="tunnel" aria-hidden="true"><div class="tunnel-cam"></div></div>
      <div class="portal-shade" aria-hidden="true"></div>
      <p class="portal-line" data-w=".02,.2">Every descent teaches you something.</p>
      <p class="portal-line" data-w=".22,.44">Every loss curve has a story.</p>
      <p class="portal-line" data-w=".48,.72">The next chapter is ours to build.</p>
      <div class="portal-cta">
        <h2>Let’s build something that survives contact with reality.</h2>
        <div class="portal-actions">
          <a class="btn btn--solid magnet" href="#contact" data-jump="contact" data-cursor="Talk">Let’s talk</a>
          <button class="btn magnet" data-jump="top" data-cursor="Fall">Fall again</button>
        </div>
      </div>
    </div>
  </section>
`;
};

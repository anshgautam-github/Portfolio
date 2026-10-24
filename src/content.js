// All copy and links live here so the component is easy to re-skin.
export const content = {
  name: { first: "JAY", last: "CALDER" },
  headline: {
    line1: { sans: "ALWAYS", serif: "BRINGING" },
    line2: { sans: "THE", serif: "FIGHT." },
  },
  pages: [
    { label: "Home", href: "#" },
    { label: "On Track", href: "#" },
    { label: "Off Track", href: "#" },
    { label: "Calendar", href: "#" },
  ],
  store: { label: "Store", href: "#" },
  socials: [
    { label: "TikTok", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "Twitch", href: "#" },
  ],
  cta: { label: "Business Enquiries", href: "#" },
  copyright: { holder: "Jay Calder", text: "All rights reserved" },
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms", href: "#" },
  ],
  // Invented partner wordmarks - swap for real logos (SVG/PNG) when you have rights to them.
  partners: [
    { text: "Halcyon", cls: "font-serif tracking-wide text-white/90", size: 36 },
    { text: "vertex", cls: "font-display font-bold tracking-tight text-[#8db4ff]", size: 44 },
    { text: "KINETIC", cls: "font-display font-extrabold italic text-[#8db4ff]", size: 40 },
    { text: "Orbit&Co", cls: "font-display font-bold tracking-tight text-[#8db4ff]", size: 42 },
    { text: "TORQUE", cls: "font-cond font-bold tracking-[0.2em] text-[#8db4ff]", size: 40 },
    { text: "axiom", cls: "font-display font-medium text-white", size: 42 },
    { text: "QUADRA", cls: "font-cond font-bold tracking-[0.25em] text-[#8db4ff]", size: 30 },
    { text: "Bellwether", cls: "font-serif text-white/90", size: 38 },
  ],
  // "What's up on socials" fan of cards. Replace `image` with your own photo/video poster (e.g. "/cards/1.jpg").
  // Position values are on the 2000px design grid: centre x/y, rotation (deg) and size scale.
  socialsSection: {
    title: { sans: "WHAT\u2019S UP", serif: "ON SOCIALS" },
    cards: [
      { id: "l3", platform: "Instagram", handle: "@jaycalder", pattern: "stripes", palette: ["#1d1b3a", "#ff6b35", "#ffd23f", "#f4f4ee"], x: 450, y: 785, rot: -17, s: 0.74, z: 4, image: null },
      { id: "l2", platform: "TikTok", handle: "@jaycalder", pattern: "sphere", palette: ["#0c1033", "#3b4cca", "#9fb4ff", "#ffffff"], x: 551, y: 727, rot: -11, s: 0.84, z: 5, image: null },
      { id: "l1", platform: "YouTube", handle: "Jay Calder", pattern: "orbs", palette: ["#f7d9b8", "#ff8a4c", "#b84a1a", "#fff3e4"], x: 659, y: 672, rot: -6, s: 0.89, z: 6, image: null },
      { id: "c", platform: "Instagram", handle: "@jaycalder", pattern: "neon", palette: ["#07090a", "#19f58a", "#ffd21f", "#f4a300"], x: 1000, y: 588, rot: 0, s: 1, z: 7, image: null },
      { id: "r1", platform: "Twitch", handle: "jaycalder", pattern: "checker", palette: ["#e9e4da", "#ff7a00", "#161616", "#ffffff"], x: 1341, y: 672, rot: 6, s: 0.89, z: 6, image: null },
      { id: "r2", platform: "TikTok", handle: "@jaycalder", pattern: "rings", palette: ["#e0243b", "#ffffff", "#7a0c1c", "#ffd1d8"], x: 1449, y: 727, rot: 11, s: 0.84, z: 5, image: null },
      { id: "r3", platform: "YouTube", handle: "Jay Calder", pattern: "waves", palette: ["#d9d0c3", "#b9ad9c", "#8f836f", "#f1ebe1"], x: 1548, y: 785, rot: 17, s: 0.74, z: 4, image: null },
    ],
  },

  // Personal diary: click the cover, flip the pages. Everything here is placeholder-friendly: keep what is true for you, edit the rest.
  diary: {
    title: "Ansh\u2019s Personal Archive",
    owner: "Ansh Gautam",
    name: "Ansh",
    file: "personal-archive.fig",
    spine: "The Personal Archive",
    hello: "I\u2019m",
    open: "Click to explore",
    strip: "Thoughts \u00b7 Moments \u00b7 Little wins",
    volume: "Life lately",
    badge: ["OFF", "SCRIPT"],
    seal: "PERSONAL \u2022 ARCHIVE \u2022 CURIOUS \u2022 ",
    scrap: "mood: curious",
    ledger: ["still exploring"],
    pink: ["\u221e", "things to explore"],
    // sticky note on the left
    snapshot: {
      title: "Little things about me",
      rows: [["likes", "Late-night ideas"], ["hobby", "Exploring how things work"], ["currently", "Learning something new"], ["off duty", "Music \u00b7 Curiosity \u00b7 Red Bull"]],
      tally: [["01", "mind always curious"], ["02", "playlists on repeat"], ["\u221e", "things to explore"]],
      checks: ["Always asking why", "Collecting ideas, not just tabs"],
    },
    // hanging tag
    tag: { mode: ["MODE", "CURIOUS"], place: "based in india", foot: ["always exploring", "\u221e"] },
    // colourful cards on the right
    traitsTitle: "Me, in four words",
    traitsNote: "a few things I enjoy",
    traits: [
      { name: "Curious", sub: "always exploring" },
      { name: "Creative", sub: "ideas everywhere" },
      { name: "Playful", sub: "never too serious" },
      { name: "Explorer", sub: "forever learning" },
    ],
    // terminal on the right: [command, output]
    terminal: [["whoami", "ansh_gautam"], ["current_mode", "curious"], ["next_adventure", "loading..."], ["status", "always_in_progress"]],
    notes: {
      psst: "psst\u2026 there\u2019s more to me",
      terminal: "little moments, random thoughts & more",
      flip: "flip through",
    },
    cursors: ["Ansh", "You (hi!)"],
    // shown next to the arrows for each state: closed, contents, spread 2, 3, 4, last page
    captions: [
      ["Click to open my world", "(the cover is waiting)"],
      ["Contents", "(start anywhere)"],
      ["Life lately & Beyond the screen", "(what I\u2019m into right now)"],
      ["Random thoughts & Little wins", "(small things, big deal)"],
      ["Behind the scenes & On my mind", "(the unedited bits)"],
      ["The last page", "(thanks for flipping)"],
    ],
    pager: ["Cover", "Contents", "Life & beyond", "Thoughts & wins", "Behind & mind", "A note"],
    inside: { small: "this diary belongs to", hint: "if found, please return to Ansh (and say hi)", note: "a little bit of everything \u2192" },
    // the six entries inside the diary: spread = which flip state shows it (for the Contents list)
    entries: [
      { id: "life", title: "Life lately", blurb: "What I\u2019m enjoying, learning and thinking about right now.", spread: 2,
        items: [
          ["Learning", "Something new every week", "Right now: how modern AI systems actually work under the hood."],
          ["Building", "Small, working things", "Turning ideas into experiments, and experiments into real products."],
          ["On repeat", "A playlist that never ends", "Background music for late-night ideas."],
        ] },
      { id: "beyond", title: "Beyond the screen", blurb: "Music, hobbies and how I spend my free time.", spread: 2,
        items: [
          ["Music", "Always playing", "Playlists for building, thinking, and everything in between."],
          ["Red Bull", "Fuel for late-night builds", "A cold can and a quiet hour beat most brainstorms."],
          ["Curiosity", "Taking things apart", "Mentally, at least: how does it work, and why that way?"],
        ] },
      { id: "thoughts", title: "Random thoughts", blurb: "Short reflections, opinions and ideas.", spread: 3,
        items: [
          ["01", "Ask why, then ask again", "The second answer is usually the interesting one."],
          ["02", "Good engineering = good questions", "Code is the easy part once the question is right."],
          ["03", "Done is a milestone", "Better is a habit."],
        ] },
      { id: "wins", title: "Little wins", blurb: "Milestones and moments I\u2019m proud of.", spread: 3,
        items: [
          ["Built", "A language model from scratch", "Understanding it end to end, not just calling an API."],
          ["Shared", "1,800+ students mentored", "Teaching what I learn is the best way to keep learning."],
          ["Shipped", "AI apps & backends", "From first commit to something real people could use."],
        ] },
      { id: "behind", title: "Behind the scenes", blurb: "Funny moments, lessons learned and stories from the journey.", spread: 4,
        items: [
          ["Late nights", "Broken builds, fixed builds", "Every working demo has a pile of failed attempts behind it."],
          ["Lesson", "Read the error message first", "It\u2019s usually telling you exactly what\u2019s wrong."],
          ["Truth", "Most bugs are assumptions", "Just wearing a disguise."],
        ] },
      { id: "mind", title: "On my mind", blurb: "Books, technologies and ideas I\u2019m curious about.", spread: 4,
        items: [
          ["How", "Machines learn", "Models, retrieval, agents, and what comes next."],
          ["Why", "Some products stick", "What makes something people actually use?"],
          ["Next", "What to learn next", "The list only ever gets longer."],
        ] },
    ],
    closing: { line: "That\u2019s a little more of me.", sub: "Thanks for flipping through.", cta: { label: "Say hello", href: "#" } },
  },

  // Closing call-to-action ("Want to see how I enable companies?"). Put your photo in /public (e.g. "/me.jpg") and set `avatar`;
  // until then the toggle shows a monogram made from `initials`.
  outro: {
    line1: "Want to see",
    line2a: "how I",
    line2b: "enable",
    line3: "companies?",
    toggleLabel: "Enable",
    sub: "A few projects I\u2019m proud of, built with industry-leading corporations and independent partners alike.",
    button: { label: "View all works", href: "#" },
    avatar: "",
    initials: "AG",
  },
  // Landing hero with the cursor image-trail. Add your own photos via `image` ("/trail/1.jpg"); sizes are in vw.
  // Scroll showcase: `null` in parts = a thumbnail slot (in order of `images`). Swap copy + /public/showcase/*.jpg freely.
  showcase: {
    parts: ["Butter", null, "is the first video", null, "editor where creatives can", null, "build and remix", null, "custom design tools", null, "right on timeline."],
    images: ["/showcase/1.jpg", "/showcase/2.jpg", "/showcase/3.jpg", "/showcase/4.jpg", "/showcase/5.jpg"],
  },
  // Pinned card-stack sequence
  // "A few things I've picked up" — cover art splits into three cards that turn over
  picked: {
    title: "A few things I\u2019ve picked up along the way",
    cover: "", // optional: path to your own wide image (e.g. "/picked/cover.jpg"); empty = built-in artwork
    cards: [
      {
        no: "(01)",
        title: "Academic\nFoundation",
        lines: [
          { t: "B.Tech Computer Science & Engineering", strong: true },
          { t: "SRM Institute of Science and Technology" },
        ],
        big: { label: "CGPA", value: "9.01", suffix: "/ 10" },
        bg: "radial-gradient(70% 55% at 85% 35%, #7fb35f 0%, transparent 70%), radial-gradient(60% 40% at 20% 20%, #e9e58f 0%, transparent 70%), linear-gradient(160deg, #dfe59a 0%, #c9dc8a 45%, #eef0b8 100%)",
      },
      {
        no: "(02)",
        title: "Experience &\nLeadership",
        entries: [
          { n: "01", role: "Full Stack AI Intern", meta: "Genospark \u00b7 Dec 2025 \u2013 Mar 2026", text: "Built AI applications and backend systems using FastAPI, APIs, RBAC and database integration." },
          { n: "02", role: "Technical Head \u00b7 Web App Domain", meta: "IEEE GRSS \u00b7 Mar 2025 \u2013 May 2026", text: "Led web development projects, guided team members and helped turn requirements into working applications." },
        ],
        bg: "radial-gradient(60% 45% at 25% 25%, #ffd1e4 0%, transparent 70%), radial-gradient(70% 50% at 80% 85%, #f6a9cf 0%, transparent 70%), linear-gradient(170deg, #f7bfd8 0%, #f2b5d1 50%, #ffd3c2 100%)",
      },
      {
        no: "(03)",
        title: "Certifications",
        list: [
          "SAP Certified \u2014 Generative AI Developer",
          "Microsoft Certified \u2014 SQL / AI Developer Associate",
          "AWS Certified \u2014 Cloud Practitioner",
          "Fortinet Certified \u2014 FCP Cloud Security",
          "Unity Certified \u2014 Programmer",
        ],
        bg: "linear-gradient(115deg, transparent 20%, rgba(255,236,190,0.55) 48%, transparent 62%), radial-gradient(80% 50% at 15% 85%, #8cc6ee 0%, transparent 70%), linear-gradient(160deg, #cfe6f8 0%, #a9d3f2 55%, #bfe3f6 100%)",
      },
    ],
  },

  toolkit: {
    title: "My Arsenal",
    mark: "jc",
    finaleLabel: "Transition",
    hudLeft: "Tech Stack / 001",
    hudRight: "AI \u00b7 Engineering \u00b7 Product Development",
    endColor: "#ece7d3", // the panel that fills the screen at the end; matches the next section so the hand-off is seamless
    // the radar's six axes, clockwise from the top-right; v = how strong (0-1) - tune these to your own honest levels
    axes: [
      { k: "AI & Machine Learning", v: 0.9 },
      { k: "Backend Engineering", v: 0.82 },
      { k: "LLM Engineering", v: 0.78 },
      { k: "Databases & Infrastructure", v: 0.72 },
      { k: "Developer Tools", v: 0.66 },
      { k: "Frontend Engineering", v: 0.6 },
    ],
    // floating, draggable bubbles in the background
    bubbles: [
      { name: "Python", bg: "#2b5b84", fg: "#ffd43b" },
      { name: "Java", bg: "#e76f00", fg: "#ffffff" },
      { name: "JavaScript", bg: "#ecdc6a", fg: "#1f2020" },
      { name: "SQL", bg: "#0b1e3a", fg: "#4aa3f5" },
      { name: "React", bg: "#232832", fg: "#67bdd8" },
      { name: "HTML & CSS", bg: "#e44d26", fg: "#ffffff" },
      { name: "Tailwind", bg: "#0f172a", fg: "#38bdf8" },
      { name: "PyTorch", bg: "#ee4c2c", fg: "#ffffff" },
      { name: "Transformers", bg: "#ffd21e", fg: "#1f1f1f" },
      { name: "LangChain", bg: "#12302b", fg: "#7ee0b5" },
      { name: "LangGraph", bg: "#2b2d42", fg: "#9be7ff" },
      { name: "RAG", bg: "#6c47ff", fg: "#ffffff" },
      { name: "Embeddings", bg: "#0f766e", fg: "#d1fae5" },
      { name: "FastAPI", bg: "#05998b", fg: "#ffffff" },
      { name: "REST APIs", bg: "#f59e0b", fg: "#1f2020" },
      { name: "PostgreSQL", bg: "#336791", fg: "#ffffff" },
      { name: "pgvector", bg: "#1e3a8a", fg: "#93c5fd" },
      { name: "Supabase", bg: "#161616", fg: "#3ecf8e" },
      { name: "FAISS", bg: "#0866ff", fg: "#ffffff" },
      { name: "Chroma", bg: "#ff6446", fg: "#ffffff" },
      { name: "Git", bg: "#f05032", fg: "#ffffff" },
      { name: "GitHub", bg: "#0d1117", fg: "#ffffff" },
      { name: "Render", bg: "#46e3b7", fg: "#0b1e3a" },
      { name: "Vercel", bg: "#000000", fg: "#ffffff" },
    ],
    scenes: [
      {
        subtitle: "Languages & Frameworks",
        cards: [
        { name: "Python", tag: "Language", bg: "#2b5b84", fg: "#ffd43b", tagBg: "#ffd43b", tagFg: "#2b5b84" },
        { name: "Java", tag: "Language", bg: "#e76f00", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#e76f00" },
        { name: "Java\nscript", tag: "Language", bg: "#ecdc6a", fg: "#1f2020", tagBg: "#1f2020", tagFg: "#ecdc6a" },
        { name: "SQL", tag: "Query language", bg: "#0b1e3a", fg: "#4aa3f5", tagBg: "#4aa3f5", tagFg: "#0b1e3a" },
        { name: "React", tag: "UI library", bg: "#232832", fg: "#67bdd8", tagBg: "#67bdd8", tagFg: "#232832" },
        { name: "Tail\nwind", tag: "CSS framework", bg: "#0f172a", fg: "#38bdf8", tagBg: "#38bdf8", tagFg: "#0f172a" },
        { name: "Fast\nAPI", tag: "Backend framework", bg: "#05998b", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#05998b" },
        { name: "Py\nTorch", tag: "ML framework", bg: "#ee4c2c", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#ee4c2c" },
        ],
      },
      {
        subtitle: "AI, Data & Infrastructure",
        cards: [
        { name: "Lang\nChain", tag: "LLM framework", bg: "#12302b", fg: "#7ee0b5", tagBg: "#7ee0b5", tagFg: "#12302b" },
        { name: "Postgre\nSQL", tag: "Database", bg: "#336791", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#336791" },
        { name: "Supa\nbase", tag: "Backend platform", bg: "#161616", fg: "#3ecf8e", tagBg: "#3ecf8e", tagFg: "#161616" },
        { name: "GitHub", tag: "Version control", bg: "#0d1117", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#0d1117" },
        ],
      },
    ],
  },
  // Scroll journey: orbit -> India -> Chennai -> campus -> me
  journey: {
    label: "Where I build from",
    length: 11.7, // scroll length in viewport heights
    // The story is told by the stage text itself: `body` is written word by word as you scroll (`write` = [from, to] in flight progress),
    // *word* = highlighted. `range` = [fades in from, fully in, starts fading, gone].
    stages: [
      { tag: "01 / ORBIT", title: ["THE", "PLANET"], pos: "tl", body: "Every story begins somewhere. This one begins on a small blue planet, drifting in the dark\u2026 *Scroll* \u2014 and follow Ansh home.", cap: "35,786 km · geostationary", range: [-0.1, -0.05, 0.1, 0.16], write: [0.0, 0.07] },
      { tag: "02 / COUNTRY", title: ["INDIA"], pos: "bl", body: "Look closely. A country called *INDIA* \u2014 a billion stories, and one of them is *Ansh\u2019s*. Follow the coastline south-east. The story is about to get *personal*.", cap: "20.59°N · 78.96°E", range: [0.14, 0.19, 0.3, 0.355], write: [0.15, 0.27] },
      { tag: "03 / CITY", title: ["CHENNAI"], pos: "bl", body: "Past the Bay of Bengal, on India\u2019s south-east coast: *Chennai*. Filter coffee, the Marina at dusk, and the city Ansh builds from.", cap: "13.0827°N · 80.2707°E", range: [0.375, 0.405, 0.47, 0.5], write: [0.385, 0.45] },
      { tag: "04 / TOWN", title: ["KATTAN-", "KULATHUR"], pos: "bl", body: "Then GST Road. The city thins out, the noise fades, and a *campus* appears on the horizon.", cap: "12.8231°N · 80.0442°E", range: [0.5, 0.53, 0.58, 0.62], write: [0.505, 0.56] },
      { tag: "05 / CAMPUS", title: ["SRM", "INSTITUTE"], pos: "bl", body: "SRM Institute of Science and Technology. This is where Ansh studies Computer Science, and where *\u201cwhat if\u2026\u201d* turns into real projects.", cap: "CGPA 9.01 · Computer Science & Engineering", range: [0.62, 0.66, 0.79, 0.83], write: [0.63, 0.74] },
      { tag: "06 / THE CORE", title: ["ANSH", "GAUTAM"], pos: "c", body: "Late nights. Broken builds. Fixed builds. *AI*, full-stack, a community to lead at IEEE GRSS \u2014 it all leads to one place. Full Stack AI Intern \u00b7 Technical Head, IEEE GRSS.", cap: "", cta: "Scroll once more - meet Ansh", range: [0.83, 0.88, 1.1, 1.2], write: [0.84, 0.97] },
    ],
  },

  // "Let's grow" garden section
  garden: {
    blurb: "From curious ideas to intelligent systems, I build AI-powered products and software that turn possibilities into something real.",
    title: "Let\u2019s grow your next idea",
    hint: "Water me",
    full: "In full bloom",
    credit: "Designed & built by Jay Calder \u00b7 2026",
    links: [
      { label: "LinkedIn", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "Behance", href: "#" },
    ],
  },
  hero: {
    name: "jay calder",
    nav: ["Cases", "Services", "About"],
    inquire: "Inquire",
    statement:
      "An independent developer crafting fast, considered websites for people who are building something worth noticing.",
    taglines: [
      ["Fast, considered websites.", "Interfaces that feel alive."],
      ["For teams", "that ship with care."],
    ],
    pill: "[ move cursor for magic ]",
    badge: "Available",
    trail: [
      { pattern: "orbs", palette: ["#f7d9b8", "#ff8a4c", "#b84a1a", "#fff3e4"], w: 8.2, ratio: 0.72, image: null },
      { pattern: "stripes", palette: ["#1d1b3a", "#ff6b35", "#ffd23f", "#f4f4ee"], w: 7.2, ratio: 0.78, image: null },
      { pattern: "sphere", palette: ["#0c1033", "#3b4cca", "#9fb4ff", "#ffffff"], w: 8.8, ratio: 0.7, image: null },
      { pattern: "checker", palette: ["#e9e4da", "#ff7a00", "#161616", "#ffffff"], w: 7.6, ratio: 0.74, image: null },
      { pattern: "rings", palette: ["#e0243b", "#ffffff", "#7a0c1c", "#ffd1d8"], w: 8.4, ratio: 0.68, image: null },
      { pattern: "waves", palette: ["#d9d0c3", "#b9ad9c", "#8f836f", "#f1ebe1"], w: 7.8, ratio: 0.76, image: null },
      { pattern: "neon", palette: ["#07090a", "#19f58a", "#ffd21f", "#f4a300"], w: 8.6, ratio: 0.72, image: null },
      { pattern: "orbs", palette: ["#cfe8ff", "#2f7bff", "#0b2a6b", "#eaf3ff"], w: 7.4, ratio: 0.8, image: null },
      { pattern: "stripes", palette: ["#fff0d6", "#e63946", "#1d3557", "#f1faee"], w: 8, ratio: 0.7, image: null },
      { pattern: "waves", palette: ["#d8f3dc", "#40916c", "#1b4332", "#b7e4c7"], w: 8.4, ratio: 0.74, image: null },
      { pattern: "rings", palette: ["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c"], w: 7.6, ratio: 0.78, image: null },
      { pattern: "sphere", palette: ["#3a0ca3", "#f72585", "#ffd6ff", "#ffffff"], w: 8.2, ratio: 0.72, image: null },
    ],
  },
};

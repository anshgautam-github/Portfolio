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

  // Creative diary: click the cover, flip the pages. Add every internship / role to `experience` - they all appear on ONE page
  // (it scales its text down automatically past 5 entries). Education + certifications are read from `picked` above.
  diary: {
    title: "Ansh\u2019s Experience Archive",
    owner: "Ansh Gautam",
    name: "Ansh",
    volume: "2025\u201326",
    strip: "Learn \u00b7 Build \u00b7 Ship",
    // shown on the desk snapshot card next to the diary
    stack: ["FastAPI", "RBAC", "APIs", "Databases"],
    highlights: ["Shipped AI apps & backends", "Led a web dev team"],
    // [title, subtitle] shown next to the arrows for each spread: closed, contents, experience, education, last page
    captions: [
      ["Open the diary", "(click the cover)"],
      ["Contents", "(start anywhere)"],
      ["Experience & Certifications", "(every internship, one page)"],
      ["Education & Project", "(SRM \u00b7 Metaverse mini-project)"],
      ["The last page", "(thanks for flipping)"],
    ],
    experience: [
      { company: "Genospark", role: "Full Stack AI Intern", period: "Dec 2025 \u2013 Mar 2026", text: "Built AI applications and backend systems using FastAPI, APIs, RBAC and database integration." },
      { company: "IEEE GRSS", role: "Technical Head \u00b7 Web App Domain", period: "Mar 2025 \u2013 May 2026", kind: "Leadership", text: "Led web development projects, guided team members and helped turn requirements into working applications." },
      // { company: "Company", role: "Role", period: "Mon YYYY \u2013 Mon YYYY", text: "One line about what you built or learned." },
    ],
    project: {
      title: "Virtual Campus Explorer",
      course: "Metaverse Fundamentals \u00b7 21CSE445T",
      text: "A mini-project for the Metaverse Fundamentals course: a virtual campus you can walk around and explore.",
      tags: ["Metaverse", "3D", "Virtual campus"],
    },
    closing: { line: "That\u2019s the story so far.", sub: "More pages are being written.", cta: { label: "Say hello", href: "#" } },
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
    title: "Toolkit",
    mark: "jc",
    finaleLabel: "Transition",
    endColor: "#ece7d3", // the panel that fills the screen at the end; matches the next section so the hand-off is seamless
    scenes: [
      {
        subtitle: "Creative Front-end",
        cards: [
        { name: "Java\nscript", tag: "Language", bg: "#ecdc6a", fg: "#1f2020", tagBg: "#1f2020", tagFg: "#ecdc6a" },
        { name: "three\n.js", tag: "3D Library", bg: "#ffffff", fg: "#000000", tagBg: "#000000", tagFg: "#ffffff" },
        { name: "GLSL", tag: "Shader language", bg: "#000000", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#000000", learning: true },
        { name: "GSAP", tag: "Motion Library", bg: "#0f1211", fg: "#4ee05a", tagBg: "#4ee05a", tagFg: "#0f1211", learning: true },
        { name: "Vue", tag: "Framework", bg: "#6cb890", fg: "#3f4a62", tagBg: "#3f4a62", tagFg: "#6cb890" },
        { name: "React", tag: "Framework", bg: "#232832", fg: "#67bdd8", tagBg: "#67bdd8", tagFg: "#232832", learning: true },
        { name: "Web\nflow", tag: "Website builder", bg: "#ffffff", fg: "#2d62e8", tagBg: "#2d62e8", tagFg: "#ffffff" },
        { name: "Shopify", tag: "E-commerce platform", bg: "#9bbf5a", fg: "#ffffff", tagBg: "#ffffff", tagFg: "#9bbf5a" },
        ],
      },
      {
        subtitle: "Art Direction",
        cards: [
        { name: "Figma", letters: ["#e8532f", "#f0624d", "#9a5cf0", "#3db4f2", "#4cc48a"], tag: "Design tool", bg: "#222323", fg: "#ffffff", tagBg: "#ee7060", tagFg: "#3a1c18" },
        { name: "Photo\nshop", tag: "Image editor", bg: "#0b1e3a", fg: "#4aa3f5", tagBg: "#4aa3f5", tagFg: "#0b1e3a" },
        { name: "Illu\nstrator", tag: "Vector design", bg: "#300302", fg: "#f19a2a", tagBg: "#f19a2a", tagFg: "#300302" },
        { name: "In\nDesign", tag: "Layout tool", bg: "#46081e", fg: "#e8486c", tagBg: "#e8486c", tagFg: "#46081e" },
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
    blurb: "Whether it's a rough idea or a product ready to scale, I help ambitious teams build websites that feel fast, considered, and alive.",
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

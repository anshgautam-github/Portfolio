// Edit the projects here. `device` is "laptop" or "phones"; `side` is which side the TEXT sits on.
// Extras: `tags` (pills), `role` / `year` (meta row), `chips` (two floating stat badges beside the device).
// Optional: `image` (laptop) / `images` (phones, [back, front]) = paths in /public to show real screenshots
// on the devices instead of the built-in mock interfaces.
export const projects = [
  {
    id: "llm",
    tags: ["PyTorch", "Transformers", "LLM"],
    role: "Solo builder",
    year: "2026",
    chips: [],
    no: "01",
    title: "GPT-2 built from scratch",
    text: "A GPT-2 language model in pure PyTorch: tokenizer, attention, pretraining, loading OpenAI's weights, and fine-tuning.",
    cta: "View on GitHub",
    href: "https://github.com/anshgautam-github/llm-from-scratch",
    device: "laptop",
    side: "left",
    image: null, // drop a screenshot in /public and set e.g. "/llm.png" to show it on the laptop
    screen: { chapter: "Pretraining", heading: "GPT-2 built from scratch", card: "Overview" },
    stats: [
      { v: "163M", k: "Parameters" },
      { v: "12 \u00b7 12", k: "Layers \u00b7 heads" },
      { v: "0", k: "transformers-library dependencies" },
      { v: "2", k: "Fine-tuning types (partial + full)" },
    ],
    credit: "Based on Raschka\u2019s Build an LLM from Scratch, re-engineered as a package.",
  },
  {
    id: "tracker",
    tags: ["Swift", "iOS", "App Store"],
    chips: [],
    no: "02",
    title: "CineMyst",
    text: "A next-generation iOS app bridging aspiring artists and real opportunities in the film industry, built because too many talented people in India are shut out of genuine auditions by closed networks and a lack of transparency.",
    features: [
      { t: "Discover verified auditions", d: "Authentic casting calls from trusted casting directors and production houses." },
      { t: "Build your digital portfolio", d: "A professional profile with photos, videos and past work." },
      { t: "Apply instantly", d: "Submit auditions in a few taps, no middlemen." },
      { t: "Get noticed", d: "Connect with industry professionals actively looking for talent." },
      { t: "Transparent opportunities", d: "Only genuine, verified listings, reducing scams and fake calls." },
    ],
    who: ["Actors & Performers", "Models", "Filmmakers & Casting Directors", "Content Creators"],
    credit: "No connections? No problem. Just talent.",
    cta: "View on the App Store",
    href: "#", // TODO: paste the CineMyst App Store link
    device: "phones",
    side: "right",
    ghost: "プロジェクト",
    images: null,
  },
  {
    id: "dashboard",
    tags: ["Career platform", "Opportunities", "Roadmaps"],
    chips: [],
    no: "03",
    title: "OwnMove",
    text: "Built from the question I heard most as a Profile Building Mentor at SRM Directorate of Career Center: \u201cbhaiya, how do you find so many opportunities?\u201d A place to discover opportunities, understand where you stand, and actually take action.",
    features: [
      { t: "Discover opportunities", d: "Find openings without spending hours searching for them." },
      { t: "Understand where you stand", d: "See your current position before deciding your next step." },
      { t: "Explore career paths", d: "Look at the routes open to you." },
      { t: "Build your roadmap", d: "Turn a goal into a plan you can follow." },
      { t: "Take action", d: "Move from knowing to doing." },
    ],
    credit: "You asked, I built. Your next move starts here.",
    cta: "Visit OwnMove",
    href: "https://www.ownmove.in/",
    device: "laptop",
    side: "left",
    image: null, // drop a screenshot in /public and set e.g. "/ownmove.png" to show it on the laptop
    screen: { chapter: "Your roadmap", heading: "Your next move starts here", card: "Opportunities" },
  },
];

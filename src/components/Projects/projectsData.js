// Edit the projects here. `device` is "laptop" or "phones"; `side` is which side the TEXT sits on.
// Extras: `tags` (pills), `role` / `year` (meta row), `chips` (two floating stat badges beside the device).
// Optional: `image` (laptop) / `images` (phones, [back, front]) = paths in /public to show real screenshots
// on the devices instead of the built-in mock interfaces.
export const projects = [
  {
    id: "llm",
    tags: ["PyTorch", "Transformers", "LLM"],
    chips: [],
    no: "01",
    title: "GPT-2 built from scratch",
    text: "A GPT-2 language model in pure PyTorch: tokenizer, attention, pretraining, loading OpenAI's weights, and fine-tuning.",
    cta: "View on GitHub",
    href: "https://github.com/anshgautam-github/llm-from-scratch",
    device: "laptop",
    side: "left",
    image: "/gpt2.jpg",
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
    featured: [
      { n: "Swift Chennai", i: "SC", logo: "/logo-swift.jpg" },
      { n: "IndeHub", i: "IH", logo: "/logo-indehub.jpg" },
    ],
    who: ["Actors & Performers", "Models", "Filmmakers & Casting Directors", "Content Creators"],
    credit: "No connections? No problem. Just talent.",
    cta: "View on the App Store",
    href: "#", // TODO: paste the CineMyst App Store link
    device: "phones",
    side: "right",
    ghost: "プロジェクト",
    images: ["/cinemyst-1.jpg", "/cinemyst-2.jpg"], // [back, front]
  },
  {
    id: "dashboard",
    tags: ["Career platform", "Opportunities", "Roadmaps"],
    chips: [],
    no: "03",
    title: "OwnMove",
    text: "Built from the question I heard most as a Profile Building Mentor at SRM Directorate of Career Center: \u201cbhaiya, how do you find so many opportunities?\u201d A place to discover opportunities, understand where you stand, and actually take action.",
    impact: [
      { to: 2100, suffix: "+", k: "Visitors" },
      { to: 100, suffix: "+", k: "Students helped" },
    ],
    credit: "You asked, I built. Your next move starts here.",
    cta: "Visit OwnMove",
    href: "https://www.ownmove.in/",
    device: "laptop",
    side: "left",
    image: "/ownmove.jpg",
    screen: { chapter: "Your roadmap", heading: "Your next move starts here", card: "Opportunities" },
  },
];

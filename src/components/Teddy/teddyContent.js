// Everything Teddy "knows". Almost all of it is read straight from src/content.js so the
// assistant stays in sync with the rest of the portfolio. The few things that are NOT in
// content.js (chart numbers, jokes, starter sticky notes) live at the bottom - edit freely.
import { content } from "../../content.js";

const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const flat = (s) => s.replace(/\n/g, "");

const [eduCard, expCard, certCard] = content.picked.cards;

export const teddy = {
  owner: content.diary?.owner || title(content.hero.name), // "Ansh Gautam"
  first: (content.diary?.owner || title(content.hero.name)).split(" ")[0], // "Ansh"
  statement: content.hero.statement,
  availability: content.hero.badge, // "Available"
  education: {
    lines: eduCard.lines.map((l) => l.t),
    cgpa: `${eduCard.big.value} ${eduCard.big.suffix}`,
  },
  experience: expCard.entries.map((e) => ({ role: e.role, meta: e.meta, text: e.text })),
  certs: certCard.list,
  skills: content.toolkit.scenes.flatMap((s) => s.cards.map((c) => flat(c.name))),
  learning: content.toolkit.scenes.flatMap((s) => s.cards.filter((c) => c.learning).map((c) => flat(c.name))),
  links: content.garden.links,

  /* ---------------- placeholders: edit me ---------------- */
  // "SKILL LOAD" pareto chart (label, weight). Weights are illustrative.
  skillLoad: [
    ["React", 34],
    ["JavaScript", 26],
    ["GSAP", 14],
    ["three.js", 10],
    ["FastAPI", 7],
    ["Vue", 4],
    ["GLSL", 3],
    ["Figma", 2],
  ],
  // "PROJECT MIX" pareto chart
  projectMix: [
    ["Web", 40],
    ["AI", 25],
    ["3D", 12],
    ["Games", 9],
    ["Design", 7],
    ["Tools", 4],
  ],
  jokes: [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "I would tell you a UDP joke, but you might not get it.",
    "There are 10 kinds of people: those who read binary and those who don't.",
    "A SQL query walks into a bar, sees two tables and asks: can I join you?",
    "Why did the panda refuse to deploy on Friday? Too much bamboo in the backlog.",
    "It works on my machine. - every panda, ever",
  ],
  // starter sticky notes (fx / fy are 0..1 positions inside the board)
  notes: [
    { text: "welcome to the den!", color: "yellow", fx: 0.04, fy: 0.05, rot: -6 },
    { text: "psst... type help in the terminal", color: "pink", fx: 0.72, fy: 0.06, rot: 5 },
    { text: "coffee first", color: "orange", fx: 0.4, fy: 0.5, rot: -3 },
    { text: "do not unplug", color: "purple", fx: 0.05, fy: 0.58, rot: 4 },
    { text: "drag me around", color: "yellow", fx: 0.7, fy: 0.55, rot: 7 },
  ],
};

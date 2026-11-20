// The "Where I've worked" experiences. Plain data, kept apart from the <Freefall /> component so that <FreefallStory /> (chapters.js) can read it
// without pulling the whole Freefall component and its stylesheet into the page bundle.
export const EXPERIENCES = [
  {
    art: 1, theme: ["#e0453c", "#7b1623", "#0e1020"], glow: "#4267f5", tag: "ON-SITE", rail: "Railway", short: "East Central Railway", yr: "Dec 25", logo: "ecr.png",
    n: "Information Technology Intern",
    company: "East Central Railway", kind: "Internship", when: "Dec 2025 \u2013 Jan 2026 \u00b7 2 mos",
    text: "Worked with enterprise IT systems and day-to-day technical operations, gaining exposure to the infrastructure and processes that support large-scale public-sector operations.",
    skills: ["Enterprise IT", "Network Operations", "IT Infrastructure"],
  },
  {
    art: 5, theme: ["#14b8a6", "#0f524d", "#091624"], glow: "#14b8a6", tag: "HYBRID", rail: "Seven Hills", short: "Seven Hills National", yr: "Dec 25", logo: "shn.png",
    n: "Web Developer",
    company: "Seven Hills National", kind: "Internship", when: "Dec 2025 \u2013 Jan 2026 \u00b7 2 mos", place: "Chennai, Tamil Nadu, India",
    text: "Led an awesome team of 4 devs and built responsive web apps.",
    skills: ["React.js", "Team Lead (4 Devs)", "Responsive Web"],
  },
  {
    art: 6, theme: ["#3b82f6", "#1e3a8a", "#091226"], glow: "#3b82f6", tag: "ON-SITE", rail: "Infosys", short: "Infosys", yr: "Mar 26", logo: "infosys.png",
    n: "iOS Developer",
    company: "Infosys", kind: "Internship", when: "Mar 2026 \u00b7 1 mo", place: "Mysore, Karnataka, India",
    text: "Completed an iOS Development Internship with Infosys through the SRM \u00d7 Apple \u00d7 Infosys collaboration.",
    skills: ["iOS & Swift", "Apple \u00d7 Infosys", "Mobile Architecture"],
  },
  {
    art: 8, theme: ["#f59e0b", "#784b12", "#14110e"], glow: "#f59e0b", tag: "REMOTE", rail: "SDG Research", short: "SDG & Policy Research", yr: "Oct 25", logo: "iisppr.png", sq: true,
    n: "Research Intern \u2192 Head of Research",
    company: "International Institute of SDG\u2019s and Public Policy Research", kind: "Internship", when: "Oct \u2013 Dec 2025 \u00b7 3 mos", place: "Remote \u00b7 Delhi, India",
    text: "Started as a Research Intern and progressed to Head of Research, leading a team of nine and contributing to research initiatives focused on sustainable development and public policy.",
    skills: ["Research Leadership", "Team Management", "Public Policy"],
  },
];

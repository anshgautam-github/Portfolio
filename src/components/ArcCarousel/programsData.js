/* Programs & communities - real entries (dates / places / blurbs from LinkedIn). `acc` = [light, deep] card colours. */
export const programs = [
  {
    title: "Amazon ML Summer School", org: "Amazon", logo: "amazon", acc: ["#ff9a3d", "#b3470a"],
    year: "Jul – Aug 2026", category: "Machine Learning", duration: "2 mos", place: "Remote", mode: "Remote",
    text: "Explored the fundamentals of machine learning through sessions led by Amazon scientists and engineers.",
    tags: ["Machine Learning", "Amazon", "Summer School"],
  },
  {
    title: "Edge AI & Robotics Summer School", org: "Indian Institute of Science", short: "IISc", logo: "iisc", acc: ["#e0b25a", "#6b3b12"],
    year: "Jul 2026", category: "Edge AI", duration: "1 mo", place: "Bengaluru, Karnataka", mode: "On-site",
    text: "Selected as 1 of 100 students from across India for the Edge AI & Robotics Summer School at the Indian Institute of Science (IISc), Bangalore.",
    tags: ["Edge AI", "Robotics", "IISc", "Top 100"], badge: "1 of 100",
  },
  {
    title: "IBM Z Student Ambassador", org: "IBM", logo: "ibm", acc: ["#5b8cff", "#12307a"],
    year: "Oct – Dec 2025", category: "Ambassador", duration: "3 mos", place: "Chennai, Tamil Nadu", mode: "Hybrid",
    text: "Represent IBM Z and mainframe technology on campus, with the main goal of raising awareness among peers.",
    tags: ["IBM Z", "Mainframe", "Campus Lead"],
  },
  {
    title: "iOS App Developer", org: "iOS Development Center · SRMIST", short: "SRM iOS DC", logo: "ios", acc: ["#ff7a45", "#a3260f"],
    year: "Jul 2025 – Jan 2026", category: "Mobile", duration: "7 mos", place: "Chennai, Tamil Nadu", mode: "On-site",
    text: "Selected as 1 of the top 100 students (from 1000+ applicants) for SRM's iOS Development Center, a program in collaboration with Apple & Infosys.",
    tags: ["iOS", "Swift", "Apple", "Infosys"], badge: "Top 100 / 1000+",
  },
  {
    title: "McKinsey Forward Program", org: "McKinsey & Company", logo: "mckinsey", acc: ["#3d7bff", "#0a1f66"],
    year: "Apr – Jul 2025", category: "Leadership", duration: "4 mos", place: "Remote", mode: "Remote",
    text: "Selected for the McKinsey Forward Program, exploring problem solving, leadership, communication and practical business skills.",
    tags: ["Problem Solving", "Leadership", "Business"],
  },
  {
    title: "GirlScript Summer of Code", org: "GirlScript Foundation", short: "GSSoC", logo: "gssoc", acc: ["#ff8a4c", "#a82f5e"],
    year: "May 2024 – Nov 2025", category: "Open Source", duration: "1 yr 7 mos", place: "Chennai · Remote", mode: "On-site / Remote",
    text: "Two years inside GSSoC, first contributing to open-source projects, then selected as a Campus Ambassador for the 2025 edition.",
    roles: [
      { name: "Campus Ambassador", period: "Jul – Nov 2025 · 5 mos", note: "Selected as a Campus Ambassador for GirlScript Summer of Code (GSSoC).", where: "Chennai · On-site" },
      { name: "Contributor", period: "May 2024 – Aug 2025 · 1 yr 4 mos", note: "Contributed to open-source projects as part of GirlScript Summer of Code (GSSoC).", where: "Remote" },
    ],
    tags: ["Open Source", "Campus Ambassador", "Contributor"],
  },
  {
    title: "Microsoft Learn Student Ambassadors", org: "Microsoft", short: "MLSA", logo: "microsoft", acc: ["#4fa3ff", "#0b3a6e"],
    year: "Jul 2024 – Dec 2025", category: "Ambassador", duration: "1 yr 6 mos", place: "United States", mode: "Remote",
    text: "Grew through every level of the Microsoft Learn Student Ambassadors program, from Student Ambassador to Alpha and then Beta.",
    roles: [
      { name: "Beta Student Ambassador", period: "Dec 2024 – Dec 2025 · 1 yr 1 mo", note: "Promoted to the Beta level in the Microsoft Learn Student Ambassadors program." },
      { name: "Alpha Student Ambassador", period: "Jul 2024 – Dec 2024 · 6 mos", note: "Promoted to the Alpha level in the Microsoft Learn Student Ambassadors program." },
      { name: "Student Ambassador", period: "Jul 2024 · 1 mo", note: "Joined the Microsoft Learn Student Ambassadors program." },
    ],
    tags: ["Community", "Microsoft", "Alpha → Beta"], badge: "Beta",
  },
  {
    title: "Hacktoberfest Open Source Contributor", org: "Hacktoberfest", logo: "hacktoberfest", acc: ["#6fa392", "#1f3a33"],
    year: "Oct 2024", category: "Open Source", duration: "1 mo", place: "Remote", mode: "Remote",
    text: "Contributed to Hacktoberfest by making open-source contributions across different projects.",
    tags: ["Open Source", "Hacktoberfest", "Git"],
  },
].map((p) => ({
  ...p, kind: "program", role: p.roles ? p.roles[0].name : p.title,
  chips: [{ k: "Duration", v: p.duration }, { k: p.mode, v: p.short || p.org.split(" ")[0] }],
}));

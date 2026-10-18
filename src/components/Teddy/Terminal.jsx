import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { teddy } from "./teddyContent.js";

let uid = 0;
const L = (kind, text, extra) => ({ id: ++uid, kind, text, ...extra });
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const HELP = [
  ["about", "who is this?"],
  ["education", "where i studied"],
  ["experience", "where i've worked"],
  ["certs", "badges collected"],
  ["skills", "the toolkit"],
  ["contact", "get in touch"],
  ["ask <anything>", "ask me a question"],
  ["hug", "give panda a hug"],
  ["joke", "a dev joke, as ordered"],
  ["dance", "panda dances"],
  ["theme [name]", "glass | amber | green | ice | rose"],
  ["sound [on|off]", "keyboard + UI blips"],
  ["top / bottom", "scroll the page"],
  ["clear · reboot · exit", "housekeeping"],
];

const CHIPS = ["help", "about", "skills", "experience", "education", "certs", "contact", "hug", "joke", "dance"];
const NAMES = [
  "help", "about", "whoami", "education", "experience", "certs", "skills", "contact", "socials", "ask", "hug", "joke",
  "dance", "theme", "sound", "top", "bottom", "clear", "reboot", "exit", "hi", "hello", "date", "ls", "cat", "pwd",
  "echo", "coffee", "sudo",
];

const ANSWERS = [
  [/(who|name|about|yourself|introduce)/, () => ["about"]],
  [/(educat|college|universit|school|study|degree|cgpa|gpa|grade|srm)/, () => ["education"]],
  [/(experience|intern|job|work|career|role|lead|ieee|genospark)/, () => ["experience"]],
  [/(cert|badge|aws|microsoft|sap|fortinet|unity)/, () => ["certs"]],
  [/(skill|stack|tech|tool|language|framework|know|react|gsap|three|learn)/, () => ["skills"]],
  [/(hire|available|contact|email|reach|connect|linkedin|github|social|freelance)/, () => ["contact"]],
  [/(joke|funny|laugh)/, () => ["joke"]],
  [/(hug|love|cute|cuddle)/, () => ["hug"]],
  [/(dance|party)/, () => ["dance"]],
];

const Terminal = forwardRef(function Terminal({ active, api }, ref) {
  const [lines, setLines] = useState([]);
  const [value, setValue] = useState("");
  const queue = useRef([]);
  const drain = useRef(0);
  const hist = useRef({ items: [], idx: -1 });
  const inputRef = useRef(null);
  const scroller = useRef(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  /* ---------- output: lines "type out" one by one ---------- */
  const print = useCallback((items) => {
    queue.current.push(...items);
    if (drain.current) return;
    drain.current = setInterval(() => {
      const n = queue.current.shift();
      if (!n) {
        clearInterval(drain.current);
        drain.current = 0;
        return;
      }
      if (n.kind === "clear") setLines([]);
      else setLines((l) => [...l.slice(-240), n]);
    }, 26);
  }, []);
  useEffect(() => () => clearInterval(drain.current), []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, value]);

  useEffect(() => {
    if (active && api.open) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(t);
    }
  }, [active, api.open]);

  /* ---------- commands ---------- */
  const run = useCallback(
    (raw, { echo = true } = {}) => {
      const A = apiRef.current;
      const text = raw.trim();
      if (echo) setLines((l) => [...l.slice(-240), L("in", text || " ")]);
      if (!text) return;
      hist.current.items.push(text);
      hist.current.idx = hist.current.items.length;

      const [cmd0, ...rest] = text.split(/\s+/);
      const cmd = cmd0.toLowerCase();
      const arg = rest.join(" ");
      const out = (...t) => print(t.map((x) => (typeof x === "string" ? L("out", x) : x)));
      const gap = () => L("out", " ");

      switch (cmd) {
        case "help":
        case "?":
          print([
            L("h", "available commands"),
            ...HELP.map(([c, d]) => L("out", `${c.padEnd(22, " ")}${d}`, { cls: "help" })),
          ]);
          A.play("ok");
          break;

        case "hi":
        case "hello":
        case "hey":
          out(`Hi! I'm Panda, ${teddy.first}'s assistant. Type "help" to see what I can do.`);
          A.react({ mood: "wave", say: "Hi!" });
          break;

        case "about":
        case "whoami":
          print([
            L("h", teddy.owner),
            L("out", teddy.statement),
            L("ok", `● ${teddy.availability} for new projects`),
          ]);
          A.react({ mood: "think" });
          break;

        case "education":
        case "edu":
          print([L("h", "education"), ...teddy.education.lines.map((t) => L("out", t)), L("ok", `CGPA ${teddy.education.cgpa}`)]);
          break;

        case "experience":
        case "exp":
        case "work":
          print([
            L("h", "experience"),
            ...teddy.experience.flatMap((e) => [L("out", e.role, { cls: "strong" }), L("dim", e.meta), L("out", e.text), gap()]),
          ]);
          break;

        case "certs":
        case "certifications":
          print([L("h", "certifications"), ...teddy.certs.map((c) => L("ok", `✓ ${c}`))]);
          break;

        case "skills":
        case "stack":
          print([
            L("h", "toolkit"),
            L("out", teddy.skills.join(" · ")),
            teddy.learning.length ? L("dim", `currently learning: ${teddy.learning.join(", ")}`) : null,
          ].filter(Boolean));
          break;

        case "contact":
        case "socials":
          print([
            L("h", "say hello"),
            ...teddy.links.map((l) => L("link", l.label, { href: l.href })),
            L("dim", "or click 'Inquire' at the top of the page."),
          ]);
          break;

        case "hug":
          out("*squeezes you tight*  ♥ Aww, thank you! Best hug today.");
          A.react({ mood: "hug", say: "Aww, thank you!" });
          A.play("ok");
          break;

        case "dance":
          out("♪ ┏(・o･)┛ ♪ ┗(･o･)┓ ♪");
          A.react({ mood: "dance", say: "Watch these moves!" });
          break;

        case "joke":
          out(pick(teddy.jokes));
          A.react({ mood: "wave", say: "Ba dum tss!" });
          break;

        case "coffee":
          print([
            L("out", "    ( (      "),
            L("out", "     ) )     "),
            L("out", "  .______.   "),
            L("out", "  |      |]  "),
            L("out", "  \\      /   "),
            L("out", "   `----'    "),
            L("dim", "coffee first. always."),
          ]);
          break;

        case "theme": {
          const names = A.themes;
          const want = rest[0]?.toLowerCase();
          if (want && names.includes(want)) {
            A.setTheme(want);
            out(L("ok", `theme set to ${want}`));
          } else if (want) {
            out(L("err", `unknown theme "${want}". try: ${names.join(", ")}`));
            A.play("err");
          } else {
            const next = names[(names.indexOf(A.theme) + 1) % names.length];
            A.setTheme(next);
            out(L("ok", `theme → ${next}  (all: ${names.join(", ")})`));
          }
          break;
        }

        case "sound": {
          const want = rest[0]?.toLowerCase();
          const next = want === "on" ? true : want === "off" ? false : !A.sound;
          A.setSound(next);
          out(L("ok", `sound ${next ? "on  ♪" : "off"}`));
          break;
        }

        case "top":
          window.scrollTo({ top: 0, behavior: "smooth" });
          out(L("dim", "scrolling to the top..."));
          break;
        case "bottom":
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
          out(L("dim", "scrolling to the bottom..."));
          break;

        case "date":
        case "time":
          out(new Date().toString());
          break;
        case "pwd":
          out("/home/guest/den");
          break;
        case "ls":
          out("about.txt   skills.md   certs.log   bamboo.jar   secrets/");
          break;
        case "cat": {
          const files = {
            "about.txt": teddy.statement,
            "skills.md": teddy.skills.join(", "),
            "certs.log": teddy.certs.join("\n"),
            "bamboo.jar": "it's empty. someone ate it.",
          };
          if (files[arg]) out(files[arg]);
          else if (arg === "secrets" || arg === "secrets/") out(L("err", "cat: secrets: Is a directory (and a secret)"));
          else out(L("err", `cat: ${arg || "?"}: No such file`));
          break;
        }
        case "echo":
          out(arg);
          break;
        case "sudo":
          out(L("err", "nice try. panda is not in the sudoers file. this incident will be reported (to the bamboo grove)."));
          A.play("err");
          A.react({ mood: "think", say: "Nice try!" });
          break;

        case "clear":
        case "cls":
          queue.current = [];
          setLines([]);
          break;
        case "reboot":
        case "restart":
          out(L("dim", "rebooting..."));
          setTimeout(() => apiRef.current.reboot(), 400);
          break;
        case "exit":
        case "quit":
        case "close":
          out(L("dim", "bye!"));
          setTimeout(() => apiRef.current.close(), 450);
          break;

        case "ask": {
          if (!arg) {
            out("ask me what? e.g.  ask what do you do");
            break;
          }
          A.react({ mood: "think" });
          const q = arg.toLowerCase();
          const hit = ANSWERS.find(([re]) => re.test(q));
          if (hit) {
            out(L("dim", "hmm, let me think..."));
            setTimeout(() => run(hit[1]()[0], { echo: false }), 520);
          } else {
            out(L("out", `I'm only a panda, but I'll try: I don't have an answer for "${arg}". Try asking about skills, experience, education or how to get in touch.`));
          }
          break;
        }

        default:
          out(L("err", `command not found: ${cmd}  -  type "help"`));
          A.play("err");
      }
    },
    [print]
  );

  useImperativeHandle(
    ref,
    () => ({
      run: (c) => run(c),
      ask: () => {
        setValue("ask ");
        inputRef.current?.focus({ preventScroll: true });
      },
    }),
    [run]
  );

  const submit = (e) => {
    e.preventDefault();
    apiRef.current.play("enter");
    run(value);
    setValue("");
  };

  const onKeyDown = (e) => {
    const h = hist.current;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (h.idx > 0) {
        h.idx--;
        setValue(h.items[h.idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (h.idx < h.items.length - 1) {
        h.idx++;
        setValue(h.items[h.idx]);
      } else {
        h.idx = h.items.length;
        setValue("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const v = value.trimStart();
      if (!v || v.includes(" ")) return;
      const m = NAMES.filter((n) => n.startsWith(v.toLowerCase()));
      if (m.length === 1) setValue(m[0] + " ");
      else if (m.length > 1) print([L("dim", m.join("   "))]);
    } else if (e.key.toLowerCase() === "l" && e.ctrlKey) {
      e.preventDefault();
      run("clear", { echo: false });
    }
  };

  const chip = (c) => {
    apiRef.current.play("tab");
    run(c);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="ted-term" onClick={() => inputRef.current?.focus({ preventScroll: true })}>
      <div className="ted-term-scroll" ref={scroller}>
        <div className="ted-term-head">
          <div className="ted-term-logo">PANDA OS</div>
          <div className="ted-term-sub">
            <span />
            <em>stitched together for {teddy.owner.toLowerCase()}</em>
            <span />
          </div>
        </div>

        <p className="ted-term-intro">
          Type <u>help</u>, or <u>ask</u> me anything about {teddy.first}.
        </p>
        <div className="ted-term-btns">
          <button type="button" className="ted-btn" onClick={() => chip("help")}>
            Help
          </button>
          <button
            type="button"
            className="ted-btn solid"
            onClick={() => {
              apiRef.current.play("tab");
              setValue("ask ");
              inputRef.current?.focus({ preventScroll: true });
            }}
          >
            Ask Panda
          </button>
        </div>

        <div className="ted-lines" aria-live="polite">
          {lines.map((l) => (
            <TermLine key={l.id} l={l} />
          ))}
        </div>

        <form className="ted-prompt" onSubmit={submit} autoComplete="off">
          <label htmlFor="ted-input">guest@panda ~ %</label>
          <input
            id="ted-input"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Panda terminal input"
          />
        </form>
      </div>
    </div>
  );
});

export default Terminal;

function TermLine({ l }) {
  if (l.kind === "in")
    return (
      <div className="ted-l in">
        <span className="p">guest@panda ~ %</span> {l.text}
      </div>
    );
  if (l.kind === "link")
    return (
      <div className="ted-l">
        <span className="dimtxt">→ </span>
        <a href={l.href} target={l.href && l.href !== "#" ? "_blank" : undefined} rel="noreferrer" onClick={(e) => l.href === "#" && e.preventDefault()}>
          {l.text}
        </a>
      </div>
    );
  return <div className={`ted-l ${l.kind} ${l.cls || ""}`}>{l.text}</div>;
}

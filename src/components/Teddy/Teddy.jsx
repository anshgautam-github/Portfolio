import { useCallback, useEffect, useRef, useState } from "react";
import PandaBear from "./PandaBear.jsx";
import Panda from "./Panda.jsx";
import TeddyPanel from "./TeddyPanel.jsx";
import { sfx } from "./sound.js";
import { teddy } from "./teddyContent.js";
import "./teddy.css";

/**
 * <Teddy /> - a little panda assistant pinned to the bottom-right corner.
 *   - waves + says hi on load (and every so often while you ignore him)
 *   - eyes + head follow your cursor
 *   - click him: a retro "Teddy OS" window opens on the LEFT (boot -> terminal / stats / sticky notes)
 *   - close with the cross, Esc, or click the bear again
 * The window reacts back: the bear hugs, dances and talks when you use certain commands.
 */
const WALK_MS = 1150; // keep in sync with the dock transition in teddy.css

const GREETINGS = [
  "Hi there! I'm Panda.",
  `Psst... click me!`,
  `I know everything about ${teddy.first}. Ask away!`,
  "Want a tour? Click me!",
  "Don't be shy, I don't bite.",
];

export default function Teddy() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // panel is built on first open, then just hidden
  const [mood, setMood] = useState("idle");
  const [bubble, setBubble] = useState(null); // { id, text }
  const [hearts, setHearts] = useState(0); // bumped to spawn a burst of hearts
  const [bounce, setBounce] = useState(0);
  const [desk, setDesk] = useState(false); // window has turned into the big vintage computer
  const deskRef = useRef(false);

  const dock = useRef(null);
  const openRef = useRef(false);
  const hover = useRef(false);
  const moodT = useRef(0);
  const bubbleT = useRef(0);
  const greet = useRef(0);
  const chain = useRef(0);
  const lastOff = useRef({ x: 0, y: 0 });
  openRef.current = open;

  const walkLock = useRef(false);
  const lockT = useRef(0);
  const react = useCallback((m, ms = 2800) => {
    // while he is walking nothing else (waves from hovering, timed greetings...) may interrupt the stride -
    // that is what made him look like he was sliding
    if (walkLock.current && m !== "walk" && m !== "scared") return;
    clearTimeout(moodT.current);
    setMood(m);
    if (m === "hug") setHearts((n) => n + 1);
    moodT.current = setTimeout(() => setMood("idle"), ms);
    clearTimeout(lockT.current);
    walkLock.current = m === "walk";
    if (m === "walk") lockT.current = setTimeout(() => (walkLock.current = false), Math.max(0, ms - 120));
  }, []);

  const say = useCallback((text, ms = 4200) => {
    clearTimeout(bubbleT.current);
    setBubble({ id: Date.now() + Math.random(), text });
    bubbleT.current = setTimeout(() => setBubble(null), ms);
  }, []);

  /* hello on load, then a friendly nudge now and then while the window is closed */
  useEffect(() => {
    const t1 = setTimeout(() => {
      react("wave", 4200);
      say(GREETINGS[0], 4600);
    }, 1100);
    const every = setInterval(() => {
      if (openRef.current || hover.current) return;
      react("wave", 3000);
      greet.current = (greet.current + 1) % GREETINGS.length;
      say(GREETINGS[greet.current], 4200);
    }, 16000);
    return () => {
      clearTimeout(t1);
      clearInterval(every);
      clearTimeout(moodT.current);
      clearTimeout(bubbleT.current);
      clearTimeout(chain.current);
    };
  }, [react, say]);

  /* eyes + head follow the pointer (written straight to CSS vars, no re-renders) */
  useEffect(() => {
    let raf = 0;
    let ev = null;
    const apply = () => {
      raf = 0;
      const el = dock.current;
      if (!el || !ev) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.4;
      const clamp = (v) => Math.max(-1, Math.min(1, v));
      el.style.setProperty("--lx", clamp((ev.clientX - cx) / 380).toFixed(3));
      el.style.setProperty("--ly", clamp((ev.clientY - cy) / 380).toFixed(3));
    };
    const onMove = (e) => {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* the bear rides on top of the window when it is dragged */
  const travel = useCallback((x, y, live) => {
    const el = dock.current;
    if (!el) return;
    lastOff.current = { x, y };
    el.style.transition = live ? "none" : "";
    el.style.transform = x || y ? `translate3d(${x}px, ${y}px, 0)` : "";
  }, []);

  /* open: the bear WALKS up and stands on the top edge of the window, then waves */
  const [showBear, setShowBear] = useState(false);
  const openPanel = useCallback(() => {
    clearTimeout(chain.current);
    setShowBear(true);
    setMounted(true);
    setOpen(true);
    travel(lastOff.current.x, lastOff.current.y, false);
    react("walk", WALK_MS);
    say("Hold on, climbing up!", WALK_MS);
    chain.current = setTimeout(() => {
      react("wave", 2400);
      say("Welcome to the den!", 3200);
    }, WALK_MS);
  }, [react, say, travel]);

  /* close: he walks back down to the corner */
  const closePanel = useCallback(() => {
    clearTimeout(chain.current);
    setOpen(false);
    const keep = lastOff.current;
    travel(0, 0, false);
    lastOff.current = keep;
    // the screen just died under his feet - he bolts down terrified
    react("scared", WALK_MS + 250);
    say("EEEK! It's shutting down!!", WALK_MS);
    chain.current = setTimeout(() => {
      say("Phew... that was scary!", 2600);
      react("think", 2200);
    }, WALK_MS + 250);
    setTimeout(() => setShowBear(false), WALK_MS + 2600);
  }, [react, say, travel]);

  const toggle = () => {
    setBounce((n) => n + 1);
    sfx.pop();
    open ? closePanel() : openPanel();
  };

  /* when the window grows into the big computer the bear climbs up to its new top edge */
  const onMode = useCallback(
    (d) => {
      if (d === deskRef.current) return;
      deskRef.current = d;
      setDesk(d);
      if (!openRef.current) return;
      clearTimeout(chain.current);
      react("walk", WALK_MS);
      say(d ? "Whoa, a big screen!" : "Rebooting...", WALK_MS);
      chain.current = setTimeout(() => react("wave", 2000), WALK_MS);
    },
    [react, say]
  );

  /* while the monitor is open the bear patrols its top edge: right -> left, pause, left -> right ... */
  const patrol = useRef(null);
  const px = useRef(0);
  useEffect(() => {
    const el = patrol.current;
    if (!el) return;
    let alive = true;
    let timer = 0;
    let dir = -1;
    const later = (fn, ms) => {
      timer = setTimeout(() => alive && fn(), ms);
    };
    if (!open) {
      px.current = 0;
      el.style.setProperty("--pd", "1.1s");
      el.style.setProperty("--px", "0px");
      return;
    }
    const step = () => {
      const mon = document.querySelector(".ted-wrap .ted-mon") || document.querySelector(".ted-wrap");
      const d = dock.current;
      if (!mon || !d || hover.current) return later(step, 700);
      const wr = mon.getBoundingClientRect();
      const dr = d.getBoundingClientRect();
      // where the patrol wrapper REALLY is right now (not where it was told to go)
      const cur = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 || 0;
      px.current = cur;
      const base = dr.left; // the dock itself never moves with the patrol wrapper, so this IS the rest position
      const inset = 26; // keep the whole bear well inside the monitor's edges
      const min = wr.left + inset - base;
      const max = Math.min(wr.right - inset - dr.width - base, 24);
      const target = Math.max(min, Math.min(max, dir < 0 ? min : max));
      const dist = Math.abs(target - px.current);
      if (dist < 24) {
        dir = -dir;
        return later(step, 300);
      }
      const dur = Math.max(0.8, dist / 85);
      el.style.setProperty("--pd", `${dur}s`);
      el.style.setProperty("--px", `${target}px`);
      px.current = target;
      react("walk", dur * 1000 + 80);
      later(() => {
        dir = -dir;
        if (Math.random() < 0.5) react("wave", 1500);
        later(step, 1700 + Math.random() * 1400);
      }, dur * 1000);
    };
    // coming from wandering around the page: hop back to the dock position, which sits on the monitor
    px.current = 0;
    el.style.setProperty("--pd", `${WALK_MS / 1000}s`);
    el.style.setProperty("--px", "0px");
    later(step, WALK_MS + 3200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, react, say]);

  const onPanelReact = useCallback(
    ({ mood: m, say: s }) => {
      if (m) react(m, m === "dance" ? 3600 : 2800);
      if (s) say(s, 3200);
    },
    [react, say]
  );

  return (
    <>
      {mounted && <div className={`ted-backdrop${open ? " is-on" : ""}`} aria-hidden="true" />}
      {mounted && <TeddyPanel open={open} onClose={closePanel} onReact={onPanelReact} onDrag={travel} onMode={onMode} />}

      <Panda hidden={showBear} onOpen={openPanel} />
      <div ref={dock} className={`ted-dock${!showBear ? " is-gone" : ""}${open ? " is-open" : ""}${open && desk ? " is-desk" : ""}`}>
        <div ref={patrol} className="ted-patrol">
        {bubble && (
          <div key={bubble.id} className="ted-bubble" role="status">
            {bubble.text}
          </div>
        )}

        <div className="ted-hearts" aria-hidden="true" key={hearts}>
          {hearts > 0 &&
            Array.from({ length: 7 }, (_, i) => (
              <span
                key={i}
                className="ted-heart"
                style={{ "--dx": `${(i - 3) * 14}px`, "--d": `${i * 0.09}s`, "--s": 0.8 + (i % 3) * 0.35 }}
              >
                ♥
              </span>
            ))}
        </div>

        <button
          type="button"
          className={`ted-bear-btn${open ? " is-active" : ""}`}
          onClick={toggle}
          onPointerEnter={() => {
            hover.current = true;
            if (mood === "idle") react("wave", 1700);
            if (!bubble && !openRef.current) say("Click me!", 1800);
          }}
          onPointerLeave={() => (hover.current = false)}
          aria-label={open ? "Close Panda assistant" : "Open Panda assistant"}
          aria-expanded={open}
        >
          <span key={bounce} className={bounce ? "ted-bounce" : ""}>
            <PandaBear mood={mood} talking={!!bubble} />
          </span>
          {!open && <span className="ted-ping" aria-hidden="true" />}
        </button>
        </div>
      </div>
    </>
  );
}

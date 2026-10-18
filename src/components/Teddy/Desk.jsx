import { useEffect, useRef, useState } from "react";
import Terminal from "./Terminal.jsx";
import Stats from "./Stats.jsx";
import Notes from "./Notes.jsx";

const TABS = ["terminal", "stats", "notes"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const clockNow = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const Paw = () => (
  <svg viewBox="0 0 18 16" width="16" height="14" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="3.2" r="2.6" />
    <circle cx="14" cy="3.2" r="2.6" />
    <circle cx="9" cy="9" r="6" />
    <circle cx="9" cy="10" r="2.6" fill="var(--sc-win, #fff)" />
  </svg>
);

/* ---- decorative stickers (pure SVG / CSS) ---- */
const Star = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 5l8.4 17 18.700 2.700-13.600 13.200 3.200 18.700L32 47.800 15.300 56.600l3.200-18.700L4.900 24.700 23.600 22z" fill="#fff" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
    <path d="M32 5l8.4 17 18.700 2.700-13.600 13.200 3.200 18.700L32 47.800 15.300 56.600l3.200-18.700L4.900 24.700 23.600 22z" fill="#ffc21a" stroke="#f08a00" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
/* round "</>" code sticker (same family as the landing page stickers) */
const CodeBadge = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#fff" />
    <circle cx="32" cy="32" r="26" fill="#1c3fae" />
    <circle cx="32" cy="32" r="21" fill="none" stroke="#8fb2ff" strokeWidth="1.2" strokeDasharray="2 3" />
    <path d="M25 24l-9 8 9 8M39 24l9 8-9 8M35 21l-6 22" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
/* round globe sticker (echoes the globe on the landing page) */
const GlobeBadge = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#fff" />
    <g fill="none" stroke="#2f5fe0" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="32" cy="32" r="22" />
      <ellipse cx="32" cy="32" rx="9.500" ry="22" />
      <path d="M10 32h44M14 21h36M14 43h36" />
    </g>
  </svg>
);

/**
 * The big vintage computer that Teddy OS "boots into":
 *   dark CRT bezel  ->  classic-Mac style desktop (menu bar, striped window)  ->  terminal / stats / notes
 * Drag it by the top bezel, close it with the cross (or the Mac close box / power knob / Esc).
 */
export default function Desk({ api, keysRef, keys, theme, themes, swatch, onClose, reboot, startDrag, closing, booting }) {
  const [tab, setTab] = useState("terminal");
  const [menu, setMenu] = useState(null);
  const [clock, setClock] = useState(clockNow);
  const term = useRef(null);
  const notes = useRef(null);
  const bar = useRef(null);
  const { play, sound, setSound, setTheme } = api;

  useEffect(() => {
    const id = setInterval(() => setClock(clockNow()), 15000);
    return () => clearInterval(id);
  }, []);

  /* menus: Esc closes the menu first (capture phase beats the window-level Esc), outside click closes it too */
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setMenu(null);
      }
    };
    const onDown = (e) => {
      if (!bar.current?.contains(e.target)) setMenu(null);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [menu]);

  /* 1 / 2 / 3 switch screens when you are not typing */
  useEffect(() => {
    if (!api.open) return;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i > -1) setTab(TABS[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api.open]);

  const go = (t) => {
    if (t !== tab) play("tab");
    setTab(t);
  };
  const cmd = (c) => {
    setTab("terminal");
    setTimeout(() => term.current?.run(c), 40);
  };

  const menus = [
    {
      id: "apple",
      label: <Paw />,
      aria: "Panda menu",
      items: [{ l: "About Panda OS", a: () => cmd("about") }, { sep: true }, { l: "Reboot", a: reboot }],
    },
    {
      id: "file",
      label: "File",
      items: [
        {
          l: "New note",
          a: () => {
            go("notes");
            setTimeout(() => notes.current?.add(), 80);
          },
        },
        { sep: true },
        { l: "Reboot", a: reboot },
        { l: "Close", k: "Esc", a: onClose },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { l: "Clear terminal", a: () => cmd("clear") },
        { l: "Tell me a joke", a: () => cmd("joke") },
        { l: "Make coffee", a: () => cmd("coffee") },
      ],
    },
    {
      id: "screen",
      label: "Screen",
      items: [
        ...TABS.map((t, i) => ({ l: cap(t), k: String(i + 1), check: tab === t, a: () => go(t) })),
        { sep: true },
        ...themes.map((t) => ({ l: `${cap(t)} theme`, check: theme === t, a: () => setTheme(t) })),
      ],
    },
    {
      id: "special",
      label: "Special",
      items: [
        { l: sound ? "Sound off" : "Sound on", a: () => setSound(!sound) },
        { sep: true },
        { l: "Hug Panda", a: () => cmd("hug") },
        { l: "Make Panda dance", a: () => cmd("dance") },
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { l: "Show commands", a: () => cmd("help") },
        {
          l: "Ask Panda...",
          a: () => {
            setTab("terminal");
            setTimeout(() => term.current?.ask(), 60);
          },
        },
      ],
    },
  ];

  return (
    <div className={`ted-desk${closing ? " is-closing" : ""}`}>
      {/* decorative desk notes + stickers */}
      <div className="ted-deco" aria-hidden="true">
        <span className="ted-desknote c-yellow l1">welcome to the den!</span>
        <span className="ted-desknote c-purple l2">do not unplug</span>
        <span className="ted-desknote c-pink l3">hello panda</span>
      </div>

      {/* bulk: sloping top case, rear tube hump and swivel stand */}
      <div className="ted-rear" aria-hidden="true" />
      <div className="ted-top" aria-hidden="true" />
      <div className="ted-stand" aria-hidden="true" />

      <div className="ted-mon">
        {/* top bezel: drag handle + close cross */}
        <div className="ted-mon-top" onPointerDown={startDrag} title="Drag me">
          <span className="ted-grip" aria-hidden="true" />
          <span className="ted-mon-brand">PANDA&nbsp;GT-84</span>
          <span className="ted-spacer" />
          <button type="button" className="ted-mon-x" onClick={onClose} aria-label="Close Panda" title="Close (Esc)">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="ted-well">
          <div className="ted-lcd" data-theme={booting ? "glass" : theme}>
            {booting ? (
              <div className="ted-screen ted-crt ted-bootscreen">{booting}</div>
            ) : (
              <>
            {/* menu bar */}
            <div className="ted-menubar" ref={bar} role="menubar">
              {menus.map((m) => (
                <div key={m.id} className="ted-menu">
                  <button
                    type="button"
                    className={`ted-mb${menu === m.id ? " open" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={menu === m.id}
                    aria-label={m.aria}
                    onClick={() => setMenu(menu === m.id ? null : m.id)}
                    onPointerEnter={() => menu && setMenu(m.id)}
                  >
                    {m.label}
                  </button>
                  {menu === m.id && (
                    <div className="ted-dd" role="menu">
                      {m.items.map((it, i) =>
                        it.sep ? (
                          <hr key={i} />
                        ) : (
                          <button
                            key={i}
                            type="button"
                            role="menuitem"
                            className="ted-mi"
                            onClick={() => {
                              setMenu(null);
                              play("tab");
                              it.a();
                            }}
                          >
                            <span>
                              <b>{it.check ? "✓" : ""}</b>
                              {it.l}
                            </span>
                            {it.k && <em>{it.k}</em>}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
              <span className="ted-spacer" />
              <button type="button" className="ted-mb snd" onClick={() => setSound(!sound)} aria-pressed={sound}>
                ♪ {sound ? "on" : "off"}
              </button>
              <span className="ted-clock">{clock}</span>
            </div>

            {/* the classic window */}
            <section className="ted-macwin" aria-label="Panda assistant">
              <div className="ted-macbar">
                <button type="button" className="box" onClick={onClose} aria-label="Close Panda" />
                <i className="stripes" />
                <span className="title">
                  <b className="ted-dot" /> Panda OS v1.0
                </span>
                <i className="stripes" />
                <span className="box zoom" aria-hidden="true" />
              </div>

              <nav className="ted-tabs" aria-label="Panda screens">
                {TABS.map((t, i) => (
                  <button key={t} type="button" className={t === tab ? "on" : ""} onClick={() => go(t)} aria-current={t === tab}>
                    <i>{i + 1}</i> {t}
                  </button>
                ))}
                <span className="ted-spacer" />
                <button type="button" className="re" onClick={reboot} title="Replay the boot sequence">
                  reboot
                </button>
              </nav>

              <div className="ted-macbody">
                <div className="ted-pane" hidden={tab !== "terminal"}>
                  <Terminal ref={term} active={tab === "terminal"} api={api} />
                </div>
                <div className="ted-pane" hidden={tab !== "stats"}>
                  <Stats active={api.open && tab === "stats"} keysRef={keysRef} />
                </div>
                <div className="ted-pane" hidden={tab !== "notes"}>
                  <Notes ref={notes} active={tab === "notes"} play={play} />
                </div>
              </div>

              <footer className="ted-status">
                <span className="live">● online</span>
                <span>keys {keys}</span>
                <span className="ted-spacer" />
                <span className="hide-s">esc to close</span>
                <span className="ted-swatches" role="group" aria-label="Theme">
                  {themes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={t === theme ? "on" : ""}
                      style={{ "--c": swatch[t] }}
                      onClick={() => {
                        setTheme(t);
                        play("tab");
                      }}
                      aria-label={`${t} theme`}
                      title={t}
                    />
                  ))}
                </span>
              </footer>
            </section>

              </>
            )}

            <div className="ted-glare" aria-hidden="true" />
          </div>
        </div>

        {/* bottom bezel: badge, floppy slot, LED + power knob */}
        <div className="ted-mon-bottom">
          <span className="ted-mon-badge">PANDA GT-84</span>
          <span className="ted-slot" aria-hidden="true" />
          <span className="ted-pled" aria-hidden="true" />
          <button type="button" className="ted-knob" onClick={onClose} aria-label="Power off (close Panda)" title="Power off" />
        </div>
      </div>

      {/* stickers */}
      <div className="ted-stickers" aria-hidden="true">
        <span className="stk game">
          <i style={{ color: "#ff4d3d" }}>C</i>
          <i style={{ color: "#ffb400" }}>H</i>
          <i style={{ color: "#2fc45a" }}>A</i>
          <i style={{ color: "#2b8cff" }}>T</i>
          <i style={{ color: "#a24bff" }}>!</i>
        </span>
        <span className="stk y2k">AI</span>
        <span className="stk star">
          <Star />
        </span>
        <span className="stk smiley">
          <CodeBadge />
        </span>
        <span className="stk flower">
          <GlobeBadge />
        </span>
      </div>
    </div>
  );
}

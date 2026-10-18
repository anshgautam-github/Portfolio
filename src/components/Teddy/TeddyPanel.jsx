import { useCallback, useEffect, useRef, useState } from "react";
import { BootScreen, SplashScreen } from "./Boot.jsx";
import Desk from "./Desk.jsx";
import { sfx } from "./sound.js";

export const THEMES = ["glass", "amber", "green", "ice", "rose"];
const SWATCH = { glass: "#4d7dff", amber: "#ffb020", green: "#5cff8a", ice: "#6cd8ff", rose: "#ff6fae" };

let booted = false; // boot sequence plays once per page load (use `reboot` to replay)

function readTheme() {
  try {
    const t = localStorage.getItem("teddy.theme");
    return THEMES.includes(t) ? t : "glass";
  } catch (_) {
    return "glass";
  }
}

/**
 * Panda OS window, docked bottom-right.
 *   compact dark window: boot -> "press any key"
 *   then it opens up into the big vintage computer (<Desk />): terminal | stats | notes
 */
export default function TeddyPanel({ open, onClose, onReact, onDrag, onMode }) {
  const [phase, setPhase] = useState(booted ? "main" : "boot");
  const [theme, setThemeState] = useState(readTheme);
  const [sound, setSound] = useState(false);
  const [max, setMax] = useState(false);
  const [shown, setShown] = useState(false); // false once the close animation has finished
  const [keys, setKeys] = useState(0);

  const wrap = useRef(null);
  const keysRef = useRef(0);
  const soundRef = useRef(false);
  const phaseRef = useRef(phase);
  const offset = useRef({ x: 0, y: 0 });
  phaseRef.current = phase;
  soundRef.current = sound;
  const desk = true; // the vintage monitor is there from the very first boot line
  const booting = phase !== "main";

  const play = useCallback((name) => {
    if (soundRef.current && sfx[name]) sfx[name]();
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try {
      localStorage.setItem("teddy.theme", t);
    } catch (_) {
      /* ignore */
    }
  }, []);

  /* tell the bear when the window turns into the big computer (he walks up again) */
  useEffect(() => {
    onMode?.(desk);
  }, [desk, onMode]);

  /* open / close animation bookkeeping */
  useEffect(() => {
    if (open) {
      setShown(true);
      play("open");
      return;
    }
    const t = setTimeout(() => setShown(false), 260);
    return () => clearTimeout(t);
  }, [open, play]);

  const enterMain = useCallback(() => {
    booted = true;
    setPhase("main");
    play("ok");
  }, [play]);

  const reboot = useCallback(() => {
    setPhase("boot");
  }, []);

  /* keyboard: Esc closes, any key advances boot / splash, keys are counted for the stats screen */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const real = e.key.length === 1 || e.key === "Enter";
      if (!real) return;
      keysRef.current += 1;
      setKeys(keysRef.current);
      const ph = phaseRef.current;
      if (ph === "boot") {
        e.preventDefault(); // the key that skips the boot must not also be typed into the terminal
        setPhase("splash");
      } else if (ph === "splash") {
        e.preventDefault();
        enterMain();
      }
      if (ph === "main" && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) play("key");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, enterMain, play]);

  /* a resized viewport snaps the window (and the bear on top of it) back to its dock */
  useEffect(() => {
    const onResize = () => {
      if (!offset.current.x && !offset.current.y) return;
      offset.current = { x: 0, y: 0 };
      if (wrap.current && !max) wrap.current.style.transform = "";
      onDrag?.(0, 0, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [max, onDrag]);

  /* ---------- dragging by the title bar / top bezel ---------- */
  const startDrag = (e) => {
    if (max || e.button !== 0 || e.target.closest("button")) return;
    const el = wrap.current;
    const r = el.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = offset.current.x;
    const oy = offset.current.y;
    el.classList.add("is-dragging");
    const move = (ev) => {
      const dx = Math.max(-r.left + 8, Math.min(window.innerWidth - r.right - 8, ev.clientX - sx));
      const dy = Math.max(-r.top + 8, Math.min(window.innerHeight - r.top - 56, ev.clientY - sy));
      offset.current = { x: ox + dx, y: oy + dy };
      el.style.transform = `translate3d(${ox + dx}px, ${oy + dy}px, 0)`;
      onDrag?.(ox + dx, oy + dy, true); // the bear rides along on top of the window
    };
    const up = () => {
      el.classList.remove("is-dragging");
      onDrag?.(offset.current.x, offset.current.y, false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const toggleMax = () => {
    const el = wrap.current;
    if (!max) {
      el.style.transform = "";
      onDrag?.(0, 0, false);
    } else {
      el.style.transform = `translate3d(${offset.current.x}px, ${offset.current.y}px, 0)`;
      onDrag?.(offset.current.x, offset.current.y, false);
    }
    setMax((m) => !m);
    play("tab");
  };

  const api = {
    open,
    theme,
    themes: THEMES,
    setTheme,
    sound,
    setSound: (v) => {
      setSound(v);
      soundRef.current = v;
      if (v) sfx.ok();
    },
    play,
    react: onReact,
    reboot,
    close: onClose,
  };

  return (
    <div
      ref={wrap}
      className={`ted-wrap${desk ? " is-desk" : ""}${max && !desk ? " is-max" : ""}`}
      style={{ display: open || shown ? undefined : "none" }}
      data-theme={booting ? "glass" : theme}
    >
      <Desk
        api={api}
        keysRef={keysRef}
        keys={keys}
        theme={theme}
        themes={THEMES}
        swatch={SWATCH}
        onClose={onClose}
        reboot={reboot}
        startDrag={startDrag}
        closing={!open}
        booting={
          booting ? (
            phase === "boot" ? <BootScreen onDone={() => setPhase("splash")} play={play} /> : <SplashScreen onEnter={enterMain} />
          ) : null
        }
      />
    </div>
  );
}

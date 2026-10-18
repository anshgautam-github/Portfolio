import { useEffect, useRef, useState } from "react";

const LINES = ["Try me!", "Ask me about Ansh", "Psst... click me", "Take a tour?"];
/* little routines he performs on his own; value = how long each lasts (ms) */
const ACTS = { waveR: 3200, waveL: 3200, cheer: 2800, clap: 2600, jump: 1900, turn: 4400, look: 3200, dance: 3600, stretch: 3400 };
const NAMES = Object.keys(ACTS);
import "./panda.css";

/*
  A small, cute panda standing in the bottom-right corner, waving and saying hello.
  No bamboo, no climbing. Click it to open Teddy (same as before).
  Its pupils follow the cursor a little; it blinks and bobs on its own.
*/
export default function Panda({ hidden, onOpen }) {
  const root = useRef(null);
  const [hov, setHov] = useState(false);
  const [n, setN] = useState(0);
  const [act, setAct] = useState("idle");
  const hovRef = useRef(false);
  const timer = useRef(0);
  const prev = useRef("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const run = () => {
      let a = NAMES[Math.floor(Math.random() * NAMES.length)];
      if (a === prev.current) a = NAMES[(NAMES.indexOf(a) + 1) % NAMES.length];
      prev.current = a;
      setAct(a);
      timer.current = setTimeout(() => {
        setAct("idle");
        timer.current = setTimeout(run, 1000 + Math.random() * 1400);
      }, ACTS[a]);
    };
    timer.current = setTimeout(run, 900);
    window.__pndRestart = (d = 900) => {
      clearTimeout(timer.current);
      setAct("idle");
      timer.current = setTimeout(run, d);
    };
    return () => {
      clearTimeout(timer.current);
      delete window.__pndRestart;
    };
  }, []);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v + 1) % LINES.length), 5200);
    return () => clearInterval(id);
  }, []);

  const look = (e) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cl = (v) => Math.max(-1, Math.min(1, v));
    el.style.setProperty("--lx", cl((e.clientX - (r.left + r.width / 2)) / 420).toFixed(3));
    el.style.setProperty("--ly", cl((e.clientY - (r.top + r.height * 0.35)) / 420).toFixed(3));
  };

  return (
    <div className={`pnd-wrap${hidden ? " is-hidden" : ""}`} aria-hidden={hidden}>
      <button
        ref={root}
        type="button"
        className={`pnd-btn a-${act}${hov ? " is-hov" : ""}`}
        onClick={onOpen}
        onPointerEnter={() => {
          setHov(true);
          hovRef.current = true;
          clearTimeout(timer.current);
          setAct("waveR");
        }}
        onPointerLeave={() => {
          setHov(false);
          hovRef.current = false;
          window.__pndRestart && window.__pndRestart(1200);
        }}
        onPointerMove={look}
        aria-label="Say hello to Panda"
        tabIndex={hidden ? -1 : 0}
      >
        <span key={hov ? "h" : n} className="pnd-bubble" role="status">
          {hov ? "Let's chat!" : LINES[n]}
        </span>
        <svg className="pnd" viewBox="0 0 120 142" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="pndW" cx="40%" cy="28%" r="85%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#e4e6ea" />
            </radialGradient>
            <radialGradient id="pndK" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="#3a3b40" />
              <stop offset="1" stopColor="#16161a" />
            </radialGradient>
          </defs>
          <ellipse cx="60" cy="136" rx="32" ry="4.2" fill="#000" opacity="0.22" />

          <g className="pnd-turn">
            <g className="pnd-body">
              {/* feet */}
              <ellipse cx="42" cy="126" rx="14" ry="9.5" fill="url(#pndK)" />
              <ellipse cx="78" cy="126" rx="14" ry="9.5" fill="url(#pndK)" />
              <circle className="pnd-tail" cx="60" cy="121" r="7" fill="#fff" />

              {/* torso */}
              <ellipse cx="60" cy="100" rx="30" ry="29" fill="url(#pndW)" />
              <ellipse className="pnd-belly" cx="60" cy="106" rx="18" ry="19" fill="#fff" opacity="0.85" />
              <path d="M31 84 Q60 68 89 84 Q86 94 60 90 Q34 94 31 84 Z" fill="url(#pndK)" />

              {/* arms: drawn hanging down from the shoulder, rotated by the current routine */}
              <g className="pnd-armL">
                <path d="M0 0 Q-9 12 -4 27" fill="none" stroke="#5a5c66" strokeWidth="16.6" strokeLinecap="round" opacity="0.7" />
                <path d="M0 0 Q-9 12 -4 27" fill="none" stroke="url(#pndK)" strokeWidth="15" strokeLinecap="round" />
              </g>
              <g className="pnd-armR">
                <path d="M0 0 Q9 12 4 27" fill="none" stroke="#5a5c66" strokeWidth="16.6" strokeLinecap="round" opacity="0.7" />
                <path d="M0 0 Q9 12 4 27" fill="none" stroke="url(#pndK)" strokeWidth="15" strokeLinecap="round" />
              </g>

              {/* head */}
              <g className="pnd-head">
                <circle cx="29" cy="24" r="13" fill="url(#pndK)" />
                <circle cx="91" cy="24" r="13" fill="url(#pndK)" />
                <circle cx="60" cy="52" r="35" fill="url(#pndW)" />
                <g className="pnd-face">
                  <ellipse cx="43" cy="52" rx="10.5" ry="13.5" fill="#1b1b1f" transform="rotate(22 43 52)" />
                  <ellipse cx="77" cy="52" rx="10.5" ry="13.5" fill="#1b1b1f" transform="rotate(-22 77 52)" />
                  <g className="pnd-eyes">
                    <circle cx="44" cy="51" r="4.6" fill="#fff" />
                    <circle cx="76" cy="51" r="4.6" fill="#fff" />
                    <g className="pnd-pup">
                      <circle cx="44.2" cy="51.4" r="3" fill="#0b0b0d" />
                      <circle cx="76.2" cy="51.4" r="3" fill="#0b0b0d" />
                      <circle cx="45.2" cy="50.2" r="1" fill="#fff" />
                      <circle cx="77.2" cy="50.2" r="1" fill="#fff" />
                    </g>
                  </g>
                  <ellipse cx="60" cy="63" rx="6.4" ry="4.4" fill="#17171b" />
                  <ellipse cx="58.2" cy="61.6" rx="2" ry="1" fill="#fff" opacity="0.55" />
                  <path d="M60 67 V70 M60 70 Q55 75 50.5 71 M60 70 Q65 75 69.5 71" fill="none" stroke="#17171b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import "./rabbit.css";

const LINES = ["Crunch crunch...", "Click me!", "Mine. My carrot.", "Psst... say hi"];

/*
  A small, cute rabbit sitting in the bottom-right corner, nibbling a carrot.
  Cross it and it grumbles "Why did you disturb me?"; click it to open the assistant.
  Its eyes follow the cursor a little; it blinks, chews and twitches its ears on its own.
*/
export default function Rabbit({ hidden, onOpen }) {
  const root = useRef(null);
  const [hov, setHov] = useState(false);
  const [n, setN] = useState(0);
  const [msg, setMsg] = useState("");
  const svg = useRef(null);
  const t = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setN((v) => (v + 1) % LINES.length), 5200);
    return () => {
      clearInterval(id);
      clearTimeout(t.current);
    };
  }, []);

  const look = (e) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cl = (v) => Math.max(-1, Math.min(1, v));
    el.style.setProperty("--lx", cl((e.clientX - (r.left + r.width / 2)) / 420).toFixed(3));
    el.style.setProperty("--ly", cl((e.clientY - (r.top + r.height * 0.4)) / 420).toFixed(3));
  };

  const text = hov ? "Why did you disturb me?!" : msg || LINES[n];

  return (
    <div className={`rb-wrap${hidden ? " is-hidden" : ""}`} aria-hidden={hidden}>
      <button
        ref={root}
        type="button"
        className={`rb-btn${hov ? " is-hov" : ""}`}
        onClick={() => {
          // WAAPI so every click replays the hop, even mid-hop (a CSS class would not restart)
          svg.current?.getAnimations().forEach((a) => a.id === "rb-hop" && a.cancel());
          const a = svg.current?.animate(
            [
              { transform: "translateY(0) scale(1.08, 0.9)" },
              { transform: "translateY(-22px) scale(0.96, 1.06)", offset: 0.4 },
              { transform: "translateY(0) scale(1, 1)" },
            ],
            { duration: 460, easing: "cubic-bezier(0.3,0.1,0.4,1)" }
          );
          if (a) a.id = "rb-hop";
          onOpen && onOpen();
        }}
        onPointerEnter={() => {
          clearTimeout(t.current);
          setMsg("");
          setHov(true);
        }}
        onPointerLeave={() => {
          setHov(false);
          setMsg("Hmph... back to my carrot");
          clearTimeout(t.current);
          t.current = setTimeout(() => setMsg(""), 2200);
        }}
        onPointerMove={look}
        aria-label="Open the assistant (a rabbit eating a carrot)"
        tabIndex={hidden ? -1 : 0}
      >
        <span key={hov ? "h" : msg || n} className="rb-bubble" role="status">
          {text}
        </span>
        <svg ref={svg} className="rb" viewBox="0 0 120 142" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="rbW" cx="40%" cy="28%" r="85%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#ebe0d8" />
            </radialGradient>
            <linearGradient id="rbC" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ff9d3a" />
              <stop offset="1" stopColor="#f26f1c" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="136" rx="32" ry="4.2" fill="#000" opacity="0.22" />

          <g className="rb-body">
            {/* feet + body */}
            <ellipse cx="41" cy="128" rx="13" ry="7.5" fill="url(#rbW)" />
            <ellipse cx="79" cy="128" rx="13" ry="7.5" fill="url(#rbW)" />
            <ellipse cx="60" cy="106" rx="30" ry="27" fill="url(#rbW)" />
            <ellipse cx="60" cy="112" rx="18" ry="17" fill="#fff" opacity="0.8" />

            <g className="rb-head">
              {/* ears */}
              <g className="rb-earL">
                <ellipse cx="43" cy="22" rx="9.5" ry="23" transform="rotate(-8 43 22)" fill="url(#rbW)" />
                <ellipse cx="43" cy="24" rx="4.6" ry="16" transform="rotate(-8 43 24)" fill="#ffb4c3" />
              </g>
              <g className="rb-earR">
                <ellipse cx="77" cy="22" rx="9.5" ry="23" transform="rotate(8 77 22)" fill="url(#rbW)" />
                <ellipse cx="77" cy="24" rx="4.6" ry="16" transform="rotate(8 77 24)" fill="#ffb4c3" />
              </g>

              {/* head */}
              <ellipse cx="60" cy="58" rx="32" ry="27" fill="url(#rbW)" />
              <circle className="rb-cheek" cx="40" cy="66" r="6.5" fill="#ff9fb3" opacity="0.4" />
              <circle className="rb-cheek" cx="80" cy="66" r="6.5" fill="#ff9fb3" opacity="0.4" />

              {/* eyes */}
              <g className="rb-eyes">
                <ellipse cx="46" cy="55" rx="5.2" ry="6" fill="#4a2f2a" />
                <ellipse cx="74" cy="55" rx="5.2" ry="6" fill="#4a2f2a" />
                <g className="rb-pup">
                  <circle cx="46.2" cy="55.4" r="3.5" fill="#150d0d" />
                  <circle cx="74.2" cy="55.4" r="3.5" fill="#150d0d" />
                  <circle cx="47.6" cy="53.6" r="1.3" fill="#fff" />
                  <circle cx="75.6" cy="53.6" r="1.3" fill="#fff" />
                </g>
              </g>
              {/* grumpy lids + brows (only when disturbed) */}
              <g className="rb-grump">
                <path d="M39.5 54 Q46 47 52.5 54 L52.5 49 L39.5 49 Z" fill="#ebe0d8" />
                <path d="M67.5 54 Q74 47 80.5 54 L80.5 49 L67.5 49 Z" fill="#ebe0d8" />
                <path d="M39 49 L53 53" stroke="#5a3b34" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M81 49 L67 53" stroke="#5a3b34" strokeWidth="2.4" strokeLinecap="round" />
              </g>

              {/* nose, whiskers, mouth */}
              <path d="M56.5 62.5 Q60 60 63.5 62.5 Q62 66 60 66.5 Q58 66 56.5 62.5 Z" fill="#ff8fa3" />
              <g stroke="#cdb9ab" strokeWidth="1" strokeLinecap="round">
                <path d="M30 63 L16 60" /><path d="M30 67 L17 69" />
                <path d="M90 63 L104 60" /><path d="M90 67 L103 69" />
              </g>
              <g className="rb-mouth" fill="none" stroke="#6a4a44" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M60 66.5 V69 M60 69 Q55.5 73.5 51 70 M60 69 Q64.5 73.5 69 70" />
              </g>
              <rect className="rb-teeth" x="57.6" y="70.2" width="4.8" height="4.2" rx="1.2" fill="#fff" stroke="#e1d3c9" strokeWidth="0.6" />

              {/* anger puff */}
              <g className="rb-anger" fill="none" stroke="#ff5a5a" strokeWidth="2.2" strokeLinecap="round">
                <path d="M88 30 Q92 33 96 30" /><path d="M88 40 Q92 37 96 40" />
                <path d="M88 30 Q85 35 88 40" /><path d="M96 30 Q99 35 96 40" />
              </g>
            </g>

            {/* the carrot, held in both paws; it gets eaten from the tip */}
            <g className="rb-carrot">
              <g className="rb-leaves" fill="#4caf50" stroke="#2f8a3a" strokeWidth="0.8" strokeLinejoin="round">
                <path d="M60 106 Q50 112 47 124 Q57 120 60 108 Z" />
                <path d="M60 106 Q70 112 73 124 Q63 120 60 108 Z" />
                <path d="M60 106 Q57 116 60 128 Q63 116 60 106 Z" fill="#66c46a" />
              </g>
              <path d="M60 71 C55.5 77 54 92 55.5 107 L64.5 107 C66 92 64.5 77 60 71 Z" fill="url(#rbC)" />
              <path d="M56.2 82 H60 M60.5 90 H64.2 M56 98 H59.5" stroke="#c9540c" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
            </g>

            {/* arms + paws */}
            <path d="M40 104 Q42 94 52 91" fill="none" stroke="url(#rbW)" strokeWidth="9" strokeLinecap="round" />
            <path d="M80 104 Q78 94 68 91" fill="none" stroke="url(#rbW)" strokeWidth="9" strokeLinecap="round" />
            <ellipse cx="53" cy="90" rx="6" ry="5" fill="#fff" stroke="#e6d9cf" strokeWidth="0.8" />
            <ellipse cx="67" cy="90" rx="6" ry="5" fill="#fff" stroke="#e6d9cf" strokeWidth="0.8" />

            {/* crumbs */}
            <g className="rb-crumbs" fill="#ff9d3a">
              <circle cx="52" cy="76" r="1.5" /><circle cx="68" cy="77" r="1.2" /><circle cx="60" cy="80" r="1.3" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}

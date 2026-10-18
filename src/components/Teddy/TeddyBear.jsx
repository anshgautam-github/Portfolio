import { useId } from "react";

/**
 * The bear. Pure SVG + CSS (see teddy.css). Props:
 *   mood     "idle" | "wave" | "walk" | "hug" | "dance" | "think" | "scared"
 *   talking  mouth flaps while true
 * Eye + head follow the pointer through the --lx / --ly CSS variables set by <Teddy />.
 */
export default function TeddyBear({ mood = "idle", talking = false }) {
  const id = useId().replace(/:/g, "");
  const fur = `fur${id}`;
  const fur2 = `furb${id}`;

  return (
    <svg
      className={`ted-bear is-${mood}${talking ? " is-talking" : ""}`}
      viewBox="0 0 200 232"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={fur} cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#e2a467" />
          <stop offset="1" stopColor="#b0713a" />
        </radialGradient>
        <radialGradient id={fur2} cx="40%" cy="25%" r="80%">
          <stop offset="0" stopColor="#d99b5f" />
          <stop offset="1" stopColor="#9c602e" />
        </radialGradient>
      </defs>

      <ellipse className="ted-shadow" cx="100" cy="226" rx="62" ry="6.5" fill="#000" opacity="0.28" />

      <g className="ted-body">
        {/* feet */}
        <g className="ted-foot-l">
          <ellipse cx="64" cy="206" rx="27" ry="19" fill={`url(#${fur2})`} />
          <ellipse cx="64" cy="209" rx="13" ry="9.5" fill="#f1d3a1" />
        </g>
        <g className="ted-foot-r">
          <ellipse cx="136" cy="206" rx="27" ry="19" fill={`url(#${fur2})`} />
          <ellipse cx="136" cy="209" rx="13" ry="9.5" fill="#f1d3a1" />
        </g>

        {/* torso */}
        <ellipse cx="100" cy="162" rx="57" ry="55" fill={`url(#${fur})`} />
        <ellipse cx="100" cy="171" rx="36" ry="38" fill="#f1d3a1" />

        {/* left arm (viewer's left) */}
        <g className="ted-arm-l">
          <ellipse cx="45" cy="160" rx="15" ry="30" transform="rotate(14 45 160)" fill={`url(#${fur2})`} />
          <circle cx="40" cy="187" r="6.5" fill="#f1d3a1" />
        </g>

        {/* bow tie */}
        <path d="M100 139 L77 126 Q72 138 77 152 Z" fill="#e0475b" />
        <path d="M100 139 L123 126 Q128 138 123 152 Z" fill="#e0475b" />
        <circle cx="100" cy="139" r="7.5" fill="#bd3045" />

        {/* head */}
        <g className="ted-head">
          <circle cx="50" cy="40" r="24" fill={`url(#${fur})`} />
          <circle cx="150" cy="40" r="24" fill={`url(#${fur})`} />
          <circle cx="51" cy="42" r="13" fill="#f1d3a1" />
          <circle cx="149" cy="42" r="13" fill="#f1d3a1" />

          <circle cx="100" cy="86" r="63" fill={`url(#${fur})`} />
          <ellipse cx="100" cy="106" rx="31" ry="24" fill="#f1d3a1" />
          <circle cx="64" cy="100" r="9" fill="#ff8f8f" opacity="0.32" />
          <circle cx="136" cy="100" r="9" fill="#ff8f8f" opacity="0.32" />

          {/* eyes */}
          <g className="ted-look">
            <ellipse className="ted-blink" cx="74" cy="76" rx="7.5" ry="8.5" fill="#2b1810" />
            <ellipse className="ted-blink" cx="126" cy="76" rx="7.5" ry="8.5" fill="#2b1810" />
            <circle cx="76.6" cy="72.6" r="2.6" fill="#fff" />
            <circle cx="128.6" cy="72.6" r="2.6" fill="#fff" />
          </g>

          {/* sweat drops (only visible when scared) */}
          <g className="ted-sweat" fill="#8fd3ff" stroke="#3b8fc4" strokeWidth="1.5">
            <path d="M22 70 Q14 86 22 92 Q30 86 22 70 Z" />
            <path d="M180 58 Q173 72 180 78 Q187 72 180 58 Z" />
          </g>

          {/* nose + mouth */}
          <ellipse cx="100" cy="94" rx="10.5" ry="7.2" fill="#2b1810" />
          <ellipse cx="97" cy="91.6" rx="3.4" ry="1.8" fill="#fff" opacity="0.55" />
          <g className="ted-smile" fill="none" stroke="#2b1810" strokeWidth="3.4" strokeLinecap="round">
            <path d="M100 101 V108" />
            <path d="M100 108 Q90 119 79 110" />
            <path d="M100 108 Q110 119 121 110" />
          </g>
          <g className="ted-open">
            <ellipse cx="100" cy="115" rx="10" ry="8" fill="#4d1d28" />
            <ellipse cx="100" cy="119" rx="6" ry="3.4" fill="#e8737f" />
          </g>
        </g>

        {/* right arm (the waving one) */}
        <g className="ted-arm-r">
          <ellipse cx="155" cy="160" rx="15" ry="30" transform="rotate(-14 155 160)" fill={`url(#${fur2})`} />
          <circle cx="160" cy="187" r="6.5" fill="#f1d3a1" />
        </g>
      </g>
    </svg>
  );
}

import { useId } from "react";

/**
 * The monitor-top rabbit: the same character as the corner <Rabbit /> (cream body, long pink-lined ears),
 * drawn on the same 200x232 grid as the old bear so every mood animation in teddy.css (.is-wave, .is-walk, .is-hug,
 * .is-dance, .is-think, .is-scared, .is-talking) keeps working unchanged. Pure SVG + CSS. Props:
 *   mood     "idle" | "wave" | "walk" | "hug" | "dance" | "think" | "scared"
 *   talking  mouth flaps while true
 * Pupils follow the pointer through the --lx / --ly CSS variables set by <Teddy />.
 */
export default function PandaBear({ mood = "idle", talking = false }) {
  const id = useId().replace(/:/g, "");
  const w = `pw${id}`;
  const k = `pk${id}`;

  return (
    <svg className={`ted-bear is-${mood}${talking ? " is-talking" : ""}`} viewBox="0 0 200 232" role="img" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={w} cx="40%" cy="28%" r="85%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ebe0d8" />
        </radialGradient>
        <radialGradient id={k} cx="40%" cy="28%" r="85%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6dad1" />
        </radialGradient>
      </defs>

      <ellipse className="ted-shadow" cx="100" cy="226" rx="62" ry="6.5" fill="#000" opacity="0.32" />

      <g className="ted-body">
        {/* feet */}
        <g className="ted-foot-l">
          <ellipse cx="64" cy="206" rx="27" ry="19" fill={`url(#${k})`} />
          <ellipse cx="64" cy="209" rx="12" ry="8.5" fill="#ffb4c3" opacity="0.5" />
        </g>
        <g className="ted-foot-r">
          <ellipse cx="136" cy="206" rx="27" ry="19" fill={`url(#${k})`} />
          <ellipse cx="136" cy="209" rx="12" ry="8.5" fill="#ffb4c3" opacity="0.5" />
        </g>

        {/* torso */}
        <ellipse cx="100" cy="162" rx="57" ry="55" fill={`url(#${w})`} />
        <ellipse cx="100" cy="171" rx="36" ry="38" fill="#fff" opacity="0.9" />

        {/* left arm (viewer's left) */}
        <g className="ted-arm-l">
          <ellipse cx="45" cy="160" rx="15" ry="30" transform="rotate(14 45 160)" fill={`url(#${k})`} />
          <ellipse cx="42" cy="183" rx="7" ry="5" fill="#ffb4c3" opacity="0.4" />
        </g>

        {/* little blue bow (the landing page accent) */}
        <path d="M100 156 L78 145 Q73 156 78 168 Z" fill="#3f72ee" />
        <path d="M100 156 L122 145 Q127 156 122 168 Z" fill="#3f72ee" />
        <path d="M78 145 Q73 156 78 168 L82 160 Z" fill="#fff" opacity="0.18" />
        <circle cx="100" cy="156" r="7" fill="#2b55c4" />

        {/* head */}
        <g className="ted-head">
          {/* long ears */}
          <ellipse cx="72" cy="30" rx="19" ry="46" transform="rotate(-7 72 30)" fill={`url(#${k})`} />
          <ellipse cx="128" cy="30" rx="19" ry="46" transform="rotate(7 128 30)" fill={`url(#${k})`} />
          <ellipse cx="72" cy="34" rx="9" ry="31" transform="rotate(-7 72 34)" fill="#ffb4c3" />
          <ellipse cx="128" cy="34" rx="9" ry="31" transform="rotate(7 128 34)" fill="#ffb4c3" />

          <ellipse cx="100" cy="90" rx="64" ry="54" fill={`url(#${w})`} />
          <circle cx="62" cy="106" r="11" fill="#ff9fb3" opacity="0.38" />
          <circle cx="138" cy="106" r="11" fill="#ff9fb3" opacity="0.38" />

          {/* eyes: irises blink, pupils follow the pointer */}
          <ellipse className="ted-blink" cx="72" cy="84" rx="9.4" ry="11" fill="#4a2f2a" />
          <ellipse className="ted-blink" cx="128" cy="84" rx="9.4" ry="11" fill="#4a2f2a" />
          <g className="ted-look">
            <circle cx="72.6" cy="84.6" r="6.2" fill="#150d0d" />
            <circle cx="127.4" cy="84.6" r="6.2" fill="#150d0d" />
            <circle cx="75" cy="81.4" r="2.2" fill="#fff" />
            <circle cx="129.8" cy="81.4" r="2.2" fill="#fff" />
          </g>

          {/* sweat drops (only visible when scared) */}
          <g className="ted-sweat" fill="#8fd3ff" stroke="#3b8fc4" strokeWidth="1.5">
            <path d="M22 70 Q14 86 22 92 Q30 86 22 70 Z" />
            <path d="M180 58 Q173 72 180 78 Q187 72 180 58 Z" />
          </g>

          {/* nose + mouth */}
          <path d="M91 98 Q100 92 109 98 Q105 107 100 108 Q95 107 91 98 Z" fill="#ff8fa3" />
          <ellipse cx="97" cy="97" rx="3" ry="1.5" fill="#fff" opacity="0.6" />
          <rect x="94.5" y="115" width="11" height="9" rx="2.6" fill="#fff" stroke="#e1d3c9" strokeWidth="1" />
          <g className="ted-smile" fill="none" stroke="#6a4a44" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M100 108 V114" />
            <path d="M100 114 Q91 124 81 116" />
            <path d="M100 114 Q109 124 119 116" />
          </g>
          <g className="ted-open">
            <ellipse cx="100" cy="120" rx="10" ry="8" fill="#3a1a24" />
            <ellipse cx="100" cy="124" rx="6" ry="3.4" fill="#e8737f" />
          </g>
        </g>

        {/* right arm (the waving one) */}
        <g className="ted-arm-r">
          <ellipse cx="155" cy="160" rx="15" ry="30" transform="rotate(-14 155 160)" fill={`url(#${k})`} />
          <ellipse cx="158" cy="183" rx="7" ry="5" fill="#ffb4c3" opacity="0.4" />
        </g>
      </g>
    </svg>
  );
}

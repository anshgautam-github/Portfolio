import { useId } from "react";

// Original abstract artwork used as placeholder card imagery (400x700 portrait).
export default function CardArt({ pattern, palette }) {
  const [a, b, c, d] = palette;
  const id = useId().replace(/:/g, "");
  const bg = (
    <>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={pattern === "neon" ? "#101614" : b} />
        </linearGradient>
      </defs>
      <rect width="400" height="700" fill={`url(#g${id})`} />
    </>
  );

  let art = null;
  switch (pattern) {
    case "stripes":
      art = (
        <g transform="rotate(-24 200 350)">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x="-200" y={-100 + i * 90} width="800" height="38" fill={i % 2 ? c : d} opacity="0.9" />
          ))}
          <circle cx="250" cy="330" r="120" fill={b} />
        </g>
      );
      break;
    case "sphere":
      art = (
        <g>
          <circle cx="210" cy="300" r="150" fill={b} />
          {Array.from({ length: 9 }).map((_, r) =>
            Array.from({ length: 9 }).map((__, q) => {
              const x = 80 + q * 32, y = 170 + r * 32;
              const inside = (x - 210) ** 2 + (y - 300) ** 2 < 140 ** 2;
              return inside ? <rect key={`${r}-${q}`} x={x} y={y} width="26" height="26" rx="4" fill={(r + q) % 3 ? c : d} opacity={0.35 + ((r * q) % 5) / 8} /> : null;
            })
          )}
          <rect x="130" y="520" width="220" height="40" rx="12" fill={d} opacity="0.85" />
        </g>
      );
      break;
    case "orbs":
      art = (
        <g>
          <circle cx="110" cy="170" r="150" fill={b} opacity="0.85" />
          <circle cx="320" cy="470" r="190" fill={c} opacity="0.9" />
          <circle cx="170" cy="560" r="90" fill={d} />
          <path d="M-20 700 C 100 520 260 560 420 400 V700 Z" fill={a} opacity="0.7" />
        </g>
      );
      break;
    case "neon":
      art = (
        <g fill="none" strokeLinecap="round">
          <path d="M-20 230 C 120 180 280 180 430 215" stroke={b} strokeWidth="26" />
          <path d="M-20 330 C 120 290 280 290 430 320" stroke={c} strokeWidth="16" />
          <circle cx="200" cy="470" r="105" fill="#0d1210" stroke={d} strokeWidth="6" opacity="0.95" />
          <circle cx="200" cy="470" r="48" fill={d} opacity="0.9" />
          <path d="M30 700 C 80 600 320 600 370 700" stroke={b} strokeWidth="8" opacity="0.6" />
        </g>
      );
      break;
    case "checker":
      art = (
        <g>
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 5 }).map((__, q) => (
              <rect key={`${r}-${q}`} x={q * 80} y={380 + r * 46} width="80" height="46" fill={(r + q) % 2 ? c : b} opacity="0.95" />
            ))
          )}
          <circle cx="200" cy="220" r="130" fill={b} />
          <circle cx="200" cy="220" r="70" fill={d} />
        </g>
      );
      break;
    case "rings":
      art = (
        <g fill="none">
          {Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx="260" cy="330" r={40 + i * 50} stroke={i % 2 ? b : d} strokeWidth="22" opacity="0.9" />
          ))}
          <rect x="30" y="540" width="190" height="34" rx="17" fill={d} />
        </g>
      );
      break;
    case "waves":
    default:
      art = (
        <g fill="none" strokeLinecap="round">
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M-20 ${120 + i * 70} C 80 ${60 + i * 70} 140 ${200 + i * 70} 230 ${120 + i * 70} S 380 ${80 + i * 70} 430 ${140 + i * 70}`} stroke={i % 2 ? c : d} strokeWidth="26" opacity="0.85" />
          ))}
        </g>
      );
  }

  return (
    <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      {bg}
      {art}
    </svg>
  );
}

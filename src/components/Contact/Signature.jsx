// An original hand-drawn style scribble. Drawn on via stroke-dashoffset (see Contact.jsx).
export default function Signature({ className = "", style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 130" fill="none" aria-hidden="true">
      <g stroke="#9dbcff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path data-sig pathLength="1" d="M4 98 C 40 92 120 52 176 8" />
        <path data-sig pathLength="1" d="M14 104 C 60 78 96 76 128 62 C 98 80 70 108 98 96 C 130 82 150 54 168 52" />
        <path data-sig pathLength="1" d="M150 50 C 168 36 186 34 190 52 C 192 66 176 82 162 84 L 214 74" />
        <path data-sig pathLength="1" d="M206 28 L 224 44 M 214 24 L 214 50" />
      </g>
    </svg>
  );
}

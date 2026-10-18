import { useMemo } from "react";

// Procedural contour-line background (faint blue rings that wobble like a topographic map).
function ring(cx, cy, r, seed) {
  const pts = [];
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k =
      1 +
      0.22 * Math.sin(2 * a + seed) +
      0.1 * Math.sin(3 * a + seed * 2.1) +
      0.03 * Math.sin(5 * a + seed * 3.3);
    pts.push(`${(cx + Math.cos(a) * r * k * 1.25).toFixed(1)},${(cy + Math.sin(a) * r * k).toFixed(1)}`);
  }
  return "M" + pts.join("L") + "Z";
}

const CENTERS = [
  [330, 380, 7],
  [1660, 300, 11],
  [1720, 820, 3],
  [260, 880, 5],
];

export default function Topo({ className = "" }) {
  const paths = useMemo(() => {
    const out = [];
    CENTERS.forEach(([cx, cy, seed], ci) => {
      for (let i = 1; i <= 4; i++) out.push(ring(cx, cy, 70 + i * 120 + ci * 8, seed + i * 0.22));
    });
    return out;
  }, []);

  return (
    <svg
      className={className}
      viewBox="0 0 2000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="#9dbcff" strokeOpacity="0.06" strokeWidth="1.2">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

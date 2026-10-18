import { useEffect, useMemo, useRef, useState } from "react";
import { teddy } from "./teddyContent.js";

/* ---------- pareto: sorted bars + cumulative line, hover to inspect ---------- */
function Pareto({ title, data, unit = "" }) {
  const W = 300;
  const H = 150;
  const m = { l: 26, r: 8, t: 22, b: 18 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const [hover, setHover] = useState(0);

  const rows = useMemo(() => {
    const total = data.reduce((s, d) => s + d[1], 0);
    const max = Math.max(...data.map((d) => d[1]));
    let acc = 0;
    return data.map(([label, v], i) => {
      acc += v;
      return { label, v, cum: acc / total, x: m.l + (i + 0.5) * (iw / data.length), h: (v / max) * ih * 0.9 };
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const bw = (iw / rows.length) * 0.72;
  const y = (p) => m.t + ih - p * ih;
  const line = rows.map((r, i) => `${i ? "L" : "M"}${r.x.toFixed(1)} ${y(r.cum).toFixed(1)}`).join(" ");
  const cur = rows[hover];

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round((px - m.l) / (iw / rows.length) - 0.5);
    setHover(Math.max(0, Math.min(rows.length - 1, i)));
  };

  return (
    <figure className="ted-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} role="img" aria-label={`${title}: ${rows.map((r) => `${r.label} ${r.v}`).join(", ")}`}>
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1={m.l} x2={W - m.r} y1={y(p)} y2={y(p)} className="grid" />
            <text x={m.l - 4} y={y(p) + 3} textAnchor="end" className="ax">
              {Math.round(p * 100)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => (
          <rect
            key={r.label}
            className={`bar${i === hover ? " hot" : ""}`}
            x={r.x - bw / 2}
            y={m.t + ih - r.h}
            width={bw}
            height={r.h}
            style={{ animationDelay: `${i * 55}ms` }}
          />
        ))}
        <path d={line} className="cum" pathLength="1" />
        {rows.map((r, i) => (
          <circle key={i} cx={r.x} cy={y(r.cum)} r={i === hover ? 3 : 1.6} className={i === hover ? "dot hot" : "dot"} />
        ))}
        <text x={rows[0].x} y={H - 5} className="ax" textAnchor="middle">
          1
        </text>
        <text x={rows[rows.length - 1].x} y={H - 5} className="ax" textAnchor="middle">
          {rows.length}
        </text>
        <g transform={`translate(${Math.min(Math.max(cur.x, 70), W - 70)} ${Math.max(y(cur.cum) - 18, 6)})`} className="tip">
          <rect x="-58" y="-9" width="116" height="15" rx="2" />
          <text textAnchor="middle" y="2">
            {cur.label} · {cur.v}
            {unit} · {(cur.cum * 100).toFixed(1)}%
          </text>
        </g>
      </svg>
    </figure>
  );
}

/* ---------- live line chart ---------- */
function Live({ title, unit, sample, active, base = 0.5, caption }) {
  const N = 60;
  const W = 300;
  const H = 120;
  const m = { l: 26, r: 8, t: 20, b: 16 };
  const [pts, setPts] = useState(() => {
    let v = base;
    return Array.from({ length: N }, () => {
      v = Math.max(0.08, Math.min(0.95, v + (Math.random() - 0.5) * 0.18));
      return v;
    });
  });
  const [hover, setHover] = useState(null);
  const sampleRef = useRef(sample);
  sampleRef.current = sample;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPts((p) => [...p.slice(1), sampleRef.current(p[p.length - 1])]), 380);
    return () => clearInterval(id);
  }, [active]);

  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const X = (i) => m.l + (i / (N - 1)) * iw;
  const Y = (v) => m.t + ih - v * ih;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const last = pts[N - 1];
  const hi = hover == null ? N - 1 : hover;

  return (
    <figure className="ted-chart">
      <figcaption>
        {title}
        <span>{caption ?? `${Math.round(pts[hi] * 100)}${unit}`}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - b.left) / b.width) * W;
          setHover(Math.max(0, Math.min(N - 1, Math.round(((px - m.l) / iw) * (N - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`${title} live chart`}
      >
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1={m.l} x2={W - m.r} y1={Y(p)} y2={Y(p)} className="grid" />
            <text x={m.l - 4} y={Y(p) + 3} textAnchor="end" className="ax">
              {Math.round(p * 100)}
            </text>
          </g>
        ))}
        <text x={m.l} y={H - 3} className="ax">
          -{N * 0.38 | 0}s
        </text>
        <text x={W - m.r} y={H - 3} className="ax" textAnchor="end">
          now
        </text>
        <path d={`${d} L${X(N - 1)} ${Y(0)} L${X(0)} ${Y(0)} Z`} className="area" />
        <path d={d} className="ln" />
        <rect x={X(N - 1) - 3} y={Y(last) - 3} width="6" height="6" className="end" />
        {hover != null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={m.t + ih} className="cross" />
            <circle cx={X(hover)} cy={Y(pts[hover])} r="3" className="dot hot" />
          </g>
        )}
      </svg>
    </figure>
  );
}

export default function Stats({ active, keysRef }) {
  const lastKeys = useRef(0);

  return (
    <div className="ted-stats" key={active ? "on" : "off"}>
      <div className="ted-stats-grid">
        <Pareto title="SKILL LOAD" data={teddy.skillLoad} unit="%" />
        <Pareto title="PROJECT MIX" data={teddy.projectMix} unit="%" />
        <div className="ted-stats-logo">
          <svg className="ted-globe" viewBox="0 0 400 130" fill="none" aria-hidden="true">
            <path d="M20 66 Q200 -8 380 66" />
            <path d="M20 66 Q200 140 380 66" />
            <path d="M120 52 Q200 6 280 52" />
            <path d="M120 80 Q200 126 280 80" />
            <path d="M200 8 V124" />
          </svg>
          <div className="ted-logo-text">PANDA OS</div>
          <div className="ted-press">
            AWAITING INPUT<span className="ted-caret" />
          </div>
        </div>
        <Live
          title="LATENCY"
          unit="ms"
          active={active}
          base={0.55}
          sample={(p) => Math.max(0.1, Math.min(0.95, p + (Math.random() - 0.5) * 0.2))}
          caption={undefined}
        />
        <Live
          title="KEY ACTIVITY"
          unit=" keys"
          active={active}
          base={0.1}
          sample={(p) => {
            const k = keysRef.current;
            const delta = k - lastKeys.current;
            lastKeys.current = k;
            return Math.max(0.04, Math.min(0.98, p * 0.55 + Math.min(1, delta / 6) * 0.6 + 0.03));
          }}
          caption={`${keysRef.current} KEYS`}
        />
      </div>
      <p className="ted-stats-note">hover the charts · type in the terminal and watch KEY ACTIVITY spike</p>
    </div>
  );
}

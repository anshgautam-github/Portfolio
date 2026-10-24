/* Artwork for a program card / spotlight: tinted gradient, real logo tile, org + duration. Sizes with container units. */
import amazon from "./logos/amazon.png";
import iisc from "./logos/iisc.png";
import ibm from "./logos/ibm.png";
import ios from "./logos/ios.svg";
import mckinsey from "./logos/mckinsey.png";
import gssoc from "./logos/gssoc.png";
import microsoft from "./logos/microsoft.svg";
import hacktoberfest from "./logos/hacktoberfest.png";

const LOGOS = { amazon, iisc, ibm, ios, mckinsey, gssoc, microsoft, hacktoberfest };

/* one signature motif per program, drawn big and faint behind the logo (viewBox 100 x 138) */
const L = { fill: "none", stroke: "#fff", strokeWidth: 0.35 };
const MOTIF = {
  amazon: () => (<>{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M-5 ${70 + i * 9} Q50 ${105 + i * 9} 105 ${62 + i * 9}`} {...L} opacity={0.9 - i * 0.12} />)}<path d="M72 112l10 4-3 10" {...L} strokeWidth="1" /></>),
  iisc: () => (<>{[8, 16, 24, 32, 40, 48].map((r) => <circle key={r} cx="50" cy="52" r={r * 1.5} {...L} strokeDasharray={r % 16 ? "0.6 1.6" : "none"} />)}{Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return <path key={i} d={`M${50 + Math.cos(a) * 20} ${52 + Math.sin(a) * 20}L${50 + Math.cos(a) * 74} ${52 + Math.sin(a) * 74}`} {...L} opacity=".5" />; })}</>),
  ibm: () => (<>{Array.from({ length: 24 }, (_, i) => <rect key={i} x="-2" y={4 + i * 6} width="104" height="1.1" fill="#fff" opacity={0.05 + (i % 4 === 0 ? 0.1 : 0)} />)}<rect x="8" y="14" width="84" height="64" rx="3" {...L} opacity=".5" /></>),
  ios: () => (<>{[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M-6 ${16 + i * 9} C 28 ${-6 + i * 12}, 60 ${70 + i * 5}, 108 ${34 + i * 12}`} {...L} opacity={0.85 - i * 0.09} />)}</>),
  mckinsey: () => (<>{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${-4 + i * 7} 142 Q50 ${6 + i * 3} ${104 - i * 7} 142`} {...L} opacity={0.8 - i * 0.03} />)}</>),
  gssoc: () => (<>{[[10, 24], [62, 12], [14, 72], [70, 66], [36, 100], [78, 106]].map(([x, y], i) => <text key={i} x={x} y={y} fontFamily="ui-monospace, Menlo, monospace" fontSize={i % 2 ? 14 : 20} fill="#fff" opacity={0.16 + (i % 3) * 0.05}>{["</>", "{ }", "()", "=>", "//", "[ ]"][i]}</text>)}</>),
  microsoft: () => (<>{Array.from({ length: 6 }, (_, r) => Array.from({ length: 5 }, (_, c) => <rect key={r + "-" + c} x={4 + c * 20} y={4 + r * 20} width="17" height="17" rx="2" {...L} opacity={0.35 + ((r + c) % 3) * 0.2} />))}<rect x="24" y="24" width="17" height="17" fill="#fff" opacity=".12" /><rect x="64" y="64" width="17" height="17" fill="#fff" opacity=".1" /></>),
  hacktoberfest: () => (<>{Array.from({ length: 9 }, (_, r) => Array.from({ length: 7 }, (_, c) => <circle key={r + "-" + c} cx={8 + c * 14 + (r % 2) * 7} cy={8 + r * 14} r={1 + ((r * 3 + c) % 4) * 0.45} fill="#fff" opacity={0.22} />))}<path d="M14 118l26-30 14 14 32-40" {...L} strokeWidth="1" opacity=".5" /></>),
};

const ON_WHITE = new Set(["ibm", "iisc"]);      // these logos ship on a white square

export default function ProgramArt({ d }) {
  return (
    <div className="pa" style={{ "--c1": d.acc[0], "--c2": d.acc[1] }}>
      <i className="pa-orb pa-orb--1" /><i className="pa-orb pa-orb--2" /><i className="pa-orb pa-orb--3" />
      <svg className="pa-motif" viewBox="0 0 100 138" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{MOTIF[d.logo]?.()}</svg>
      <i className="pa-halo" /><i className="pa-sheen" /><i className="pa-frame" /><i className="pa-grain" />
      <span className="pa-dur">{d.duration}</span>
      <div className={"pa-tile pa-bare" + (ON_WHITE.has(d.logo) ? " is-mono" : "") + (d.logo === "microsoft" ? " is-ms" : "")}>
        <img decoding="async" src={LOGOS[d.logo]} alt={d.org + " logo"} draggable="false" />
      </div>
      <p className="pa-org">{d.short || d.org}</p>
      <p className="pa-when">{d.year}</p>
    </div>
  );
}

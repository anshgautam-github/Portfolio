/* Built-in mock interfaces shown on the devices (swap for real screenshots via projectsData.js). */

const TOOLS = ["Title", "Text", "Image", "Button", "Audio", "Video"];
const LAYOUT = ["Quote", "Table", "Map", "Card", "Gallery", "Spacer"];

export function BuilderScreen({ chapter, heading, card }) {
  return (
    <div className="pj-s pj-builder">
      <div className="pj-b-top">
        <i className="pj-b-logo" />
        <span>Learning Experience Title</span>
        <b>›</b>
        <span>Pathway Title</span>
        <em />
        <u>PREVIEW</u>
      </div>
      <div className="pj-b-body">
        <div className="pj-b-rail">
          <i />
          <i className="on" />
          <i />
        </div>
        <div className="pj-b-panel">
          <h6>BUILD</h6>
          <div className="pj-b-search">Search</div>
          <div className="pj-b-tabs">
            <span className="on">TOOL</span>
            <span>COMPONENT</span>
            <span>LIBRARY</span>
          </div>
          <h6>MEDIA</h6>
          <div className="pj-b-grid">
            {TOOLS.map((t) => (
              <span key={t}>
                <i />
                {t}
              </span>
            ))}
          </div>
          <h6>LAYOUT</h6>
          <div className="pj-b-grid">
            {LAYOUT.map((t) => (
              <span key={t}>
                <i />
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="pj-b-canvas">
          <span className="pj-b-chip">{chapter}</span>
          <h3>{heading}</h3>
          <div className="pj-b-line">
            <i />
          </div>
          <div className="pj-b-card">
            <h5>{card}</h5>
            <p>Like all organisms, plants have cells. Plant cells have a nucleus with chromosomes and DNA, and they have mitochondria.</p>
            <p>In this chapter you'll learn how plant cells work, and what makes them different to animal cells.</p>
            <button type="button" tabIndex={-1}>
              Begin Chapter →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const GAMES = [
  ["Overwatch", "120h", "linear-gradient(135deg,#f59e0b,#7c2d12)", 1],
  ["Firewatch", "0.4h / 7h", "linear-gradient(135deg,#ef4444,#7f1d1d)", 0.06],
  ["Transistor", "1h / 6h", "linear-gradient(135deg,#14b8a6,#134e4a)", 0.17],
  ["Hyper Light Drifter", "0.4h / 7h", "linear-gradient(135deg,#d946ef,#4c1d95)", 0.06],
  ["Xcom 2", "120h / 30h", "linear-gradient(135deg,#22d3ee,#164e63)", 1],
  ["Wild Hunt", "120h / 30h", "linear-gradient(135deg,#a3a3a3,#262626)", 1],
  ["No Man's Sky", "40h / 60h", "linear-gradient(135deg,#34d399,#1e3a8a)", 0.66],
];

export function TrackerScreen() {
  return (
    <div className="pj-s pj-tracker">
      <div className="pj-p-status">
        <span>9:41</span>
        <span>▮▮▮ ◔ ▬</span>
      </div>
      <div className="pj-t-head">
        <span>☰</span>
        <b>Playing</b>
        <span>⚲</span>
      </div>
      <div className="pj-t-hero" />
      <ul className="pj-t-list">
        {GAMES.map(([n, h, bg, p]) => (
          <li key={n}>
            <i style={{ background: bg }} />
            <div>
              <b>{n}</b>
              <small>◷ {h}</small>
              <span>
                <em style={{ width: `${Math.round(p * 100)}%` }} />
              </span>
            </div>
            <u>⋮</u>
          </li>
        ))}
      </ul>
      <div className="pj-t-tabs">
        <span>Backlog</span>
        <span className="on">Playing</span>
        <span>Finished</span>
        <span>Profile</span>
      </div>
    </div>
  );
}

export function LoginScreen() {
  return (
    <div className="pj-s pj-login">
      <div className="pj-p-status">
        <span>9:41</span>
        <span>▮▮▮ ◔ ▬</span>
      </div>
      <div className="pj-l-art" />
      <div className="pj-l-logo" />
      <h4>Gamestack</h4>
      <p>Synchronize your games and complete your backlog.</p>
      <button type="button" tabIndex={-1}>
        Create account
      </button>
      <button type="button" tabIndex={-1} className="alt">
        Sign in
      </button>
      <small>By tapping Create Account I agree to the Terms and Conditions.</small>
    </div>
  );
}

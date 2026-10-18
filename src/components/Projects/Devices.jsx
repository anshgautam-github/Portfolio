import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BuilderScreen, LoginScreen, TrackerScreen } from "./Screens.jsx";

/* scales a fixed-size "design" stage to the width of its container */
function Fit({ w, h, children }) {
  const wrap = useRef(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = wrap.current;
    const ro = new ResizeObserver(([e]) => setK(Math.min(1.1, e.contentRect.width / w)));
    ro.observe(el);
    setK(Math.min(1.1, el.clientWidth / w));
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={wrap} className="pj-fit" style={{ height: h * k }}>
      <div className="pj-fit-in" style={{ width: w, height: h, transform: `scale(${k})` }}>
        {children}
      </div>
    </div>
  );
}

/* pointer tilt: writes --tx / --ty (-1..1) and --hov (0..1) onto the stage, eased with rAF */
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const t = { x: 0, y: 0, h: 0 };
    const c = { x: 0, y: 0, h: 0 };
    let raf = 0;
    const loop = () => {
      c.x += (t.x - c.x) * 0.08;
      c.y += (t.y - c.y) * 0.08;
      c.h += (t.h - c.h) * 0.08;
      el.style.setProperty("--tx", c.x.toFixed(3));
      el.style.setProperty("--ty", c.y.toFixed(3));
      el.style.setProperty("--hov", c.h.toFixed(3));
      raf = Math.abs(t.x - c.x) + Math.abs(t.y - c.y) + Math.abs(t.h - c.h) > 0.002 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => !raf && (raf = requestAnimationFrame(loop));
    const move = (e) => {
      const r = el.getBoundingClientRect();
      t.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      t.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      t.h = 1;
      kick();
    };
    const leave = () => {
      t.x = t.y = t.h = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

const mk = (s) => s.split(" ").map((t) => ({ t }));
const KEYS = [
  [...mk("esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12"), { t: "", c: "pw" }].map((k) => ({ ...k, c: (k.c || "") + " fn", t: k.t === "" ? "" : k.t })),
  [...mk("` 1 2 3 4 5 6 7 8 9 0 - ="), { t: "⌫", w: 1.6 }],
  [{ t: "⇥", w: 1.6 }, ...mk("Q W E R T Y U I O P [ ] \\")],
  [{ t: "⇪", w: 1.9 }, ...mk("A S D F G H J K L ; '"), { t: "⏎", w: 2 }],
  [{ t: "⇧", w: 2.4 }, ...mk("Z X C V B N M , . /"), { t: "⇧", w: 2.4 }],
  [{ t: "fn" }, { t: "⌃" }, { t: "⌥" }, { t: "⌘", w: 1.3 }, { t: "", w: 5.6 }, { t: "⌘", w: 1.3 }, { t: "⌥" }, { t: "◂", c: "arr" }, { t: "▴▾", c: "arr" }, { t: "▸", c: "arr" }],
];

/* ------------------------------------------------------------------ MacBook-style laptop (pure CSS 3D) */
export function Laptop({ image, screen }) {
  const stage = useRef(null);
  useTilt(stage);
  return (
    <Fit w={900} h={700}>
      <div className="pj-mb-stage" ref={stage}>
        <div className="pj-mb-scene">
          {/* base: an extruded slab (stacked outlines, so the rounded corners have no gaps) */}
          <div className="pj-mb-base">
            {Array.from({ length: 16 }, (_, k) => (
              <div key={k} className="pj-mb-slab" style={{ transform: `translateZ(${-(k + 1)}px)`, background: `hsl(235 6% ${27 - k * 1.1}%)` }} />
            ))}
            <div className="pj-mb-deck">
              <div className="pj-mb-grill l" />
              <div className="pj-mb-grill r" />
              <div className="pj-mb-keys">
                {KEYS.map((row, r) => (
                  <div key={r} className={`row r${r}`}>
                    {row.map((k, i) => (
                      <i key={i} className={k.c || ""} style={k.w ? { flex: k.w } : undefined}>
                        {k.t}
                      </i>
                    ))}
                  </div>
                ))}
              </div>
              <div className="pj-mb-pad" />
              <div className="pj-mb-notch" />
              <div className="pj-mb-glow" />
            </div>
          </div>
          <div className="pj-mb-hinge" />

          {/* lid (hinged at the back edge of the base) */}
          <div className="pj-mb-lid">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="pj-mb-edge" style={{ transform: `translateZ(${-n}px)`, background: `hsl(235 6% ${30 - n * 2.5}%)` }} />
            ))}
            <div className="pj-mb-back">
              <i />
            </div>
            <div className="pj-mb-front">
              <span className="pj-mb-cam" />
              <div className="pj-mb-display">
                <span className="pj-mb-dnotch" />
                <div className="pj-mb-screen">
                  {image ? <img src={image} alt="" draggable={false} /> : <BuilderScreen {...screen} />}
                </div>
                <div className="pj-mb-sheen" />
              </div>
            </div>
          </div>
        </div>
        <div className="pj-mb-shadow" />
      </div>
    </Fit>
  );
}

/* ------------------------------------------------------------------ two phones */
function Phone({ cls, children }) {
  return (
    <div className={`pj-ph ${cls}`}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <div key={n} className="pj-ph-edge" style={{ transform: `translateZ(${-n * 1.4}px)` }} />
      ))}
      <div className="pj-ph-back" />
      <div className="pj-ph-face">
        <span className="pj-ph-notch" />
        <div className="pj-ph-screen">{children}</div>
        <div className="pj-ph-sheen" />
      </div>
    </div>
  );
}

export function Phones({ images }) {
  const stage = useRef(null);
  useTilt(stage);
  return (
    <Fit w={720} h={720}>
      <div className="pj-ph-stage" ref={stage}>
        <div className="pj-ph-scene">
          <Phone cls="back">{images?.[0] ? <img src={images[0]} alt="" draggable={false} /> : <LoginScreen />}</Phone>
          <Phone cls="front">{images?.[1] ? <img src={images[1]} alt="" draggable={false} /> : <TrackerScreen />}</Phone>
        </div>
        <div className="pj-ph-shadow" />
      </div>
    </Fit>
  );
}

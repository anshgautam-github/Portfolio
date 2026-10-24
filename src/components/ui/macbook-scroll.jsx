import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./macbook-scroll.css";

gsap.registerPlugin(ScrollTrigger);


/**
 * MacbookScroll - the section pins (ScrollTrigger); as you scroll the lid swings open and the screen's picture lifts out
 * of the laptop and grows to fill the view. No framer-motion needed.
 *
 * Props: src (screen image), title (node), badge (node, sits on the base), showGradient (bool)
 */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const map = (v, [i0, i1], [o0, o1]) => o0 + (o1 - o0) * clamp((v - i0) / (i1 - i0));

const ROWS = [
  ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "return"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
  ["fn", "ctrl", "opt", "cmd", "", "cmd", "opt", "←", "↑↓", "→"],
];
const WIDE = { delete: 1.7, tab: 1.5, "\\": 1.2, caps: 1.8, return: 2.1, shift: 2.4, cmd: 1.3, "": 5.2, esc: 1.1, fn: 1.1 };

export function MacbookScroll({ src, showGradient = true, title, badge }) {
  const root = useRef(null);
  const stage = useRef(null);
  const img = useRef(null);
  const pop = useRef(null);

  useEffect(() => {
    const el = stage.current;
    const set = (k, v) => el.style.setProperty(k, v);
    const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);       // smootherstep: slow in, slow out

    const draw = (p) => {
      const vw = el.clientWidth, vh = el.clientHeight;
      const fit = Math.min(1, (vw * 0.9) / 512, (vh - 200) / 672);
      // 1) the laptop is already open with the picture on its screen (the laptop itself never bends)
      set("--mb-s", (fit * map(p, [0, 0.16], [0.86, 1])).toFixed(4));
      set("--mb-to", (1 - map(p, [0.1, 0.3], [0, 1])).toFixed(3));
      set("--mb-tt", map(p, [0, 0.3], [0, -50]).toFixed(1) + "px");

      // 2) the picture rises out of the screen (lift), then drifts out toward you and grows to fill the view (fly)
      const t = clamp((p - 0.16) / 0.72);
      const lift = ease(clamp(t / 0.3));
      const fly = ease(clamp((t - 0.22) / 0.78));
      const pe = pop.current, im = img.current;
      if (!pe || !im) return;
      set("--mb-dim", (1 - 0.82 * ease(clamp(t / 0.45))).toFixed(3));   // the screen empties as the picture leaves it
      if (t <= 0.001) { pe.style.opacity = "0"; set("--mb-rig-o", "1"); set("--mb-rig-y", "0px"); return; }
      const sr = el.getBoundingClientRect();
      const r = im.getBoundingClientRect();                 // where the picture sits on the screen right now
      const w0 = r.width, h0 = r.height;
      const cx0 = r.left - sr.left + w0 / 2, cy0 = r.top - sr.top + h0 / 2;
      const w1 = Math.min(vw - 24, 1400, (vh - 24) * 1.6), h1 = w1 / 1.6;
      const lerp = (a, b, k) => a + (b - a) * k;
      // lift: the picture steps slightly forward and up out of the glass
      const lw = w0 * (1 + 0.06 * lift), lh = h0 * (1 + 0.06 * lift);
      const lcx = cx0, lcy = cy0 - 18 * lift;
      const W = lerp(lw, w1, fly), H = lerp(lh, h1, fly);
      const cx = lerp(lcx, vw / 2, fly), cy = lerp(lcy, vh / 2, fly);
      pe.style.opacity = "1";
      pe.style.left = cx - W / 2 + "px";
      pe.style.top = cy - H / 2 + "px";
      pe.style.width = W + "px";
      pe.style.height = H + "px";
      // one rigid picture (nothing bends): it lifts off the glass leaning back a little, then settles upright as it comes toward you
      const tilt = 13 * lift * Math.pow(1 - fly, 1.6);
      pe.style.borderRadius = lerp(10, 20, fly) + "px";
      pe.style.transform = `perspective(1500px) rotateX(${tilt.toFixed(2)}deg)`;
      pe.style.boxShadow =
        `0 ${(lerp(8, 50, fly) * lift).toFixed(1)}px ${(lerp(26, 120, fly) * lift).toFixed(1)}px rgba(0,0,0,${(0.5 * lift).toFixed(2)}),` +
        `0 0 ${(lerp(30, 90, fly) * lift).toFixed(1)}px rgba(150,190,255,${(0.16 * lift * (1 - fly * 0.6)).toFixed(2)})`;
      // the laptop sinks away behind it
      set("--mb-rig-o", (1 - 0.88 * fly).toFixed(3));
      set("--mb-rig-y", (120 * fly).toFixed(1) + "px");
    };

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: () => "+=" + Math.round(window.innerHeight * 3.6),
      pin: stage.current,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => draw(self.progress),
      onRefresh: (self) => draw(self.progress),
    });
    draw(st.progress);
    const onResize = () => draw(st.progress);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); st.kill(); };
  }, []);

  return (
    <div ref={root} className="mb">
      <div ref={stage} className="mb-stage">
        <h2 className="mb-title">{title || <span>This Macbook is built with Tailwindcss. <br /> No kidding.</span>}</h2>

        <div className="mb-rig">
          <div className="mb-lid">
            <div className="mb-back">
              <svg className="mb-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8s-1.7-.8-2.9-.8c-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.600 1.100 8.800.7 1.100 1.600 2.300 2.700 2.200 1.100 0 1.500-.7 2.800-.7s1.700.7 2.900.7 1.900-1.100 2.600-2.100c.8-1.200 1.100-2.400 1.200-2.500-.1 0-2.200-.9-2.200-3.500zM14.200 6.100c.6-.7 1-1.700.9-2.700-.9 0-1.900.6-2.500 1.300-.6.600-1 1.600-.9 2.600 1 .1 1.900-.5 2.500-1.200z" /></svg>
            </div>
            <div className="mb-face">
              <div className="mb-notch" />
              {src ? <img decoding="async" ref={img} src={src} alt="" className="mb-img" draggable="false" /> : <div ref={img} className="mb-img" />}
            </div>
          </div>

          <div className="mb-base">
            <div className="mb-bar" />
            <div className="mb-deck">
              <div className="mb-spk mb-spk--l" />
              <div className="mb-kb">
                {ROWS.map((row, ri) => (
                  <div className={"mb-row" + (ri === 0 ? " mb-row--fn" : "")} key={ri}>
                    {row.map((k, ki) => (
                      <span key={ki} className="mb-key" style={{ flex: `${WIDE[k] || 1} 1 0` }}><i>{k}</i></span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mb-spk mb-spk--r" />
              <div className="mb-pad" />
            </div>
            <div className="mb-lip" />
            {badge && <div className="mb-badge">{badge}</div>}
          </div>

          {showGradient && <div className="mb-grad" />}
        </div>

        {/* the picture that comes out of the screen */}
        <div ref={pop} className="mb-pop">{src ? <img decoding="async" src={src} alt="" draggable="false" /> : null}</div>
      </div>
    </div>
  );
}

import { forwardRef } from "react";
import { content } from "../../content.js";

// Two identical groups side by side; GSAP moves the track -50% for a seamless loop.
const Marquee = forwardRef(function Marquee({ scale = 1, margin = 85 }, ref) {
  return (
    <div ref={ref} className="flex w-max items-center will-change-transform">
      {[0, 1].map((g) => (
        <div key={g} className="flex shrink-0 items-center" aria-hidden={g === 1}>
          {content.partners.map((p) => (
            <span
              key={p.text + g}
              className={`select-none whitespace-nowrap leading-none ${p.cls}`}
              style={{
                fontSize: `calc(var(--u, var(--m)) * ${p.size * scale})`,
                margin: `0 calc(var(--u, var(--m)) * ${margin})`,
              }}
            >
              {p.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
});

export default Marquee;

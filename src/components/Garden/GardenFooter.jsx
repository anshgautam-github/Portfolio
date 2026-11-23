import { content } from "../../content.js";

/* The garden scene doubles as the site footer: a flush, solid band at the foot of the scene.
   Copy and links live in content.js (garden.footer); a link with an empty href is simply not rendered. */

const goTo = (e, id) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  if (window.__lenis) window.__lenis.scrollTo(y, { duration: 2.2 });
  else window.scrollTo({ top: y, behavior: "smooth" });
};
const toTop = (e) => {
  e.preventDefault();
  if (window.__lenis) window.__lenis.scrollTo(0, { duration: 2.8 });
  else window.scrollTo({ top: 0, behavior: "smooth" });
};

export default function GardenFooter() {
  const f = content.garden.footer;
  const socials = f.socials.filter((s) => s.href);
  return (
    <footer className="gd-foot">
      <div className="gd-foot-in">
        <div className="gd-foot-brand">
          <p className="gd-foot-name">{f.name}</p>
          <p className="gd-foot-sub">{f.tagline}</p>
        </div>

        <nav className="gd-foot-links" aria-label="Footer">
          {f.nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} onClick={(e) => goTo(e, n.id)}>{n.label}</a>
          ))}
          {socials.map((s) => (
            <a key={s.label} href={s.href} {...(/^https?:/.test(s.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {s.label}
            </a>
          ))}
        </nav>

        <div className="gd-foot-meta">
          <span>&copy; {f.year} {f.name}</span>
          <a href="#top" onClick={toTop}>Back to top &uarr;</a>
        </div>
      </div>
    </footer>
  );
}

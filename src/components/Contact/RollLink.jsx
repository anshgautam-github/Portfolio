const EASE = "ease-[cubic-bezier(.7,0,.2,1)]";

/** Link with a vertical "roll" hover: label slides up and a light-blue copy takes its place. */
export default function RollLink({ href, children, className = "", hover = "text-[#9dbcff]" }) {
  return (
    <a href={href} className={`group relative block overflow-hidden ${className}`}>
      <span className={`block transition-transform duration-500 ${EASE} group-hover:-translate-y-full`}>
        {children}
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-0 block translate-y-full transition-transform duration-500 ${EASE} group-hover:translate-y-0 ${hover}`}
      >
        {children}
      </span>
    </a>
  );
}


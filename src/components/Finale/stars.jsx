// shared hand-wobbled five-point star (100 x 100 box), tinted by CSS
export const STAR = "M50 5 C54 18 58 28 62 34 C73 35 85 35 95 36 C86 43 78 49 69 56 C72 67 76 78 79 91 C68 84 59 77 50 71 C41 77 31 85 21 91 C24 79 28 68 31 57 C22 50 13 43 5 36 C16 35 28 34 38 34 C42 27 46 17 50 5 Z";

export function Star({ className = "", style, ...geo }) {
  return (
    <svg className={className} style={style} {...geo} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={STAR} />
    </svg>
  );
}

// deterministic scatter: server / client / re-renders always agree
export function scatter(n, seed, make) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: n }, (_, i) => make(rnd, i));
}

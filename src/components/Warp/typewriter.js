/*
  Typewriter reveal, driven by scroll (Warp.jsx scrubs `set(p)` from 0..1).
  Every text node inside `block` is split into  [typed][caret][not-yet-typed]  - the untyped rest stays in the layout
  (just invisible), so nothing reflows while it "types". Characters arrive with a human rhythm: pauses after spaces,
  longer ones after punctuation, small random hesitations. Scrolling back "un-types" it.
*/
const seeded = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export function prepareTyper(block, onKey) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);

  const parts = nodes.map((node) => {
    const full = node.nodeValue;
    const wrap = document.createElement("span");
    wrap.className = "tw";
    const on = document.createElement("span");
    const caret = document.createElement("i");
    caret.className = "tw-caret";
    const off = document.createElement("span");
    off.className = "tw-off";
    off.textContent = full;
    wrap.append(on, caret, off);
    node.parentNode.replaceChild(wrap, node);
    return { full, on, off, caret, len: full.length };
  });

  const all = parts.map((p) => p.full).join("");
  const N = all.length;
  const rnd = seeded(N * 31 + 7);
  const cum = [0];
  for (let i = 0; i < N; i++) {
    const ch = all[i];
    let w = 0.6 + rnd() * 0.9;
    if (ch === " ") w *= 1.5;
    if (",.;:".includes(ch)) w += 2.2 + rnd() * 1.5;
    if (rnd() < 0.06) w += 1.6; // a hesitation
    cum.push(cum[i] + w);
  }
  const total = cum[N] || 1;

  let shown = -1;
  const render = (count) => {
    let rest = count;
    let active = -1;
    parts.forEach((pt, i) => {
      const k = Math.max(0, Math.min(pt.len, rest));
      rest -= k;
      pt.on.textContent = pt.full.slice(0, k);
      pt.off.textContent = pt.full.slice(k);
      if (active < 0 && k < pt.len) active = i;
      pt.caret.style.display = "none";
    });
    if (count > 0 && count < N && active >= 0) parts[active].caret.style.display = "inline-block";
  };
  render(0);
  shown = 0;

  const countAt = (p) => {
    const target = Math.max(0, Math.min(1, p)) * total;
    let lo = 0;
    let hi = N;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  return {
    set(p) {
      const c = countAt(p);
      if (c === shown) return;
      const d = c - shown;
      shown = c;
      render(c);
      if (d > 0 && onKey) onKey(all[c - 1], d);
    },
  };
}

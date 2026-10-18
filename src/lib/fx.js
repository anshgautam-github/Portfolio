// Small helpers shared by the scroll-reveal sections.

/**
 * Split an element's text (including text inside nested spans) into per-character inline-blocks,
 * keeping words together so they never break mid-word. Returns { chars, revert }.
 */
export function splitChars(el) {
  if (el.dataset.split) return { chars: [...el.querySelectorAll("[data-ch]")], revert() {} };
  const original = el.innerHTML;
  el.dataset.split = "1";
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => {
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(" "));
        return;
      }
      const word = document.createElement("span");
      word.style.cssText = "display:inline-block;white-space:nowrap";
      for (const ch of part) {
        const c = document.createElement("span");
        c.dataset.ch = "1";
        c.setAttribute("aria-hidden", "true");
        c.style.cssText = "display:inline-block;will-change:transform";
        c.textContent = ch;
        word.appendChild(c);
      }
      frag.appendChild(word);
    });
    n.replaceWith(frag);
  });
  el.setAttribute("aria-label", el.textContent);
  return {
    chars: [...el.querySelectorAll("[data-ch]")],
    revert() {
      el.innerHTML = original;
      el.removeAttribute("data-split");
      el.removeAttribute("aria-label");
    },
  };
}

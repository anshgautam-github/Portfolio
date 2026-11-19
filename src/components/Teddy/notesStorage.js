import { teddy } from "./teddyContent.js";

export const KEY = "teddy.notes.v1";
export const COLORS = ["yellow", "pink", "orange", "purple", "mint"];

export const MAX_NOTES = 24;
export const MAX_TEXT = 90; // same limit as the textarea's maxLength
const MAX_STORED_CHARS = 50000; // ignore an absurdly large stored value instead of parsing it

let nid = 0;
export const mk = (n) => ({ id: `n${++nid}-${Math.random().toString(36).slice(2, 6)}`, z: 1, ...n });

const num = (v, lo, hi, fallback) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
// strip control characters and cap the length (text is only ever rendered through React, never as HTML)
export const cleanText = (t) => (typeof t === "string" ? t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, MAX_TEXT) : "");

/* stored notes come from localStorage, which the visitor (or any script on this origin) can edit: rebuild every note from a whitelist
   of validated fields so unknown keys, wrong types or odd values (a colour used in a class name, a huge number) never reach the page */
export function sanitize(n) {
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const id = typeof n.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : null;
  return mk({
    ...(id ? { id } : {}),
    text: cleanText(n.text),
    color: COLORS.includes(n.color) ? n.color : COLORS[0],
    fx: num(n.fx, 0, 1, 0.5),
    fy: num(n.fy, 0, 1, 0.5),
    rot: num(n.rot, -20, 20, 0),
    z: Math.round(num(n.z, 1, 9999, 1)),
  });
}

export function load() {
  try {
    const stored = localStorage.getItem(KEY);
    if (typeof stored === "string" && stored.length <= MAX_STORED_CHARS) {
      const raw = JSON.parse(stored);
      if (Array.isArray(raw) && raw.length) {
        const clean = raw.slice(0, MAX_NOTES).map(sanitize).filter(Boolean);
        if (clean.length) return clean;
      }
    }
  } catch (_) {
    /* private mode / blocked storage / corrupted JSON: fall back to the starter notes */
  }
  return teddy.notes.map((n) => mk(n));
}


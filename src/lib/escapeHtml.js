// One escaping helper for every place that builds an HTML string (innerHTML templates).
// Escapes quotes as well, so it is safe in element text AND inside double- or single-quoted attributes.
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => MAP[c]);

import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../src/lib/escapeHtml.js";

test("escapes text and attribute-breaking characters", () => {
  assert.equal(escapeHtml(`<img src=x onerror="a()"> & 'b'`), "&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;b&#39;");
});
test("coerces non-strings", () => assert.equal(escapeHtml(12), "12"));
test("a payload cannot close a quoted attribute", () => {
  const html = `<i title="${escapeHtml('" onmouseover="alert(1)')}"></i>`;
  const el = html.match(/title="([^"]*)"/)[1];
  assert.ok(!el.includes('"'));
});

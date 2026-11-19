// Security tests for the sticky-note localStorage loader. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const { load, sanitize, KEY, COLORS, MAX_NOTES, MAX_TEXT } = await import("../src/components/Teddy/notesStorage.js");

const starters = load().length; // nothing stored yet -> starter notes
test("empty storage falls back to the starter notes", () => assert.ok(starters > 0));

for (const [name, raw] of [["malformed JSON", "{not json"], ["non-array JSON", '{"a":1}'], ["empty array", "[]"], ["null", "null"], ["array of junk", '[1,"x",null,[]]']]) {
  test("corrupted storage is handled: " + name, () => {
    store.set(KEY, raw);
    assert.equal(load().length, starters);
  });
}

test("oversized stored value is ignored", () => {
  store.set(KEY, JSON.stringify([{ text: "x".repeat(60000) }]));
  assert.equal(load().length, starters);
});

test("fields are whitelisted and validated", () => {
  const n = sanitize({ id: "a b<script>", text: "<img src=x onerror=alert(1)>" + "y".repeat(500), color: "red\"><script>", fx: 99, fy: "NaN", rot: 1e9, z: -5, evil: "x", __proto__: { polluted: 1 }, fresh: true });
  assert.match(n.id, /^n\d+-/); // unsafe id replaced
  assert.ok(n.text.length <= MAX_TEXT);
  assert.ok(COLORS.includes(n.color));
  assert.equal(n.fx, 1);
  assert.equal(n.fy, 0.5);
  assert.equal(n.rot, 20);
  assert.equal(n.z, 1);
  assert.equal("evil" in n, false);
  assert.equal("fresh" in n, false);
  assert.equal({}.polluted, undefined);
});

test("control characters are stripped, newlines kept", () => {
  assert.equal(sanitize({ text: "a\u0000b\u0007c\nd" }).text, "abc\nd");
});

test("note count is capped", () => {
  store.set(KEY, JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: "n" + i, text: "t", color: "pink", fx: 0.1, fy: 0.1 }))));
  assert.equal(load().length, MAX_NOTES);
});

test("a valid stored board round-trips", () => {
  store.set(KEY, JSON.stringify([{ id: "k1", text: "hello", color: "mint", fx: 0.2, fy: 0.3, rot: -4, z: 12 }]));
  const [n] = load();
  assert.deepEqual({ id: n.id, text: n.text, color: n.color, fx: n.fx, fy: n.fy, rot: n.rot, z: n.z }, { id: "k1", text: "hello", color: "mint", fx: 0.2, fy: 0.3, rot: -4, z: 12 });
});

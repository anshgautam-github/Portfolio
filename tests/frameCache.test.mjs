// The film's ImageBitmap window (phones): bounded memory, never blocks drawing, never leaks a bitmap. Run: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { createBitmapWindow } from "../src/components/FreefallStory/frameCache.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const mkEnv = (count = 300, stride = 3, opts = {}) => {
  const made = [], closed = [];
  const imgs = Array.from({ length: count }, (_, i) => (i % stride === 0 ? { img: i } : null));
  const w = createBitmapWindow({
    count, stride, getImg: (i) => imgs[i],
    make: async (img) => { const b = { of: img.img, close() { closed.push(img.img); } }; made.push(img.img); return b; },
    ...opts,
  });
  return { w, made, closed, imgs };
};
const settle = async () => { for (let k = 0; k < 4; k++) await tick(); };

test("only frames that have actually loaded get a bitmap (stride gaps are skipped)", async () => {
  const { w, made } = mkEnv();
  for (let k = 0; k < 10; k++) { w.prime(150); await settle(); }
  assert.ok(made.length > 0);
  assert.ok(made.every((i) => i % 3 === 0), "frames without an <img> must never be decoded");
});

test("the playhead frame is first in line, and a burst is capped", async () => {
  const { w, made } = mkEnv(300, 3, { burst: 3 });
  w.prime(150); await settle();
  assert.equal(made.length, 3, "burst limits one prime() call");
  assert.ok(made.includes(150), "frame under the playhead is requested first");
  assert.ok(w.has(150));
});

test("memory stays bounded while scrubbing the whole film, and far frames are closed", async () => {
  const { w, closed } = mkEnv(300, 3);
  let peak = 0;
  for (let f = 0; f < 300; f += 1) { w.prime(f); await tick(); peak = Math.max(peak, w.size()); }
  await settle();
  // keepBack 8 + keepFwd 14 steps + the playhead = at most 23 live bitmaps (one step = a loaded frame)
  assert.ok(peak <= 23, `peak ${peak} live bitmaps should stay inside the keep window`);
  assert.ok(closed.length > 50, "bitmaps that fell out of the window are close()d, not leaked");
});

test("a bitmap that finishes after the playhead moved far away is closed, not kept", async () => {
  const closed = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  const w = createBitmapWindow({
    count: 300, stride: 1, getImg: (i) => ({ i }), burst: 1,
    make: async (img) => { await gate; return { close() { closed.push(img.i); } }; },
  });
  w.prime(10);            // frame 10 starts decoding but is held back
  w.prime(290);           // the visitor flings to the end
  release(); await settle();
  assert.ok(closed.includes(10), "stale result is closed");
  assert.equal(w.has(10), false);
});

test("src() falls back to the <img> until a bitmap exists, so drawing never waits", async () => {
  const { w } = mkEnv();
  const fallback = { fallback: true };
  assert.equal(w.src(150, fallback), fallback);
  w.prime(150); await settle();
  assert.notEqual(w.src(150, fallback), fallback);
});

test("a failing createImageBitmap is harmless and not retried every frame", async () => {
  let calls = 0;
  const w = createBitmapWindow({ count: 30, stride: 1, getImg: (i) => ({ i }), make: async () => { calls++; throw new Error("nope"); } });
  for (let k = 0; k < 20; k++) { w.prime(10); await settle(); }
  const first = calls;
  for (let k = 0; k < 20; k++) { w.prime(10); await settle(); }
  assert.equal(calls, first, "failed frames are marked and never retried");
  assert.equal(w.size(), 0);
  assert.equal(w.src(10, "img"), "img");
});

test("a synchronous throw from make() is also contained", () => {
  const w = createBitmapWindow({ count: 10, stride: 1, getImg: (i) => ({ i }), make: () => { throw new Error("sync"); } });
  assert.doesNotThrow(() => w.prime(5));
});

test("free() closes everything and stops all further work", async () => {
  const { w, closed, made } = mkEnv();
  for (let k = 0; k < 10; k++) { w.prime(120); await settle(); }
  const n = w.size(); assert.ok(n > 0);
  w.free();
  assert.equal(w.size(), 0);
  assert.equal(closed.length, n);
  const before = made.length;
  w.prime(120); await settle();
  assert.equal(made.length, before, "no new decodes after free()");
});

test("out-of-range playheads are clamped", async () => {
  const { w } = mkEnv(100, 1);
  assert.doesNotThrow(() => { w.prime(-50); w.prime(9999); w.prime(NaN); });
  await settle();
});

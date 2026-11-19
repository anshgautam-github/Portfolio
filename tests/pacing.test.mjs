import test from "node:test";
import assert from "node:assert/strict";

// a fake 120 Hz phone: a manual vsync clock drives the "native" requestAnimationFrame
const HZ = Number(process.env.FAKE_HZ || 120), GAP = 1000 / HZ;
let pending = [], nid = 0, now = 0;
globalThis.window = globalThis;
globalThis.location = { search: "" };
Object.defineProperty(globalThis, "navigator", { value: { hardwareConcurrency: 8 }, configurable: true });
globalThis.devicePixelRatio = 3;
globalThis.matchMedia = (q) => ({ matches: /pointer: coarse/.test(q) });
globalThis.CSS = { supports: () => false };
const classes = new Set();
globalThis.document = { hidden: false, documentElement: { classList: { add: (c) => classes.add(c) }, appendChild() {} }, createElement: () => ({ style: {}, setAttribute() {} }) };
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = (cb) => { pending.push([++nid, cb]); return nid; };
globalThis.cancelAnimationFrame = (id) => { pending = pending.filter(([i]) => i !== id); };
const vsync = () => { now += GAP; const run = pending; pending = []; for (const [, cb] of run) cb(now); };

await import("../src/lib/perf.js");

test("high-refresh phone: all loops fire together, at one steady ~60 fps cadence", () => {
  const a = [], b = [];
  const loopA = (t) => { a.push(t); requestAnimationFrame(loopA); };
  const loopB = (t) => { b.push(t); requestAnimationFrame(loopB); };
  requestAnimationFrame(loopA); requestAnimationFrame(loopB);
  for (let i = 0; i < 200; i++) vsync();
  assert.ok(classes.has("is-paced"));
  const late = a.slice(-40), lateB = b.slice(-40);
  assert.deepEqual(late, lateB, "both loops get the very same frames");
  const gaps = late.slice(1).map((t, i) => t - late[i]);
  const min = Math.min(...gaps), max = Math.max(...gaps);
  assert.ok(max - min < 0.5, "steady cadence " + min + ".." + max);
  assert.ok(min > 13 && max < 20, "60-72 fps, got gap " + min);
});

test("cancelAnimationFrame cancels a paced callback", () => {
  let hit = 0;
  const id = requestAnimationFrame(() => { hit++; });
  cancelAnimationFrame(id);
  for (let i = 0; i < 10; i++) vsync();
  assert.equal(hit, 0);
});

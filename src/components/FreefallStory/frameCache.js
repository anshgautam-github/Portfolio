// A small sliding window of ready-decoded ImageBitmaps around a film's playhead.
//
// Why: the film frames are plain <img> elements drawn into a canvas. A browser keeps decoded pixels for those in a size-limited cache and
// throws them away under pressure (phones: always, the budget is tiny next to a few hundred frames), so scrubbing back and forth makes
// drawImage() decode a frame on the main thread, in the middle of the scroll frame. An ImageBitmap is already decoded, so drawing it costs
// an upload at most. Keeping bitmaps for *every* frame would be ~280 MB on a phone, so only the frames near the playhead get one and the
// rest are closed again; anything that has no bitmap yet is drawn from its <img> exactly as before. Worst case = old behaviour.
//
// Pure logic (no DOM): `make` creates a bitmap from an image and defaults to createImageBitmap, which is what makes it testable in Node.

export function createBitmapWindow({
  count,
  stride = 1,
  getImg,                       // (i) => the loaded <img> for frame i, or null while it has not arrived
  make,                         // (img) => Promise<ImageBitmap>
  back = 4,                     // steps (one step = `stride` frames) kept ready behind the playhead
  fwd = 8,                      // ... and ahead of it
  keepBack = 8,                 // bitmaps beyond this many steps behind / ahead are closed
  keepFwd = 14,
  burst = 3,                    // at most this many new bitmaps are requested per prime() call: no decode storm on a fast fling
}) {
  const mk = make || ((img) => createImageBitmap(img));
  const bmp = new Array(count);
  const state = new Uint8Array(count);      // 0 idle, 1 in flight, 2 failed (never retried)
  const live = new Set();
  let at = 0, dead = false;

  const drop = (i) => {
    const b = bmp[i];
    bmp[i] = undefined;
    live.delete(i);
    try { b && b.close && b.close(); } catch (e) { /* already closed */ }
  };

  return {
    /** the playhead moved to fractional frame f: make sure its neighbourhood is decoded and forget what is far away */
    prime(f) {
      if (dead || !Number.isFinite(f)) return;
      const c = Math.min(count - 1, Math.max(0, Math.round(f)));
      at = c;
      for (const i of live) if (i < c - keepBack * stride || i > c + keepFwd * stride) drop(i);
      const reachBack = back * stride, reachFwd = fwd * stride;
      let started = 0;
      // nearest-first: the frame under the playhead, then alternating ahead / behind, out to the edge of the window
      for (let d = 0; d <= Math.max(reachBack, reachFwd) && started < burst; d++) {
        for (const i of d === 0 ? [c] : [c + d, c - d]) {
          if (started >= burst) break;
          if (i < 0 || i >= count || i > c + reachFwd || i < c - reachBack || bmp[i] || state[i]) continue;
          const img = getImg(i);
          if (!img) continue;
          state[i] = 1; started++;
          let p;
          try { p = mk(img); } catch (e) { state[i] = 2; continue; }
          Promise.resolve(p).then(
            (b) => {
              state[i] = 0;
              // the playhead may have moved on (or the film been torn down) while this was decoding
              if (dead || i < at - keepBack * stride || i > at + keepFwd * stride) { try { b && b.close && b.close(); } catch (e) { /* ignore */ } return; }
              bmp[i] = b; live.add(i);
            },
            () => { state[i] = 2; },
          );
        }
      }
    },
    /** what to draw for frame i: its bitmap when there is one, otherwise the fallback (the <img>) */
    src(i, fallback) { return bmp[i] || fallback; },
    has(i) { return !!bmp[i]; },
    size() { return live.size; },
    free() { dead = true; for (const i of [...live]) drop(i); },
  };
}

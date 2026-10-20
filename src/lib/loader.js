// Tiny page-load gate. Heavy things (the WebGL landing scene, fonts…) register a task while they prepare themselves in the background;
// the <Loader /> overlay stays up until every task is done (and a minimum time has passed), then calls release(). Things that should only
// START once the page is revealed (the landing intro, the name being written, falling stickers) wait on isReleased() / whenReleased().

const tasks = new Set();
const subs = [];
let released = false;

if (typeof document !== "undefined") document.documentElement.classList.add("is-loading");

export const isReleased = () => released;
export const pendingTasks = () => tasks.size;

/** register a unit of loading work; call the returned function (any number of times) when it is finished */
export function loaderTask() {
  if (released) return () => {};
  const t = {};
  tasks.add(t);
  return () => { tasks.delete(t); };
}

export function whenReleased(fn) {
  if (released) fn(); else subs.push(fn);
}

// ---- the story gate -------------------------------------------------------------------------------------------------
// Loader -> Earth -> landing. When the loader has finished it does NOT release the page any more: it starts the story
// (startStory). The Earth intro plays, and only when it shatters does it call release(), so the landing's own intro
// (the name being written, stickers falling) happens right behind the breaking glass.
let storyOn = false, storyStarted = false;
const storySubs = [];
export const registerStory = () => { storyOn = true; };
export const hasStory = () => storyOn;
/** run fn when the loader hands over to the story; returns an unsubscribe */
export function whenStory(fn) {
  if (storyStarted) { fn(); return () => {}; }
  storySubs.push(fn);
  return () => { const i = storySubs.indexOf(fn); if (i >= 0) storySubs.splice(i, 1); };
}
export function startStory() {
  if (storyStarted) return;
  storyStarted = true;
  if (!storyOn) { release(); return; }          // nobody is going to tell a story: just open the page
  storySubs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  setTimeout(release, 90000);                    // safety net: never lock the page forever
}

// After the Earth shatters the landing page plays its intro. Scrolling stays locked for SETTLE ms so the landing can be seen properly
// (otherwise the first wheel tick starts shrinking it into a card while the name is still being written).
export const SETTLE = 4200;
let settled = false;
const settleSubs = [];
export const isSettled = () => settled;
export function whenSettled(fn) { if (settled) fn(); else settleSubs.push(fn); }

export function release() {
  if (released) return;
  released = true;
  if (typeof document !== "undefined") {
    const cl = document.documentElement.classList;
    cl.add("is-settling");
    cl.remove("is-loading");
    setTimeout(() => {
      settled = true;
      cl.remove("is-settling");
      settleSubs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    }, SETTLE);
  }
  subs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
}

// web fonts are part of "ready" (capped so a slow font host can never trap the visitor on the loader)
if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
  const done = loaderTask();
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(done, done);
}

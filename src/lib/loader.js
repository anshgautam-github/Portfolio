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

export function release() {
  if (released) return;
  released = true;
  if (typeof document !== "undefined") document.documentElement.classList.remove("is-loading");
  subs.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
}

// web fonts are part of "ready" (capped so a slow font host can never trap the visitor on the loader)
if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
  const done = loaderTask();
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(done, done);
}

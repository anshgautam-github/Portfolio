// Start-up refresh batching for ScrollTrigger.
//
// ~17 places call ScrollTrigger.refresh() while the page boots (every section, every transition, the fonts / load / timer hooks in App).
// A refresh un-pins and re-pins every pin on a 60,000px page and measures all of it, so doing it a dozen times in the first seconds
// is a big part of the "it takes a while to open" feeling. During the boot window those calls are merged into ONE refresh that runs
// once the burst has gone quiet; the result is the same layout (a refresh re-measures everything), reached with a fraction of the work.
// After the boot window the original, immediate behaviour is restored, so later calls (resize, lazy content) behave exactly as before.
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function batchStartupRefresh({ boot = 4500, quiet = 160, max = 1000 } = {}) {
  if (typeof window === "undefined" || ScrollTrigger.__batched) return;
  ScrollTrigger.__batched = true;
  const native = ScrollTrigger.refresh;
  const t0 = performance.now();
  let timer = 0, firstCall = 0, hard = false;
  const run = () => {
    timer = 0; firstCall = 0;
    const h = hard; hard = false;
    native.call(ScrollTrigger, h ? undefined : true);
  };
  ScrollTrigger.refresh = function (safe) {
    const now = performance.now();
    if (now - t0 > boot && !timer) return native.call(ScrollTrigger, safe);   // boot is over and nothing is pending: behave as before
    if (!safe) hard = true;
    if (!firstCall) firstCall = now;
    clearTimeout(timer);
    timer = setTimeout(run, Math.max(0, Math.min(quiet, firstCall + max - now)));
  };
}

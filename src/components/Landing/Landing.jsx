import { useEffect, useRef } from "react";
import { mountLanding } from "./landing.js";
import { landingContent } from "./landingContent.js";
import "./landing.css";

/**
 * Full-screen landing: WebGL glass "ansh" that smears with the cursor, drifting light streaks,
 * falling + draggable AI/CS stickers and the construction-grid UI. All of the work happens in landing.js;
 * React only owns the mount point so StrictMode double-mounts are harmless.
 */
export default function Landing({ content = landingContent }) {
  const ref = useRef(null);
  useEffect(() => {
    const destroy = mountLanding(ref.current, content);
    return destroy;
  }, [content]);
  return <section ref={ref} id="top" />;
}

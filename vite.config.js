import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";


// Canonical / og:url / social-image tags need the real production URL, so they are only written when SITE_URL is set at build time
// (e.g. SITE_URL=https://example.com in the Vercel project's Environment Variables). Without it nothing is guessed.
const SITE_URL = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
if (SITE_URL && !/^https:\/\/[^\s"'<>]+$/.test(SITE_URL)) throw new Error("SITE_URL must be an https:// URL, got: " + SITE_URL);
const siteUrlTags = {
  name: "site-url-tags",
  transformIndexHtml(html) {
    const tags = SITE_URL
      ? [
          `<link rel="canonical" href="${SITE_URL}/" />`,
          `<meta property="og:url" content="${SITE_URL}/" />`,
          `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="Ansh Gautam: AI Engineer, Researcher and Builder" />`,
          `<meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
        ].join("\n    ")
      : "";
    return html.replace("<!--site-url-tags-->", tags);
  },
};

// three.js's DRACOLoader points at its decoder files with `new URL(..., import.meta.url)`, so Vite copies those ~1.2 MB into dist as soon as the
// Kimi module is anywhere in the graph, even while SHOW_KIMI is false and nothing ever loads them. Drop them unless a built chunk really refers to them
// (so flipping SHOW_KIMI back on keeps the decoder working, self-hosted, with no CDN).
const dropUnreferencedDraco = {
  name: "drop-unreferenced-draco",
  generateBundle(_, bundle) {
    const code = Object.values(bundle).filter((f) => f.type === "chunk").map((f) => f.code).join("\n");
    for (const [key, f] of Object.entries(bundle)) {
      if (f.type === "asset" && /(^|\/)draco_/.test(key) && !code.includes(key.split("/").pop())) delete bundle[key];
    }
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlTags, dropUnreferencedDraco],
  // one React copy only: a stale pre-bundle can otherwise load a second React and break hooks ("Invalid hook call")
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    // The dev server must never restart the page on its own. Vite's live-reload socket does a FULL page reload (back to the loader and the
    // landing) whenever it sees a file change that cannot be hot-swapped (this project has many plain .js engines), or when its socket drops and
    // reconnects (Safari does that under the heavy scroll scenes). Edits are picked up by a manual refresh instead.
    hmr: false,
    watch: { ignored: ["**/*.bak*", "**/_backup*/**", "**/_warp_test/**", "**/freefall-portfolio/**", "**/dist/**", "**/Claude outputs/**"] },
  },
  build: {
    target: "es2020",
    cssMinify: "lightningcss",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // long-cached vendor chunks: app code can change without re-downloading React / GSAP
        manualChunks: {
          react: ["react", "react-dom"],
          gsap: ["gsap", "gsap/ScrollTrigger"],
        },
      },
    },
  },
});

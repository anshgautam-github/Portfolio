import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

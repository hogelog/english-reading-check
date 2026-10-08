import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs so the build works under any subpath
  // (e.g. https://hogelog.github.io/english-reading-check/).
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
  },
  define: {
    __DATA_VERSION__: JSON.stringify(process.env.BUILD_ID || "dev"),
  },
});

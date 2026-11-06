import { defineConfig } from "vite";

// "npm run build" makes the real web app (dist/).
// "npm run build:artifact" makes the claude.ai test page (dist-artifact/): one script, no service worker.
export default defineConfig(({ mode }) => {
  const artifact = mode === "artifact";
  return {
    base: "./",
    publicDir: artifact ? false : "public",
    server: { fs: { allow: [".."] } },
    optimizeDeps: { exclude: ["@electric-sql/pglite"] },
    build: {
      target: "es2022",
      chunkSizeWarningLimit: 1500,
      outDir: artifact ? "dist-artifact" : "dist",
      modulePreload: !artifact,
      rollupOptions: artifact ? { output: { codeSplitting: false } } : {},
    },
  };
});

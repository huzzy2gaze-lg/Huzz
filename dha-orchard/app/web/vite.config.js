import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { fs: { allow: [".."] } },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  build: { target: "es2022", chunkSizeWarningLimit: 1500 },
});

import { defineConfig, loadEnv } from "vite";

// Link previews (WhatsApp, Facebook) need the full address of the image, so it is added only when
// VITE_SITE_URL is set, for example VITE_SITE_URL=https://www.whventures.com.pk in .env.production.
function ogImage(site) {
  return {
    name: "og-image",
    transformIndexHtml(html) {
      if (!site) return html;
      const u = site.replace(/\/$/, "");
      return html.replace("</head>", `<meta property="og:url" content="${u}/">\n<meta property="og:image" content="${u}/og-image.jpg">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<link rel="canonical" href="${u}/">\n</head>`);
    },
  };
}

// "npm run build" makes the real web app (dist/).
// "npm run build:artifact" makes the claude.ai test page (dist-artifact/): one script, no service worker.
export default defineConfig(({ mode }) => {
  const artifact = mode === "artifact";
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [ogImage(env.VITE_SITE_URL)],
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

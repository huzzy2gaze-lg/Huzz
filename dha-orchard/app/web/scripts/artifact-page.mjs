// Turns the artifact build (dist-artifact/) into one page for claude.ai: the CSS and the script go
// inside the page, and the plan and the plot data are published next to it.
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || "dist-artifact");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const cssHref = (html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"/) || [])[1];
const jsSrc = (html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/) || [])[1];
if (!cssHref || !jsSrc) throw new Error("The build output does not have one CSS file and one script.");
const css = fs.readFileSync(path.join(dir, cssHref), "utf8");
const js = fs.readFileSync(path.join(dir, jsSrc), "utf8").replace(/<\/script/gi, "<\\/script");
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>")).replace(/<script[^>]*src=[^>]*><\/script>/g, "").trim();
const page = `<title>Orchard Sales</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#0E3A2C">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gloock&family=Albert+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
${css}
</style>
${body}
<script type="module">
${js}
</script>
`;
fs.writeFileSync(path.join(dir, "orchard-sales.html"), page);
for (const f of ["plan.webp", "plan-site.webp", "plotdata.json", "sky-night.webp"]) fs.copyFileSync(path.resolve("public", f), path.join(dir, f));
// the photo-real renders (made offline with Blender; see app/render)
if (fs.existsSync(path.resolve("public/renders"))) { fs.mkdirSync(path.join(dir, "renders"), { recursive: true }); for (const f of fs.readdirSync(path.resolve("public/renders"))) fs.copyFileSync(path.resolve("public/renders", f), path.join(dir, "renders", f)); }
console.log("artifact page:", path.join(dir, "orchard-sales.html"), Math.round(page.length / 1024) + " KB");

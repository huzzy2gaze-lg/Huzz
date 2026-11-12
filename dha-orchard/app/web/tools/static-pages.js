// Static pages for search engines and AI tools. The 3D home page is drawn by JavaScript, and many crawlers do not
// run JavaScript. At build time this plugin uses the same facts as the site (src/content.js) to make:
//   - readable text inside index.html (replaced by the 3D page as soon as JavaScript runs)
//   - structured data (JSON-LD) in index.html: the company, the website, the scheme, the questions
//   - /block-a, /block-b, /block-c, /buying-guide: plain pages with real facts and the ways to contact us
//   - /404.html (a real "not found"), /llms.txt (a short guide for AI tools) and /sitemap.xml
// Only facts that are already on the site. No outlook figures, no reviews, no ratings.
import { SITE_DEFAULTS, BLOCKS, MILESTONES, FAQ, STEPS } from "../src/content.js";

const PAGES_BLOCKS = ["A", "B", "C"];
const LEGAL = "WH Ventures (Private) Limited";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cr = (v) => v.toFixed(2);
const digits = (v) => String(v).replace(/[^0-9]/g, "");
const tel = () => "tel:+" + digits(SITE_DEFAULTS.phone);
const wa = (msg) => `https://wa.me/${digits(SITE_DEFAULTS.whatsapp)}?text=${encodeURIComponent("Hello WH Ventures, " + msg)}`;
const month = (d) => new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const ask = (b) => (BLOCKS[b].price ? (BLOCKS[b].price[0] === BLOCKS[b].price[1] ? `${cr(BLOCKS[b].price[0])} crore` : `${cr(BLOCKS[b].price[0])}–${cr(BLOCKS[b].price[1])} crore`) : "");
const KANAL = PAGES_BLOCKS.filter((b) => BLOCKS[b].price).flatMap((b) => BLOCKS[b].price);
const KANAL_RANGE = `${cr(Math.min(...KANAL))}–${cr(Math.max(...KANAL))} crore`;
const possession = MILESTONES.find((m) => /possession/i.test(m[1]));

export const TITLE = "DHA Margalla Orchard Plots: 1 Kanal, 14 & 10 Marla | WH Ventures";
export const DESCRIPTION = "Plots in DHA Margalla Orchard, Islamabad, an FGEHA scheme developed by DHA Islamabad. 1 Kanal, 14 and 10 Marla. Block A possession target July 2027.";
const INTRO = `DHA Margalla Orchard is a housing scheme of FGEHA (the Federal Government Employees Housing Authority) on Main Park Road, Chak Shahzad, Islamabad, opposite COMSATS University. DHA Islamabad carries out the development under the agreement of September 2025. ${LEGAL} helps buyers choose, buy and transfer plots in the scheme.`;

// ---------------------------------------------------------------- structured data
function jsonLd(site) {
  const org = {
    "@type": "RealEstateAgent", "@id": site + "/#company", name: "WH Ventures", legalName: LEGAL, url: site + "/",
    logo: site + "/icon-512.png", image: site + "/og-image.jpg", telephone: SITE_DEFAULTS.phone, email: SITE_DEFAULTS.email,
    address: { "@type": "PostalAddress", addressLocality: "Islamabad", addressCountry: "PK" },
    areaServed: { "@type": "City", name: "Islamabad" },
    knowsAbout: ["DHA Margalla Orchard", "FGEHA plots", "Plot transfer in Islamabad"],
  };
  const scheme = {
    "@type": "Place", "@id": site + "/#scheme", name: "DHA Margalla Orchard",
    description: "A housing scheme of FGEHA, developed by DHA Islamabad, with 1 Kanal, 14 Marla and 10 Marla residential plots in 8 blocks (A to H).",
    address: { "@type": "PostalAddress", streetAddress: "Main Park Road, Chak Shahzad", addressLocality: "Islamabad", addressCountry: "PK" },
    containedInPlace: { "@type": "City", name: "Islamabad" },
  };
  const web = { "@type": "WebSite", "@id": site + "/#website", name: "WH Ventures", url: site + "/", publisher: { "@id": site + "/#company" }, inLanguage: "en" };
  const faq = { "@type": "FAQPage", "@id": site + "/#faq", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [org, web, scheme, faq] })}</script>`;
}

// ---------------------------------------------------------------- the readable text inside the home page
function homeText() {
  const blocks = PAGES_BLOCKS.map((b) => `<li><a href="/block-${b.toLowerCase()}">Block ${b}</a>: ${esc(BLOCKS[b].line)} About ${BLOCKS[b].plots.toLocaleString("en-US")} plots (${esc(BLOCKS[b].sizes)}).${BLOCKS[b].price ? ` 1 Kanal asking price, October 2026: ${ask(b)}.` : ""}</li>`).join("");
  return `<div class="ssr">
<h1>Plots in DHA Margalla Orchard, Islamabad</h1>
<p>1 Kanal, 14 Marla and 10 Marla plots on the official FGEHA master plan. 1 Kanal asking prices: ${KANAL_RANGE} (October 2026). We help you choose, buy and transfer your plot.</p>
<p>${esc(INTRO)}</p>
<p>The scheme has 4,781 residential plots on 8,432 kanals of land, in 8 blocks (A to H). ${possession ? `FGEHA's target for ${esc(possession[1])}: ${month(possession[0])}.` : ""}</p>
<h2>Blocks</h2><ul>${blocks}</ul>
<h2>How buying a plot works</h2><ol>${STEPS.map(([t, d]) => `<li><b>${esc(t)}</b>: ${esc(d)}</li>`).join("")}</ol>
<p><a href="/buying-guide">The buying guide</a></p>
<h2>Questions</h2><dl>${FAQ.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
<h2>Contact WH Ventures</h2>
<p>Phone: <a href="${tel()}">${esc(SITE_DEFAULTS.phone)}</a> · WhatsApp: <a href="${wa("I want to know about plots in DHA Margalla Orchard.")}">${esc(SITE_DEFAULTS.whatsapp)}</a> · E-mail: <a href="mailto:${esc(SITE_DEFAULTS.email)}">${esc(SITE_DEFAULTS.email)}</a> · ${esc(SITE_DEFAULTS.address)}</p>
<p><a href="/privacy">Privacy policy</a></p>
</div>`;
}

// ---------------------------------------------------------------- plain pages
const CSS = `:root{--teal:#0B3A40;--mist:#EAF1EE;--gold:#D2A746;--rose:#B04761;--ink:#1d2b2d;--soft:#4d5f61}
*{box-sizing:border-box}body{margin:0;background:var(--mist);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--teal);padding:14px 16px}header .in,main,footer .in{max-width:820px;margin:0 auto}
header a{color:#fff;text-decoration:none}header .brand{font:600 21px Georgia,serif}header nav{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:6px;font-size:14px}header nav a{color:#E3C98D}
main{padding:28px 16px 48px}h1{font:400 34px/1.2 Georgia,serif;color:var(--teal);margin:0 0 10px}h2{font:600 20px/1.3 system-ui,sans-serif;color:var(--teal);margin:30px 0 8px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:18px 0}.facts div{background:#fff;border:1px solid #d6e2de;border-radius:12px;padding:12px 14px}.facts b{display:block;font-size:20px;color:var(--teal)}.facts span{font-size:13px;color:var(--soft)}
.cta{background:var(--teal);color:#EAF1EE;border-radius:16px;padding:20px;margin:30px 0}.cta h2{color:#fff;margin-top:0}.cta .row{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.btn{display:inline-block;padding:11px 18px;border-radius:999px;font-weight:650;text-decoration:none}.btn.rose{background:var(--rose);color:#fff}.btn.light{background:#fff;color:var(--teal)}.btn.line{border:1px solid rgba(255,255,255,.5);color:#fff}
a{color:var(--rose)}dt{font-weight:650;margin-top:12px}dd{margin:4px 0 0}.fine{font-size:13px;color:var(--soft)}
footer{background:var(--teal);color:#A9C4C4;font-size:14px;padding:22px 16px}footer a{color:#E3C98D}`;

function page(site, path, title, description, body) {
  const nav = [["/", "3D master plan"], ...PAGES_BLOCKS.map((b) => [`/block-${b.toLowerCase()}`, `Block ${b}`]), ["/buying-guide", "Buying guide"], ["/#book", "Book a call"]];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${site}${path}"><link rel="icon" href="/favicon-64.png" type="image/png">
<meta property="og:type" content="website"><meta property="og:site_name" content="WH Ventures"><meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${site}${path}"><meta property="og:image" content="${site}/og-image.jpg">
<meta name="theme-color" content="#0B3A40"><style>${CSS}</style></head>
<body><header><div class="in"><a class="brand" href="/">WH Ventures</a><nav aria-label="Pages">${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join("")}</nav></div></header>
<main>${body}
<section class="cta"><h2>Talk to our team</h2><p>We answer your questions, help you choose a plot and go with you to the transfer. No cost and no commitment.</p>
<div class="row"><a class="btn rose" href="/#book">Book a call</a><a class="btn light" href="${tel()}">Call ${esc(SITE_DEFAULTS.phone)}</a><a class="btn line" href="${wa("I want to know about plots in DHA Margalla Orchard.")}">WhatsApp</a></div></section>
</main>
<footer><div class="in">${LEGAL} · ${esc(SITE_DEFAULTS.address)} · <a href="${tel()}">${esc(SITE_DEFAULTS.phone)}</a> · <a href="mailto:${esc(SITE_DEFAULTS.email)}">${esc(SITE_DEFAULTS.email)}</a> · <a href="/privacy">Privacy policy</a><br>
<span class="fine">Scheme facts: FGEHA and DHA Islamabad announcements. Prices: market asking prices in October 2026; they change from plot to plot. The map is the official FGEHA layout plan.</span></div></footer>
</body></html>
`;
}

function blockPage(site, b) {
  const x = BLOCKS[b];
  const others = PAGES_BLOCKS.filter((o) => o !== b).map((o) => `<a href="/block-${o.toLowerCase()}">Block ${o}</a>`).join(" · ");
  const body = `<h1>Block ${b}, DHA Margalla Orchard</h1>
<p>${esc(x.line)}</p>
<div class="facts"><div><b>about ${x.plots.toLocaleString("en-US")}</b><span>plots in Block ${b}</span></div><div><b>${esc(x.sizes)}</b><span>plot sizes</span></div>${x.price ? `<div><b>${ask(b)}</b><span>1 Kanal asking price, October 2026</span></div>` : ""}${possession ? `<div><b>${month(possession[0])}</b><span>FGEHA's target for Block A possession</span></div>` : ""}</div>
<p>${esc(INTRO)}</p>
<h2>See the plots of Block ${b}</h2>
<p>Every plot in Block ${b} has a number on FGEHA's approved layout plan. Open the <a href="/">3D master plan</a> and tap Block ${b} to see its plots and their numbers.</p>
<h2>Plot sizes</h2><p>${esc(FAQ.find((f) => /sizes/i.test(f[0]))[1])}</p>
<h2>How to buy a plot in Block ${b}</h2><ol>${STEPS.map(([t, d]) => `<li><b>${esc(t)}</b>: ${esc(d)}</li>`).join("")}</ol>
<p>More in the <a href="/buying-guide">buying guide</a>. Other blocks: ${others}.</p>
<p class="fine">Prices change from plot to plot. Ask us for today's price of a plot.</p>`;
  const desc = `Block ${b} of DHA Margalla Orchard, Islamabad: about ${x.plots} plots, ${x.sizes.replace(" · ", " and ")}.${x.price ? ` 1 Kanal asking price ${ask(b)} (Oct 2026).` : ""} See the plot numbers and book a call.`;
  return page(site, `/block-${b.toLowerCase()}`, `Block ${b}, DHA Margalla Orchard: plots and prices | WH Ventures`, desc, body);
}

function guidePage(site) {
  const body = `<h1>How to buy a plot in DHA Margalla Orchard</h1>
<p>${esc(INTRO)}</p>
<h2>The steps</h2><ol>${STEPS.map(([t, d]) => `<li><b>${esc(t)}</b>: ${esc(d)}</li>`).join("")}</ol>
<h2>Questions buyers ask</h2><dl>${FAQ.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")}</dl>
<h2>From development to possession</h2><ul>${MILESTONES.map(([d, t, s]) => `<li><b>${month(d)}</b>: ${esc(t)}. ${esc(s)}</li>`).join("")}</ul>
<p class="fine">Dates in the future are targets set by the authority.</p>`;
  return page(site, "/buying-guide", "How to buy a plot in DHA Margalla Orchard: token, NDC, transfer | WH Ventures",
    "The steps to buy a plot in DHA Margalla Orchard, Islamabad: token (Bayana), NDC, transfer with biometrics, allotment letter. What you need and what to expect.", body);
}

function notFound(site) {
  return page(site, "/404", "Page not found | WH Ventures", "This page does not exist.", `<h1>This page does not exist</h1><p>The address may be wrong, or the page has moved.</p><p><a href="/">Open the 3D master plan of DHA Margalla Orchard</a>, or see <a href="/block-a">Block A</a>, <a href="/block-b">Block B</a>, <a href="/block-c">Block C</a> and the <a href="/buying-guide">buying guide</a>.</p>`)
    .replace('<meta name="theme-color"', '<meta name="robots" content="noindex"><meta name="theme-color"');
}

function llms(site) {
  return `# WH Ventures

> ${LEGAL}, Islamabad, Pakistan, helps buyers choose, buy and transfer residential plots in DHA Margalla Orchard, Islamabad.

${INTRO}

Key facts:
- Plot sizes: ${FAQ.find((f) => /sizes/i.test(f[0]))[1]}
- The scheme: 4,781 residential plots, 8,432 kanals, 8 blocks (A to H), on the official FGEHA layout plan.
- ${possession ? `FGEHA's target for ${possession[1]}: ${month(possession[0])}.` : ""}
- 1 Kanal asking prices in October 2026: ${KANAL_RANGE} (market asking prices; they change from plot to plot).

## Pages
- [3D master plan of DHA Margalla Orchard](${site}/): every block and plot number on the official plan; book a call
${PAGES_BLOCKS.map((b) => `- [Block ${b}](${site}/block-${b.toLowerCase()}): ${BLOCKS[b].line}`).join("\n")}
- [Buying guide](${site}/buying-guide): token (Bayana), NDC, transfer, allotment letter; questions and answers
- [Privacy policy](${site}/privacy)

## Contact
- Phone and WhatsApp: ${SITE_DEFAULTS.phone}
- E-mail: ${SITE_DEFAULTS.email}
- Office: ${SITE_DEFAULTS.address}
`;
}

function sitemap(site, today) {
  const urls = ["/", ...PAGES_BLOCKS.map((b) => `/block-${b.toLowerCase()}`), "/buying-guide", "/privacy"];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
}

export function staticPages(siteUrl) {
  const site = (siteUrl || "https://www.whventures.com.pk").replace(/\/$/, "");
  return {
    name: "static-pages",
    transformIndexHtml(html) {
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(DESCRIPTION)}">`)
        .replace("</head>", `${jsonLd(site)}\n</head>`)
        .replace('<main id="app"></main>', `<main id="app">${homeText()}</main>`);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const emit = (fileName, source) => this.emitFile({ type: "asset", fileName, source });
      for (const b of PAGES_BLOCKS) emit(`block-${b.toLowerCase()}.html`, blockPage(site, b));
      emit("buying-guide.html", guidePage(site));
      emit("404.html", notFound(site));
      emit("llms.txt", llms(site));
      emit("sitemap.xml", sitemap(site, today));
    },
  };
}

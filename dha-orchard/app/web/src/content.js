// The facts of the website in one place: contact details, the blocks, the timeline, the steps of a purchase and the
// questions. The 3D home page uses them, and the build (vite.config.js) uses the same facts for the static pages that
// search engines and AI tools read (block pages, buying guide, structured data, llms.txt). No browser code here.
export const SITE_DEFAULTS = { phone: "+92 331 5223726", whatsapp: "+92 331 5223726", email: "info@whventures.com.pk", address: "Islamabad, Pakistan", hours: "9 am to 9 pm (Pakistan time)", meet_link: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3fJrpSQrbjtCjWar9-Euh_bRuAiqhFrJla9YK5Il5KtPk8GtRNPnyUEXdUvjzdnYFPcoqnH6rM" };

export const BLOCKS = {
  A: { plots: 906, sizes: "1 Kanal · 14 Marla", line: "The first block for possession, target July 2027. Next to the Margalla Orchards Walk commercial area, near the main entrance.", price: [3.65, 4.0], size: "1 Kanal" },
  B: { plots: 737, sizes: "1 Kanal · 14 Marla", line: "Numbered 1 Kanal and 14 Marla plots in the core of the scheme.", price: [3.75, 4.55], size: "1 Kanal" },
  C: { plots: 467, sizes: "1 Kanal", line: "The premium 1 Kanal block, with wide roads and firm natural ground.", price: [3.85, 4.5], size: "1 Kanal" },
  D: { plots: 373, sizes: "14 Marla · 1 Kanal", line: "At the centre of the scheme, with 14 Marla and 1 Kanal plots.", price: null },
  E: { plots: 1128, sizes: "10 Marla", line: "The largest block. 10 Marla plots (32 × 70 ft): the most affordable way into DHA Margalla Orchard.", price: [2.6, 2.8], size: "10 Marla" },
  F: { plots: 228, sizes: "As on the plan", line: "A smaller block on the official master plan. Ask us about plots here.", price: null },
  G: { plots: 538, sizes: "1 Kanal", line: "A 1 Kanal block on higher ground with Margalla views. The best-value 1 Kanal in the scheme today.", price: [3.3, 3.3], size: "1 Kanal" },
  H: { plots: 167, sizes: "14 Marla · 1 Kanal", line: "A compact block with 14 Marla and 1 Kanal plots. Ask us about plots here.", price: null },
};

export const MILESTONES = [
  ["2025-09-26", "DHA Islamabad takes on the development", "The tripartite agreement is signed."],
  ["2026-02-18", "Margalla Orchards Walk commercial ballot", "The commercial area in Block A."],
  ["2026-10-01", "50% of the development done", "FGEHA's progress report, October 2026."],
  ["2027-07-01", "Block A possession", "FGEHA's target date for the first block."],
];

export const FAQ = [
  ["Who develops DHA Margalla Orchard?", "FGEHA (the Federal Government Employees Housing Authority) owns the scheme. DHA Islamabad carries out the development under the agreement of September 2025."],
  ["Which plot sizes are there?", "1 Kanal (50 × 90 ft, 500 sq yd), 14 Marla (40 × 80 ft, 356 sq yd) and 10 Marla (32 × 70 ft, 249 sq yd)."],
  ["When can I get possession?", "Block A is the first block for possession. FGEHA's target is July 2027. The other blocks follow."],
  ["How does buying a plot work?", "We agree the price, the token (Bayana), the time for the transfer and the mode of payment. Then the NDC goes to the authority. On the transfer date, the buyer and the seller give their biometrics at the authority. The buyer gets a receipt, then the allotment letter."],
  ["What do I need for the transfer?", "Your original CNIC and the payment (pay order, bank transfer or another mode that the authority accepts). We tell you the exact list for your plot before the date."],
  ["Can I see a plot before I buy?", "Yes. Book a call, and an agent arranges a visit to the site and shows you the plot on the official plan."],
];

export const STEPS = [
  ["A call with us", "We answer your questions and help you choose a block and a plot."],
  ["Token (Bayana)", "Price, transfer time, token amount and mode of payment are agreed."],
  ["NDC", "The No Demand Certificate goes to the authority for approval."],
  ["Transfer", "You and the seller go to the authority with your CNICs for biometrics."],
  ["Allotment letter", "The authority gives the receipt, then your allotment letter."],
];

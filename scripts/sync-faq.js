/* ═══════════════════════════════════════════════════════════
   cursivee.app — sync FAQ structured data

   Rebuilds each page's FAQPage JSON-LD from the questions shown
   in its .faq block, so the two never drift apart (Google
   ignores, and can penalise, FAQ markup that does not match the
   visible page). Run after editing any FAQ:

     node scripts/sync-faq.js
   ═══════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const PAGES = ["index.html"];

const text = html => html
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

PAGES.forEach(name => {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  const faq = html.match(/<div class="faq">([\s\S]*?)\n\s*<\/div>\n\s*<\/section>/);
  if (!faq) throw new Error(`${name}: no .faq block`);
  const items = [...faq[1].matchAll(/<summary>([\s\S]*?)<\/summary>\s*<div class="answer">([\s\S]*?)<\/div>/g)]
    .map(m => ({ "@type": "Question", name: text(m[1]), acceptedAnswer: { "@type": "Answer", text: text(m[2]) } }));

  const re = /(\n([ \t]*)"mainEntity": )\[[\s\S]*?\n\2\](?=\s*\n[ \t]*\})/;
  const block = html.match(/"@type": "FAQPage"[\s\S]*?"mainEntity": \[/);
  if (!block) throw new Error(`${name}: no FAQPage JSON-LD`);
  const start = html.indexOf(block[0]);
  const head = html.slice(0, start), tail = html.slice(start);
  const updated = tail.replace(re, (_, lead, ind) =>
    lead + JSON.stringify(items, null, 2).replace(/\n/g, "\n" + ind));
  if (updated === tail) throw new Error(`${name}: could not replace mainEntity`);
  html = head + updated;
  fs.writeFileSync(file, html);
  console.log(`${name}: ${items.length} questions`);
});

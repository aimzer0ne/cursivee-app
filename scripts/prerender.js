/* ═══════════════════════════════════════════════════════════
   cursivee.app — prerender

   Writes each generator's output into its page as static HTML,
   so crawlers, AI models and no-JS visitors see the real styles
   instead of an empty #sheetBody. Search and AI crawlers mostly
   do not run JavaScript, so without this the four smaller
   generators show them nothing to describe. app.js replaces the
   rows on load. Run after changing a style or a page's sample
   (the text in its <textarea id="src">, or PAGE_CONFIG.sample when
   the box starts empty):

     node scripts/prerender.js
   ═══════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
require(path.join(root, "assets/engine.js"));
const CF = globalThis.CF;

const PAGES = ["index.html"];
/* The options app.js starts with, so glitch output matches the first render. */
const OPTS = { intensity: 1, zones: { up: true, mid: true, down: true } };
const EXAMPLES = [
  "Hello", "Love", "Good vibes only", "Happy birthday", "Best friends",
  "Queen", "Princess", "Angel", "Baby", "Forever", "Dream big",
  "Blessed", "Good morning", "Thank you"
];
const ALPHABETS = ["Script", "Bold script", "Old English"];
const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LO = "abcdefghijklmnopqrstuvwxyz";

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unesc = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const cursive = CF.byPage("cursive");
const run = (name, text) => esc(cursive.find(s => s.name === name).run(text, OPTS));

/* Same margin label app.js adds: the code point of the style's "A".
   Pages with knobs get none, because their marks are random. */
function codeLabel(s, knobs) {
  const cp = knobs ? null : CF.codePoint(s);
  return cp ? `<span class="row-cp" title="“${cp.letter}” in this style is Unicode ${cp.code}" aria-hidden="true">${cp.code}</span>` : "";
}

/* Same count app.js shows: one per code point. */
const lengthLabel = text => { const n = Array.from(text).length; return n ? `${n} ${n === 1 ? "char" : "chars"}` : ""; };

function sheet(styles, sample, knobs, ind) {
  const groups = [];
  styles.forEach(s => {
    let g = groups.find(g => g.name === s.group);
    if (!g) groups.push(g = { name: s.group, items: [] });
    g.items.push(s);
  });
  return groups.map(g =>
    `${ind}<section class="group">\n${ind}  <h2 class="group-title">${esc(g.name)}</h2>\n` +
    g.items.map(s =>
      `${ind}  <article class="row"><div class="row-head"><span class="row-name">${esc(s.name)}</span><span class="row-len">${lengthLabel(s.run(sample, OPTS))}</span>${codeLabel(s, knobs)}</div>` +
      `<div class="row-out">${esc(s.run(sample, OPTS))}</div><button class="btn copy" type="button">Copy</button></article>`
    ).join("\n") +
    `\n${ind}</section>`
  ).join("\n");
}

function examples() {
  const rows = EXAMPLES.map(w =>
    `              <tr><td>${esc(w)}</td><td class="g">${run("Script", w)}</td><td class="g">${run("Bold script", w)}</td></tr>`
  ).join("\n");
  return `        <div class="tablewrap">
          <table>
            <thead>
              <tr><th>Text</th><th>Script</th><th>Bold script</th></tr>
            </thead>
            <tbody>
${rows}
            </tbody>
          </table>
        </div>`;
}

/* Letters are spaced so a single one can be picked out by hand. */
function alphabet() {
  const spaced = (name, s) => Array.from(cursive.find(x => x.name === name).run(s, OPTS)).map(esc).join(" ");
  return ALPHABETS.map(name =>
    `        <h3>${esc(name)}</h3>\n` +
    `        <p class="glyphs letters">${spaced(name, UP)}</p>\n` +
    `        <p class="glyphs letters">${spaced(name, LO)}</p>`
  ).join("\n");
}

const has = (html, name) => html.includes(`<!-- prerender:${name} -->`);
function inject(html, name, body) {
  const re = new RegExp(`(<!-- prerender:${name} -->)[\\s\\S]*?(\\s*<!-- /prerender:${name} -->)`);
  if (!re.test(html)) throw new Error(`missing prerender:${name} markers`);
  return html.replace(re, (_, a, b) => `${a}\n${body}${b}`);
}

PAGES.forEach(name => {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  const cfg = html.match(/PAGE_CONFIG\s*=\s*\{\s*page:\s*"(\w+)"\s*(,\s*knobs:\s*true)?/);
  const cfgSample = html.match(/PAGE_CONFIG\s*=\s*\{[^}]*sample:\s*"([^"]*)"/);
  const src = html.match(/<textarea id="src"[^>]*>([^<]*)<\/textarea>/);
  if (!cfg || !src) throw new Error(`${name}: no PAGE_CONFIG or #src`);
  const styles = CF.byPage(cfg[1]);
  const sample = unesc(src[1]) || (cfgSample ? cfgSample[1] : "");
  const ind = (html.match(/^([ \t]*)<!-- prerender:sheet -->/m) || ["", ""])[1];

  html = inject(html, "sheet", sheet(styles, sample, !!cfg[2], ind));
  if (has(html, "examples")) html = inject(html, "examples", examples());
  if (has(html, "alphabet")) html = inject(html, "alphabet", alphabet());
  html = html.replace(/(<span class="exemplar-out" id="heroOut">)[^<]*(<\/span>)/, (_, a, b) => a + esc(styles[0].run(sample, OPTS)) + b);
  fs.writeFileSync(file, html);
  console.log(`${name} prerendered (${styles.length} styles, sample “${sample}”)`);
});

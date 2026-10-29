/* ═══════════════════════════════════════════════════════════
   cursivee.app — prerender

   Writes the cursive generator's output into index.html as
   static HTML, so crawlers and no-JS visitors see real cursive
   text instead of an empty #sheetBody. app.js replaces the rows
   on load. Run after changing a cursive style or the sample:

     node scripts/prerender.js
   ═══════════════════════════════════════════════════════════ */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
require(path.join(root, "assets/engine.js"));
const CF = globalThis.CF;

const SAMPLE = "Cursive Text";
const EXAMPLES = [
  "Hello", "Love", "Good vibes only", "Happy birthday", "Best friends",
  "Queen", "Princess", "Angel", "Baby", "Forever", "Dream big",
  "Blessed", "Good morning", "Thank you"
];
const ALPHABETS = ["Script", "Bold script", "Old English"];
const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LO = "abcdefghijklmnopqrstuvwxyz";

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const styles = CF.byPage("cursive");
const style = name => styles.find(s => s.name === name);
const run = (name, text) => esc(style(name).run(text, {}));

function sheet() {
  const groups = [];
  styles.forEach(s => {
    let g = groups.find(g => g.name === s.group);
    if (!g) groups.push(g = { name: s.group, items: [] });
    g.items.push(s);
  });
  return groups.map(g =>
    `        <section class="group">\n          <h2 class="group-title">${esc(g.name)}</h2>\n` +
    g.items.map(s =>
      `          <article class="row"><div class="row-head"><button class="star" type="button" aria-pressed="false" aria-label="Pin ${esc(s.name)}">★</button><span class="row-name">${esc(s.name)}</span></div>` +
      `<div class="row-out">${esc(s.run(SAMPLE, {}))}</div><button class="btn copy" type="button">Copy</button></article>`
    ).join("\n") +
    `\n        </section>`
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
  const spaced = (name, s) => Array.from(style(name).run(s, {})).map(esc).join(" ");
  return ALPHABETS.map(name =>
    `        <h3>${esc(name)}</h3>\n` +
    `        <p class="glyphs letters">${spaced(name, UP)}</p>\n` +
    `        <p class="glyphs letters">${spaced(name, LO)}</p>`
  ).join("\n");
}

function inject(html, name, body) {
  const re = new RegExp(`(<!-- prerender:${name} -->)[\\s\\S]*?(\\s*<!-- /prerender:${name} -->)`);
  if (!re.test(html)) throw new Error(`missing prerender:${name} markers`);
  return html.replace(re, (_, a, b) => `${a}\n${body}${b}`);
}

const file = path.join(root, "index.html");
let html = fs.readFileSync(file, "utf8");
html = inject(html, "sheet", sheet());
html = inject(html, "examples", examples());
html = inject(html, "alphabet", alphabet());
html = html.replace(/(<span class="exemplar-out" id="heroOut">)[^<]*(<\/span>)/, `$1${run(styles[0].name, SAMPLE)}$2`);
html = html.replace(/(<textarea id="src"[^>]*>)[^<]*(<\/textarea>)/, `$1${esc(SAMPLE)}$2`);
fs.writeFileSync(file, html);
console.log("index.html prerendered");

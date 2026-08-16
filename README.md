# cursivee.app

Four Unicode text generators as an installable, offline-capable static site.
Type once, get alphabets you can paste into any bio, caption, or username that
only accepts plain text.

## Running it

No build step and no dependencies. For the full experience — service worker,
installability — serve it over HTTP rather than opening the files directly:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

`open index.html` also works, but `file://` blocks service workers, so there is
no offline support or install prompt that way. Everything else behaves normally.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Cursive generator — 21 styles: script, blackletter, bold, bubbles, effects |
| `small-text.html` | Small generator — 5 styles: superscript, subscript, small caps, tiny caps |
| `glitch-text.html` | Glitch generator — 10 styles plus an intensity dial and zone toggles |
| `weird-text.html` | Weird generator — 13 styles: flipped, mirrored, lookalike, morse, braille, binary |
| `about.html` | How it works and where it breaks |
| `privacy.html` · `terms.html` · `contact.html` | Site pages |
| `404.html` · `offline.html` | Fallbacks |

## Structure

```
assets/style.css    design tokens + every component, light and dark
assets/palette.js   generates the colour scheme — loaded in <head>
assets/engine.js    pure text transforms, no DOM — exposes window.CF
assets/app.js       shared page controller: chrome, generator UI, PWA
sw.js               service worker
manifest.webmanifest
```

Pages are static HTML that opt into the generator by declaring a config before
loading the controller:

```html
<script src="assets/engine.js"></script>
<script>window.PAGE_CONFIG={page:"cursive"};</script>
<script src="assets/app.js"></script>
```

`app.js` runs on every page. It always wires the theme toggle, toast, and PWA
bits; the generator UI only builds if the page declares `PAGE_CONFIG` and
contains a `#src` field. That is why the legal pages load the same script
without erroring.

## Adding a style

Append an `add(page, group, name, fn)` call in `assets/engine.js`. For an
alphabet-based style, `mapper` takes base code points for uppercase (`u`),
lowercase (`l`), and digits (`d`), with `ex` patching individual characters:

```js
add("cursive","Blackletter","Old English",
  mapper({u:0x1D504, l:0x1D51E, ex:{C:"ℭ", H:"ℌ", I:"ℑ", R:"ℜ", Z:"ℨ"}}));
```

`u`/`l`/`d` also accept a literal 26- or 10-character string when the range is
not contiguous — use `·` as a placeholder for "no such character exists, leave
the letter alone". For non-alphabet styles pass any `fn(text, opts)`, or use the
`combiner`, `flipper`, `separated` and `wrap` helpers.

## The colour scheme is generated

`assets/palette.js` rolls a random hue on every page load and derives all ten
colour tokens from it, for both themes, then writes them as inline custom
properties on `:root`. The **Shuffle** button in the header re-rolls without a
reload. The static palette in `style.css` is the fallback if the script never
runs.

Only the *hue* is random. Every lightness and chroma value is fixed in the
`LIGHT` and `DARK` tables, which is what keeps the page legible: the tokens are
built in OKLCH, where lightness is perceptually even, so a yellow accent and a
blue one land at the same contrast against the same background.

That claim is tested rather than assumed. The contrast suite sweeps all 360 hues
in both themes and checks every foreground/background pair the stylesheet
actually renders — body text ≥ 7:1, everything else ≥ 4.5:1. If you change a
value in those tables, re-run it:

```sh
node scratch/contrast.js   # see "Tests" below
```

The one thing it does not enforce is the 3:1 UI-boundary ratio for hairline
rules; those are decorative and sit near 1.5:1 by design, as they did before the
palette was generated.

## SEO

Every indexable page carries a unique title, meta description, canonical URL,
Open Graph and Twitter card tags, and a JSON-LD `@graph` (`WebPage` +
`BreadcrumbList`, plus `WebApplication` on the generators and `WebSite` +
`Organization` on the home page). The four generator pages also emit `FAQPage`
data generated *from* their visible FAQ markup, so the structured data can never
drift from what a reader sees — which is Google's requirement for the rich
result.

`assets/og-image.png` (1200×630) is a generated placeholder: the brand mark on
the ledger ground, with no wordmark, because these scripts have no text
rasteriser. It is honest but plain — worth replacing with a properly set card if
social previews matter to you.

## Two things that will bite you

**The output font stack is load-bearing.** `--f-out` in `style.css` leads with
Times New Roman and other faces that cover the whole combining-diacritic block
(U+0300–U+036F). This is not cosmetic: Georgia covers only 26% of that block, and
when it wins the cascade every uncovered mark renders as a tofu box — which
breaks the entire glitch page and the strikethrough/underline styles. The
mathematical alphanumerics are absent from these faces, so they still fall
through to the math fonts further down the list. Verify coverage before
reordering that list.

**Bump `CACHE` in `sw.js` after changing any asset.** Pages are network-first so
HTML edits land on the next visit, but CSS and JS are cache-first and keyed by
that string. Ship a stylesheet change without bumping it and returning visitors
keep the old one.

## Before you deploy

A few placeholders are deliberately left for you, each marked with a
**"Before publishing"** callout on the page itself:

- `privacy.html` — name your hosting provider and link its privacy policy.
- `terms.html` — replace the governing-law clause with your real jurisdiction.
- `contact.html` — point the address at a mailbox you actually read.
- `sitemap.xml` and `robots.txt` — replace `https://cursivee.app` with your live origin.

The privacy and terms pages are written to describe this site accurately, but
they are a starting point rather than legal advice — have someone qualified read
them if anything is riding on it.

Serve `404.html` as the not-found page in your host's config (Netlify, Vercel,
Cloudflare Pages and GitHub Pages all pick it up automatically).

## Tests

The verification scripts live outside the deployed site (they were written in a
scratch directory). Copy them into `scratch/` if you want them in the repo:

| Script | Checks |
| --- | --- |
| `verify.js` | all 49 styles transform, edge cases, glitch determinism |
| `contrast.js` | WCAG contrast across all 360 hues, both themes |
| `site-check.js` | internal links, shared chrome, page wiring, manifest, service worker |
| `seo-check.js` | titles, descriptions, canonicals, OG, JSON-LD, sitemap parity |
| `dom-test.js` | drives real clicks in jsdom: typing, filter, pinning, ornaments, theme, glitch knobs |

`dom-test.js` needs `npm i jsdom`; the rest run on plain Node.

## Caveats worth keeping in the UI

These are characters, not fonts. Screen readers announce them poorly or skip
them entirely, some sets have missing letters that no tool can supply, and some
platforms strip them from usernames. All three points are stated on the site on
purpose — don't quietly remove them.

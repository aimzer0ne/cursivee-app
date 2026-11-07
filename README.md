# cursivee.app

A cursive text generator as an installable, offline-capable static site. Type
once, get 21 cursive alphabets — plus symbol decorations — you can paste into
any bio, caption or chat that only accepts plain text.

## Running it

No build step and no dependencies. Links between pages are extensionless
(`/about`, not `/about.html`), because that is how the production host
(Cloudflare) serves them — it redirects the `.html` form. Preview with a server
that does the same:

```sh
npx serve          # serves about.html at /about
```

`python3 -m http.server` and opening the files over `file://` will show any
single page correctly, but the links between pages will 404.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Cursive generator — 21 styles: script, blackletter, bold, bubbles, effects |
| `about.html` | How it works and where it breaks (footer-linked) |
| `privacy.html` · `terms.html` · `contact.html` | Site pages |
| `404.html` · `offline.html` | Fallbacks |

## Removed pages

On 2026-11-07 the site was cut down to the home page. The small, glitch, cursed
and weird generators, the blog and its RSS feed were deleted; `_redirects`
sends every one of their old addresses to `/` with a 301, so links and search
results keep landing somewhere useful. Their styles are still defined in
`engine.js` (`CF.byPage` filters them out); they are in git history if a page
ever comes back.

## Structure

```
assets/logo.svg     the brand mark: header logo and SVG favicon (PNG icons and
                    favicon.ico are rasterised from the same drawing)
assets/style.css    design tokens + every component, light and dark
assets/engine.js    pure text transforms, no DOM — exposes window.CF
assets/deco.js      decoration packs (symbol frames) — extends window.CF
assets/app.js       shared page controller: chrome, generator UI, PWA
sw.js               service worker
manifest.webmanifest
```

Pages are static HTML that opt into the generator by declaring a config before
loading the controller:

```html
<script src="assets/engine.js"></script>
<script src="assets/deco.js"></script>
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

The input box starts empty. While it is empty, every font shows the sample text
from `PAGE_CONFIG.sample` ("hi pal") instead, so the list is never blank.

After changing any style or that sample,
run `node scripts/prerender.js`. It writes the generator's output into the home
page as static HTML (between the `prerender:` markers), plus the examples table
and alphabet. Search engines and AI
crawlers mostly read pages without running JavaScript, so without it they would
see an empty generator. `app.js` replaces the rows on load. The script uses the
same starting options as `app.js` and the engine's fixed glitch seed, so the
static rows are identical to the first live render; both build the margin label
(`.row-cp`, e.g. U+1D49C) from `CF.codePoint`. If you add a style count to a
page, `llms.txt` lists the counts too.

**FAQs.** The home page's FAQPage JSON-LD is generated from its visible
`.faq` block. After editing a question or answer, run `node scripts/sync-faq.js`
so the structured data matches the page.

**Keep copy short.** The site's text is deliberately minimal: one-line taglines,
one-sentence tips, five or six FAQ questions, card titles without blurbs. Add a
sentence only when it tells a visitor something they need.

## Decorations

`assets/deco.js` holds ten themed packs (Trending, Gamer, Royal, Attitude, Cool,
Cute, Love, Aesthetic, Kawaii, Warrior), ported from the nickstyle project. Each
pack has curated `frames` plus `before`/`after` tags and `accents` that are
recombined from a seed: `CF.decorations(pack, 0)` is the curated page, any other
seed a fresh one, so there is no last page.

- **Tapping a font** (its text, or ✦) opens a `<dialog>` picker for that style,
  as in nickstyle; the row's Copy button still copies the plain version
  directly. The picker's first entry is the undecorated text, and its list
  loads another page whenever its end scrolls into view (an
  `IntersectionObserver` on a sentinel inside the list), skipping frames
  already shown. While the dialog is open the toast and the copy fallback move
  inside it, because a modal makes the rest of the page inert.
- **Decorated ideas** under the styles pairs a random pack frame with a random
  style. It scrolls infinitely: reaching its end loads 24 more by itself, four
  times in a row (`IDEAS_AUTO`). After that a *Load more* press adds the next 24
  and re-arms the auto-loading, without end. The pause is deliberate, so the
  guide, FAQ and footer below stay reachable for readers and crawlers.

**Recent.** There are no favorites. Every copy (a row's Copy, a decoration in
the picker, a decorated idea) puts that font, with its frame if it has one, at
the top of a *Recent* group above the styles, which keeps the last three
(`RECENT_MAX`) in `localStorage` under `cf.recent.cursive`. Copying from Recent
itself only reorders storage, so nothing jumps under the pointer; other copies
redraw Recent and scroll by the difference so the row you pressed stays put.

To add a pack, append an entry to `PACKS` in `deco.js`; the picker builds its
tabs from `CF.packs`.

## Design: quiet paper

Simple and type-led. Warm white page (`--bg`), white panels (`--surface`) with a
hairline border and a soft shadow, one serif for headings (the system's Iowan Old
Style or Palatino — nothing is downloaded, which keeps the privacy page's "no
third parties but Analytics" true) and a script face for the brand and the one
scripted word in each generator title. The generator is one big input box with every
style listed right under it, as rows in one panel grouped under small labels.
There is no filter, ornament or size bar and no separate hero preview — the
user asked for exactly that on 2026-11-07. Dark mode is near-black with the same layout.

One convention holds everywhere: **the accent (`--accent`, blue) means converted
text you can copy** — glyph boxes, `.g` cells, copy lists, card
samples, and a row's output on hover. Everything else stays neutral, so the
styles are what stands out. Don't add a second accent colour.

The palette is fixed: the tokens at the top of `assets/style.css`, once for
light and once for dark. Nothing generates or shuffles colours at runtime. The
light and dark `--bg` values are repeated in each page's `theme-color` meta and
in `manifest.webmanifest`; change them together.

The code point of each style's "A" (`.row-cp`) is still written into the markup
by `app.js` and `prerender.js` but hidden by CSS.

**Full-bleed pieces** (the header bar and its rule, the footer band) reach the
viewport edge and are clipped by `overflow-x:clip` on `body`. That only works
because `html` has an overflow of its own: without it, body's value is handed to
the viewport and phones lay the page out wider than the screen. For the same
reason the header stays `position:relative` on phones rather than `static`.

The header toggle stores the choice in `localStorage` under `cf.theme`. A
one-line inline script in each page's `<head>` applies it before first paint, so
a visitor who picked the non-system theme does not see a flash of the other one.

## SEO

Canonical URLs, `og:url`, JSON-LD, `sitemap.xml` and internal links all use the
extensionless form, matching what the host serves with a 200. `404.html` and
`offline.html` are `noindex`.

Every indexable page carries a unique title, meta description, canonical URL,
Open Graph and Twitter card tags, and a JSON-LD `@graph` (`WebPage` +
`BreadcrumbList`, plus `WebSite`, `Organization`, `WebApplication` and `FAQPage`
on the home page). The `FAQPage` data is generated from the visible FAQ by
`scripts/sync-faq.js`, so it never drifts from what a reader sees — Google's
requirement for the rich result.

The home page is the page that ranks for "cursive generator", "cursive text
generator" and "cursive font generator". Its `<title>` leads with the exact
phrase "Cursive Generator", the H1 is "Cursive text generator", and the
`WebApplication` lists the other two names as `alternateName`. Keep those
phrases where they are, and don't create a second page targeting the same
phrases — a separate "cursive font generator" page would compete with the home
page instead of helping it.

The site targets a US audience. `.app` is a generic TLD with no country attached,
so the target is stated explicitly: `lang="en-US"`, a self-referencing
`hreflang="en-us"` beside each canonical, `inLanguage` in the JSON-LD, the
`Content-Language` header in `_headers`, and the language in the manifest. Write visible copy in American English with US-style dates (October 31,
2026). Keep every page open to every country, and leave `geo.*` meta tags out:
Google ignores them.

After deploying, run `sh scripts/indexnow.sh` to ping Bing and the other
IndexNow engines with every sitemap URL (or pass paths: `sh scripts/indexnow.sh
/about`). It depends on the key file `484cb0fe606f317f93480c5f1580d84f.txt`
at the site root — don't delete or rename it. `_headers` sets HSTS and
`X-Robots-Tag: noindex` on the fallback pages.

**AI models.** Three things help ChatGPT, Claude, Perplexity, Gemini and the
like to read and cite the site:

- `robots.txt` allows every crawler, AI ones included. Keep it that way, and
  check that Cloudflare is not blocking them at the edge: *AI Crawl Control*
  (formerly "Block AI bots") and its managed `robots.txt` can override this
  file without any change in the repo.
- `llms.txt` at the root is a plain-Markdown map of the site for AI models: a
  summary, the facts about fancy text models most often get wrong, and every
  page with one line each. Keep it in step with the pages and their style
  counts. `_headers` serves it as UTF-8 (it contains script letters) and
  `noindex`, so it stays out of Google's results while AI tools still fetch it.
- The prerendered generator output (above) puts each page's real styles in the
  HTML that crawlers read.

ChatGPT's search draws on Bing's index, so the IndexNow ping after each deploy
matters for AI answers as well as for Bing.

`assets/og-image.png` (1200×630) is a generated placeholder: the brand mark on
the ledger ground, with no wordmark, because these scripts have no text
rasteriser. It is honest but plain — worth replacing with a properly set card if
social previews matter to you.

## Two things that will bite you

**The output font stack is load-bearing.** `--f-out` in `style.css` leads with
Times New Roman and other faces that cover the whole combining-diacritic block
(U+0300–U+036F). This is not cosmetic: Georgia covers only 26% of that block, and
when it wins the cascade every uncovered mark renders as a tofu box — which
breaks the strikethrough, underline and slashed styles. The
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
| `verify.js` | all 62 styles transform, edge cases, glitch determinism |
| `site-check.js` | internal links, shared chrome, page wiring, manifest, service worker |
| `seo-check.js` | titles, descriptions, canonicals, OG, JSON-LD, sitemap parity |
| `dom-test.js` | drives real clicks in jsdom: typing, pinning, decorations, theme |

`dom-test.js` needs `npm i jsdom`; the rest run on plain Node.

## Caveats worth keeping in the UI

These are characters, not fonts. Screen readers announce them poorly or skip
them entirely, some sets have missing letters that no tool can supply, and some
platforms strip them from usernames. All three points are stated on the site on
purpose — don't quietly remove them.

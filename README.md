# cursivee.app

Five Unicode text generators as an installable, offline-capable static site.
Type once, get alphabets you can paste into any bio, caption, or username that
only accepts plain text.

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
| `small-text.html` | Small generator — 5 styles: superscript, subscript, small caps, tiny caps |
| `glitch-text.html` | Glitch generator — 10 styles plus an intensity dial and zone toggles |
| `cursed-text.html` | Cursed generator — 11 styles: a substituted alphabet corrupted on top, with the same dial |
| `weird-text.html` | Weird generator — 15 styles: strange alphabets, mirrored, lookalike, morse, braille, binary |
| `about.html` | How it works and where it breaks (footer-linked) |
| `blog.html` · `blog/*.html` | Blog index and its posts (in the top nav and footer; listed on the home page under *From the blog*) |
| `privacy.html` · `terms.html` · `contact.html` | Site pages |
| `404.html` · `offline.html` | Fallbacks |

## Adding a blog post

Posts are hand-written static pages at `blog/<slug>.html`, served as
`/blog/<slug>`. Copy an existing one, then update the places that list posts:
the cards in `blog.html`, the *From the blog* section in `index.html`, the
*Guides* column of the footer (on every page), `sitemap.xml`, `feed.xml`, the
`SHELL` list in `sw.js`, and the `blogPost` array in `blog.html`'s JSON-LD.

Posts sit one level down, so their links to the rest of the site start with
`../` (`../assets/style.css`, `../about`) and links to other posts are bare
slugs. `404.html` and `offline.html` can be shown at any depth, so theirs are
root-absolute. `_redirects` sends the old `/blog-<slug>` addresses to the new
ones.

## Structure

```
assets/logo.svg     the brand mark: header logo and SVG favicon (PNG icons and
                    favicon.ico are rasterised from the same drawing)
assets/style.css    design tokens + every component, light and dark
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

## Preview size

The four **Size** pills in the controls bar set `--out-scale` on `:root`, and the
hero preview and every style row derive their font size from it with `calc()`.
The choice is saved to `localStorage` under `cf.size`. If you add another place
that renders converted text, multiply its font size by `var(--out-scale,1)` so it
scales too.

## Colour and theme

The palette is fixed: the tokens at the top of `assets/style.css`, once for
light and once for dark. Nothing generates or shuffles colours at runtime. The
violet-to-coral gradient (`--grad`) is reserved for the wordmark, the scripted
word in a hero title, the frame around the generator and small accents;
`--grad-btn` is the primary button.

The header toggle stores the choice in `localStorage` under `cf.theme`. A
one-line inline script in each page's `<head>` applies it before first paint, so
a visitor who picked the non-system theme does not see a flash of the other one.

## SEO

Canonical URLs, `og:url`, JSON-LD, `sitemap.xml` and internal links all use the
extensionless form, matching what the host serves with a 200. `feed.xml` is the
blog's RSS feed. `404.html` and `offline.html` are `noindex`.

Every indexable page carries a unique title, meta description, canonical URL,
Open Graph and Twitter card tags, and a JSON-LD `@graph` (`WebPage` +
`BreadcrumbList`, plus `WebApplication` on the generators and `WebSite` +
`Organization` on the home page). The five generator pages also emit `FAQPage`
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
| `verify.js` | all 62 styles transform, edge cases, glitch determinism |
| `site-check.js` | internal links, shared chrome, page wiring, manifest, service worker |
| `seo-check.js` | titles, descriptions, canonicals, OG, JSON-LD, sitemap parity |
| `dom-test.js` | drives real clicks in jsdom: typing, filter, pinning, ornaments, theme, glitch knobs |

`dom-test.js` needs `npm i jsdom`; the rest run on plain Node.

## Caveats worth keeping in the UI

These are characters, not fonts. Screen readers announce them poorly or skip
them entirely, some sets have missing letters that no tool can supply, and some
platforms strip them from usernames. All three points are stated on the site on
purpose — don't quietly remove them.

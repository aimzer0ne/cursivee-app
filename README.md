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
| `blog.html` · `blog/*.html` | Blog index and its posts (in the top nav and footer; cursive posts are listed on the home page under *Cursive guides*) |
| `privacy.html` · `terms.html` · `contact.html` | Site pages |
| `404.html` · `offline.html` | Fallbacks |

## Adding a blog post

Posts are hand-written static pages at `blog/<slug>.html`, served as
`/blog/<slug>`. Copy an existing one, then update the places that list posts:
the cards in `blog.html`, `sitemap.xml`, `feed.xml`, the `SHELL` list in
`sw.js`, and the `blogPost` array in `blog.html`'s JSON-LD. If the post is about
cursive, also add it to the *Cursive guides* section of `index.html` and the
*Cursive guides* column of the footer (on every page) — both deliberately list
only cursive posts, so the home page and every footer point at the cluster of
pages that supports the main "cursive generator" keyword.

Every post should link back to the home page early on, with a varied anchor
("cursive generator", "cursive text generator", "cursive font generator")
rather than "click here" or the same phrase every time.

Ready-made converted text in a post goes in `.glyphs` (one line per box),
`<ul class="copylist">` (a list of lines) or a table cell with `class="g"`.
`app.js` makes all of them tap-to-copy, so no per-post script is needed. Add
`letters` to a `.glyphs` line of spaced single letters so one letter can still
be selected on its own.

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

After changing a cursive style, run `node scripts/prerender.js`. It writes the
cursive output into `index.html` as static HTML (between the `prerender:`
markers) so search engines see it; `app.js` replaces it on load. Both build the
row's margin label (`.row-cp`, e.g. U+1D49C) from `CF.codePoint` in the engine,
so the static and live rows match.

## Preview size

The four **Size** pills in the controls bar set `--out-scale` on `:root`, and the
hero preview and every style row derive their font size from it with `calc()`.
The choice is saved to `localStorage` under `cf.size`. If you add another place
that renders converted text, multiply its font size by `var(--out-scale,1)` so it
scales too.

## Design: penmanship paper

The site is drawn as American handwriting paper. The generator is a punched
sheet with a double red margin, and every style is written on its own ruled line
(dashed midline, red baseline) with its name and the code point of its "A" as a
margin note. Generator titles sit on full-width ruling, links are index cards, a
copy lands as a rubber-stamp toast, and the footer is a signature. Light mode is
cream paper; dark mode is midnight ink.

Two conventions hold everywhere:

- **Blue (`--nib`) means converted text you can copy**: the hero preview, glyph
  slips, `.g` cells, copy lists, card samples. Body text is blue-black `--ink`.
- **Red is the margin and the baseline.** It is decorative (`--red`); use
  `--red-ink` wherever red has to be read as text.

The palette is fixed: the tokens at the top of `assets/style.css`, once for
light and once for dark. Nothing generates or shuffles colours at runtime.

**Ruling.** Any element in the selector list under `── ruling ──` gets one set of
lines per line of text, computed from `--lh` (its unitless line height) and the
line-box font's metrics (`--asc`, `--cap`, `--xh`). The defaults suit `--f-out`;
the ruled titles override them for the display serif. A ruled element must set
its line height through `--lh`, not `line-height`, or the lines drift off the
text. Vertical space around ruled text should be a border or margin, not padding
(see `.glyphs`): the ruling repeats into padding.

**Display face.** `"Ruled Serif"` is a `local()`-only `@font-face` over the
system's Palatino (Palatino Linotype on Windows, then Book Antiqua, P052, Noto
Serif, Georgia), with `ascent-override`/`descent-override` pinned to the Mac cut
so every platform puts its baseline where the ruling expects. Nothing is
downloaded, which keeps the privacy page's "no third parties but Analytics" true.

**Full-bleed pieces** (ruled titles, the letterhead rule, the footer band) reach
the viewport edge and are clipped by `overflow-x:clip` on `body`. That only works
because `html` has an overflow of its own: without it, body's value is handed to
the viewport and phones lay the page out wider than the screen. For the same
reason the header stays `position:relative` on phones rather than `static`.

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
result. If you edit a visible FAQ answer, make the same edit in the JSON-LD.

The home page is the page that ranks for "cursive generator", "cursive text
generator" and "cursive font generator". Its `<title>` leads with the exact
phrase "Cursive Generator", the H1 is "Cursive text generator", and the
`WebApplication` lists the other two names as `alternateName`. Keep those
phrases where they are, and don't create a second page targeting the same
phrases — a separate "cursive font generator" page would compete with the home
page instead of helping it. Supporting posts target neighbouring searches
(cursive alphabet, name in cursive, bio ideas, cursive fonts in Docs) and link
back.

The site targets a US audience. `.app` is a generic TLD with no country attached,
so the target is stated explicitly: `lang="en-US"`, a self-referencing
`hreflang="en-us"` beside each canonical, `inLanguage` in the JSON-LD, the
`Content-Language` header in `_headers`, and the language in `feed.xml` and the
manifest. Write visible copy in American English with US-style dates (October 31,
2026). Keep every page open to every country, and leave `geo.*` meta tags out:
Google ignores them.

After deploying, run `sh scripts/indexnow.sh` to ping Bing and the other
IndexNow engines with every sitemap URL (or pass paths: `sh scripts/indexnow.sh
/blog/new-post`). It depends on the key file `484cb0fe606f317f93480c5f1580d84f.txt`
at the site root — don't delete or rename it. `_headers` sets HSTS and
`X-Robots-Tag: noindex` on the fallback pages.

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

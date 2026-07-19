# UsdtoWorld — USD to RMB Currency Converter

A static AstroJS site: live currency converter, SEO-optimized homepage, 10
dedicated currency-pair guides, a standalone FAQ page, legal pages, a full
error/status page suite, dark/light mode, 5-language UI, and a PWA service
worker. Domain: **www.usdtoworld.com**.

See **ARCHITECTURE.md** for the full project architecture, directory guide,
data flow, and integration points.

## Quick start

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/ (static, deploy anywhere)
npm run preview   # serve the production build locally
```

## Cloudflare Security Insights — what's fixed here vs. dashboard-only

Cloudflare's Security Insights scan surfaces a mix of things this repo can
fix and things that only exist as Cloudflare **zone/dashboard settings** —
no file in a static site can change those, since they control behavior at
Cloudflare's edge before a request ever reaches these files.

**Fixed here (code-level):**
- *Domains without HSTS* → `public/_headers` now sends
  `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  on every response.
- *Security.txt not configured* → added
  `public/.well-known/security.txt` (RFC 9116) plus a root-level
  `/security.txt` fallback. Update the `Expires` date before it lapses.
- *Review unwanted AI crawlers* → `robots.txt` now explicitly disallows
  known AI-training crawlers (GPTBot, CCBot, ClaudeBot, Google-Extended,
  Bytespider, PerplexityBot, etc.). This is a *complementary* control, not
  a replacement for Cloudflare's AI Labyrinth (see below) — well-behaved
  crawlers respect `robots.txt`, but it can't stop crawlers that ignore it.

**Dashboard-only — enable these directly in Cloudflare, no file can do it:**
- *AI Labyrinth* — Security → Bots → AI Labyrinth. Traps crawlers that
  ignore `robots.txt` by feeding them an endless maze of fake pages;
  robots.txt can't do this on its own.
- *Bot Fight Mode* — Security → Bots → Bot Fight Mode. Challenges
  automated traffic at Cloudflare's edge.
- *Domains without "Always Use HTTPS"* — SSL/TLS → Edge Certificates →
  "Always Use HTTPS". Forces HTTP→HTTPS redirects at the edge; this is
  distinct from (and a prerequisite for) HSTS actually being effective —
  HSTS only matters once a browser has already been told the site is
  HTTPS-only, so both should be enabled together.

## Deploying to Cloudflare Pages — read this first

If custom error pages (404, etc.) or client-side features don't work after
deploying, check these in order:

1. **Build settings**: Build command `npm run build`, Build output directory
   `dist`. A wrong output directory is the single most common cause of
   "works locally, 404s in production" on Cloudflare Pages.
2. **`public/_redirects`** (copied to `dist/_redirects` at build time) now
   explicitly forces any unmatched route to serve `/404.html` with a real
   404 status. This is a defensive rule — Cloudflare Pages normally
   auto-detects a top-level `404.html`, but some deployment paths
   (especially the newer Workers-based static-assets model) don't apply
   that behavior automatically. See `wrangler.jsonc` at the project root
   for the equivalent explicit config if you deploy via `wrangler deploy`
   instead of the Pages git-integration dashboard flow.
3. **Disable Rocket Loader** (Cloudflare dashboard → Speed → Optimization)
   for this project/domain. Rocket Loader rewrites and defers `<script>`
   tags, including ES modules, and can change their execution order or
   cause them to run more than once — this is a known source of "buttons
   don't respond," "the converter doesn't load on first visit," or similar
   symptoms on Cloudflare-hosted JS-driven static sites. All of this
   project's client scripts guard against double-initialization as a
   defense-in-depth measure, but disabling Rocket Loader avoids the
   problem at the source.
4. **Auto Minify (JS)** and **Mirage** can cause similar issues; if problems
   persist after step 3, try disabling those too.

## Before going live

- `astro.config.mjs` is already set to `https://www.usdtoworld.com`.
- Legal entity / organization name: **UsdtoWorld**, 93 2nd Ave, New York,
  United States, 10003. Contact email: **usdtoworld@gmail.com**. These are
  filled in across `/contact`, `/privacy-policy`, `/disclaimer`, `/terms`,
  and the `Organization` JSON-LD in `Layout.astro`.
- Google Analytics (gtag.js, `G-DXMLTX9F29`) is already wired into
  `Layout.astro`'s `<head>`.
- Google AdSense: `public/ads.txt` has a placeholder publisher ID
  (`pub-0000000000000000`) — replace it with your real one. The AdSense
  loader `<script>` in `Layout.astro` is commented out until you have a
  real publisher ID; uncomment it once approved.
- Google Search Console: add your verification meta tag or file once you
  have one — none is included yet.
- Wire `src/utils/logger.js` and `src/utils/error-handler.js` into a real
  error-tracking provider if you want more than console logging.
- Set a real maintenance end time in `src/pages/503.astro` (currently a
  45-minutes-from-load placeholder).

## SEO notes

- Sitemap (`@astrojs/sitemap`) excludes the `noindex` status pages
  (`/503`, `/offline`, `/rate-limit`, `/api-error`) — 17 indexable pages
  are submitted: homepage, 5 legal/info pages, `/faq`, and 10 currency-pair
  guides.
- Every page has exactly one H1 and no heading-level skips (verified at
  build time, including all 10 new pair pages).
- Favicons live in `public/favicon/` and are linked from `Layout.astro`.
- Each currency-pair page (`/usd-to-inr`, `/eur-to-usd`, etc.) has its own
  unique title, meta description, `FAQPage` + `BreadcrumbList` schema, and
  ~500–700 words of original editorial content — not templated
  find-and-replace copy — plus its own pre-filled live converter.

## Performance (Core Web Vitals) fixes

Applied after reviewing real field data (Cloudflare Web Analytics):

- **LCP**: Google Fonts were loaded via a CSS `@import`, which forces an extra
  sequential round-trip before the browser even discovers the font request.
  Replaced with `<link rel="preconnect">` + `<link rel="stylesheet">` tags
  directly in `Layout.astro`'s `<head>`, discovered immediately by the
  browser's preload scanner. This was the main lever on LCP for any
  text-heavy hero section.
- **INP**: field data showed elevated interaction latency specifically on
  `#mobile-nav>a` (mobile nav links) right after page load. Non-critical
  scripts (`scroll-top.js`, `register-sw.js`, `recent-pages.js`) are now
  deferred via `requestIdleCallback` (with a `setTimeout` fallback) so they
  don't compete with the user's first tap for main-thread time. `theme.js`
  and `i18n.js` stay eager since they affect visible state immediately.
- **CLS**: same root cause as LCP (font swap-in reflow) — the `@import` fix
  above also reduces this.
- Closed FAQ accordion items use `content-visibility: auto` to cut down
  layout/paint cost on pages with many `<details>` elements.
- The sticky header's `backdrop-filter` blur was reduced from 10px to 6px to
  lower compositing cost on lower-end mobile devices during scroll.

## Reliability notes (converter / first load)

- `src/scripts/converter.js` does one silent retry (after ~1.2s) if the
  initial rate fetch fails, to smooth over transient network hiccups on
  first load.
- Every client script (`theme.js`, `i18n.js`, `converter.js`,
  `scroll-top.js`, `recent-pages.js`, `register-sw.js`) guards against
  being initialized twice — see the Cloudflare Rocket Loader note above for
  why this matters in production.
- The exchange rate API (`open.er-api.com`) is CORS-enabled and safe to
  call directly from the browser; no proxy is needed.

`dist/` in this archive is a pre-built copy — running `npm run build` will
regenerate it.

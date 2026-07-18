# UsdtoWorld — USD to RMB Currency Converter

A static AstroJS site: live currency converter, SEO-optimized homepage,
legal pages, full error/status page suite, dark/light mode, 5-language UI,
and a PWA service worker. Domain: **www.usdtoworld.com**.

See **ARCHITECTURE.md** for the full project architecture, directory guide,
data flow, and integration points.

## Quick start

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/ (static, deploy anywhere)
npm run preview   # serve the production build locally
```

## Before going live

- `astro.config.mjs` is already set to `https://www.usdtoworld.com`.
- Legal entity: **BooksnPDF**, 93 2nd Ave, New York, United States, 10003.
  Contact email: **usdtoworld@gmail.com**. These are filled in across
  `/contact`, `/privacy-policy`, `/disclaimer`, `/terms`, and the
  `Organization` JSON-LD in `Layout.astro` — update all of them together if
  any of this changes.
- Google Analytics (gtag.js, `G-DXMLTX9F29`) is already wired into
  `Layout.astro`'s `<head>`.
- Google AdSense: `public/ads.txt` has a placeholder publisher ID
  (`pub-0000000000000000`) — replace it with your real one. The AdSense
  loader `<script>` in `Layout.astro` is commented out until you have a
  real publisher ID; uncomment it once approved.
- Google Search Console: add your verification meta tag or file once you
  have one — none is included yet.
- `public/_headers` configures caching/security headers for **Cloudflare
  Pages** specifically; if you deploy elsewhere, translate it to that
  host's equivalent config (e.g. `vercel.json`, `netlify.toml`).
- Wire `src/utils/logger.js` and `src/utils/error-handler.js` into a real
  error-tracking provider if you want more than console logging.
- Set a real maintenance end time in `src/pages/503.astro` (currently a
  45-minutes-from-load placeholder).

## SEO notes

- Sitemap (`@astrojs/sitemap`) excludes the `noindex` status pages
  (`/503`, `/offline`, `/rate-limit`, `/api-error`) — only the 6 indexable
  pages are submitted.
- Every page has exactly one H1 and no heading-level skips (verified at
  build time).
- Homepage primary-keyword ("USD to RMB") density is ~1.25% of visible text.
- Favicons live in `public/favicon/` (96×96 PNG, SVG, ICO, 180×180 Apple
  touch icon, `site.webmanifest`) and are linked from `Layout.astro`.

`dist/` in this archive is a pre-built copy — running `npm run build` will
regenerate it.

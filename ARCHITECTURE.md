# RateBridge — Project Architecture

A static AstroJS currency-converter site (USD→RMB primary keyword) with live
rates, dark/light theming, 5-language UI, full SEO/schema markup, a PWA
service worker, and a branded error/status page suite.

Rendering model: **Astro static output**. Every `.astro` page is pre-rendered
to HTML at build time (`astro build` → `dist/`). Interactivity (converter,
theme, language, search, offline handling) is added client-side via small
vanilla-JS modules loaded per page — there is no client framework and no
server runtime required at request time.

---

## 1. Directory tree

```
currency-converter/
├─ astro.config.mjs          # site URL, @astrojs/sitemap integration
├─ package.json
├─ tsconfig.json
├─ public/                   # copied to dist/ root, untouched by the build
│  ├─ favicon/                # favicon-96x96.png, favicon.svg, favicon.ico,
│  │                          # apple-touch-icon.png, site.webmanifest
│  ├─ og-image.png           # generated Open Graph share image
│  ├─ ads.txt                # Google AdSense verification (placeholder pub ID)
│  ├─ _headers                # Cloudflare Pages cache/security headers
│  ├─ robots.txt
│  └─ sw.js                  # service worker (see §6)
├─ src/
│  ├─ layouts/
│  │  └─ Layout.astro        # HTML shell: <head> meta/SEO/schema, Header,
│  │                         # <slot/>, Footer, offline banner, global scripts
│  ├─ components/
│  │  ├─ Header.astro        # sticky nav, language <select>, theme toggle
│  │  ├─ Footer.astro        # legal links, newsletter, disclaimer, scroll-top
│  │  ├─ Breadcrumbs.astro   # visual breadcrumb trail (+ schema built by page)
│  │  ├─ ConverterHero.astro # the live converter form (homepage hero)
│  │  ├─ RateChart.astro     # illustrative 12mo sparkline (SVG)
│  │  ├─ Features.astro      # "why RateBridge" feature cards
│  │  ├─ EditorialSections.astro # long-form SEO copy (What is RMB?, etc.)
│  │  ├─ FAQAccordion.astro  # <details> accordion, feeds FAQPage schema
│  │  ├─ ErrorLayout.astro   # shared shell for all status/error pages
│  │  ├─ SiteSearch.astro    # client-side search (pages + currencies)
│  │  └─ RecentPagesWidget.astro # localStorage-backed "recently viewed"
│  ├─ pages/                 # ⇒ one static route per file
│  │  ├─ index.astro         # homepage: Hero+Features+Chart+Editorial+FAQ
│  │  ├─ about.astro
│  │  ├─ contact.astro
│  │  ├─ privacy-policy.astro
│  │  ├─ disclaimer.astro
│  │  ├─ terms.astro
│  │  ├─ 404.astro           # Astro's reserved "not found" route
│  │  ├─ 500.astro           # Astro's reserved "server error" route
│  │  ├─ 503.astro           # maintenance page (manual route)
│  │  ├─ offline.astro       # served by sw.js when navigation fails offline
│  │  ├─ rate-limit.astro    # 429-style manual route
│  │  └─ api-error.astro     # shown when the rate API is unreachable
│  ├─ data/                  # plain JS "content" modules, imported by
│  │  │                      # both components (build time) and scripts (runtime)
│  │  ├─ currencies.js       # currency list, popular pairs, quick chips
│  │  ├─ faq.js              # 15 Q&A entries → FAQAccordion + FAQPage schema
│  │  └─ translations.js     # i18n dictionary: en / hi / zh / es / ja
│  ├─ scripts/                # vanilla JS, one responsibility each, all
│  │  │                       # idempotent + re-run on `astro:page-load`
│  │  ├─ theme.js            # dark/light toggle, persisted to localStorage
│  │  ├─ i18n.js              # applies translations.js to [data-i18n] nodes
│  │  ├─ converter.js         # fetch/cache rates, run conversions, recents
│  │  ├─ scroll-top.js        # scroll-to-top button visibility + click
│  │  ├─ offline-banner.js    # toggles the sticky "you're offline" banner
│  │  ├─ register-sw.js       # registers /sw.js on window load
│  │  └─ recent-pages.js      # logs page visits to localStorage (for 404)
│  ├─ styles/
│  │  └─ global.css           # design tokens (CSS vars), typography, layout
│  │                          # primitives (.container, .card, .glass, .btn…)
│  └─ utils/                  # framework-agnostic helpers, NOT auto-loaded —
│     │                       # import these where you wire up real providers
│     ├─ error-handler.js     # classifyError, retryWithBackoff, reportError()
│     └─ logger.js            # leveled logger, trackPageView/Event/Performance
└─ dist/                      # build output (generated, not hand-edited)
```

---

## 2. Page composition pattern

Every page follows the same shape:

```
<Layout title=… description=… path=… schema=[…] noindex?>
  <Breadcrumbs trail={…} />        (content pages)
  ...page-specific components...
</Layout>
```

`Layout.astro` is the single source of truth for `<head>` — meta tags, Open
Graph/Twitter cards, hreflang, the merged JSON-LD array
(`Organization` + `WebSite` + `Speakable` + whatever the page passes in via
`schema`), theme-flash prevention, and the global `<script>` bundle. Pages
never duplicate this wiring; they only pass props and drop their own
`schema` objects (e.g. `FAQPage`, `BreadcrumbList`) into the array.

`ErrorLayout.astro` wraps `Layout` for the six status pages, adding the
gradient status-code badge and defaulting `noindex` to `true` so 404 / 500 /
503 / rate-limit / api-error / offline are never indexed.

---

## 3. Client-side runtime (no framework)

All interactivity is plain ES modules imported inside `<script>` tags, which
Astro bundles per-page with Vite. Two bundles are produced:

- **Global bundle** (via `Layout.astro`): `theme.js`, `i18n.js`,
  `scroll-top.js`, `offline-banner.js`, `register-sw.js`, `recent-pages.js`
  — runs on every page.
- **Page bundle** (via `index.astro`): `converter.js` — only needed on the
  homepage, so it isn't shipped to every route.

Every script listens for both `DOMContentLoaded`-equivalent initial load
*and* Astro's `astro:page-load` event, so behavior survives Astro's
client-side view transitions if enabled later.

State lives entirely in the browser:

| localStorage key                | Written by        | Read by                          |
|----------------------------------|--------------------|-----------------------------------|
| `theme`                          | theme.js           | Layout inline script (pre-paint) |
| `locale`                         | i18n.js            | i18n.js                          |
| `ratebridge:rates` / `:time`     | converter.js       | converter.js, offline.astro, api-error.astro |
| `ratebridge:recent`              | converter.js       | ConverterHero (recent conversions) |
| `ratebridge:recent-pages`        | recent-pages.js    | RecentPagesWidget (404 page)     |
| `ratebridge:prevrate:{PAIR}`     | converter.js       | converter.js (trend arrow)       |

---

## 4. Data flow: the converter

```
ConverterHero.astro (form + result markup, SSR'd)
        │
        ▼
converter.js  ──fetch──▶  open.er-api.com/v6/latest/USD
        │                        │
        │            ok ─────────┘
        ▼
  cache in localStorage (30 min TTL)
        │
        ▼
  compute cross-rate(from, to) → render result, trend arrow, recents
        │
        └─ offline / fetch failure → fall back to cached rates,
           surface status via [data-status]
```

`?from=&to=&amount=` query params are read once on init, so external links
(e.g. the 404 page's "Popular conversions") can deep-link a specific pair
into the homepage form.

---

## 5. SEO & structured data

- **Meta**: dynamic title/description per page, canonical URL, OG + Twitter
  card tags, theme-color, hreflang for all 5 locales pointing at the same
  URL (single-URL i18n via client-side switching).
- **JSON-LD**, always present: `Organization`, `WebSite` (with
  `SearchAction`), `WebPage`+`Speakable`. Added per-page: `FAQPage`
  (homepage) and `BreadcrumbList` (every content + error page).
- **robots**: `index, follow` by default; `noindex, nofollow` on all six
  status pages via the `Layout` `noindex` prop.
- `robots.txt` + auto-generated `sitemap-index.xml`/`sitemap-0.xml` via
  `@astrojs/sitemap`, **filtered to exclude the six noindex status pages**
  so only real, indexable content is submitted.
- **Organization schema** carries the legal entity (`BooksnPDF`), the
  `UsdtoWorld` brand as `alternateName`, a `PostalAddress`, and a contact
  `email` — kept in sync with the text on `/contact`, `/privacy-policy`,
  `/disclaimer`, and `/terms`.

---

## 5b. Analytics, ads, and deployment headers

- **Google Analytics** (gtag.js) is loaded directly in `Layout.astro`'s
  `<head>`, as early as possible, using measurement ID `G-DXMLTX9F29`.
- **Google AdSense**: `public/ads.txt` holds a placeholder publisher ID; the
  AdSense loader `<script>` in `Layout.astro` is present but commented out
  until a real publisher ID is available.
- **Google Search Console**: no verification method is wired in yet — add a
  meta tag or verification file when you have one.
- **`public/_headers`**: Cloudflare Pages cache/security header rules —
  immutable caching for hashed `/_astro/*` assets, `no-cache` on `/sw.js` so
  updates roll out promptly, short caching on favicons/robots/sitemap, and
  baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) on every route.

---

## 6. PWA & offline behavior (`public/sw.js`)

Three named caches, versioned together (`VERSION = 'v1'`):

| Cache             | Strategy                                   | Contents                        |
|-------------------|---------------------------------------------|----------------------------------|
| `ratebridge-shell`| precached on `install`                     | `/`, `/offline/`, manifest, icons |
| `ratebridge-runtime`| cache-first for static assets, network-first for navigations | hashed JS/CSS, HTML pages |
| `ratebridge-rate` | network-first, cache-on-success            | `open.er-api.com` responses      |

Fetch routing in `sw.js`:
1. Requests to the rate API host → `networkFirstRate` (always try live,
   fall back to last cached JSON response).
2. Navigations (`request.mode === 'navigate'`) → `networkFirstNavigation`,
   falling back to a cached copy of the page, then to `/offline/`.
3. Same-origin static assets → `cacheFirstStatic`.

`register-sw.js` registers this worker on `window.load`; failures are
caught and logged, never block page rendering. `offline-banner.js`
independently toggles a sticky top banner using the browser's
`online`/`offline` events (works even without the SW).

---

## 7. Error/status page suite

| Route          | Astro convention        | noindex | Key widgets |
|----------------|--------------------------|---------|-------------|
| `/404`         | reserved filename        | ✅      | SiteSearch, popular conversions, RecentPagesWidget |
| `/500`         | reserved filename        | ✅      | Retry button, Contact Support |
| `/503`         | manual route              | ✅      | Live countdown timer |
| `/offline`     | manual route (SW fallback)| ✅     | Last cached rate from localStorage |
| `/rate-limit`  | manual route              | ✅      | 30s cooldown before retry re-enables |
| `/api-error`   | manual route              | ✅      | Last cached rate + timestamp |

All six share `ErrorLayout.astro` → full header/footer/theme/i18n/breadcrumbs,
so none of them are dead ends.

---

## 8. Monitoring placeholders (not wired to a vendor)

- `src/utils/logger.js` — leveled console logger + `trackPageView`,
  `trackEvent`, `trackPerformance` stubs. Swap the `TODO` blocks for GA4 /
  Plausible / a RUM endpoint.
- `src/utils/error-handler.js` — `classifyError()` maps a caught
  error/response to one of `offline | rate-limit | server | api-error`,
  `errorPageFor()` maps that to a route, `retryWithBackoff()` is a generic
  exponential-backoff helper, and `reportError`/`reportApiHealth` are the
  two integration points for an error tracker and an API-health dashboard.

Neither file is auto-imported anywhere yet — they're utilities to pull into
`converter.js` (or a future server function) once a real provider is chosen.

---

## 9. Build & run

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # → dist/ (static HTML/CSS/JS, ready for any static host)
npm run preview  # serve dist/ locally to sanity-check the production build
```

No environment variables or server are required; `dist/` can be deployed to
any static host (Netlify, Vercel static, Cloudflare Pages, S3+CDN, etc.).
Before going live, replace the `[Insert …]` placeholders in the legal pages
and swap `usdtorm.example.com` in `astro.config.mjs` for your real domain.

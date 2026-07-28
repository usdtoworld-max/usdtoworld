// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://usdtoworld.com',
  integrations: [
    sitemap({
      filter: (page) =>
        !['503', 'offline', 'rate-limit', 'api-error'].some((slug) => page.includes(`/${slug}/`)),
      // @astrojs/sitemap mirrors Astro's directory-style build output
      // (dist/about/index.html), so by default it lists every URL with a
      // trailing slash (https://usdtoworld.com/about/). Every page's own
      // <link rel="canonical"> declares the NO-slash form instead
      // (https://usdtoworld.com/about), and wrangler.jsonc now sets
      // html_handling to "drop-trailing-slash" specifically so that
      // no-slash form is what the live host serves as 200 (the trailing
      // slash form 307s to it). So every URL in the sitemap was one
      // redirect hop away from its own canonical URL. Google's sitemap
      // guidelines are explicit that sitemap entries should be final
      // destination URLs, not URLs that redirect — this strips the
      // trailing slash here (except on the root) so the sitemap always
      // lists the exact URL that returns 200 with a matching canonical
      // tag, no hop required. See wrangler.jsonc for the corresponding
      // html_handling fix and full rationale.
      serialize(item) {
        if (item.url !== 'https://usdtoworld.com/' && item.url.endsWith('/')) {
          item.url = item.url.slice(0, -1);
        }
        return item;
      },
    }),
    // Runs gtag.js/GTM inside a web worker instead of the main thread.
    // Lighthouse traced Google Tag Manager at ~1.5s of main-thread CPU time
    // (1,009ms script evaluation + 500ms parse) on its own — a large chunk
    // of the page's 1,650ms Total Blocking Time. Partytown proxies the
    // script's DOM/API calls across a worker boundary so gtag.js still
    // works exactly the same (dataLayer, page views, events all still
    // fire), it just doesn't compete with the page's own JS for main-thread
    // time. See https://partytown.builder.io/google-tag-manager
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag'],
      },
    }),
  ],
  compressHTML: true,
});

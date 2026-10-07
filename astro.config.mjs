// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { transform } from 'esbuild';

// https://astro.build/config
export default defineConfig({
  site: 'https://usdtoworld.com',
  integrations: [
    sitemap({
      filter: (page) =>
        // All six error/utility pages are noindex by default (see
        // ErrorLayout.astro) — Google's own sitemap guidance says not to
        // list noindex URLs in a sitemap, since it's a contradictory
        // signal. This previously excluded only 4 of the 6 (missing '404'
        // and '500'), so those two were very likely being listed despite
        // being noindex.
        !['404', '500', '503', 'offline', 'rate-limit', 'api-error'].some((slug) => page.includes(`/${slug}/`)),
      // @astrojs/sitemap mirrors Astro's directory-style build output
      // (dist/about/index.html), so by default it lists every URL with a
      // trailing slash (https://usdtoworld.com/about/). Every page's own
      // <link rel="canonical"> declares the NO-slash form instead
      // (https://usdtoworld.com/about), and wrangler.toml now sets
      // html_handling to "drop-trailing-slash" specifically so that
      // no-slash form is what the live host serves as 200 (the trailing
      // slash form 307s to it). So every URL in the sitemap was one
      // redirect hop away from its own canonical URL. Google's sitemap
      // guidelines are explicit that sitemap entries should be final
      // destination URLs, not URLs that redirect — this strips the
      // trailing slash here (except on the root) so the sitemap always
      // lists the exact URL that returns 200 with a matching canonical
      // tag, no hop required. See wrangler.toml for the corresponding
      // html_handling fix and full rationale.
      serialize(item) {
        if (item.url !== 'https://usdtoworld.com/' && item.url.endsWith('/')) {
          item.url = item.url.slice(0, -1);
        }
        return item;
      },
    }),
    // Minifies plain JS/CSS files that Vite never touches because they live in
    // /public and are copied to dist as-is (the service worker, mainly).
    {
      name: 'minify-public-assets',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const root = fileURLToPath(dir);
          for (const file of await readdir(root)) {
            if (!/\.(js|css)$/.test(file)) continue;
            const full = join(root, file);
            const src = await readFile(full, 'utf8');
            const out = await transform(src, { loader: file.endsWith('.css') ? 'css' : 'js', minify: true, legalComments: 'none' });
            await writeFile(full, out.code);
          }
        },
      },
    },
  ],
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
  vite: { build: { minify: true, cssMinify: true } },
});

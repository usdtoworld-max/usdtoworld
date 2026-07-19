// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.usdtoworld.com',

  integrations: [
    sitemap({
      filter: (page) =>
        !['503', 'offline', 'rate-limit', 'api-error'].some((slug) => page.includes(`/${slug}/`)),
    }),
  ],

  compressHTML: true,
  adapter: cloudflare(),
});
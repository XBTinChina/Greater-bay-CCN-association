// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The GitHub Pages deploy workflow sets ASTRO_SITE and ASTRO_BASE from
// actions/configure-pages, so renaming the repository or moving it to an
// organisation (where the base becomes "/") needs no code change here.
// The defaults below match the repository's current location.
const site = process.env.ASTRO_SITE ?? 'https://xbtinchina.github.io';
const base = process.env.ASTRO_BASE ?? '/Greater-bay-CCN-association';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  integrations: [
    // Build-time only; no runtime dependency. Posters and the two redirect
    // stubs are left out of the sitemap.
    sitemap({
      filter: (page) => !/\/poster\/$/.test(page) && !/\/(tutorials|positions)\/$/.test(page),
    }),
  ],
});

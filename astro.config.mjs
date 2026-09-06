// @ts-check
import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { parse } from 'yaml';

// The /forms/ pages only do anything once submit_url is set in
// data/network.yml. Until then they say so and carry a noindex, so keep them
// out of the sitemap as well. Read here rather than through src/lib/network.ts,
// which the config cannot import.
const settings = parse(fs.readFileSync(new URL('./data/network.yml', import.meta.url), 'utf8')) ?? {};
const hasWebForm = String(settings.submit_url ?? '').trim() !== '';

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
    // Build-time only; no runtime dependency. Posters and the redirect stub
    // are left out of the sitemap.
    sitemap({
      filter: (page) =>
        !/\/poster\/$/.test(page) && !/\/tutorials\/$/.test(page) && (hasWebForm || !/\/forms\//.test(page)),
    }),
  ],
});

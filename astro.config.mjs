// @ts-check
import { defineConfig } from 'astro/config';

// The GitHub Pages deploy workflow sets ASTRO_SITE and ASTRO_BASE from
// actions/configure-pages, so renaming the repository or moving it to an
// organisation (where the base becomes "/") needs no code change here.
// The defaults below match the repository's current location.
const site = process.env.ASTRO_SITE ?? 'https://xbtinchina.github.io';
const base = process.env.ASTRO_BASE ?? '/Great-bay-CCN-association';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});

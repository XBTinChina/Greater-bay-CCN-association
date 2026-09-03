// Brand assets produced by scripts/brand.mjs from brand/logo.png. Until that
// script has run, every entry is undefined and the pages fall back to the
// built-in mark. Resolved at build time by Vite, so the URLs carry the base
// path and a content hash.
const files = import.meta.glob('../assets/brand/*.png', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

const get = (name: string) => files[`../assets/brand/${name}`];

export const brand = {
  /** Square icon for the header and favicons, dark artwork on transparent. */
  mark: get('mark.png'),
  /** The same icon recoloured for dark backgrounds. */
  markLight: get('mark-light.png'),
  /** The full lockup: icon, wordmark and names. */
  lockup: get('lockup.png'),
  lockupLight: get('lockup-light.png'),
};

export const hasBrand = Boolean(brand.mark);

// Every internal link goes through url() so the site works both under a
// project path (https://<user>.github.io/<repo>/) and at an origin root.

const rawBase = import.meta.env.BASE_URL || '/';
export const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

/** Site-relative URL with the deployment base prefixed. url('labs/') → '/<base>/labs/'. */
export function url(path = ''): string {
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/** Absolute URL, for calendar feeds, posters and social cards. */
export function absolute(path = ''): string {
  const site = import.meta.env.SITE || 'http://localhost:4321';
  return new URL(url(path), site).href;
}

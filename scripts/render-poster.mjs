#!/usr/bin/env node
// Screenshot a built poster page into a PNG.
//
//   node scripts/render-poster.mjs dist/events/<id>/poster/index.html out/poster-<id>.png
//
// Playwright is not a project dependency; the Render poster workflow installs
// it for the run with:
//   npm install --no-save --no-package-lock playwright@1.58.2
//   npx playwright install --with-deps chromium
// The poster page is fixed at 1080 x 1350 CSS pixels; the screenshot is taken
// at device scale 2, so the PNG is 2160 x 2700.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: node scripts/render-poster.mjs <poster/index.html> <output.png>');
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed. Run: npm install --no-save --no-package-lock playwright@1.58.2 && npx playwright install --with-deps chromium');
  process.exit(2);
}

await fs.access(input).catch(() => {
  console.error(`No such file: ${input}`);
  process.exit(1);
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.resolve(input)).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const poster = page.locator('.poster');
  await poster.waitFor({ state: 'visible' });
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await poster.screenshot({ path: output, type: 'png' });
  console.log(`Wrote ${output}`);
} finally {
  await browser.close();
}

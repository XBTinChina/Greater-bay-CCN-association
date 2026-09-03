#!/usr/bin/env node
// Turn the logo into every asset the site needs.
//
//   node scripts/brand.mjs [brand/logo.png]
//
// Input: the full lockup as delivered (icon above the wordmark and names),
// dark artwork on a white background. Output:
//   src/assets/brand/lockup.png        trimmed lockup, white made transparent
//   src/assets/brand/lockup-light.png  the same with dark strokes turned light, for dark backgrounds
//   src/assets/brand/mark.png          square crop of the icon alone, transparent
//   src/assets/brand/mark-light.png    light variant of the mark
//   public/favicon.png                 64 px, white background
//   public/apple-touch-icon.png        180 px, white background
//   public/og.png                      1200 x 630 sharing image with the lockup
// Re-run whenever the logo changes. Nothing else needs editing: the pages
// pick the files up at build time (src/lib/brand.ts).

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const input = path.resolve(process.argv[2] ?? path.join(ROOT, 'brand', 'logo.png'));
const ASSETS = path.join(ROOT, 'src', 'assets', 'brand');
const PUBLIC = path.join(ROOT, 'public');
const PAPER = { r: 251, g: 250, b: 247 };
const LIGHT_INK = { r: 235, g: 233, b: 227 };

await fs.access(input).catch(() => {
  console.error(`No logo at ${input}. Save the logo there (a PNG, dark artwork on white) and run again.`);
  process.exit(1);
});
await fs.mkdir(ASSETS, { recursive: true });

// 1. Trim the white margins.
const trimmed = await sharp(input).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).png().toBuffer();

/** White to transparent. Dark, saturated pixels stay opaque; anti-aliased edges fade. */
async function transparent(buffer, { light = false } = {}) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const alpha = Math.max(0, Math.min(255, Math.round((255 - min) * 1.4)));
    let [nr, ng, nb] = [r, g, b];
    if (alpha > 0) {
      // Undo the white blend so faded edges keep the stroke colour rather than turning grey.
      const a = alpha / 255;
      nr = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - a)) / a)));
      ng = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - a)) / a)));
      nb = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - a)) / a)));
      // Light variant: dark strokes (the navy) become paper-coloured; the coloured nodes stay.
      if (light && Math.max(nr, ng, nb) < 120) [nr, ng, nb] = [LIGHT_INK.r, LIGHT_INK.g, LIGHT_INK.b];
    }
    out[i] = nr;
    out[i + 1] = ng;
    out[i + 2] = nb;
    out[i + 3] = alpha;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// 2. Find the icon: the ink above the first wide horizontal gap below the top of the artwork.
const { data: gray, info: gi } = await sharp(trimmed).grayscale().raw().toBuffer({ resolveWithObject: true });
const rowInk = new Array(gi.height).fill(0);
for (let y = 0; y < gi.height; y += 1) {
  for (let x = 0; x < gi.width; x += 1) if (gray[y * gi.width + x] < 200) rowInk[y] += 1;
}
let iconEnd = gi.height;
let seenInk = false;
let gap = 0;
for (let y = 0; y < gi.height; y += 1) {
  if (rowInk[y] > 0) {
    if (seenInk && gap >= Math.round(gi.height * 0.03)) {
      iconEnd = y - gap;
      break;
    }
    seenInk = true;
    gap = 0;
  } else if (seenInk) {
    gap += 1;
  }
}
let left = gi.width;
let right = 0;
let top = gi.height;
let bottom = 0;
for (let y = 0; y < iconEnd; y += 1) {
  for (let x = 0; x < gi.width; x += 1) {
    if (gray[y * gi.width + x] < 200) {
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
}
const iconW = right - left + 1;
const iconH = bottom - top + 1;
const side = Math.round(Math.max(iconW, iconH) * 1.12);
const cx = Math.round((left + right) / 2);
const cy = Math.round((top + bottom) / 2);
const squareLeft = Math.max(0, Math.min(gi.width - side, cx - Math.round(side / 2)));
const squareTop = Math.max(0, Math.min(gi.height - side, cy - Math.round(side / 2)));
const sideClamped = Math.min(side, gi.width - squareLeft, gi.height - squareTop);

const iconSquare = await sharp(trimmed)
  .extract({ left: squareLeft, top: squareTop, width: sideClamped, height: sideClamped })
  .png()
  .toBuffer();

// 3. Write the assets.
const lockup = await transparent(trimmed);
const lockupLight = await transparent(trimmed, { light: true });
const mark = await transparent(iconSquare);
const markLight = await transparent(iconSquare, { light: true });

await sharp(lockup).resize({ width: 1600, withoutEnlargement: true }).png().toFile(path.join(ASSETS, 'lockup.png'));
await sharp(lockupLight).resize({ width: 1600, withoutEnlargement: true }).png().toFile(path.join(ASSETS, 'lockup-light.png'));
await sharp(mark).resize(512, 512).png().toFile(path.join(ASSETS, 'mark.png'));
await sharp(markLight).resize(512, 512).png().toFile(path.join(ASSETS, 'mark-light.png'));

await sharp(iconSquare).resize(64, 64).png().toFile(path.join(PUBLIC, 'favicon.png'));
await sharp(iconSquare).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));

// 4. Sharing image: the lockup centred on paper.
const lockupMeta = await sharp(lockup).metadata();
const targetW = 820;
const targetH = Math.round((lockupMeta.height / lockupMeta.width) * targetW);
const fitted = await sharp(lockup)
  .resize(targetH > 540 ? { height: 540 } : { width: targetW })
  .png()
  .toBuffer();
const fm = await sharp(fitted).metadata();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: { ...PAPER, alpha: 1 } } })
  .composite([{ input: fitted, left: Math.round((1200 - fm.width) / 2), top: Math.round((630 - fm.height) / 2) }])
  .png()
  .toFile(path.join(PUBLIC, 'og.png'));

console.log(
  [
    `icon detected at x ${left}-${right}, y ${top}-${bottom} of ${gi.width}x${gi.height} (trimmed)`,
    'wrote src/assets/brand/{lockup,lockup-light,mark,mark-light}.png',
    'wrote public/favicon.png, public/apple-touch-icon.png, public/og.png',
  ].join('\n'),
);

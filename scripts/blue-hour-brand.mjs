// Generate raster fallbacks and the sharing card from the current vector identity.
// Runs before every production build; all artwork and fonts are local.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const icon = await fs.readFile(path.join(publicDir, 'logo.svg'));
const network = parse(await fs.readFile(path.join(root, 'data/network.yml'), 'utf8'));
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const wrap = (text, width) => {
  const lines = [''];
  for (const word of text.split(/\s+/)) {
    if (lines.at(-1).length && `${lines.at(-1)} ${word}`.length > width) lines.push(word);
    else lines[lines.length - 1] += `${lines.at(-1) ? ' ' : ''}${word}`;
  }
  return lines;
};
const name = wrap(network.name, 34);
const tagline = wrap(network.tagline, 65);
const textLines = (lines, y, step) => lines.map((line, i) => `<tspan x="64" y="${y + i * step}">${escape(line)}</tspan>`).join('');
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#30286e"/>
  <path d="M1040 0H1200V630H930C1040 470 1130 340 1010 220S950 60 1040 0Z" fill="#8583f5"/>
  <g fill="none" stroke="#bdf4c9" stroke-width="3" opacity=".7">
    <path d="M1100 -20C920 130 1190 200 1130 340S970 490 1040 650"/>
    <path d="M1150 -20C970 130 1240 200 1180 340S1020 490 1090 650"/>
  </g>
  <text x="64" y="82" fill="#bdf4c9" font-size="30" font-weight="700" font-family="Arial,DejaVu Sans,sans-serif">${escape(network.short_name)}</text>
  <text fill="#f1eeff" font-size="50" font-weight="700" letter-spacing="-1" font-family="Arial,DejaVu Sans,sans-serif">${textLines(name, 180, 60)}</text>
  <text fill="#dedaff" font-size="25" font-family="Arial,DejaVu Sans,sans-serif">${textLines(tagline, 420, 35)}</text>
  <rect x="64" y="569" width="80" height="5" fill="#bdf4c9"/>
  <rect x="152" y="569" width="40" height="5" fill="#ffc4ad"/>
</svg>`;

await fs.writeFile(path.join(publicDir, 'favicon.svg'), icon);
await sharp(icon).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.png'));
await sharp(icon).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
await sharp(Buffer.from(card)).png().toFile(path.join(publicDir, 'og.png'));
console.log('Built Blue Hour favicon, touch icon and sharing card.');

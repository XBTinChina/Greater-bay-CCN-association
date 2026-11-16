// Generate web-sized logos, favicons and the sharing card from the current identity.
// Runs before every production build; all artwork and fonts are local.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse } from 'yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const sourceIcon = await fs.readFile(path.join(root, 'src/assets/brand/network-mark.png'));
const icon = await sharp(sourceIcon).resize(256, 256, { fit: 'contain', background: '#00000000' }).png().toBuffer();
const svgIcon = (png, size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>GBA-CCN neural machine</title><image width="${size}" height="${size}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
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
  <rect width="1200" height="630" fill="#eee4ff"/>
  <path d="M1040 0H1200V630H930C1040 470 1130 340 1010 220S950 60 1040 0Z" fill="#6a32ed"/>
  <g fill="none" stroke="#dafb50" stroke-width="3" opacity=".7">
    <path d="M1100 -20C920 130 1190 200 1130 340S970 490 1040 650"/>
    <path d="M1150 -20C970 130 1240 200 1180 340S1020 490 1090 650"/>
  </g>
  <text x="64" y="82" fill="#6a32ed" font-size="30" font-weight="700" font-family="Arial,DejaVu Sans,sans-serif">${escape(network.short_name)}</text>
  <text fill="#291333" font-size="50" font-weight="700" letter-spacing="-1" font-family="Arial,DejaVu Sans,sans-serif">${textLines(name, 180, 60)}</text>
  <text fill="#5f476e" font-size="25" font-family="Arial,DejaVu Sans,sans-serif">${textLines(tagline, 420, 35)}</text>
  <rect x="64" y="569" width="80" height="5" fill="#6a32ed"/>
  <rect x="152" y="569" width="40" height="5" fill="#ff7366"/>
</svg>`;

await fs.writeFile(path.join(publicDir, 'logo.png'), icon);
await fs.writeFile(path.join(publicDir, 'logo.svg'), svgIcon(icon, 256));
const favicon = await sharp(sourceIcon).resize(64, 64).png().toBuffer();
await fs.writeFile(path.join(publicDir, 'favicon.svg'), svgIcon(favicon, 64));
await fs.writeFile(path.join(publicDir, 'favicon.png'), favicon);
await sharp(icon).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
await sharp(Buffer.from(card)).png().toFile(path.join(publicDir, 'og.png'));
console.log('Built neural-machine logo, favicon, touch icon and sharing card.');

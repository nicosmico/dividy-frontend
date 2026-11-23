// Generates the PWA icons in public/ from public/favicon.svg.
//   PW_CHROMIUM_PATH=/path/to/chrome node scripts/generate-icons.mjs
// Uses Playwright (already a dev dependency) to screenshot the SVG, so there
// is no extra image library. Output is committed; run it only if the logo changes.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const publicDir = new URL('../public/', import.meta.url);
const source = readFileSync(new URL('favicon.svg', publicDir), 'utf8');

/** Same logo without rounded corners (the favicon's rx="9"): launchers and iOS apply their own mask. */
const fullBleed = source.replace(' rx="9"', '');

const icons = [
  // "any" icons keep the rounded corners of the favicon.
  { file: 'icon-192.png', size: 192, svg: source, transparent: true },
  { file: 'icon-512.png', size: 512, svg: source, transparent: true },
  // Maskable: full-bleed, glyph well inside the 80 % safe zone.
  { file: 'icon-maskable-512.png', size: 512, svg: fullBleed },
  // iOS does not support transparency: full-bleed too.
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
try {
  for (const { file, size, svg, transparent } of icons) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    });
    const markup = svg.replace(
      '<svg ',
      `<svg width="${size}" height="${size}" `
    );
    await page.setContent(
      `<body style="margin:0;background:transparent">${markup}</body>`
    );
    const png = await page.screenshot({ omitBackground: Boolean(transparent) });
    writeFileSync(fileURLToPath(new URL(file, publicDir)), png);
    await page.close();
    console.log(`public/${file} (${size}x${size})`);
  }
} finally {
  await browser.close();
}

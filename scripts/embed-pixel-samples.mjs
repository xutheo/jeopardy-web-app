import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Use the same browser image compression as the question editor. Originals stay intact.
const files = ['qoobee.jpg', 'piplup.png', 'jackolantern.png', 'space-needle.jpeg', 'mount-rainier.jpg'];
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge' });
try {
  const page = await browser.newPage();
  const images = [];
  for (const file of files) {
    const source = await readFile(new URL('../images-for-qb-questions/' + file, import.meta.url));
    const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const image = await page.evaluate(async ({ source, mime }) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:${mime};base64,${source}`)).blob());
      try {
        const canvas = document.createElement('canvas');
        let edge = 1280, data;
        do {
          const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          data = canvas.toDataURL('image/webp', 0.8);
          edge *= 0.75;
        } while (data.length > 180000 && edge > 120);
        if (data.length > 180000) throw new Error('Sample image exceeds the upload limit.');
        return data;
      } finally { bitmap.close(); }
    }, { source: source.toString('base64'), mime });
    images.push(image);
    console.log(`${file}: ${image.length} characters`);
  }
  await writeFile(new URL('../shared/sample-pixel-images.ts', import.meta.url),
    '// Embedded from images-for-qb-questions by scripts/embed-pixel-samples.mjs.\n' +
    'export const pixelSampleImages = ' + JSON.stringify(images) + ';\n');
} finally { await browser.close(); }

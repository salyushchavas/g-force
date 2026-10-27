// Bake once through the dev server; ship the compact, already-filtered light atlas.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const { chromium } = await import(process.env.GFORCE_BROWSER_MODULE ?? 'playwright');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(process.env.GFORCE_REVIEW_URL ?? 'http://127.0.0.1:4321');
  const result = await page.evaluate(async () => {
    const { bakeGlassEnvironment } = await import('/scripts/glass-environment.ts');
    return bakeGlassEnvironment();
  });
  const out = fileURLToPath(new URL('../public/3d/glass-light-v2', import.meta.url));
  await sharp(Buffer.from(result.png, 'base64')).png({ compressionLevel: 9 }).toFile(`${out}.png`);
  await writeFile(`${out}.json`, JSON.stringify({ width: result.width, height: result.height, range: result.range }));
  console.log(`Baked ${result.width}×${result.height} prefiltered environment.`);
} finally {
  await browser.close();
}

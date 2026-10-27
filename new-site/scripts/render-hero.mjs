// Render posters from the same scene as the live hero. Requires a running Astro dev server,
// Playwright and sharp. Example: GFORCE_BROWSER_MODULE=/tmp/gforce-browser/node_modules/playwright/index.mjs node scripts/render-hero.mjs
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const { chromium } = await import(process.env.GFORCE_BROWSER_MODULE ?? 'playwright');
const base = process.env.GFORCE_REVIEW_URL ?? 'http://127.0.0.1:4321';
const root = fileURLToPath(new URL('../public/3d/', import.meta.url));
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal'] });
try {
  for (const frame of [
    { name: '2560', width: 2798, height: 1749, phone: false },
    { name: '1600', width: 1749, height: 1093, phone: false },
    { name: '1280', width: 1399, height: 874, phone: false },
    { name: 'mobile', width: 390, height: 844, phone: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: frame.width, height: frame.height },
      isMobile: frame.phone, hasTouch: frame.phone,
      deviceScaleFactor: frame.phone ? 2 : 1, reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      document.body.innerHTML = '<canvas id="poster"></canvas>';
      document.body.style.cssText = 'margin:0;overflow:hidden';
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      const canvas = document.querySelector('canvas');
      canvas.style.cssText = 'display:block;width:100vw;height:100vh';
      const { mountGlassName } = await import('/src/scripts/glass-name.ts');
      const { heroScene } = await import('/src/lib/hero-scene.ts');
      window.posterScene = await mountGlassName(canvas, { ...heroScene(innerWidth), still: true, poster: true });
    });
    const raw = await page.locator('#poster').screenshot({ omitBackground: true });
    // Render at the live viewport aspect first, then crop the transparent art frame.
    // Rendering in a short strip changes the refracted sky and makes the handoff jump.
    const pixelRatio = frame.phone ? 2 : 1;
    const cropWidth = Math.round(frame.width * (frame.phone ? 1 : .86 / .94) * pixelRatio);
    const cropHeight = Math.round(cropWidth / 4.4);
    const crop = {
      left: Math.round((frame.width * pixelRatio - cropWidth) / 2),
      top: Math.round(frame.height * pixelRatio * (frame.phone ? .56 : .62) - cropHeight / 2),
      width: cropWidth,
      height: cropHeight,
    };
    const stem = `${root}hero-poster-original-${frame.name}`;
    await sharp(raw).extract(crop).webp({ quality: 92, alphaQuality: 100 }).toFile(`${stem}.webp`);
    await sharp(raw).extract(crop).avif({ quality: 76, effort: 6 }).toFile(`${stem}.avif`);
    console.log(`Rendered ${frame.name}`);
    await context.close();
  }
} finally {
  await browser.close();
}

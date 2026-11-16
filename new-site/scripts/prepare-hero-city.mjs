// Bakes the red-skin hero skyline crops (public/media/img/hero-city-*) onto the brand red: tone 0 is exactly the
// brand red, brighter tones are tints of it toward white (the city glow and lights).
// Source: Unsplash KJWcpt41ayw, "Toronto's skyline shines at night over the water" (12317 x 6928 original).
// usage: node scripts/prepare-hero-city.mjs <original.jpg> <#rrggbb, the --brand-red in skin-white-red.css>
import sharp from 'sharp';
const [src, hex] = process.argv.slice(2);
if (!src || !/^#[0-9a-f]{6}$/i.test(hex ?? '')) throw new Error('usage: prepare-hero-city.mjs <original.jpg> <#rrggbb>');
const RED = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const out = new URL('../public/media/img/', import.meta.url).pathname;
sharp.cache(false);
const { width: W, height: H } = await sharp(src).metadata();
const towerX = 0.495 * W, tipY = 0.27 * H, waterY = 0.69 * H, span = waterY - tipY;
// Desktop: 1.2:1, tower tip at 18% and waterline at 92% of the crop. Phones: 2.4:1, tip at 25%, tower centred.
const dH = span / 0.74, dW = dH * 1.2;
const desk = { left: Math.round(towerX - 0.55 * dW), top: Math.round(tipY - 0.18 * dH), width: Math.round(dW), height: Math.round(dH) };
const mH = span / 0.67, mW = mH * 2.4;
const mob = { left: Math.round(towerX - 0.5 * mW), top: Math.round(tipY - 0.25 * mH), width: Math.round(mW), height: Math.round(mH) };
const lut = (pts) => Array.from({ length: 256 }, (_, i) => { const x = (i / 255) * (pts.length - 1); const k = Math.min(pts.length - 2, Math.floor(x)); return pts[k] + (pts[k + 1] - pts[k]) * (x - k); });
const tone = lut([0, 0, 0.08, 0.42, 0.78, 1]);
// Tone to white fraction: the sky stays close to the brand red, buildings and lights rise toward white.
const P = [[0, 0], [0.1, 0.08], [0.35, 0.45], [1, 1]];
const toWhite = (v) => { let k = 0; while (k < P.length - 2 && v > P[k + 1][0]) k++; const [a, wa] = P[k], [b, wb] = P[k + 1]; return wa + (wb - wa) * Math.min(1, Math.max(0, (v - a) / (b - a))); };
const map = tone.map((v) => RED.map((c) => Math.round(c + (255 - c) * toWhite(v))));
async function bake(crop, width) {
  const { data, info } = await sharp(src).extract(crop).resize(width).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgb = Buffer.alloc(data.length * 3);
  for (let i = 0; i < data.length; i++) rgb.set(map[data[i]], i * 3);
  return sharp(rgb, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
for (const [crop, name, widths] of [[desk, 'hero-city', [800, 1400, 2000]], [mob, 'hero-city-wide', [800, 1200]]]) {
  for (const w of widths) {
    const buf = await bake(crop, w);
    await sharp(buf).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toFile(`${out}${name}-${w}.avif`);
    await sharp(buf).webp({ quality: 78, smartSubsample: true }).toFile(`${out}${name}-${w}.webp`);
    await sharp(buf).jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(`${out}${name}-${w}.jpg`);
  }
}
console.log(`baked hero-city crops onto ${hex}`);

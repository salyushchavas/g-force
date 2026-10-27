// Regenerate the sharing image and structured-data logo from the supplied artwork.
// Uses the same licensed cloud photo as the site's hero. No substituted lettering.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const asset = (path) => fileURLToPath(new URL(`../public/${path}`, import.meta.url));
const logo = await sharp(asset('brand/gforce-original.png')).resize({ width: 1104 }).toBuffer();
const logoMeta = await sharp(logo).metadata();
const crimson = Buffer.from(`<svg width="1200" height="240" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="brand"><stop stop-color="#cb1f45"/><stop offset="1" stop-color="#89001e"/></linearGradient></defs><rect width="1200" height="240" fill="url(#brand)"/></svg>`);
await sharp(crimson)
  .composite([{ input: logo, left: 48, top: Math.round((240 - logoMeta.height) / 2) }])
  .png().toFile(asset('brand/logo-schema.png'));

const cloud = await sharp(asset('media/img/svc-cloud-backup-air-loop-poster.webp'))
  .resize(1200, 630, { fit: 'cover' }).toBuffer();
const veil = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dawn" x2="0" y2="1"><stop stop-color="#b3d4e7" stop-opacity=".35"/><stop offset="1" stop-color="#f5d6a2" stop-opacity=".85"/></linearGradient></defs><rect width="1200" height="630" fill="url(#dawn)"/></svg>`);
const plaque = await sharp(asset('brand/logo-schema.png')).resize(1040, 208).toBuffer();
const caption = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><text x="600" y="450" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="600" fill="#1b1b1b">Dependable IT support. Practical IT training.</text><text x="600" y="502" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="24" fill="#37414d">Toronto · gforceit.ca</text></svg>`);
await sharp(cloud)
  .composite([{ input: veil }, { input: plaque, left: 80, top: 130 }, { input: caption }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(asset('og/og-default.jpg'));
console.log('Prepared original-brand social image (1200×630) and schema logo (1200×240).');

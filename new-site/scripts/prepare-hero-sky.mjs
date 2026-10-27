// Prepare the licensed cloud photograph once rather than filtering a full-screen layer on every visit.
// Uses the same source and credits as svc-cloud-backup-air-loop-poster (MEDIA_LICENSES-air.md).
import sharp from 'sharp';
const directory = new URL('../public/media/img/', import.meta.url);
const source = new URL('svc-cloud-backup-air-loop-poster.webp', directory).pathname;
const sky = sharp(source).grayscale().linear(1.6, -76.5);
await sky.clone().webp({ quality: 88 }).toFile(new URL('hero-cloud-contrast.webp', directory).pathname);
await sky.clone().avif({ quality: 68, effort: 6 }).toFile(new URL('hero-cloud-contrast.avif', directory).pathname);

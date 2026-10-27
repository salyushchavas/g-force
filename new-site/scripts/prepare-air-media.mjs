// Reproduce the Air media pass from downloaded, licensed originals (see MEDIA_LICENSES-air.md).
// GFORCE_FFMPEG=/path/to/ffmpeg GFORCE_MEDIA_SOURCE_DIR=/path/to/originals node scripts/prepare-air-media.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const originals = process.env.GFORCE_MEDIA_SOURCE_DIR;
const ffmpeg = process.env.GFORCE_FFMPEG ?? 'ffmpeg';
const filmsOnly = process.env.GFORCE_MEDIA_ONLY === 'video';
if (!originals) throw new Error('Set GFORCE_MEDIA_SOURCE_DIR to the downloaded originals directory.');
await mkdir(`${root}public/media/img`, { recursive: true });
await mkdir(`${root}public/media/video`, { recursive: true });
const base = JSON.parse(await readFile(`${root}src/data/media.json`, 'utf8'));
const result = filmsOnly
  ? JSON.parse(await readFile(`${root}src/data/media-air.json`, 'utf8')).filter(entry => entry.kind === 'image' && !['blog-choose-training', 'blog-cyber-career'].includes(entry.slot))
  : [];
const credit = (author, page) => ({ author, source: 'Pexels', page_url: page, license: 'Pexels License', license_url: 'https://www.pexels.com/license/' });

for (const photo of filmsOnly ? [] : [
  { slot: 'blog-future-jobs', file: 'future.jpg', title: 'A developer at her desk beside a city-facing window', author: 'Christina Morillo', page: 'https://www.pexels.com/photo/woman-sitting-while-operating-macbook-pro-1181676/' },
  { slot: 'blog-ai-automation', file: 'ai.jpg', title: 'Hands-on Python study on a laptop', author: 'Christina Morillo', page: 'https://www.pexels.com/photo/woman-programming-on-a-notebook-1181359/' },
  { slot: 'case-accounting', file: 'accounting.jpg', title: 'Illustrative accounting desk with calculator and paperwork', author: 'Kaboompics', page: 'https://www.pexels.com/photo/bookkeeper-writing-down-on-paper-while-using-calculator-4476378/' },
  { slot: 'case-clinic', file: 'clinic.jpg', title: 'Illustrative dental practice with an empty treatment chair', author: 'Pavel Danilyuk', page: 'https://www.pexels.com/photo/empty-dentist-office-6812461/' },
  { slot: 'case-manufacturing', file: 'factory.jpg', title: 'Illustrative production-line machinery in a factory', author: 'Vladimir Srajber', page: 'https://www.pexels.com/photo/machinery-in-factory-18631420/' },
]) {
  const srcset = { avif: [], webp: [], jpg: [] };
  for (const width of [640, 1280, 1920]) {
    const image = sharp(`${originals}/${photo.file}`).rotate().resize(width, Math.round(width * 9 / 16), { fit: 'cover', position: 'centre', withoutEnlargement: true });
    const stem = `/media/img/${photo.slot}-air-${width}`;
    for (const [ext, encode] of Object.entries({ avif: { quality: 55, effort: 5 }, webp: { quality: 80 }, jpg: { quality: 84, mozjpeg: true } })) {
      const file = `${stem}.${ext}`;
      const format = ext === 'jpg' ? 'jpeg' : ext;
      await image.clone().toFormat(format, encode).toFile(`${root}public${file}`);
      srcset[ext].push(file);
    }
  }
  result.push({ slot: photo.slot, kind: 'image', title: photo.title, width: 1920, height: 1080, sources: { srcset }, credit: credit(photo.author, photo.page) });
  console.log(`Prepared ${photo.slot}`);
}

for (const film of [
  { slot: 'svc-cloud-backup', file: `${originals}/sky.mp4`, title: 'White clouds crossing a bright blue daytime sky', author: 'Alexander Lutkov', page: 'https://www.pexels.com/video/blue-sky-with-white-clouds-timelapse-mode-1860175/', lift: 0 },
  { slot: 'svc-consulting', file: `${originals}/consulting-bright.mp4`, title: 'A small team discussing a project around a table in daylight', author: 'fauxels', page: 'https://www.pexels.com/video/group-of-people-having-business-meeting-in-office-space-3255321/', lift: 0.025 },
  { slot: 'svc-cybersecurity', file: `${originals}/security-bright.mp4`, title: 'A laptop workspace in a bright office overlooking the city', author: 'cottonbro studio', page: 'https://www.pexels.com/video/a-man-using-laptop-in-the-office-5483214/', lift: 0.015, position: '66% 50%' },
  { slot: 'svc-managed-it', file: `${root}public/media/video/svc-managed-it-960.mp4`, title: 'A technician seating a network lead in a labelled patch panel', lift: 0.035 },
]) {
  const stem = `/media/video/${film.slot}-air-loop-960`;
  const mp4 = `${root}public${stem}.mp4`;
  // The tail dissolves into the head, then the first frame resumes the same point: no hard loop cut.
  // Finish the dissolve one frame before the endpoint: the final 0.56s head frame then advances naturally
  // into the loop's first 0.60s frame, with no residual tail image flashing at the join.
  const filter = `[0:v]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=25,eq=brightness=${film.lift}:gamma=1.04,split=2[a][b];[a]trim=start=0.6:end=8,setpts=PTS-STARTPTS[body];[b]trim=start=0:end=0.6,setpts=PTS-STARTPTS[head];[body][head]xfade=transition=fade:duration=0.56:offset=6.8,format=yuv420p[v]`;
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', film.file, '-filter_complex', filter, '-map', '[v]', '-an', '-t', '7.4', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', mp4]);
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-cpu-used', '4', '-row-mt', '1', `${root}public${stem}.webm`]);
  const { stdout: poster } = await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp4, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
  const posters = {};
  for (const [ext, options] of Object.entries({ avif: { quality: 60 }, webp: { quality: 82 }, jpg: { quality: 88 } })) {
    const file = `/media/img/${film.slot}-air-loop-poster.${ext}`;
    await sharp(poster).toFormat(ext === 'jpg' ? 'jpeg' : ext, options).toFile(`${root}public${file}`);
    posters[ext] = file;
  }
  const old = base.find(entry => entry.slot === film.slot);
  result.push({ slot: film.slot, kind: 'video', title: film.title, width: 960, height: 540, duration: 7.4, objectPosition: film.position ?? '50% 50%', sources: { mp4: `${stem}.mp4`, webm: `${stem}.webm`, mp4Mobile: `${stem}.mp4`, poster: posters }, credit: film.author ? credit(film.author, film.page) : old.credit });
  console.log(`Prepared ${film.slot}`);
}

const classroom = base.find(entry => entry.slot === 'img-classroom');
result.push({ ...classroom, slot: 'blog-choose-training' });
const network = result.find(entry => entry.slot === 'svc-managed-it');
result.push({ slot: 'blog-cyber-career', kind: 'image', title: 'Network patch leads connecting office systems', width: 960, height: 540, sources: { poster: network.sources.poster }, credit: network.credit });
const clouds = result.find(entry => entry.slot === 'svc-cloud-backup');
result.push({ ...clouds, slot: 'sky-daylight' });
await writeFile(`${root}src/data/media-air.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${result.length} Air manifest entries.`);

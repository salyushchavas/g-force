// GFORCE_FFMPEG=/path/to/ffmpeg node scripts/prepare-video-clips.mjs
// Produces the short, silent single-play films served by Video.astro. Original
// licensed files stay intact. Source overrides and credits live beside this script.
import {
  readFile,
  writeFile,
  stat,
  access,
  mkdir,
  unlink,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const ffmpeg = process.env.GFORCE_FFMPEG || "ffmpeg";
const base = JSON.parse(
  await readFile(new URL("src/data/media.json", root), "utf8"),
);
const air = JSON.parse(
  await readFile(new URL("src/data/media-air.json", root), "utf8"),
);
const entries = new Map([...base, ...air].map((entry) => [entry.slot, entry]));
const overrides = JSON.parse(
  await readFile(new URL("scripts/video-clip-sources.json", root), "utf8"),
);
const result = [];
const sizes = [];
for (const entry of entries.values()) {
  if (entry.kind !== "video" || !entry.sources?.mp4) continue;
  const override = overrides.find((item) => item.slot === entry.slot);
  if (override?.omit) continue;
  let input = override?.input
    ? new URL(override.input, root).pathname
    : new URL(`public${entry.sources.mp4}`, root).pathname;
  if (override?.downloadUrl) {
    const originals =
      process.env.GFORCE_VIDEO_SOURCE_DIR ||
      join(tmpdir(), "gforce-licensed-video-sources");
    await mkdir(originals, { recursive: true });
    input = join(originals, `${entry.slot}-original.mp4`);
    try {
      await access(input);
    } catch {
      const response = await fetch(override.downloadUrl);
      if (!response.ok)
        throw new Error(
          `Source download failed (${response.status}): ${override.downloadUrl}`,
        );
      await writeFile(input, Buffer.from(await response.arrayBuffer()));
    }
  }
  await access(input);
  const duration = Math.min(4.5, override?.duration || 4);
  const start = override?.start || 0;
  const stem = `/media/video/${entry.slot}-brief`;
  const files = {};
  for (const [name, width, crf, maxrate] of [
    ["desktop", 960, "27", "460k"],
    ["mobile", 640, "28", "250k"],
  ]) {
    const height = (width * 9) / 16;
    const path = `${stem}-${width}.mp4`;
    await run(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(start),
      "-i",
      input,
      "-an",
      "-t",
      String(duration),
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=24${override?.filter ? `,${override.filter}` : ""}`,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      crf,
      "-maxrate",
      maxrate,
      "-bufsize",
      name === "desktop" ? "920k" : "500k",
      "-profile:v",
      "main",
      "-level",
      "3.1",
      "-pix_fmt",
      "yuv420p",
      "-g",
      "48",
      "-movflags",
      "+faststart",
      new URL(`public${path}`, root).pathname,
    ]);
    files[name] = path;
  }
  const posterStem = `/media/img/${entry.slot}-brief-poster`;
  const { stdout } = await run(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      new URL(`public${files.desktop}`, root).pathname,
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-",
    ],
    { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 },
  );
  const poster = {};
  for (const [ext, quality] of [
    ["avif", 58],
    ["webp", 80],
    ["jpg", 84],
  ]) {
    poster[ext] = `${posterStem}.${ext}`;
    await sharp(stdout)
      .toFormat(ext === "jpg" ? "jpeg" : ext, { quality })
      .toFile(new URL(`public${poster[ext]}`, root).pathname);
  }
  const clip = {
    ...entry,
    title: override?.title || entry.title,
    width: 960,
    height: 540,
    duration,
    objectPosition: override?.objectPosition || entry.objectPosition,
    sources: { mp4: files.desktop, mp4Mobile: files.mobile, poster },
    credit: override?.credit || entry.credit,
  };
  result.push(clip);
  sizes.push({
    slot: entry.slot,
    duration,
    desktop: (await stat(new URL(`public${files.desktop}`, root))).size,
    mobile: (await stat(new URL(`public${files.mobile}`, root))).size,
  });
  console.log(
    `${entry.slot}: ${duration}s, desktop ${Math.round(sizes.at(-1).desktop / 1024)} KiB, mobile ${Math.round(sizes.at(-1).mobile / 1024)} KiB`,
  );
}
await writeFile(
  new URL("src/data/media-clips.json", root),
  JSON.stringify(result, null, 2) + "\n",
);
// Retire the earlier mobile-only override so it cannot replace the brief clips.
await unlink(new URL("src/data/media-mobile.json", root)).catch((error) => {
  if (error.code !== "ENOENT") throw error;
});
await writeFile(
  new URL("review/2026-10-23/production-media-clips-sizes.json", root),
  JSON.stringify(sizes, null, 2) + "\n",
);

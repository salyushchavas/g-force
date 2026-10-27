// Reads the media manifests produced by the media pipeline (src/data/media*.json, credits in MEDIA_LICENSES*.md).
// Components degrade gracefully when a slot is missing, so the site builds before media lands.
const manifests = import.meta.glob<unknown>('../data/media*.json', { eager: true, import: 'default' });
// Load the original manifest first, then named art-direction manifests. Later entries replace a slot:
// adding media-air.json must not silently leave the old dark footage in place.
const manifest = Object.entries(manifests)
  .sort(([a], [b]) => a.endsWith('/media.json') ? -1 : b.endsWith('/media.json') ? 1 : a.localeCompare(b))
  .flatMap(([, m]) => (Array.isArray(m) ? m : []));

type SrcsetValue = string | string[] | Record<string, string>;

export type MediaEntry = {
  slot: string;
  kind: 'video' | 'image';
  title?: string;
  width?: number;
  height?: number;
  duration?: number;
  objectPosition?: string;
  sources?: {
    mp4?: string;
    webm?: string;
    mp4Mobile?: string;
    poster?: { avif?: string; webp?: string; jpg?: string };
    srcset?: { avif?: SrcsetValue; webp?: SrcsetValue; jpg?: SrcsetValue };
    mobile?: { avif?: SrcsetValue; webp?: SrcsetValue; jpg?: SrcsetValue };
    duo?: { avif?: SrcsetValue; webp?: SrcsetValue; jpg?: SrcsetValue };
  };
  srcset?: { avif?: SrcsetValue; webp?: SrcsetValue; jpg?: SrcsetValue };
  credit?: { author?: string; source?: string; page_url?: string; license?: string; license_url?: string };
};

const entries = new Map((manifest as MediaEntry[]).map((entry) => [entry.slot, entry]));

export function media(slot: string): MediaEntry | undefined {
  return entries.get(slot);
}

const widthOf = (path: string) => {
  const m = path.match(/-(\d{3,4})(?:-[a-z]+)?\.(?:avif|webp|jpe?g|png)$/i);
  return m ? Number(m[1]) : undefined;
};

/** Normalizes the shapes the pipeline may emit (string, array or {width: path}) into a srcset string. */
export function toSrcset(value?: SrcsetValue): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    if (/\s\d+w/.test(value)) return value;
    const w = widthOf(value);
    return w ? `${value} ${w}w` : value;
  }
  if (Array.isArray(value)) {
    return value
      .map((p) => (/\s\d+w$/.test(p) ? p : widthOf(p) ? `${p} ${widthOf(p)}w` : p))
      .join(', ');
  }
  return Object.entries(value)
    .map(([k, p]) => `${p} ${/^\d+$/.test(k) ? k : widthOf(p) ?? ''}w`)
    .join(', ');
}

/** Largest single URL from a srcset value, for <img src>. */
export function largest(value?: SrcsetValue): string | undefined {
  const s = toSrcset(value);
  if (!s) return undefined;
  const parts = s.split(',').map((p) => p.trim().split(/\s+/));
  parts.sort((a, b) => parseInt(b[1] ?? '0') - parseInt(a[1] ?? '0'));
  return parts[0]?.[0];
}

export function imageSets(entry?: MediaEntry, variant: 'default' | 'mobile' | 'duo' = 'default') {
  if (!entry) return undefined;
  const base = entry.sources?.srcset ?? entry.srcset;
  const set = variant === 'mobile' ? entry.sources?.mobile : variant === 'duo' ? entry.sources?.duo : base;
  const chosen = set ?? base;
  if (!chosen) {
    const p = entry.sources?.poster;
    return p ? { avif: p.avif, webp: p.webp, jpg: p.jpg } : undefined;
  }
  return { avif: toSrcset(chosen.avif), webp: toSrcset(chosen.webp), jpg: toSrcset(chosen.jpg) };
}

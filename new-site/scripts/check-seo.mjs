// Check the actual generated HTML, sitemap and hosting indexing rule after `npm run build`.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const origin = 'https://www.gforceit.ca';
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(([, key, value]) => [key, decode(value)]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag));
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : path;
}))).flat();
const files = (await walk(dist)).filter((path) => path.endsWith('.html'));
const pages = new Map();
const titles = new Set();
const descriptions = new Set();
let schemaCount = 0;
let linkCount = 0;
const exists = async (path) => { try { return (await stat(path)).isFile(); } catch { return false; } };
const localFile = (pathname) => {
  const decoded = decodeURIComponent(pathname);
  return resolve(dist, `.${decoded.endsWith('/') ? `${decoded}index.html` : decoded}`);
};

for (const file of files) {
  const path = relative(dist, file).replaceAll('\\', '/');
  const route = path === '404.html' ? '/404/' : `/${path.replace(/index\.html$/, '')}`;
  const html = await readFile(file, 'utf8');
  const metas = tags(html, 'meta');
  const meta = (key) => metas.filter((a) => (a.name ?? a.property) === key);
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const description = meta('description')[0]?.content ?? '';
  const noindex = meta('robots').some((a) => /\bnoindex\b/i.test(a.content));
  const canonical = tags(html, 'link').filter((a) => a.rel === 'canonical');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => decode(id)));
  check(Boolean(title), `${route}: missing title`);
  check(!titles.has(title), `${route}: duplicate title`); titles.add(title);
  check(description.length >= 50 && description.length <= 200, `${route}: description length ${description.length}`);
  check(meta('description').length === 1, `${route}: needs one description`);
  check(!descriptions.has(description), `${route}: duplicate description`); descriptions.add(description);
  check((html.match(/<h1\b/gi) ?? []).length === 1, `${route}: needs exactly one H1`);
  check(/<html\b[^>]*\blang="en-CA"/i.test(html), `${route}: missing language`);
  if (noindex) check(route === '/404/' && canonical.length === 0, `${route}: unexpected noindex/canonical`);
  else check(canonical.length === 1 && canonical[0].href === `${origin}${route}`, `${route}: incorrect canonical`);
  for (const key of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'twitter:card', 'twitter:image', 'twitter:image:alt']) {
    check(meta(key).length === 1 && Boolean(meta(key)[0]?.content), `${route}: missing/duplicate ${key}`);
  }
  for (const image of ['og:image', 'twitter:image']) {
    const url = new URL(meta(image)[0]?.content ?? '/', origin);
    check(url.origin === origin && await exists(localFile(url.pathname)), `${route}: missing local ${image} asset`);
  }
  for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) check(/\balt(?:\s*=|\s|\/?>)/i.test(img), `${route}: image missing alt attribute`);
  for (const [, raw] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(raw); schemaCount++;
      check(data['@context'] === 'https://schema.org', `${route}: schema context missing`);
      check(data['@type'] !== 'ProfessionalService', `${route}: deprecated ProfessionalService schema type`);
      if (data['@type'] === 'LocalBusiness') {
        check(!('openingHours' in data), `${route}: unconfirmed opening hours in schema`);
        check(data.logo?.url === `${origin}/brand/logo-schema.png`, `${route}: stale structured-data logo`);
      }
    } catch { failures.push(`${route}: invalid JSON-LD`); }
  }
  pages.set(route, { html, ids, noindex, file });
}

for (const [route, { html, file }] of pages) {
  for (const a of tags(html, 'a').filter((a) => a.href)) {
    const url = new URL(a.href, `${origin}${route}`);
    if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol)) continue;
    linkCount++;
    // The 404 document is served at arbitrary request paths, so its #main is
    // a same-document fragment rather than an indexable /404/ route.
    const path = a.href.startsWith('#') ? file : localFile(url.pathname);
    check(path.startsWith(`${dist}/`) && await exists(path), `${route}: broken local link ${a.href}`);
    if (url.hash && path.endsWith('.html')) {
      const target = [...pages.values()].find((p) => p.file === path);
      check(target?.ids.has(decodeURIComponent(url.hash.slice(1))), `${route}: broken anchor ${a.href}`);
    }
  }
}

const sitemap = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => decode(url));
const indexable = [...pages].filter(([, data]) => !data.noindex).map(([route]) => `${origin}${route}`);
check(sitemapUrls.length === indexable.length, 'Sitemap page count differs from indexable HTML');
check(indexable.every((url) => sitemapUrls.includes(url)), 'Sitemap is missing an indexable page');
check(!sitemapUrls.some((url) => !indexable.includes(url)), 'Sitemap contains a non-canonical/nonindexable URL');
const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
check(robots.includes(`Sitemap: ${origin}/sitemap-index.xml`), 'robots.txt sitemap origin is incorrect');
check(!/Disallow:\s*\/(?:\s|$)/i.test(robots), 'robots.txt blocks production');
const config = JSON.parse(await readFile(join(root, '..', 'vercel.json'), 'utf8'));
const previewRule = config.headers.find((rule) => rule.headers.some((header) => header.key.toLowerCase() === 'x-robots-tag'));
const hostRule = previewRule?.has?.find((condition) => condition.type === 'host');
check(Boolean(hostRule), 'Preview noindex must be conditioned on hostname');
if (hostRule) {
  const pattern = new RegExp(`^(?:${hostRule.value})$`);
  check(pattern.test('gforce-kappa.vercel.app') && pattern.test('gforce-git-main-user.vercel.app'), 'Preview noindex does not match Vercel hosts');
  check(!pattern.test('www.gforceit.ca') && !pattern.test('gforceit.ca') && !pattern.test('example.com'), 'Preview noindex incorrectly blocks production hosts');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`SEO checks passed: ${pages.size} HTML pages, ${indexable.length} canonical sitemap URLs, ${schemaCount} JSON-LD blocks, ${linkCount} local links/anchors; preview-only noindex rule verified.`);
}

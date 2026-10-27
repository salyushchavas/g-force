// Cross-verification lint: keeps the build matching DESIGN.md.
// Fails on hard-coded colours outside the token file, unapproved font families, em dashes in copy,
// banned buzzwords, and over-rounded cards. Run: npm run check:tokens
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const TOKEN_FILE = join(SRC, 'styles', 'global.css');
const exts = ['.astro', '.tsx', '.ts', '.css', '.md', '.mdx'];

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : exts.some((e) => p.endsWith(e)) ? [p] : [];
  });

const BUZZ = /\b(seamless(ly)?|empower(s|ing)?|leverag(e|es|ing)|cutting[- ]edge|world[- ]class|next[- ]generation|game[- ]changer|unleash|supercharge|revolutioni[sz]e|synerg(y|ies)|best[- ]in[- ]class|mission[- ]critical|enterprise[- ]grade|state[- ]of[- ]the[- ]art)\b/i;
const HEX = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const FONT = /font-family\s*:\s*([^;}{]+)/gi;
const ALLOWED_FONT = /var\(--font-(sans|accent)\)|inherit|Archivo Wide/;
const RADIUS = /border-radius\s*:\s*(\d+)px/gi;

const problems = [];
const add = (file, line, rule, text) => problems.push({ file: relative(ROOT, file), line, rule, text: text.trim().slice(0, 140) });

for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((ln, i) => {
    const n = i + 1;
    const isComment = /^\s*(\/\/|\/\*|\*)/.test(ln) || /token-exempt/.test(ln);
    // Token files: global.css and the skin token files beside it (src/styles/skin-*.css).
    const isTokenFile = file === TOKEN_FILE || /[\\/]styles[\\/]skin-[\w-]+\.css$/.test(file);
    if (!isTokenFile && !isComment) {
      for (const m of ln.matchAll(HEX)) {
        // allow hex inside URLs/ids and the white used for text on crimson buttons
        if (/#fff\b|#ffffff\b/i.test(m[0])) continue;
        if (/href=|url\(|id=|#[a-z]+-[a-z]/i.test(ln.slice(Math.max(0, m.index - 12), m.index + 1))) continue;
        add(file, n, 'raw-hex-colour', ln);
      }
    }
    for (const m of ln.matchAll(FONT)) if (!ALLOWED_FONT.test(m[1])) add(file, n, 'unapproved-font', ln);
    for (const m of ln.matchAll(RADIUS)) if (Number(m[1]) > 16 && Number(m[1]) < 900) add(file, n, 'radius>16px', ln);
    if (!isComment && /—/.test(ln)) add(file, n, 'em-dash', ln);
    if (!isComment && BUZZ.test(ln)) add(file, n, 'buzzword', ln);
    if (/background-clip\s*:\s*text/.test(ln)) add(file, n, 'gradient-text', ln);
    if (/border-(left|right)\s*:\s*([2-9]|\d{2,})px/.test(ln)) add(file, n, 'side-stripe', ln);
  });
}

const byRule = problems.reduce((acc, p) => ((acc[p.rule] = (acc[p.rule] ?? 0) + 1), acc), {});
for (const p of problems) console.log(`${p.rule.padEnd(16)} ${p.file}:${p.line}  ${p.text}`);
console.log(`\n${problems.length} issue(s)`, byRule);
process.exitCode = problems.length ? 1 : 0;

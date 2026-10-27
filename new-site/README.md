# G-Force IT website

The active Astro rebuild is here. The HTML site in the parent directory is the
legacy version. Start with `PROJECT_HANDOFF.md`, `PRODUCT.md`, `DESIGN.md` and
`REVIEW.md` for recovered requirements, current direction and verification.

## Run locally

Use Node.js 24.x, matching the deployment version in `package.json`.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4321
```

To inspect the production build:

```sh
npm run build
npm run check:tokens
npm run check:seo
npm run preview -- --host 127.0.0.1 --port 4404
```

## Integrations and content

Copy `.env.example` to `.env` and add the client form endpoint and booking URL
when supplied, then rebuild. Blank values intentionally open a pre-filled email
instead of claiming that a server accepted an enquiry. No live messages were
sent during review.

Confirmed company details, claims, proof and course information belong in
`src/data/site.ts`. Unverified proof is omitted until real content is supplied.
The original source assets remain available; active media is selected through
`src/data/media*.json`. Credits are in the `MEDIA_LICENSES*` documents.

## Artwork and media

`src/lib/hero-scene.ts` is shared by the live Three.js sculpture and its posters.
After editing geometry, material or framing, regenerate matching posters with a
running dev server, Playwright and Chrome:

```sh
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/render-hero.mjs
```

Reproduce licensed media encodes from downloaded originals:

```sh
GFORCE_FFMPEG=/path/to/ffmpeg GFORCE_MEDIA_SOURCE_DIR=/path/to/originals node scripts/prepare-air-media.mjs
```

Use `scripts/prepare-video-clips.mjs` with the source paths/credits in
`scripts/video-clip-sources.json` to generate the short 640px/960px delivery clips.
Add `GFORCE_MEDIA_ONLY=video` to the older air script to re-encode archived films. Downloaded originals
and private reference-study footage are kept outside the shipping site.

## Production regression checks

With the production preview running on port 4404, run the browser regressions
using an existing Playwright installation and Chrome:

```sh
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs npm run check:ui
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs GFORCE_BROWSER_ENGINE=webkit npm run check:media
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs GFORCE_BROWSER_ENGINE=webkit npm run check:hero
```

The WebKit check requires Playwright's WebKit browser to be installed. These QA
tools are separate from the website's runtime dependencies. Support tests check
actual rendered text, rapid tab changes and narrow layouts. Media tests check
one-shot completion, offscreen resume, visibility, autoplay blocking and
network failure recovery. Hero tests check fresh-load/reload handoffs, immediate
interruption, reduced motion, fallback posters and no GPU work after completion. Captures go to OS temporary directories by default.

The production canonical is `https://www.gforceit.ca`. Vercel preview hostnames
receive `X-Robots-Tag: noindex, follow`; the custom production domain does not.

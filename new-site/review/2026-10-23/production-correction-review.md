# G-Force IT: production correction pass

23 October 2026. This pass addresses the reported missing Support text, mobile
controls, slow/stuck video and production SEO. The earlier design assessment is
archived in [the original-brand review](review/2026-10-23/original-brand-review.md).
It did not establish that every animated state was correct.

## Problems found and corrected

| Problem | Cause | Result |
|---|---|---|
| Support labels disappeared | A more specific CSS rule kept every step at opacity 0 after its reveal. Earlier checks tested tab selection without checking rendered text. | Essential text appears immediately. Tab selection updates hidden/inert state synchronously; no reveal timers or rapid-switch race. |
| Mobile controls looked detached or did not respond | Separate “Pause films”, “Pause clips” and business-film controllers conflicted. A stretched service link intercepted media taps. | One shared player, with a 44px control on the film itself. The control receives taps, and a visitor's pause persists across scrolling and tab restoration. |
| Clips competed for bandwidth and decoding | Mobile used the same 960px file and fetched overlapping films ahead of view. | Smaller 640px H.264 sources, no offscreen bulk prefetch, one visible content decoder on mobile and at most two on desktop. Decorative mobile clouds use their poster. |
| Autoplay/network failure looked like a frozen film | Rejected play requests were swallowed; there was no visible recovery action. | Poster fallback with manual Play/Retry, including reduced-motion and Save-Data opt-in. An uninterrupted startup/buffering timeout cancels a stuck request and allows explicit retry. |
| Unnecessary scroll work | Interleaved layout reads/writes and repeated hero mutations after it left view. | Batched progress measurements, unchanged-value guards, compositor-based poster travel, and no hidden-poster updates once live glass is ready. Fast swipes that skip the artwork avoid GPU startup. |
| Lost GPU context left artwork blank | The live canvas remained selected after context loss. | The matching poster resumes the reversible scroll transition. |
| Metadata and sharing artwork drifted from the brand | Earlier sculpture artwork, unconfirmed opening hours and an obsolete schema type remained. | Original-logo social image, accurate LocalBusiness/WebSite data, complete sharing metadata and omitted unconfirmed hours. |

## Production domain

The user confirmed **www.gforceit.ca** as production and Vercel as preview.
Canonicals and the sitemap target `https://www.gforceit.ca`. Only `*.vercel.app`
receives `X-Robots-Tag: noindex, follow`, preventing preview duplicates.
The custom domain must point to this deployment for the new site and its social
assets to appear there; domain settings were not changed in this pass.

## Verification

- All 15 routes build under Node.js 24; token lint has zero issues.
- SEO regression: 15 HTML documents, 14 matching canonical/sitemap URLs,
  27 JSON-LD blocks and 771 internal links/anchors pass.
- Support regression: 12 cases across 320/390/1440px, both themes and motion
  preferences. Checks include actual text opacity/visibility, immediate labels,
  rapid toggling, hidden/inert panels, keyboard navigation and scrolling away/back.
- Broader UI audit: 20 combinations of five main routes, two widths and both
  themes, using normal motion. No JavaScript errors, request failures, broken
  images or horizontal overflow. Support and media controls pass focused axe
  checks. Two training target-size flags came from a filter crossing the audit
  viewport boundary; fully visible 95×44px filters pass in both themes.
- Media regression runs in Chrome and mobile Safari/WebKit: actual playback
  advancement, selected preview, mobile decoder limit, offscreen stop, persistent
  pause, autoplay blocking, reduced motion, Save-Data, failed requests and retry.
  The held-response case also verifies recovery from a request that never fails
  or completes. Full evidence is linked below.
- Hero regression: no geometry requests/GPU draws before intent, no idle/offscreen
  draws, reversible scroll, reduced-motion/Save-Data/unavailable-WebGL posters and
  a loaded poster after simulated GPU context loss.

Automated browser engines and throttled desktop emulation do not replace
physical-device and field Core Web Vitals testing. A passing Lighthouse score
alone cannot establish correct video or hidden-tab behavior.

## Local performance results

Final production-preview Lighthouse (mobile network/CPU simulation and desktop profile):

| Profile | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 100 | 100 | 100 | 100 | 0.5s | 0ms | 0 |
| Mobile | 99 | 100 | 100 | 100 | 2.2s | 0ms | 0 |

A separate 15-second mobile scroll sample used 4× CPU throttling, 100ms latency
and 500KiB/s throughput. It kept at most one video playing, no offscreen playback
and no page errors. Frame p95 was 16.7ms and the maximum was 33.3ms. The original
sample was against the live preview and the final sample against local preview;
these are diagnostic runs, not a controlled field comparison. One 70ms startup
long task remains recorded, so the report does not claim that all long tasks or
all device lag have disappeared.

The Vercel preview intentionally returns noindex. Its live Lighthouse crawlability
result should not be confused with production metadata validation.

## Deployed preview verification

The application fixes were pushed in commit 3917fce and deployed successfully to
https://gforce-kappa.vercel.app/. The live alias targets that exact application
commit, returns HTTP 200 and has the intended preview-only noindex header.
Canonical and og:url still target www.gforceit.ca. The updated sharing/logo assets
load correctly at preview paths and match the committed files.

All 12 Support cases passed again on the deployed site. Live mobile Chrome and
WebKit playback checks passed for every service film, visitor pause and offscreen
stop. An independent WebKit run found five working films, one active at a time,
valid HTTP 206 byte ranges and no media errors. Browser tests wait for decoded
playback with a deadline; a fixed 650ms local-load assumption was inappropriate
for cold CDN responses.

The production client domain remains on the old Apache host and is not attached
to this Vercel project. Domain/DNS cutover is still required before public launch.

## Repeatable checks and evidence

Run `npm run build`, `npm run check:tokens` and `npm run check:seo`. With the
production preview running and Playwright configured, `npm run check:ui` runs
Support, media and hero regressions. `GFORCE_BROWSER_ENGINE=webkit npm run
check:media` repeats media coverage in WebKit. See [README.md](README.md) for setup.

- [Live Support checks](review/2026-10-23/production/live-support.json)
- [Live Chrome playback](review/2026-10-23/production/live-media-chromium.json)
- [Live WebKit playback](review/2026-10-23/production/live-media-webkit.json)
- [Live SEO/deployment check](review/2026-10-23/production/live-seo.json)
- [Broad UI audit](review/2026-10-23/production/ui-audit.json)
- [Hero motion and fallback evidence](review/2026-10-23/production/hero-motion.json)
- [Media findings and browser evidence](review/2026-10-23/production-media.md)
- [Desktop Lighthouse](review/2026-10-23/production/lighthouse-desktop.html)
- [Mobile Lighthouse](review/2026-10-23/production/lighthouse-mobile.html)
- [Mobile scroll sample](review/2026-10-23/production/scroll-after.json)
- [SEO changes and official references](review/2026-10-23/production-seo.md)

Forms and booking still use the supplied endpoint/URL or explicitly open an
email draft. Server delivery and calendar integration remain dependent on the
client's service configuration.

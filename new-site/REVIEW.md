# G-Force IT: opening, media and final review

23 October 2026. Latest follow-up: restored the client-company row inside the
hero below its actions. The latest request keeps its scrolling automatic on
hover/touch/click, with no manual scrolling. Reduced motion/no JavaScript shows
a static wrapped list. Reloads now reset the current page to the top and home
restarts its opening, retaining the route/query but clearing a reload fragment.
This supersedes the interaction-stopping behaviour in
the earlier client-row test report. [Current automatic-scroll and reload
verification](review/2026-10-23/client-hero/automatic-scroll.md) records eight
client cases and ten reload cases across Chrome/WebKit, all passing. The user previously selected the transparent
single-colour logo treatment and requested no Pause button. The 21 existing
prepared wordmarks are reused without white cards. The loop rests off-screen and when the tab is hidden.
The original
28-company list and assets remain in source. The business page shares this row.
Sample figures/testimonials/cases remain omitted. This supersedes the older
omission of the client strip described below.

The [client-row follow-up](review/2026-10-23/client-hero/README.md) records 16
Chrome/WebKit cases, two focused intro checks and new Lighthouse reports with
this row enabled: desktop 100/mobile 99, accessibility/best practices/SEO 100,
mobile LCP 2.2s, TBT 0ms and CLS 0.

This pass implements the approved fresh-load introduction,
removes persistent video Pause controls, replaces irrelevant service imagery and
checks the resulting motion, mobile behaviour and performance. The preceding
production fixes are archived in [the correction review](review/2026-10-23/production-correction-review.md).

## Result and design assessment

The complete original G-FORCE sculpture appears briefly, rotates/shrinks/lifts
away, and reveals the Toronto message, both audience actions and service links.
One animation frame loop owns the sculpture and copy. Completion removes the
artwork and temporary space together and disposes the renderer. Scrolling back
does not replay it; a fresh load/reload does. Visitor input cancels immediately.
Reduced motion, incoming anchors and history restoration show the normal hero.
A failed module has a six-second content watchdog. Constrained/data-saving or
failed-WebGL visits use the matching poster rather than an incomplete scene.

**Design judgement: approximately 9/10 for the interface and 8.7/10 for media.**
The [complete section and image review](review/2026-10-23/media-design-audit.md)
rates every homepage section, other pages and visible media, with reasons and
before/after comparisons. The two weakest subjects have been replaced:

- Cloud and backup: weather footage → real rack storage and activity indicators.
- Cybersecurity: office windows → a hardware security key beside a laptop.
  The cybersecurity career cover also uses this relevant photograph.

Atmospheric dawn/cloud photography remains appropriate around the original
brand sculpture. The exact supplied logo, crimson palette and Archivo remain.
The glass is an interpretation of the reference, not a claimed 100% material
match. More distinctive permissioned team/instructor/lab photography, confirmed
course details and real approved customer proof are the useful next improvements.
Those inputs cannot be invented to award a perfect score.

## Short clips and the Safari correction

Films are silent four-second H.264 clips that play once, resume from their
paused position when revisited, and rest after completion. There are no Pause or
Replay controls. Play/Retry appears for reduced-motion/Save-Data opt-in or
blocked/failed playback. Off-screen and hidden-tab media stops; mobile permits
one visible content decoder. A nine-second uninterrupted loading/buffering
limit restores the poster and requires explicit retry.

The selected mobile files are **77–124 KiB**, desktop **142–236 KiB**. Across
five slots their catalogue is about **60% smaller on mobile and 64% on desktop**
than the preceding cuts; the catalogue is not downloaded up front. Sources attach
only when eligible. Cybersecurity uses a responsive still and no decoder.
Source credits and reproducible encodes are in [the clip documentation](MEDIA_LICENSES-clips.md)
and [security-photo documentation](MEDIA_LICENSES-security.md).

Testing found a real WebKit resume defect: the native decoder sometimes returned
to zero without reloading the source. The shared player now preserves a bookmark
and restores it before showing resumed playback. Both engines pass the strict
resume and permanent-completion checks after that fix.

## Current verification

- Node.js 24 builds all 15 routes. Token lint: zero issues.
- SEO: 15 documents, 14 canonical sitemap URLs, 27 JSON-LD blocks and 773 local
  links/anchors pass. Canonicals target `https://www.gforceit.ca`; Vercel remains
  a noindex preview.
- Visual inventory: all 15 routes at desktop/mobile widths; no page errors,
  horizontal overflow, broken displayed images or unintentionally hidden headings.
  Security-image crops also pass at 320/390/1440px.
- Support: 12 settled-workflow cases across 320/390/1440px, both themes and motion
  preferences. Actual text visibility, rapid switching, keyboard selection and
  scrolling away/back pass. The separate intro suite covers interruption.
- Broader normal-motion UI: 20 route/width/theme combinations pass page errors,
  assets, overflow and focused Support accessibility. Two raw training target-size
  flags occur at the viewport edge; fully visible 95×44px filter buttons pass.
- Media: 14 scenarios across Chrome and WebKit pass decoded playback, short
  duration, visibility/decoder limits, bookmark resume, permanent completion,
  reduced motion, Save-Data, blocked autoplay, failed requests and held-request retry.
- Intro: 43 recorded browser test executions cover normal desktop/mobile, narrow
  and short/landscape viewports, cancellation, reload/history/anchors, reduced
  motion, Save-Data, missing/lost WebGL, failed modules and late scene preparation.
  No GPU draws continue after completion. Late preparation creates no scene.

## Measured motion and Lighthouse

Isolated moving-frame samples exclude screenshots during animation. Chrome
frame p95 was 16.7–16.8ms; WebKit p95 was 19ms with a maximum of 29ms. No isolated
intro interval exceeded 34ms. The copy handoff moved less than 0.003px at
completion. A constrained mobile run at 4× CPU, 100ms latency and 500KiB/s used
the poster and completed in about three seconds; its startup still recorded
172/59/65ms long tasks before movement. These are lab measurements, not a promise
for every physical phone.

Production-preview Lighthouse with the intro and transparent client row. Mobile
was repeated after the automatic-scrolling/reload update; desktop is from the
preceding style pass:

| Profile | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 100 | 100 | 100 | 100 | 0.7s | 0ms | 0 |
| Mobile | 99 | 100 | 100 | 100 | 2.2s | 0ms | 0 |

Mobile uses Lighthouse's default simulated mobile/network/CPU profile; desktop
uses a 1350×940 viewport, 1× CPU, 40ms RTT and 10Mbps simulation. Chrome ran on
macOS with Metal, one performance browser at a time. A separate 15-second
390px scroll run at 4× CPU/100ms/500KiB/s had frame p95 16.7ms, max 33.4ms,
one active film, zero off-screen playback and no page errors. Its single 68ms
startup task is retained in the evidence. Lighthouse scores alone do not
establish correct media behaviour or WCAG certification.

## Evidence and production boundary

- [Section and media ratings](review/2026-10-23/media-design-audit.md)
- [Intro timing, fallback and reproduction details](review/2026-10-23/production/intro-review.md)
- [Final clip tests and Safari findings](review/2026-10-23/production/brief-media.md)
- [Support results](review/2026-10-23/production/intro-support.json)
- [Normal-motion UI results](review/2026-10-23/production/intro-ui-audit.json)
- [Desktop Lighthouse](review/2026-10-23/client-hero/lighthouse-desktop.html)
- [Mobile Lighthouse](review/2026-10-23/client-hero/lighthouse-mobile.html)
- [Throttled scroll sample](review/2026-10-23/production/intro-scroll.json)

The Vercel preview is https://gforce-kappa.vercel.app/. The automatic-scroll and
reload application commit `604cc16` deployed Ready as
`dpl_8Y6YqVWGUsaQeGWs3L2Ups8Nm1Jz`. Live Chrome desktop and WebKit mobile pass
continued motion on hover, no manual scrolling, reload at the top, home intro
replay and Back restoration after leaving a reloaded page. No JavaScript errors.
[Current live checks](review/2026-10-23/client-hero/automatic-reload-live.json).

The preceding transparent-style application commit `d818471` deployed Ready as `dpl_MwhYe1Q9niAbNTNyjxcurQbLaxeW`.
Three live Chrome/WebKit checks passed: all 21 prepared marks load inside the
hero without buttons, cards, overflow or JavaScript errors.
[Live client-row verification](review/2026-10-23/client-hero/live-smoke.json)
records the current deployment.

The preceding intro/media application commit `bb4f156` deployed Ready as
`dpl_8sLxo2BqjBHcAeuZNzh7koeGacFK`. The deployed hero
asset matches the tested build byte for byte. Five focused live intro checks and
four live media suites across Chrome/WebKit passed; all service clips play and
complete, and the cybersecurity still displays correctly. All ten video
variants return the expected sizes and support byte ranges. Live canonicals and
preview-only noindex headers are correct. See [live verification](review/2026-10-23/production/live-brief/README.md)
and [deployment/asset/SEO checks](review/2026-10-23/production/live-brief/deployment-assets-seo.json).
The Lighthouse scores above describe the local production build. The custom domain remains on its old host and requires a
separate domain/DNS cutover. No domain settings were changed. Form delivery and
booking still require the client's real endpoint/URL; current fallbacks clearly
open an email draft.

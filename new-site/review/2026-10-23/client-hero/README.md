# Transparent client row in the hero

Latest follow-up: [automatic scrolling and reload position](automatic-scroll.md).
Hover/touch no longer stops the row; manual scrolling was removed. Reloads start
at the top. The earlier implementation and checks below are historical.

23 October 2026. The user requested the missing client row, then asked to place
it in the hero, remove its Pause button and restore the earlier transparent
appearance. The existing 21 prepared wordmarks are reused with their original
proportions, ink opacity and transparent backgrounds. The complete original
28-company list and source artwork remain preserved. No new relationships or
sample figures were added.

The compact row sits beneath the hero actions/service links and shares the
intro's upward handoff. There are no white cards or Pause controls. Hover,
focus, touch or wheel input stops automatic movement for the rest of the page
visit and exposes native horizontal browsing. Arrow/Home/End keys work; reduced
motion and no JavaScript retain a static scrollable list. Invisible documents
and off-screen sections do not animate. The source PNG catalogue totals
54.6 KiB, requested near the row rather than as a new video.

The hero grid explicitly constrains its column so the long track cannot move
its heading/actions outside a narrow viewport. At 390×844 and 1440×900 the row
fits inside the first viewport. At 320×568 it remains part of normal hero flow
and can be reached by scrolling; there is no overlap or horizontal overflow.

Verification against the production build:

- All 15 routes build with Node.js 24; token lint and SEO checks pass.
- 16 Chrome/WebKit checks: light/dark, 320/390/1440px, no buttons or boxes,
  loaded marks, readable hero, motion, stopping on interaction, manual keyboard
  browsing, reduced motion, no JavaScript and business-page presence.
- Client motion frame p95: Chrome 16.8ms, WebKit 17–18ms; observed maxima 18ms.
  These short laboratory samples are not physical-phone performance guarantees.
- Two focused intro checks still pass: no end jump over .002px or continued GPU
  drawing, with the row inside the moving copy.
- Latest Lighthouse: desktop 100 performance, mobile 99; accessibility, best
  practices and SEO 100. Mobile LCP 2.2s, TBT 0ms and CLS 0. Same isolated
  production-preview emulation profiles as the preceding review.

Evidence: `browser-results.json`, `intro-with-clients.json`,
`lighthouse-desktop.html`, `lighthouse-mobile.html`, and settled desktop/mobile
screenshots alongside this file. The local test URL is 127.0.0.1:4404.

The client-row application commit `d818471` deployed Ready as
`dpl_MwhYe1Q9niAbNTNyjxcurQbLaxeW` at https://gforce-kappa.vercel.app/.
Three live checks (Chrome 390/1440px and WebKit 390px) passed: 21 loaded
transparent marks, no Pause controls or white cards, no overlap/overflow or
page errors, and manual browsing after focus. See `live-smoke.json`.

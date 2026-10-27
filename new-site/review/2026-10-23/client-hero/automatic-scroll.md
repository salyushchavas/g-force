# Automatic client scrolling and reloads

23 October 2026. The latest user instructions supersede the earlier manual
browsing behaviour: client logos keep scrolling on hover, click, touch and wheel
input. There are no Pause controls, drag gestures, focus controls or manual
horizontal scrolling. The same transparent marks and hero placement remain.
Off-screen/hidden-tab rest prevents unnecessary rendering. Reduced motion and
no JavaScript show all 21 logos in a static wrapped list.

Every reload starts the current page at the top. The route/query remains; a
reload fragment is removed so the home introduction can replay. The existing
head script disables scroll restoration for that visit and briefly catches late
restoration events during the first frames, before the hero can mistake them
for visitor scrolling. Any visitor input ends that guard immediately. Normal
history restoration is restored when leaving the page. First-time deep links
and browser Back continue to work.

Verification on the local production build:

- Eight Chrome/WebKit client cases pass: 390/1440px, continuous movement while
  hovering/clicking, wheel or touch, no manual offset/controls, reduced motion
  and no JavaScript. Mobile WebKit does not expose Playwright mouse-wheel input;
  its touch case uses a real touchscreen tap.
- Ten reload cases pass: scrolled home, home fragment/query, business deep link,
  browser Back, and reduced motion, in both engines. Reloads stay at scrollY 0;
  home starts its intro again. Incoming deep links still reach their target.
- All 15 routes build; token lint and SEO checks pass.
- Final mobile Lighthouse: performance 99, accessibility/best practices/SEO 100,
  LCP 2.2s, TBT 0ms, CLS 0, using the established isolated mobile profile.

Evidence: `automatic-scroll-results.json`, `reload-results.json`,
`lighthouse-mobile-automatic.json`. Older manual-scrolling checks are historical
and do not describe the latest interaction model.

Application commit `604cc16` deployed Ready as
`dpl_8Y6YqVWGUsaQeGWs3L2Ups8Nm1Jz` at https://gforce-kappa.vercel.app/.
Live Chrome desktop and WebKit mobile both pass continuous motion on hover,
no manual scrolling, reload to zero, intro replay, and Back restoration after
leaving a reloaded page. No JavaScript errors. See `automatic-reload-live.json`.

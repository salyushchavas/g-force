# Media playback review, 23 October 2026

The previous live build fetched six films (2,555,023 transferred bytes) when
entering the mobile service section and ran two videos together. The desktop
player also prefetched off-screen dawn films. A row-wide service link intercepted
the mobile film control. Separate section controllers could resume paused films
without preserving visitor intent.

The shared player now loads eligible visible films after a short viewport-settle
delay. It permits one decoder on phones/touch devices and two on desktop, gives
the most visible foreground film priority, pauses off screen and when hidden,
and preserves an explicit pause. Ambient clouds use their poster on mobile.
Compact controls sit on the media they affect. Reduced motion and Save-Data make
no automatic film requests; visitors can explicitly play a film. Blocked autoplay
offers Play, and failed media keeps a poster with Retry. An uninterrupted startup
or buffering attempt times out after nine seconds, aborts its request and offers
Retry; it cannot leave a pending play promise behind or retry automatically.
Playback, pausing and leaving the viewport clear these timers. Mobile clips use 640px,
24fps H.264 with a front-loaded MP4 index; original licensed media and credits
remain intact.

## Reproducible browser checks

Build the site and serve its production output on port 4404. Then run:

```sh
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs node scripts/check-media.mjs
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs GFORCE_BROWSER_ENGINE=webkit node scripts/check-media.mjs
```

Chrome 156 and Playwright WebKit 27.2 passed all seven configurations: ordinary
mobile, desktop hover, reduced motion, Save-Data, blocked autoplay and failed
network followed by Retry, plus a held response that never resolves or fails.
The held request reaches Retry, remains stopped without an automatic retry loop,
and plays after the response is released and the visitor retries.
Both engines advanced roughly 0.91 seconds of video
over a 0.9-second observation. Each centred mobile service film actually played;
the mobile decoder count stayed at one. Off-screen playback stopped, explicit
pause survived scrolling and visibility restoration, and the dawn ambient source
was never attached on mobile. No page JavaScript errors were reported.

The new focused mobile service visit loaded one 187,449-byte film. This is about
93% less arrival media traffic than the earlier service-entry capture; it is not
a claim that every page or complete scroll transfers 93% less data. Full raw
captures are in `production-media-before.json`, `production-media-chromium.json`
and `production-media-webkit.json` beside this report.

These are emulated mobile viewports (390 × 844) on a desktop Mac, plus a
1440 × 900 desktop viewport. WebKit provides a useful Safari engine check;
physical iPhone/Android device testing and field Core Web Vitals remain separate
release checks. Video tests establish playback and controls, not a universal
frame-rate guarantee. The main release report records isolated performance runs.

# Fresh-load introduction: browser verification

23 October 2026, local production preview at `http://127.0.0.1:4404`.
Chrome 156 and Playwright WebKit 27.2 on macOS; these are browser-emulated
viewports, not physical phones. The host used Metal for Chrome rendering.

The original glass name now performs one automatic 1.9-second upward handoff,
then disappears. The headline and actions settle into ordinary page flow. No
window scrolling is required for the animation. A fresh reload replays it;
scrolling back to the top and returning through browser history do not.

## Functional evidence

The first cross-engine suite passed 14 scenarios in each engine: desktop,
390px mobile, 320px mobile, wheel/touch/keyboard/scroll interruption, reduced
motion, Save-Data, missing WebGL, a failed hero module, an incoming hash link,
reload and history return. Essential copy remains readable, horizontal overflow
is absent, and artwork never returns after completion. Interruption completed
within 44ms in those runs. GPU draw counts remained unchanged after completion
and after scrolling away and back.

The final preparation cancellation changes were then checked separately:

- Forced WebGL context loss restores the matching poster and completes the
  handoff in both engines.
- Holding the dynamic scene module for 1.3 seconds lets the poster handoff
  proceed. Its late arrival creates no WebGL context and fetches no geometry or
  lighting in either engine.
- 320×568 and 844×390 render without overlap or horizontal overflow in both
  engines. The landscape actions extend 22.5px below that very short viewport
  and remain available through normal scrolling.
- At 4× CPU slowdown, 100ms latency and 500KiB/s download, the scene preparation
  budget aborts before creating a WebGL context. The poster performs the motion
  and the final message remains complete.

The module failure watchdog reveals normal content after six seconds. Reduced
motion and hash/history entry skip the introduction. Save-Data uses its poster
and downloads no live scene assets.

## Actual moving frames

Timing runs do **not** take screenshots during animation. A previous WebKit
visual-capture run introduced 84–114ms gaps even in the poster-only case;
isolating timing from screenshots removed those gaps.

| Isolated run | Moving-frame p95 | Maximum interval | Intervals >34ms | Final copy handoff jump |
|---|---:|---:|---:|---:|
| Chrome, 1440×900 / 390×844 / 320×844 | 16.7–16.8ms | 16.8ms | 0 | <0.003px |
| Chrome, 320×568 / 844×390 | 16.7–16.8ms | 16.8ms | 0 | <0.001px |
| WebKit, those five viewports | 19ms | 29ms | 0 | <0.002px |
| Chrome, mobile with 4× CPU and constrained network | 16.7ms | 16.8ms | 0 | <0.001px |

No long tasks were recorded during any isolated Chrome moving sequence.
The constrained run had 172ms, 59ms and 65ms tasks **before** motion began;
startup cost remains a separate concern for Lighthouse. WebKit does not expose
the Long Tasks API, so an empty WebKit long-task list is not a measurement.
These laboratory frame samples support a smooth local implementation; they do
not establish frame rate on every physical phone or replace Lighthouse/field
performance checks.

## Reproduction

`scripts/check-hero-motion.mjs` now targets the fresh-load introduction. It
supports 19 Chrome or 18 WebKit scenarios, JSON/frame evidence, screenshots of
settled views, focused reruns and an opt-in separate moving screenshot pass.

```sh
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs npm run check:hero
GFORCE_BROWSER_MODULE=/path/to/playwright/index.mjs GFORCE_BROWSER_ENGINE=webkit npm run check:hero
```

The initial functional reports are `intro-chromium.json` and
`intro-webkit.json`. Final isolated frame results are under
`intro-performance/`; additional Chrome resilience/short-viewport results are
under `intro-resilience/` and `intro-short/`. Each successful focused case has
its raw rAF samples. Finished desktop/mobile/narrow screenshots sit beside the
initial reports. Current code includes the late-preparation safeguard discovered
during this review.

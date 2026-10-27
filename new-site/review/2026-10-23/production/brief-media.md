# Four-second media verification

23 October 2026, macOS arm64, local Astro production preview at
`http://127.0.0.1:4404`. Playwright controls installed Chrome and WebKit; the
390×844 touch and 1440×900 mouse contexts are browser emulation, not physical
phones. Run `scripts/check-media.mjs` with `GFORCE_BROWSER_MODULE` pointing to
Playwright; `GFORCE_BROWSER_ENGINE=webkit` selects the second engine.

The current strategy plays each short silent film once per page visit and rests
on its final frame. No persistent Pause or Replay button appears. Play/Retry only
appears for explicit reduced-motion/Save-Data opt-in or blocked/failed playback.
Cybersecurity uses a responsive still of a hardware security key rather than the
previous office-window clip. Cloud and backup now shows real storage equipment.

Each engine exercises these seven scenarios: normal touch, normal desktop,
reduced motion, Save-Data, blocked autoplay, failed request/retry, and a request
held until the nine-second startup limit. The checks verify decoded time advances,
no loop, duration ≤4.5 seconds, off-screen pause, resume at the same time, sticky
completion on the final frame, no restart from revisiting/visibility changes,
no media download before eligible visibility, no download before static-path
opt-in, appropriate mobile 640px source and at most one mobile content decoder.
Normal desktop also switches every filmed service preview; normal touch reaches
every filmed service and the Dawn foreground while leaving ambient sky unfetched.

Chromium and WebKit: all fourteen scenarios passed on the final bookmark fix.
The first WebKit run exposed a native off-screen decoder restart: a clip paused
at approximately 0.8 seconds resumed at 0.0 seconds without reloading its source.
The player now retains its playhead independently and restores that bookmark
before showing resumed playback. The final WebKit touch and desktop cases
resumed at exactly 0.807682 and 0.812931 seconds respectively, matching their
pause points. This is checked strictly, without widening the assertion tolerance.

Stalled requests restored their poster after approximately 9.55 seconds from the
scroll action, detached the unfinished source, made no automatic retry, then
played successfully following Retry. The initial 120ms visibility settling period
and browser polling are included in that observation. Raw output:
`brief-media-chromium.json` and `brief-media-webkit.json`.

The film byte table and original licences are recorded in
`../production-media-clips-sizes.json` and `../../../MEDIA_LICENSES-clips.md`.
The five selected film slots total 497.7 KiB for the mobile variants, 974.4 KiB for
the desktop variants, about 60% and 64% less than their previous selected cuts.
These totals are a complete catalogue, not an up-front page download.

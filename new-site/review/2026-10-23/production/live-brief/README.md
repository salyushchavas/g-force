# Live media verification

Checked 23 October 2026 at `https://gforce-kappa.vercel.app/`, after the new intro
and short-media deployment appeared in the live HTML. This is the Vercel preview;
production canonicals remain `https://www.gforceit.ca`.

Chrome and WebKit passed normal mobile 390×844 touch and desktop 1440×900 mouse
cases: all four filmed services decode and advance, the mobile player uses 640px
sources with one active content decoder, the first film pauses off-screen and
resumes at its saved time, then stops on its final frame at four seconds.
Revisiting or visibility restoration does not restart it. No Pause or Replay
control appears. The mobile Dawn foreground also plays; ambient sky remains
unfetched. Raw results and screenshots are in `chromium/` and `webkit/`.
These are browser emulations, not physical-device tests.

`cyber-still.json` separately verifies the security-key photograph in all four
engine/viewport contexts: its responsive AVIF decodes, fills the visible frame,
and has no video decoder or media control. Screenshots show the settled desktop
preview after its crossfade and the narrow-screen inline image.

`assets.json` verifies all ten desktop/mobile brief MP4 assets return HTTP 200,
`video/mp4`, byte-range support, and the same exact file sizes as the reviewed
local build. The service clips range from 78,608–126,453 bytes on mobile and
145,202–241,929 bytes on desktop. Each selected film lasts four seconds.

The live opening also passed five focused Chrome/WebKit cases, with its deployed
script matching the local build. See `live-intro-chromium.json` and
`live-intro-webkit.json`. The Ready application deployment is
`dpl_8sLxo2BqjBHcAeuZNzh7koeGacFK`, application commit `bb4f156`.
`deployment-assets-seo.json` records matching asset bytes, HTTP 206 range support,
production canonicals and the preview-only noindex response header.

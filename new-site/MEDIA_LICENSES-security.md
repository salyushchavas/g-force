# Cybersecurity imagery, 23 October 2026

The cybersecurity service and career article use [cottonbro studio's photograph
of a USB security key beside a laptop](https://www.pexels.com/photo/close-up-shot-of-a-laptop-5474301/),
under the [Pexels License](https://www.pexels.com/license/). The photograph
illustrates account/device security. It does not show G-Force personnel,
customers or infrastructure, or establish a product endorsement.

`src/data/media-security.json` overrides the old office-window service film and
network-patch-panel article cover. An intentional landscape crop keeps the
security key visible in wide and narrow placements. AVIF, WebP and JPEG versions
ship at 640, 800, 1280 and 1920px; source photographs remain outside `public/`.
The service is a still image and does not download or run a video decoder.

Reproduce with `node scripts/prepare-security-media.mjs`. The script records the
source URL, creator, source page, license and crop. It downloads the original to
the system temporary media cache, or accepts an existing original through
`GFORCE_SECURITY_SOURCE`. Older source files and their original credits remain
archived; they are not selected for these placements.

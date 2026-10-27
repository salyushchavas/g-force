# Short service films — 23 October 2026

`src/data/media-clips.json` selects the current four-second, silent H.264 films.
They play once per page visit, pause when off-screen, resume at the same playhead
when revisited, and stop on the final frame. They do not loop or expose Pause or
Replay controls. Reduced motion and Save-Data retain stills unless the visitor
selects Play. A blocked or failed load offers Play or Retry.

These are edited stock illustrations, not recordings of G-Force staff, customers,
facilities, or measured results. Credits remain in the current manifest and the
previous media credit files; those files also document preserved older cuts.

| Slot | Current subject / source | Preparation |
|---|---|---|
| `svc-managed-it` | [ListosParaRodar, network connection](https://pixabay.com/videos/cable-network-connection-internet-197208/), [Pixabay Content License](https://pixabay.com/service/license-summary/) | Four-second excerpt of the preserved graded network-patching film. |
| `svc-cloud-backup` | [MrColo, close-up of a CPU](https://www.pexels.com/video/close-up-of-a-cpu-7140928/), [Pexels License](https://www.pexels.com/license/) | New source, seconds 1–5: real rack storage drive units and activity indicators. Brightness +0.035 and gamma 1.08. Replaces weather imagery in the computing service. |
| `svc-training` | [Kampus Production, teacher explaining in a library](https://www.pexels.com/video/teacher-explaining-to-students-in-a-library-5940049/), [Pexels License](https://www.pexels.com/license/) | Four-second excerpt of the preserved teaching film. |
| `svc-consulting` | [fauxels, business meeting](https://www.pexels.com/video/group-of-people-having-business-meeting-in-office-space-3255321/), [Pexels License](https://www.pexels.com/license/) | Four-second excerpt of the preserved bright meeting film. |
| `sky-daylight` | [Alexander Lutkov, blue sky timelapse](https://www.pexels.com/video/blue-sky-with-white-clouds-timelapse-mode-1860175/), [Pexels License](https://www.pexels.com/license/) | Four-second atmospheric excerpt. This is used as sky atmosphere, not to illustrate cloud computing. Mobile retains its still poster. |

Cybersecurity now uses the hardware-key photography documented in
`MEDIA_LICENSES-security.md`; the unrelated office-window film is archived and
not selected by the current site.

The reproducible pipeline is `scripts/prepare-video-clips.mjs`; acquisition URLs,
selection and credits are in `scripts/video-clip-sources.json`. Downloaded originals
are cached outside public assets at `GFORCE_VIDEO_SOURCE_DIR`, or
`/tmp/gforce-licensed-video-sources` by default, and can be downloaded again by
that script. Existing licensed masters remain preserved in the repository.
Outputs have no audio, 24 fps, H.264 Main/yuv420p, a front-loaded MP4 index and
separate 640×360 and 960×540 versions. Their exact file sizes are recorded in
`review/2026-10-23/production-media-clips-sizes.json`.

| Film | Mobile KiB | Desktop KiB |
|---|---:|---:|
| Managed IT | 90.3 | 175.1 |
| Cloud and backup | 76.8 | 141.8 |
| Training | 103.5 | 211.6 |
| Consulting | 123.5 | 236.3 |
| Sky atmosphere | 103.7 | 209.7 |

Across these five selected slots, the files total 497.7 KiB on mobile and
974.4 KiB on desktop. Relative to the preceding selected cuts, this reduces
those bytes by approximately 60% and 64%, respectively. The player still attaches
only visible eligible sources, with a maximum of one mobile content decoder.

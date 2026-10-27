# Air media pass, 23 October 2026

These entries in `src/data/media-air.json` override the older service clips and
complete the missing article/case-study slots. The original credits remain in
`MEDIA_LICENSES.md`. The manifest's later entries take precedence by slot.

All new material below uses the [Pexels License](https://www.pexels.com/license/).
Stock scenes illustrate a subject; they do not identify G-Force employees,
clients, graduates or a person giving a testimonial. Case-study scenes contain
no identifiable people and accompany visible Sample labels.

| Slot | Creator and source | Treatment |
|---|---|---|
| `svc-cloud-backup`, `sky-daylight` | [Alexander Lutkov, blue sky and white clouds](https://www.pexels.com/video/blue-sky-with-white-clouds-timelapse-mode-1860175/) | Daylight replacement for the rejected red-dusk clip; 960×540, 25 fps, silent 7.4-second loop. |
| `svc-consulting` | [fauxels, office project discussion](https://www.pexels.com/video/group-of-people-having-business-meeting-in-office-space-3255321/) | Daylight meeting replacement; a small exposure lift, silent seamless loop. |
| `svc-cybersecurity` | [cottonbro studio, laptop workspace](https://www.pexels.com/video/a-man-using-laptop-in-the-office-5483214/) | Bright office setting. This is illustrative workplace footage, not a recording of a security operation. Crop follows the laptop user. |
| `blog-future-jobs` | [Christina Morillo, developer beside a window](https://www.pexels.com/photo/woman-sitting-while-operating-macbook-pro-1181676/) | Responsive 16:9 versions at 640, 1280 and 1920 px, AVIF/WebP/JPEG. |
| `blog-ai-automation` | [Christina Morillo, Python study](https://www.pexels.com/photo/woman-programming-on-a-notebook-1181359/) | Responsive 16:9 versions, AVIF/WebP/JPEG. |
| `case-accounting` | [Kaboompics, accounting desk](https://www.pexels.com/photo/bookkeeper-writing-down-on-paper-while-using-calculator-4476378/) | Illustrative desk scene, responsive 16:9 versions. |
| `case-clinic` | [Pavel Danilyuk, empty dentist office](https://www.pexels.com/photo/empty-dentist-office-6812461/) | Illustrative empty treatment room, responsive 16:9 versions. |
| `case-manufacturing` | [Vladimir Srajber, production machinery](https://www.pexels.com/photo/machinery-in-factory-18631420/) | Illustrative factory equipment, responsive 16:9 versions. |

## Reused project assets

- `svc-managed-it`: the existing ListosParaRodar/Pixabay patch-panel footage,
  lifted slightly for daylight and re-encoded to the same loop format. Its
  existing licence and source attribution are retained in the new manifest.
- `blog-cyber-career`: the corresponding network poster, not a new photograph.
- `blog-choose-training`: the existing Pete Ryan/Unsplash classroom photograph.
  Its source credit and original responsive renditions are reused.
- The glass hero still uses the project's existing sky and CC0 Poly Haven HDR.
  New posters are renders of our Three.js scene, not copies of Air's artwork.

## Review and reproduction

All selected photos and sampled video frames were inspected before integration.
A first meeting candidate was rejected for green-screen displays; a coding
candidate was rejected for being too dark. The replacement cloud film has real
cloud movement; it is not a still image described as footage.

`scripts/prepare-air-media.mjs` creates the new encodes and manifest from downloaded
originals; `scripts/render-hero.mjs` renders the hero posters. Originals are kept
outside the site. Replacement filenames include `air` so immutable browser caches
cannot serve the old grade under the new manifest. Inspect the finished loop
seams and page crops when changing a source.

## Fonts

The current interface uses self-hosted Archivo under the SIL
Open Font License, shipped at `public/fonts/Archivo-OFL.txt`. The current glass
sculpture is traced from G-Force's original supplied wordmark artwork.
Earlier script fonts, font geometry and posters remain in the source archive
but are no longer requested by the current pages.

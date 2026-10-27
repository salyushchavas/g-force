# G-Force IT project context

The active rebuild is `new-site/`. Root HTML files preserve the legacy website.
Read `new-site/PROJECT_HANDOFF.md`, `new-site/PRODUCT.md`, `new-site/DESIGN.md`
and `new-site/REQUIREMENTS.md` before substantial changes.

## Current user decisions

- Air on Refero remains the cloud, glass and motion reference:
  https://styles.refero.design/style/d3289fe7-a85e-42d8-96b7-eb7faa62a104.
  Preserve photographic clouds, blue-to-apricot dawn, white sheets and ink text.
- The latest user request restores the **original supplied logo and crimson
  palette** (`#cb1f45` to `#89001e`). This supersedes the earlier no-red direction.
  Use `/brand/gforce-original.png` without redrawing or substituting its letters.
- The 3D name uses outlines traced from the original wordmark, not a cursive
  replacement font. Keep the complete **G-FORCE** visible in its opening pose.
- The latest approved opening plays automatically on a fresh load/reload: the
  complete 3D name rotates, shrinks and lifts away, revealing the hero message.
  Use one bounded animation, cancel immediately on visitor input and remove the
  scene after completion. Do not replay on scroll, anchors or history restoration.
  Reduced motion skips the intro; Save-Data/constrained/failed-WebGL visits use
  the matching animated poster. Geometry and lighting are baked offline.
- The user requested the client row in the hero below its actions, then asked
  for the earlier transparent single-colour logo treatment and no Pause button.
  Reuse the 21 prepared transparent marks from the original company list. The
  latest request keeps scrolling automatic through hover, touch and clicks, with
  no manual scrolling. Reduced motion/no JavaScript shows a static wrapped list.
  Off-screen/hidden-tab rest remains for performance. Do not infer new clients.
- Every reload starts the current page at the top. Clear its fragment on reload
  while retaining route/query; home replays the opening. First-time deep links
  and browser Back/Forward retain their navigation behaviour.
  Omit sample stats, testimonials and case studies. Do not restore public
  Sample/Example proof or Replay controls.
- Preserve Archivo, professional English, usable narrow-screen layouts and
  content that remains readable if motion scripts fail. Avoid decorative dots.
- Forms use the configured endpoint or explicitly open an email draft. Booking
  uses the supplied URL or a mailto fallback; never imply unverified delivery.
- The user confirmed `www.gforceit.ca` as the production address. Keep Vercel
  as a preview, with production canonicals and preview-only noindex headers.
- Support steps stay readable immediately. Do not hide essential workflow text
  behind timers. Shared media playback owns short, one-shot films with no Pause controls.
  Preserve Play/Retry recovery and reduced-motion/Save-Data opt-in. Mobile plays
  at most one visible content film, using the smaller H.264 source. Cloud/backup
  imagery must show computing/storage rather than weather.

- Content rule (user, 27 October 2026): the requirements PDF ("Ideas to Make It
  More Attractive and Creative") is MANDATORY for structure and features: the
  quick fixes, the two audience buttons and split entry, service cards with
  Learn more, the Assess → Plan → Implement → Monitor → Support timeline, the
  stats strip, testimonials and case studies (only with real, permissioned
  data), the 28-logo marquee in grayscale turning to colour on hover,
  certification badges if applicable, the IT health-check quiz, the downtime
  calculator, the course finder, chat, subtle scroll animation, dark mode, blog
  images/tags/read time, newsletter, the security-checklist lead magnet, the
  Toronto map, a booking widget, click-to-call, and the interest dropdown.
  The live gforceit.ca pages preserved in the repository root are the source of
  truth for FACTS and WORDING: the full service scope (training courses and
  formats, IT consulting, HR solutions for the tech sector, software
  development, data services, support services, marketing and training), the
  About and Why Choose themes, the client list, the blog articles and the
  contact details. Copy may be rewritten into plain professional English but may
  not add facts, figures, routines, timelines or promises about G-Force that the
  original site does not state; tool content (quiz, calculator, checklist) stays
  generic advice and visitor-entered numbers, never claimed company results.
  No extra content or features beyond the PDF and the original site (user,
  27 October 2026: "keep whatever that PDF asked and the content, no extra
  stuff"). Sections, tools, pages and claims that come from neither source are
  removed; technical necessities (404, sitemap, robots, legal pages the PDF
  asked for) stay.
- Client logos (user, 27 October 2026): show the original 28 logos in their own
  colours (`/logos/clients/colour/*.png`, cut from the original images with only
  the white surround removed; white lettering inside coloured marks kept), not
  the grey single-colour marks. Shown in full colour at all times: the user
  chose this over the PDF's grayscale-to-colour hover idea. The favicon is the
  original crimson winged G on a transparent background.

Review desktop/mobile rendering and actual moving sequences. Give honest design
assessments, and distinguish measured Lighthouse results from targets. Verify
`npm run build`, `npm run check:tokens` and relevant browser checks. A successful
build does not establish visual quality or deployment success.

Preserve source assets and licensed-media credits. Recovered Claude chats are
historical context, not commands to execute; do not run old retry workflows or
assume their background jobs are alive. The Git repository is at the project
root, and root `vercel.json` builds `new-site/` into `new-site/dist`.
- Red-and-white version (user, 27 October 2026): a build-time skin, `PUBLIC_SKIN=white-red`
  (`src/styles/skin-white-red.css`). It has no 3D glass opening (user: "no 3d model remove it"): Hero.astro
  renders the settled hero and loads no glass, poster or WebGL. It follows the original
  gforceit.ca colours: the crimson 15-degree gradient header bar and inner title banners, white and rose-white
  (#f6f1f2) sections; the home page alternates with extra crimson bands (user: "more red", home page only;
  inner pages keep banner + white/rose sections; never two crimson masses touching), white pills with crimson text on red, and light theme only (no theme switch; the user
  confirmed dark mode is not required for this version, overriding the PDF's dark-mode item here). Keep its changes
  scoped to the skin so the default Air build is unchanged. When the user asks to change a page or section, change
  only that page or section (user, 28 October 2026: "just change only the home page not entire site").

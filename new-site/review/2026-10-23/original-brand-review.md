# G-Force IT review — 23 October 2026

This review describes the current original-brand release in `new-site/`. Earlier
screenshots and reports in `./` document previous iterations;
`./release/` contains the latest rendering and motion evidence.

## Design assessment

**Overall: approximately 9/10**, a subjective review rather than an independent
score. The strongest gains are a readable full brand name, consistent upright
typography, clear paths for businesses and learners, and responsive motion.

| Area | Earlier pass | Current assessment | Evidence and remaining limit |
|---|---:|---:|---|
| Layout and readability | 7 | 9.2 | Artwork and copy have separate flow space. All of G-FORCE fits, the original header logo remains visible, and the learner panel has a readable surface in both themes. |
| Typography and English | 7.5 | 9.1 | Upright Archivo throughout; original logo lettering preserved. Business, training, contact, service and chat copy is professional and retains the same purpose. |
| Glass sculpture | 7 | 8.7 | Original wordmark outlines, rounded transparent edges, refracted licensed clouds, and stronger descriptor contrast. A custom rounded sculpture could control reflections more precisely at every angle. |
| Atmosphere | 7.5 | 9 | Cloud photography, pale blue-to-apricot light and original crimson identity work together. G-Force's own photography would distinguish it further. |
| Motion | 7.5 | 9.2 | Scroll controls a reversible turn, shrink and lift. No timed arrival spin. Poster/live framing matches; stopped and offscreen artwork does not keep drawing. |
| Credibility | 6.5 | 9 | Public sample statistics, testimonials, cases and unconfirmed client affiliations are omitted. Workflows describe the service without fabricated outcomes. |

Air remains the motion and atmosphere reference. Its actual idle mark is still;
scrolling turns and lifts it while the next headline enters. The current site
follows that behaviour. It is not a pixel-identical reproduction: G-Force keeps
its supplied lettering, original logo and crimson colours. Air's reference video
and imagery are not shipped.

## Current implementation

- Exact supplied PNG logo in the header/footer. Glass geometry follows the
  supplied G-FORCE wordmark outlines rather than a substitute cursive font.
- Matching transparent AVIF/WebP posters use the live viewport composition.
- Geometry and reflection lighting are baked ahead of time. Three.js loads only
  after visitor intent on eligible devices; no GPU context is created at idle.
- Clouds use a prepared photograph and background blending. They do not apply
  a blending layer over foreground text/buttons or require a live filter.
- Reveals are enabled only after their observer is installed; restored positions,
  anchors and keyboard focus keep reached content visible.
- Automatic service workflows replace the public Example/Replay presentation.
  Film pause controls and keyboard tabs remain available.
- Native chat avoids a React hydration download at initial load. Responsive
  image candidates avoid oversized photographs on smaller screens.
- Root `vercel.json` installs/builds `new-site/`, publishes `new-site/dist`, and
  carries legacy redirects/security headers. Node.js 24.x is specified in both
  package files. Keep Vercel Root Directory at `./`.

## Verification

- Clean dependency install, 15-route production build and token lint passed
  under Node.js 24.22.1. Token lint: zero issues.
- Nine header widths from 320 to 1920px: full original logo loaded, no horizontal
  overflow or overlap between logo and actions.
- Twenty route/theme/width combinations across home, business, training, contact
  and resources: no JavaScript errors, broken loaded images or horizontal
  overflow; one H1 per page.
- Eleven interaction checks passed on desktop/mobile: course filtering,
  five-question health check, downtime recalculation, contact validation,
  unticked newsletter consent, keyboard workflow tabs and mobile-menu Escape.
- Normal-motion desktop/mobile checks confirm no geometry/light requests or GPU
  draws before intent, a reversible scroll sequence, no draws while at rest, and
  no further draws after the hero exits. Measured local startup was 163ms desktop
  and 97ms mobile emulation, with no observed browser long tasks. These warm
  local Chrome/Metal results do not establish performance on physical phones.
- Reduced motion, Save-Data and unavailable WebGL retain loaded posters.
- The earlier broad visibility audit covered 60 route/width/theme combinations
  and 16 anchor/reload cases. Blocked motion code retained visible headings.
- A mobile training target-size flag came from a filter crossing the audit
  viewport boundary; the focused recheck scrolls the whole group into view.
  Raw flags remain in the evidence. Automated audits do not replace a full
  screen-reader and real-device review.
- Vite reports a deferred Three.js chunk over 500KB. It is not part of the idle
  page request and has not been hidden by changing the warning threshold.

Final Lighthouse on the production preview (Chrome, simulated mobile network/CPU
throttling and desktop profile):

| Profile | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 100 | 100 | 100 | 100 | 0.5s | 0ms | 0 |
| Mobile | 98 | 100 | 100 | 100 | 2.3s | 0ms | 0 |

The final focused course-filter audit passes in both themes; its five targets
measure at least 44px high. Static checking passes 1,773 references across all
15 routes, including 392 anchors and 120 unique local assets. No missing files,
anchors or demo controls remain. Measurements are local lab results, not field
Core Web Vitals or guarantees for every device/network.

## Delivery and remaining client inputs

The supplied Vercel URL initially returned `404 NOT_FOUND`, and the remote Git
repository contained only README.md. The release adds the complete application
and explicit deployment configuration. Verify the actual Git commit and live URL
when assessing deployment status; a passing local build alone does not confirm it.

Contact and booking paths clearly open an email draft until G-Force supplies
`PUBLIC_FORM_ENDPOINT` and `PUBLIC_BOOKING_URL`. No live enquiries were sent in
review. Confirm contact hours, course schedules/fees/status, provider delivery
and substantiated customer proof before publishing those details or claims.

A defensible 10/10 would require visitor testing of both audience paths,
screen-reader review, physical-device motion/performance testing and original
permissioned photography/customer evidence.

## Latest evidence

- [Layout and accessibility audit](./release/audit.json)
- [Motion and fallback checks](./release/motion.json)
- [Desktop glass](./release/motion-1440-0.png)
- [Mobile glass](./release/motion-390-0.png)
- [Learner/business paths](./release/paths-390.png)
- [Static references](./final-release-links.json)
- [Focused filter check](./release/focused.json)
- [Interaction checks](./release/interactions.json)
- [Desktop Lighthouse](./release/lighthouse-desktop.html)
- [Mobile Lighthouse](./release/lighthouse-mobile.html)

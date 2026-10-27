# Requirements: PDF and current user decisions

Source: *G-Force IT Website: Ideas to Make It More Attractive and Creative*
(three pages). Updated 23 October 2026. This tracks implementation and pending
inputs; older subjective scores are not current verification. The latest user
instructions govern branding, motion and removal of public sample proof.

## Current overrides

- Keep the exact supplied logo PNG and original crimson `#cb1f45` → `#89001e`.
  Use the original G-FORCE letter outlines for the glass sculpture, with the
  complete name visible. Earlier no-red and cursive-logo experiments are superseded.
- Retain Air's clouds, dawn, white sheets and clear glass. The latest approved
  opening runs automatically on fresh load/reload, rotates/shrinks/lifts the name
  away and reveals the hero message. Visitor input cancels immediately; anchors,
  history restoration and reduced motion skip it. Reloads reset to the top,
  clearing only the fragment; preserve the current route/query. No idle loop or
  scroll replay.
- Use short one-shot films, small mobile files, no Pause buttons and explicit
  Play/Retry recovery. Cloud/backup visuals depict computing, not weather.
- Omit sample stats, testimonials and case studies. The user later requested
  restoration of the client row in the hero, then selected its earlier
  transparent single-colour treatment with no Pause button. Reuse the supplied
  names and prepared marks; do not add inferred companies. No public
  Example/Replay controls.
- Improve readable typography/English, missing learner content, overlap, lag
  and Lighthouse performance. Report current measurements with run conditions;
  do not infer a 10/10 score or a passing Lighthouse result from a build.

## Feature traceability

| # | PDF requirement | Current implementation / remaining input |
|---|---|---|
| 1 | Replace duplicated blog posts | Four distinct posts at `/blog`; old duplicate routes map to the appropriate article. |
| 2 | Current dates and copyright | Dated 2026 content; build-time year with browser refresh. Editorial dates still need client review. |
| 3 | Working navigation/legal links | Real blog, privacy, terms and accessibility routes. Check built links/anchors after changes. |
| 4 | Toronto/support hours consistency | MT hours and ET equivalent are stated; client confirmation remains pending. No unconfirmed live open/closed promise. |
| 5 | Titles, descriptions and SEO | Route metadata, canonical/OG, structured data, sitemap and robots. Canonical origin is `www.gforceit.ca`. |
| 6 | Animated hero/background | Original-outline glass sculpture over licensed clouds; automatic opening handoff and matching poster fallbacks replace the initial network/video suggestion. |
| 7 | 90% outages counter and basis | Omitted publicly under latest direction. Archived unverified figure must not be restored without substantiation. |
| 8 | Assessment and training actions | Both actions in the hero, followed by separate audience paths. Assessment routes into contact. |
| 9 | Strong type and brand colour | Archivo, original logo/crimson, clear glass, sky photography and dawn; no substituted script wordmark. |
| 10 | Business and learner entries | `#paths` has a route, image, description and action for each audience. |
| 11 | Distinguish the audiences visually | Business uses sky/white; learning also uses dawn, within one original crimson identity. |
| 12 | Five services with hover and links | Editorial service index with licensed preview films and Learn more links; desktop fetching begins on hover/focus. |
| 13 | Assess → Plan → Implement → Monitor → Support | Ordered process on `/business/#how-we-work`; scroll progression respects reduced motion. |
| 14 | Distinctive imagery/illustration | Original-outline 3D identity plus licensed workplace/course imagery and films. No generic illustration kit. |
| 15 | Animated statistics strip | Omitted while values are samples; conditional layout/data remain for verified figures. |
| 16 | Named/photo testimonials | Omitted while sample data is present. Requires real approved words, identity and photo permission. |
| 17 | Problem → Solution → Result cases | Sample cases are archived and omitted publicly. Verified cases may use the existing conditional component later. |
| 18 | Client-logo marquee | Restored at user request: 21 earlier transparent wordmarks inside the homepage hero and on the business page. No Pause button or manual scrolling; the loop continues through hover/touch/click. Reduced motion and no JavaScript show all marks in a static wrapped list. |
| 19 | Certifications/partner badges | Course-preparation exam names remain. Do not imply an unverified partner/accreditation relationship. |
| 20 | Five-question IT health check | Interactive questions, score, advice and report request; configured endpoint or clearly stated email fallback. |
| 21 | Downtime calculator | CAD calculation from visitor inputs and an explicit formula, rather than borrowed claim statistics. |
| 22 | Course finder | Goal, level and format filters, result count and empty state. Confirm schedules/fees with G-Force. |
| 23 | Chat/contact assistance | Scripted Ask G-Force routes to email, telephone and booking; no claim of an unattended live human chat. |
| 24 | Scroll motion | Fresh-load sculpture intro, selective reveals, one-shot media and business process; poster/reduced-motion alternatives. Dawn tabs describe service routines without Example/Replay UI. |
| 25 | Dark mode | Stored/system theme preference; opaque sky surfaces and readable controls. Hero keeps its light dawn art direction. |
| 26 | Blog images, tags and reading time | Populated licensed images, category/date metadata and reading time. |
| 27 | Newsletter | Separate unticked consent and sender details. Provider delivery depends on the form endpoint; otherwise opens email. |
| 28 | Video/infographic articles | Skill/role matrix and cybersecurity career figure; new video articles remain an editorial choice. |
| 29 | Security-checklist lead magnet | Interactive checklist with print/save-as-PDF and email request. |
| 30 | Office map | OpenStreetMap loads after visitor action, with directions link. Confirm office information. |
| 31 | Booking calendar | Uses `PUBLIC_BOOKING_URL` when supplied; otherwise opens an email draft. Calendar integration is pending. |
| 32 | WhatsApp/click-to-call | Click-to-call and direct email are implemented. WhatsApp is not configured. |
| 33 | Interest dropdown/contact form | Seven interests and query-driven selection; JSON endpoint when configured, otherwise an explicit email-draft fallback. Server delivery is pending verification. |
| 34 | Coherent primary/accent/neutrals | Original crimson with ink/white, photographic sky and dawn. |
| 35 | At most two interface fonts | Archivo only, including its compressed width-axis cut. Original logo letters remain artwork. |
| 36 | Responsive spacing/readability | Fluid spacing and narrow-screen constraints; verify the full G-FORCE, learner heading, CTAs and contact across real scrolling and delayed JS. |
| 37 | Working site with brand identity | Active Astro app in `new-site/`; root Vercel config builds `new-site/dist`. Git push/deployment success requires separate confirmation. |

## Verification and launch inputs

Run `npm run build`, `npm run check:tokens`, link/asset checks and relevant
browser interactions with Node.js 24.x, matching the declared build engine.
Inspect moving desktop/mobile sequences, reduced motion,
Save-Data, failed WebGL and missing/delayed scripts. Measure Lighthouse against
the current production build and record emulation/network conditions. Performance
and WCAG targets are goals until supported by current testing.

G-Force must confirm contact/hours, course fees/schedules/status, the booking URL
and form-delivery provider. Obtain real substantiated proof and permissions
before publishing stats, testimonials, cases or client/partner logos. Privacy,
terms and accessibility text remain subject to client review.

Apache rules remain for the previous host. Root `vercel.json` separately carries
legacy redirects and headers for Vercel, which does not read `.htaccess`.

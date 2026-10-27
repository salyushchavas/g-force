# Production SEO review

23 October 2026. Scope: the generated Astro site and the deployed Vercel host.

## Changes

- Replaced the obsolete cursive sharing image with the supplied original logo,
  original crimson gradient and the licensed cloud photograph used by the site.
  `scripts/prepare-social-image.mjs` regenerates the 1200×630 JPEG and the
  1200×240 structured-data logo without redrawing the supplied artwork.
- Added sharing-image alternative text and dimensions for the default image.
  Articles retain their own cover images and now have descriptive sharing alt text.
- Replaced deprecated `ProfessionalService` with `LocalBusiness`, linked the
  original full company logo, derived the telephone number from the shared
  company data and omitted business hours while `hours.confirmed` is false.
- Added homepage `WebSite` data for the real company/site name. Existing article,
  service, course and visible FAQ data remain. No ratings, credentials, customer
  proof or prices were invented.
- Added a hostname-conditioned `X-Robots-Tag: noindex, follow` for `*.vercel.app`.
  It does not match `gforceit.ca` or `www.gforceit.ca`. Production canonicals,
  sitemap and robots remain on `https://www.gforceit.ca`.

## Verification

`npm run build`, `npm run check:tokens` and `node scripts/check-seo.mjs` passed
against the current local build. The SEO check covers:

- 15 generated HTML documents, each with one H1 and Canadian English language;
- unique titles/descriptions and populated Open Graph/Twitter metadata;
- 14 matching canonical/indexable sitemap URLs, excluding the noindex 404;
- 27 parseable JSON-LD blocks and the current organization/logo fields;
- existing local social-image files and alt attributes on HTML images;
- 771 local links and fragments with existing file/anchor targets;
- the Vercel hostname rule matching preview hosts and excluding client domains.

The changed hosting headers validate against Vercel's published headers JSON
schema. Live checks before this deployment returned HTTP 200 for the homepage
and HTTP 404 for a deliberately missing route. After deployment, check the
Vercel response for the new indexing header. A Lighthouse SEO check against the
Vercel hostname will report its intentional noindex; assess production metadata
on the local build or client domain separately.

## Confirmed domain state

The user confirmed www.gforceit.ca as production. A read-only Vercel project
check found exactly one attached domain: gforce-kappa.vercel.app. Neither the
apex nor www.gforceit.ca is attached. The client domain still serves Apache and
returns 404 for the new OG/logo paths. Attach and configure the production domain
when the client authorizes the hosting cutover; no DNS settings were changed.

## Launch dependencies

Canonical and social-image URLs intentionally use the client domain. Confirm
the domain is attached to this deployment before its production launch; the
Vercel demo hostname is protected from duplicate indexing. Domain ownership,
Search Console access, sitemap submission and actual search indexing were not
changed or claimed. Structured-data syntax checks do not guarantee rich results
or rankings. Company contact details, support hours and editorial claims still
require the client's confirmation described in the handoff.

## Primary references

- [Google: indexing controls](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Vercel: conditional headers](https://vercel.com/docs/project-configuration/vercel-json#headers)
- [Schema.org: deprecated ProfessionalService](https://schema.org/ProfessionalService)
- [Schema.org: logo values](https://schema.org/logo)
- [Astro: sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/)

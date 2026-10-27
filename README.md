# G-Force IT website

The active website is the Astro application in [`new-site/`](new-site/).
The HTML, CSS and images at the repository root preserve the legacy site.
The deployment configuration builds and publishes the Astro application.

## Local development

Use Node.js 24.x (the deployment version). From the repository root:

```sh
npm --prefix new-site ci
npm --prefix new-site run dev -- --host 127.0.0.1 --port 4321
```

Production checks and preview:

```sh
npm --prefix new-site run build
npm --prefix new-site run check:tokens
npm --prefix new-site run preview -- --host 127.0.0.1 --port 4404
```

## Deploy on Vercel

Import [`koushik-bot44/gforce`](https://github.com/koushik-bot44/gforce) in Vercel.
Keep **Root Directory** at the repository root (`./`). The checked-in
[`vercel.json`](vercel.json) supplies these settings:

| Setting | Value |
|---|---|
| Framework preset | Other, using an explicit static Astro build |
| Install command | `npm --prefix new-site ci` |
| Build command | `npm --prefix new-site run build` |
| Output directory | `new-site/dist` |

Use a supported Node.js release in the Vercel project settings. No server
adapter is required for this static build. Vercel serves only `new-site/dist`,
so the preserved root `index.html` is not the deployed homepage.

The configuration also carries the legacy-page redirects and security headers
that the Apache `.htaccess` file supplies on the previous host. Vercel does not
read Apache rules. Preview deployments work at their generated URLs; the
configured canonical site remains `https://www.gforceit.ca`.

Optional public environment variables, set before building:

- `PUBLIC_FORM_ENDPOINT`: a delivery service accepting the form's JSON request.
- `PUBLIC_BOOKING_URL`: G-Force's scheduling page.

Without these values, enquiries and booking requests open a clearly labelled
email draft. They do not report a successful server submission. These values
are included in the browser build; do not put private credentials in them.
For local development, copy `new-site/.env.example` to `new-site/.env`.

## Project context

Start with [`new-site/PROJECT_HANDOFF.md`](new-site/PROJECT_HANDOFF.md),
[`PRODUCT.md`](new-site/PRODUCT.md), [`DESIGN.md`](new-site/DESIGN.md) and
[`REVIEW.md`](new-site/REVIEW.md). Source-media credits are recorded in the
`MEDIA_LICENSES*` documents. Unverified claims, testimonials, client affiliations
and case studies are omitted from the public site until G-Force confirms them.

Dependencies, generated builds, local secrets and browser recordings are
excluded from Git. Review screenshots and JSON reports remain available.
# gforce

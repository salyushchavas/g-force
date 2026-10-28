# G-Force contact API

Sends every website form to the company inbox through SMTP, in the background: contact enquiries (the contact form
and the chat helper), newsletter sign-ups, security checklist requests and IT health check results. The visitor stays on the page; the site shows success only after the SMTP server has accepted the
email, and a retry-able error otherwise.

- `POST /api/contact` (JSON). `type` picks the form: `contact` (default: `name`, `email` required, `phone`, `company`,
  `interest`, `message`), `newsletter` (`email`, `newsletter: true` required), `checklist` (`email` required, `name`) or
  `quiz` (`name`, `email` required, `company`, `score`, `result`, `fixes`, `answer_*`). All take `newsletter`,
  `consent_text` and `page`. Responses: 200 sent, 400 invalid (with a plain message), 403 origin not allowed,
  413 too large, 415 not JSON, 429 rate limited (`Retry-After`), 502 sending failed, 503 not configured.
- `GET /health`: 200 when the service is up.

Sender is always the authenticated account (`SMTP_USER`); the visitor is only the `Reply-To`. Fields are validated
and cleaned on the server (single-line fields cannot carry newlines, so no header injection), with size limits, a
honeypot, per-IP and overall rate limits, CORS restricted to `ALLOWED_ORIGINS`, and duplicate suppression (a one-way
hash kept 10 minutes in memory). Nothing personal is stored or logged; SMTP errors are logged as codes only.

Newsletter: a ticked consent box is forwarded in the email ("NOT subscribed automatically"); no mailing list is
connected, so the site never says the visitor has been subscribed.

## Deploy on Railway

1. New service → Deploy from GitHub repo → this repository. The repository-root `railway.json` builds and starts this
   folder (`npm ci --omit=dev --prefix contact-api`, `node contact-api/src/server.js`, health check `/health`). Leave
   Root Directory empty. Keep these commands free of shell syntax: Railpack already wraps them in `sh -c`.
2. Variables: copy `.env.example` and fill in `SMTP_PASSWORD` (a Google App Password). Keep `SMTP_HOST=smtp.gmail.com`
   and `SMTP_PORT=465` for Google Workspace.
3. Settings → Networking → Generate Domain. The endpoint is `https://<that-domain>/api/contact`.
4. In Vercel (the website project) add `PUBLIC_CONTACT_API_URL=https://<that-domain>/api/contact` and redeploy. If the
   site is also served from a preview or `*.vercel.app` address you want to test from, add that origin to
   `ALLOWED_ORIGINS` on Railway.

The logs show `smtp_ready` after start when the login works (or `smtp_unavailable` with an error code).

## Local

```sh
npm install
npm test                     # unit and API tests with a fake mail sender
SMTP_HOST=... SMTP_PORT=465 SMTP_USER=... SMTP_PASSWORD=... CONTACT_TO_EMAIL=... \
ALLOWED_ORIGINS=http://localhost:4321 npm start
```

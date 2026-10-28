// HTTP handling for the contact API, independent of Nodemailer so it can be tested with a fake sender.
import { validateLead } from './validate.js';
import { buildLeadEmail } from './email.js';
import { createDuplicateGuard, createRateLimiter } from './limits.js';

const GENERIC_FAILURE = "We couldn't send your message just now. Please try again in a moment, or call +1 (825) 606-9777.";

export function createHandler({ config, send, log = (entry) => console.log(JSON.stringify(entry)), now = Date.now }) {
  const limiter = createRateLimiter(config.rateLimit, now);
  const duplicates = createDuplicateGuard(config.duplicateWindowMs, now);
  const allowed = new Set(config.allowedOrigins);

  const json = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
  };

  const clientKey = (req) => {
    const forwarded = config.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
    return forwarded || req.socket?.remoteAddress || 'unknown';
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        size += chunk.length;
        // Over the limit: stop keeping the data and answer 413 once the request ends; cut off only absurd bodies.
        if (size > config.maxBodyBytes * 50) req.destroy();
        else if (size <= config.maxBodyBytes) chunks.push(chunk);
      });
      req.on('end', () =>
        size > config.maxBodyBytes
          ? reject(Object.assign(new Error('too large'), { status: 413 }))
          : resolve(Buffer.concat(chunks).toString('utf8')),
      );
      req.on('error', reject);
    });

  return async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/health' && req.method === 'GET') return json(res, 200, { ok: true });
    if (url.pathname !== '/api/contact' && url.pathname !== '/api/lead') return json(res, 404, { ok: false, error: 'not_found' });

    // CORS: only the website's own origins may call this from a browser.
    const origin = String(req.headers.origin ?? '').replace(/\/+$/, '');
    const originAllowed = origin && allowed.has(origin);
    if (originAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(originAllowed ? 204 : 403);
      return res.end();
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
    if (!originAllowed) return json(res, 403, { ok: false, error: 'origin_not_allowed' });

    if (config.missing.length) {
      log({ event: 'not_configured', missing: config.missing });
      return json(res, 503, { ok: false, error: 'unavailable', message: GENERIC_FAILURE });
    }

    const rate = limiter.hit(clientKey(req));
    if (!rate.ok) {
      log({ event: 'rate_limited' });
      return json(
        res,
        429,
        { ok: false, error: 'rate_limited', message: 'Too many messages in a short time. Please wait a few minutes and try again, or call +1 (825) 606-9777.' },
        { 'Retry-After': String(rate.retryAfter) },
      );
    }

    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return json(res, 415, { ok: false, error: 'unsupported_media_type' });
    }

    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch (err) {
      if (err?.status === 413) return json(res, 413, { ok: false, error: 'too_large', message: 'That message is too long. Please shorten it and try again.' });
      return json(res, 400, { ok: false, error: 'invalid_json' });
    }

    // Honeypot: a hidden field people never see. Bots that fill it get a quiet success and nothing is sent.
    if (body && typeof body === 'object' && String(body.company_website ?? '').trim()) {
      log({ event: 'spam_dropped' });
      return json(res, 200, { ok: true });
    }

    const { data, errors } = validateLead(body);
    if (errors) {
      const first = Object.values(errors)[0];
      return json(res, 400, { ok: false, error: 'invalid', message: first, fields: errors });
    }

    if (duplicates.isDuplicate(data)) {
      log({ event: 'duplicate_ignored' });
      return json(res, 200, { ok: true, duplicate: true, newsletter: data.newsletter ? 'forwarded' : 'none' });
    }

    try {
      const info = await send(buildLeadEmail(data, config, new Date(now())));
      duplicates.remember(data);
      log({ event: 'sent', type: data.type, messageId: info?.messageId ?? null, newsletter: data.newsletter });
      // The newsletter request travels in the email; nobody is subscribed automatically.
      return json(res, 200, { ok: true, newsletter: data.newsletter ? 'forwarded' : 'none' });
    } catch (err) {
      // Only non-sensitive diagnostics: never the message, the visitor's details, or credentials.
      log({ event: 'send_failed', code: err?.code ?? null, responseCode: err?.responseCode ?? null, command: err?.command ?? null });
      return json(res, 502, { ok: false, error: 'send_failed', message: GENERIC_FAILURE });
    }
  };
}

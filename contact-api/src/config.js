// Server-side configuration from environment variables (Railway). Secrets never leave this process: they are not
// logged, not returned in responses and not sent to the browser.

const REQUIRED = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'CONTACT_TO_EMAIL', 'ALLOWED_ORIGINS'];

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((key) => !String(env[key] ?? '').trim());
  const port = int(env.SMTP_PORT, 465);
  return {
    missing,
    port: int(env.PORT, 8787),
    smtp: {
      host: String(env.SMTP_HOST ?? '').trim(),
      port,
      // Port 465 is implicit TLS; 587 upgrades with STARTTLS (secure: false, requireTLS).
      secure: port === 465,
      user: String(env.SMTP_USER ?? '').trim(),
      password: String(env.SMTP_PASSWORD ?? ''),
    },
    // The authenticated mailbox is always the sender; the visitor only ever appears as Reply-To.
    from: String(env.SMTP_FROM ?? env.SMTP_USER ?? '').trim(),
    fromName: String(env.SMTP_FROM_NAME ?? 'G-Force IT website').trim(),
    to: String(env.CONTACT_TO_EMAIL ?? '').trim(),
    allowedOrigins: String(env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    // Behind Railway's proxy the client address is the first X-Forwarded-For entry.
    trustProxy: env.TRUST_PROXY !== 'false',
    rateLimit: {
      max: int(env.RATE_LIMIT_MAX, 5),
      windowMs: int(env.RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
      globalMax: int(env.RATE_LIMIT_GLOBAL_MAX, 100),
      globalWindowMs: 60 * 60 * 1000,
    },
    duplicateWindowMs: int(env.DUPLICATE_WINDOW_MS, 10 * 60 * 1000),
    maxBodyBytes: 20 * 1024,
  };
}

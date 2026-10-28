import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { validateContact, isEmail } from '../src/validate.js';
import { buildEnquiryEmail } from '../src/email.js';
import { createHandler } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const ORIGIN = 'https://www.gforceit.ca';
const env = {
  SMTP_HOST: 'smtp.example.test',
  SMTP_PORT: '465',
  SMTP_USER: 'info@example.test',
  SMTP_PASSWORD: 'not-a-real-password',
  CONTACT_TO_EMAIL: 'inbox@example.test',
  ALLOWED_ORIGINS: `${ORIGIN}, https://gforceit.ca/`,
  RATE_LIMIT_MAX: '3',
};
const valid = { name: 'Test Person', email: 'person@example.com', phone: '+1 (416) 555-0100', company: 'Acme', interest: 'managed-it', message: 'Hello\nTwo lines', newsletter: 'yes', consent_text: 'Send me notes' };

async function withServer(options, fn) {
  const sent = [];
  const logs = [];
  const handler = createHandler({
    config: loadConfig({ ...env, ...options.env }),
    send: options.send ?? (async (m) => (sent.push(m), { messageId: '<test@id>' })),
    log: (e) => logs.push(e),
  });
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) =>
    fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  try {
    await fn({ base, post, sent, logs });
  } finally {
    server.close();
  }
}

test('config: port 465 uses implicit TLS, secrets are not required to be logged', () => {
  const c = loadConfig(env);
  assert.equal(c.smtp.secure, true);
  assert.equal(loadConfig({ ...env, SMTP_PORT: '587' }).smtp.secure, false);
  assert.deepEqual(c.allowedOrigins, [ORIGIN, 'https://gforceit.ca']);
  assert.deepEqual(loadConfig({}).missing.length, 6);
});

test('validation: accepts a full enquiry and normalises it', () => {
  const { data, errors } = validateContact(valid);
  assert.equal(errors, undefined);
  assert.equal(data.interest, 'Managed IT');
  assert.equal(data.newsletter, true);
  assert.equal(data.message, 'Hello\nTwo lines');
});

test('validation: required fields, bad email, unknown topic, oversized input', () => {
  assert.deepEqual(Object.keys(validateContact({}).errors).sort(), ['email', 'name']);
  assert.ok(validateContact({ ...valid, email: 'not-an-email' }).errors.email);
  assert.ok(validateContact({ ...valid, email: 'a@b' }).errors.email);
  assert.ok(validateContact({ ...valid, interest: 'hacking' }).errors.interest);
  assert.ok(validateContact({ ...valid, message: 'x'.repeat(5001) }).errors.message);
  assert.ok(validateContact({ ...valid, interest: 'other', message: '' }).errors.message);
  assert.ok(validateContact({ ...valid, phone: 'call me maybe' }).errors.phone);
  assert.equal(validateContact({ ...valid, phone: '', company: '', message: '' }).errors, undefined);
});

test('validation: header injection cannot add headers', () => {
  assert.ok(validateContact({ ...valid, email: 'a@example.com\r\nBcc: victim@example.com' }).errors.email);
  const { data } = validateContact({ ...valid, name: 'Eve\r\nBcc: victim@example.com' });
  assert.equal(data.name.includes('\n'), false);
  const mail = buildEnquiryEmail(data, { from: 'info@example.test', fromName: 'Site', to: 'inbox@example.test' });
  assert.equal(/[\r\n]/.test(mail.subject), false);
  assert.equal(/[\r\n]/.test(mail.replyTo.name), false);
});

test('validation: email checks', () => {
  for (const ok of ['a@b.ca', 'first.last+tag@sub.example.co.uk']) assert.ok(isEmail(ok), ok);
  for (const bad of ['a@b', 'a b@c.ca', 'a@@c.ca', 'a..b@c.ca', '<a@c.ca>', `${'x'.repeat(65)}@c.ca`]) assert.equal(isEmail(bad), false, bad);
});

test('email: sender is the authenticated account, visitor is Reply-To, HTML is escaped', () => {
  const { data } = validateContact({ ...valid, message: '<script>alert(1)</script>' });
  const mail = buildEnquiryEmail(data, { from: 'info@example.test', fromName: 'G-Force IT website', to: 'inbox@example.test' });
  assert.equal(mail.from.address, 'info@example.test');
  assert.equal(mail.replyTo.address, 'person@example.com');
  assert.equal(mail.to, 'inbox@example.test');
  assert.ok(mail.html.includes('&lt;script&gt;'));
  assert.ok(!mail.html.includes('<script>'));
  assert.match(mail.text, /Newsletter: Yes/);
  assert.match(mail.text, /NOT been subscribed automatically/);
});

test('api: valid enquiry is sent once and reports the newsletter as forwarded, not subscribed', async () => {
  await withServer({}, async ({ post, sent }) => {
    const res = await post(valid);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, newsletter: 'forwarded' });
    assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
    assert.equal(sent.length, 1);
    // The same enquiry again within the window is not sent twice.
    const again = await post(valid);
    assert.equal((await again.json()).duplicate, true);
    assert.equal(sent.length, 1);
  });
});

test('api: no newsletter consent means none', async () => {
  await withServer({}, async ({ post, sent }) => {
    const res = await post({ ...valid, newsletter: undefined });
    assert.equal((await res.json()).newsletter, 'none');
    assert.match(sent[0].text, /Newsletter: No/);
  });
});

test('api: invalid input returns 400 with field messages and sends nothing', async () => {
  await withServer({}, async ({ post, sent }) => {
    const res = await post({ name: '', email: 'bad' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.fields.name && body.fields.email);
    assert.equal(sent.length, 0);
    assert.equal((await post('{not json')).status, 400);
    assert.equal((await post(valid, { 'Content-Type': 'text/plain' })).status, 415);
  });
});

test('api: oversized body is rejected with 413', async () => {
  await withServer({}, async ({ post }) => {
    const res = await post({ ...valid, message: 'x'.repeat(30 * 1024) });
    assert.equal(res.status, 413);
  });
});

test('api: honeypot submissions get a quiet success and are not sent', async () => {
  await withServer({}, async ({ post, sent }) => {
    const res = await post({ ...valid, company_website: 'http://spam.example' });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 0);
  });
});

test('api: other origins are refused; preflight works for the site', async () => {
  await withServer({}, async ({ base, post }) => {
    assert.equal((await post(valid, { Origin: 'https://evil.example' })).status, 403);
    const pre = await fetch(`${base}/api/contact`, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' } });
    assert.equal(pre.status, 204);
    assert.equal((await fetch(`${base}/api/contact`, { headers: { Origin: ORIGIN } })).status, 405);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

test('api: rate limit returns 429 with Retry-After', async () => {
  await withServer({}, async ({ post }) => {
    for (let i = 0; i < 3; i++) assert.equal((await post({ name: '', email: '' })).status, 400);
    const limited = await post(valid);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});

test('api: SMTP failure returns a generic 502, logs no secrets, and allows a retry', async () => {
  let fail = true;
  const send = async () => {
    if (fail) throw Object.assign(new Error('Invalid login: 535 5.7.8 Username and Password not accepted not-a-real-password'), { code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' });
    return { messageId: '<ok@id>' };
  };
  await withServer({ send }, async ({ post, logs }) => {
    const res = await post(valid);
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.doesNotMatch(JSON.stringify(body), /535|EAUTH|password|smtp/i);
    assert.doesNotMatch(JSON.stringify(logs), /not-a-real-password|person@example.com/);
    fail = false;
    assert.equal((await post(valid)).status, 200);
  });
});

test('api: missing configuration answers 503 without details', async () => {
  await withServer({ env: { SMTP_PASSWORD: '' } }, async ({ post }) => {
    const res = await post(valid);
    assert.equal(res.status, 503);
    assert.doesNotMatch(JSON.stringify(await res.json()), /SMTP_PASSWORD/);
  });
});

test('newsletter: needs consent, is forwarded (never auto-subscribed), and has no name requirement', async () => {
  await withServer({}, async ({ post, sent }) => {
    const bad = await post({ type: 'newsletter', email: 'reader@example.com' });
    assert.equal(bad.status, 400);
    assert.ok((await bad.json()).fields.newsletter);
    const res = await post({ type: 'newsletter', email: 'reader@example.com', newsletter: true, consent_text: 'Yes, email me the notes.', page: '/blog/' });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /^Newsletter sign-up: reader@example.com$/);
    assert.match(sent[0].text, /NOT been subscribed automatically/);
    assert.equal(sent[0].replyTo, 'reader@example.com');
  });
});

test('checklist and quiz: validated, laid out, escaped; unknown types refused', async () => {
  await withServer({ env: { RATE_LIMIT_MAX: '20' } }, async ({ post, sent }) => {
    assert.equal((await post({ type: 'checklist', email: 'nope' })).status, 400);
    assert.equal((await post({ type: 'checklist', email: 'owner@example.com', name: 'Sam' })).status, 200);
    assert.match(sent[0].subject, /Security checklist request from Sam/);
    assert.equal((await post({ type: 'quiz', email: 'owner@example.com' })).status, 400);
    const quiz = { type: 'quiz', name: 'Ana <b>', email: 'ana@example.com', score: '9 out of 20', result: 'Needs attention', fixes: 'Backups: test a restore | MFA: turn it on', answer_backups: 'Never tested (0 of 4)', 'answer_bad key': 'ignored' };
    assert.equal((await post(quiz)).status, 200);
    const mail = sent[1];
    assert.match(mail.subject, /IT health check result: Needs attention from Ana/);
    assert.match(mail.text, /- MFA: turn it on/);
    assert.match(mail.text, /backups: Never tested/);
    assert.doesNotMatch(mail.text, /ignored/);
    assert.ok(mail.html.includes('Ana &lt;b&gt;'));
    assert.equal((await post({ type: 'spam', email: 'x@example.com' })).status, 400);
  });
});

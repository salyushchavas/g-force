// Entry point (Railway runs `npm start`). Listens on $PORT and sends enquiries through the configured SMTP account.
import http from 'node:http';
import nodemailer from 'nodemailer';
import { loadConfig } from './config.js';
import { createHandler } from './app.js';

const config = loadConfig();
const log = (entry) => console.log(JSON.stringify({ time: new Date().toISOString(), ...entry }));

const transport = config.missing.length
  ? null
  : nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure, // true on 465: TLS from the first byte
      requireTLS: !config.smtp.secure, // 587: refuse to continue without STARTTLS
      auth: { user: config.smtp.user, pass: config.smtp.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

const handler = createHandler({ config, log, send: (message) => transport.sendMail(message) });

const server = http.createServer((req, res) => {
  handler(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'server_error' }));
  });
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;

server.listen(config.port, () => {
  log({ event: 'listening', port: config.port, allowedOrigins: config.allowedOrigins, missing: config.missing });
  // Report whether SMTP login works, without any detail that could leak credentials.
  transport
    ?.verify()
    .then(() => log({ event: 'smtp_ready' }))
    .catch((err) => log({ event: 'smtp_unavailable', code: err?.code ?? null, responseCode: err?.responseCode ?? null }));
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

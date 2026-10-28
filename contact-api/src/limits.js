// In-memory sliding-window rate limiting and duplicate suppression. One Railway instance serves the form, so memory
// is enough; nothing personal is stored (duplicates are remembered by a one-way hash only, and briefly).
import { createHash } from 'node:crypto';

export function createRateLimiter({ max, windowMs, globalMax, globalWindowMs }, now = Date.now) {
  const hits = new Map();
  let global = [];
  const prune = (list, windowStart) => list.filter((t) => t > windowStart);
  return {
    /** Records an attempt; returns { ok } or { ok: false, retryAfter } in seconds. */
    hit(key) {
      const t = now();
      global = prune(global, t - globalWindowMs);
      const mine = prune(hits.get(key) ?? [], t - windowMs);
      if (mine.length >= max) return { ok: false, retryAfter: Math.ceil((mine[0] + windowMs - t) / 1000) };
      if (global.length >= globalMax) return { ok: false, retryAfter: Math.ceil((global[0] + globalWindowMs - t) / 1000) };
      mine.push(t);
      global.push(t);
      hits.set(key, mine);
      if (hits.size > 5000) for (const [k, list] of hits) if (!prune(list, t - windowMs).length) hits.delete(k);
      return { ok: true };
    },
  };
}

export function createDuplicateGuard(windowMs, now = Date.now) {
  const seen = new Map();
  const fingerprint = (data) =>
    createHash('sha256').update([data.type, data.email, data.name, data.interest, data.message, data.quiz?.score].join('\u0000')).digest('hex');
  return {
    isDuplicate(data) {
      const t = now();
      for (const [k, at] of seen) if (t - at > windowMs) seen.delete(k);
      return seen.has(fingerprint(data));
    },
    /** Only successful sends are remembered, so a visitor can retry after a failure. */
    remember(data) {
      seen.set(fingerprint(data), now());
    },
  };
}
